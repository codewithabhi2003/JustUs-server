const asyncHandler   = require('express-async-handler');
const Message        = require('../models/Message');
const Conversation   = require('../models/Conversation');
const cloudinary     = require('../config/cloudinary');

// GET /api/messages/:conversationId
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { before, limit = 30 } = req.query;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id.toString())) {
    res.status(403); throw new Error('Access denied');
  }

  const query = { conversationId, deletedFor: { $ne: req.user._id } };
  if (before) query._id = { $lt: before };

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate('senderId', 'username displayName avatar')
    .populate('replyTo');

  res.json(messages.reverse());
});

// PUT /api/messages/:messageId
const editMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const msg = await Message.findOneAndUpdate(
    { _id: req.params.messageId, senderId: req.user._id, isDeleted: false },
    { content, isEdited: true, editedAt: new Date() },
    { returnDocument: 'after' }
  ).populate('senderId', 'username displayName avatar');

  if (!msg) { res.status(404); throw new Error('Message not found or not yours'); }

  const io = req.app.get('io');
  io.to(`conv:${msg.conversationId}`).emit('message:edited', msg);

  res.json(msg);
});

// DELETE /api/messages/:messageId
const deleteMessage = asyncHandler(async (req, res) => {
  const { deleteFor } = req.body; // 'me' or 'everyone'
  const userId = req.user._id.toString();

  let msg;
  if (deleteFor === 'everyone') {
    // Check time limit: 30 minutes
    const message = await Message.findOne({ _id: req.params.messageId, senderId: userId });
    if (!message) { res.status(404); throw new Error('Message not found'); }

    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > thirtyMinutes) {
      res.status(400); throw new Error('Can only delete for everyone within 30 minutes');
    }

    // Delete media from Cloudinary
    if (message.mediaPublicId) {
      try { await cloudinary.uploader.destroy(message.mediaPublicId); } catch {}
    }

    msg = await Message.findByIdAndUpdate(
      req.params.messageId,
      { isDeleted: true, content: '', mediaUrl: null, mediaPublicId: null },
      { returnDocument: 'after' }
    );

    const io = req.app.get('io');
    io.to(`conv:${msg.conversationId}`).emit('message:deleted', {
      messageId: req.params.messageId, deleteFor: 'everyone'
    });
  } else {
    msg = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $addToSet: { deletedFor: userId } },
      { returnDocument: 'after' }
    );
  }

  res.json({ success: true });
});

module.exports = { getMessages, editMessage, deleteMessage };