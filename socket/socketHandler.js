const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');

function getOtherId(conversation, myId) {
  return conversation.participants.find(p => p.toString() !== myId).toString();
}

module.exports = (io) => {
  // JWT auth middleware for sockets
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    // ── PRESENCE ──────────────────────────────────────────────────────────
    await User.findByIdAndUpdate(userId, {
      'status.isOnline': true,
      'status.socketId': socket.id,
      'status.lastSeen': new Date()
    });

    socket.join(`user:${userId}`);

    const conversations = await Conversation.find({ participants: userId });
    conversations.forEach(c => socket.join(`conv:${c._id}`));

    const user = await User.findById(userId).populate('contacts');
    user.contacts.forEach(contact => {
      io.to(`user:${contact._id}`).emit('user:online', {
        userId, isOnline: true, lastSeen: new Date()
      });
    });

    // ── MESSAGING ─────────────────────────────────────────────────────────
    socket.on('message:send', async ({ conversationId, content, type, mediaUrl, mediaPublicId, fileName, fileSize, replyTo }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.map(p => p.toString()).includes(userId)) return;

        const message = await Message.create({
          conversationId, senderId: userId,
          type: type || 'text',
          content: content || '',
          mediaUrl, mediaPublicId, fileName, fileSize,
          replyTo: replyTo || null,
          readBy: [userId]
        });

        const populated = await Message.findById(message._id)
          .populate('senderId', 'username displayName avatar')
          .populate('replyTo');

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastActivity: new Date(),
          $inc: { [`unreadCount.${getOtherId(conversation, userId)}`]: 1 }
        });

        io.to(`conv:${conversationId}`).emit('message:received', populated);

      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── TYPING ────────────────────────────────────────────────────────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:started', { userId, conversationId });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stopped', { userId, conversationId });
    });

    // ── EDIT ──────────────────────────────────────────────────────────────
    socket.on('message:edit', async ({ messageId, newContent }) => {
      const msg = await Message.findOneAndUpdate(
        { _id: messageId, senderId: userId, isDeleted: false },
        { content: newContent, isEdited: true, editedAt: new Date() },
        { returnDocument: 'after' }
      ).populate('senderId', 'username displayName avatar');

      if (msg) io.to(`conv:${msg.conversationId}`).emit('message:edited', msg);
    });

    // ── DELETE ────────────────────────────────────────────────────────────
    socket.on('message:delete', async ({ messageId, deleteFor }) => {
      if (deleteFor === 'everyone') {
        const msg = await Message.findOneAndUpdate(
          { _id: messageId, senderId: userId },
          { isDeleted: true, content: '', mediaUrl: null },
          { returnDocument: 'after' }
        );
        if (msg) io.to(`conv:${msg.conversationId}`).emit('message:deleted', { messageId, deleteFor: 'everyone' });
      } else {
        const msg = await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { deletedFor: userId } },
          { returnDocument: 'after' }
        );
        if (msg) socket.emit('message:deleted', { messageId, deleteFor: 'me' });
      }
    });

    // ── READ RECEIPTS ─────────────────────────────────────────────────────
    socket.on('messages:read', async ({ conversationId }) => {
      await Message.updateMany(
        { conversationId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );
      await Conversation.findByIdAndUpdate(conversationId, {
        [`unreadCount.${userId}`]: 0
      });
      socket.to(`conv:${conversationId}`).emit('messages:read', { conversationId, readBy: userId });
    });

    // ── WEBRTC SIGNALING ──────────────────────────────────────────────────
    socket.on('call:initiate', ({ targetUserId, callType, offer }) => {
      io.to(`user:${targetUserId}`).emit('call:incoming', {
        from: { _id: userId, displayName: socket.user.displayName, avatar: socket.user.avatar },
        callType,
        offer,   // WebRTC offer passed through
      });
    });

    socket.on('call:accept',  ({ targetUserId, answer }) =>
      io.to(`user:${targetUserId}`).emit('call:accepted', { from: userId, answer }));

    socket.on('call:reject',  ({ targetUserId }) =>
      io.to(`user:${targetUserId}`).emit('call:rejected', { from: userId }));

    socket.on('call:end',     ({ targetUserId }) =>
      io.to(`user:${targetUserId}`).emit('call:ended', { from: userId }));

    socket.on('webrtc:offer',  ({ targetUserId, offer })     =>
      io.to(`user:${targetUserId}`).emit('webrtc:offer',  { from: userId, offer }));

    socket.on('webrtc:answer', ({ targetUserId, answer })    =>
      io.to(`user:${targetUserId}`).emit('webrtc:answer', { from: userId, answer }));

    socket.on('webrtc:ice',    ({ targetUserId, candidate }) =>
      io.to(`user:${targetUserId}`).emit('webrtc:ice',    { from: userId, candidate }));

    // ── DISCONNECT ────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(userId, {
        'status.isOnline': false,
        'status.socketId': null,
        'status.lastSeen': new Date()
      });
      const updatedUser = await User.findById(userId).populate('contacts');
      updatedUser?.contacts.forEach(contact => {
        io.to(`user:${contact._id}`).emit('user:offline', {
          userId, isOnline: false, lastSeen: new Date()
        });
      });
    });
  });
};