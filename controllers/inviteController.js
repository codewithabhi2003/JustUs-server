const asyncHandler  = require('express-async-handler');
const crypto        = require('crypto');
const InviteLink    = require('../models/InviteLink');
const User          = require('../models/User');
const Conversation  = require('../models/Conversation');

// POST /api/invite/generate
const generateInvite = asyncHandler(async (req, res) => {
  const token = crypto.randomBytes(20).toString('hex');
  const invite = await InviteLink.create({ token, createdBy: req.user._id });
  const url = `${process.env.CLIENT_URL}/invite/${token}`;
  res.json({ token, url });
});

// GET /api/invite/:token
const getInvite = asyncHandler(async (req, res) => {
  const invite = await InviteLink.findOne({ token: req.params.token })
    .populate('createdBy', 'username displayName avatar');
  if (!invite) { res.status(404); throw new Error('Invite not found'); }
  res.json(invite);
});

// POST /api/invite/:token/accept
const acceptInvite = asyncHandler(async (req, res) => {
  const invite = await InviteLink.findOne({
    token: req.params.token,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!invite) { res.status(400); throw new Error('Invite link invalid or expired'); }
  if (invite.createdBy.toString() === req.user._id.toString()) {
    res.status(400); throw new Error('You cannot accept your own invite');
  }

  await User.findByIdAndUpdate(invite.createdBy, { $addToSet: { contacts: req.user._id } });
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { contacts: invite.createdBy } });

  let conversation = await Conversation.findOne({
    participants: { $all: [invite.createdBy, req.user._id] }
  });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [invite.createdBy, req.user._id]
    });
  }

  await InviteLink.findByIdAndUpdate(invite._id, {
    isUsed: true, usedBy: req.user._id, conversationId: conversation._id
  });

  const io = req.app.get('io');
  io.to(`user:${invite.createdBy}`).emit('invite:accepted', {
    by: { _id: req.user._id, displayName: req.user.displayName, avatar: req.user.avatar },
    conversationId: conversation._id
  });

  res.json({ success: true, conversationId: conversation._id, message: 'Connected! 💕' });
});

module.exports = { generateInvite, getInvite, acceptInvite };
