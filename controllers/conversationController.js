const asyncHandler = require('express-async-handler');
const Conversation = require('../models/Conversation');

// GET /api/conversations
const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ lastActivity: -1 })
    .populate('participants', 'username displayName avatar status')
    .populate({ path: 'lastMessage', populate: { path: 'senderId', select: 'displayName' } });
  res.json(conversations);
});

// GET /api/conversations/:id
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate('participants', 'username displayName avatar status')
    .populate({ path: 'lastMessage', populate: { path: 'senderId', select: 'displayName' } });
  if (!conversation) { res.status(404); throw new Error('Conversation not found'); }
  if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
    res.status(403); throw new Error('Access denied');
  }
  res.json(conversation);
});

// POST /api/conversations/get-or-create
const getOrCreate = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, userId] }
  }).populate('participants', 'username displayName avatar status');

  if (!conversation) {
    conversation = await Conversation.create({ participants: [req.user._id, userId] });
    conversation = await conversation.populate('participants', 'username displayName avatar status');
  }
  res.json(conversation);
});

// PUT /api/conversations/:id/read
const markRead = asyncHandler(async (req, res) => {
  await Conversation.findByIdAndUpdate(req.params.id, {
    [`unreadCount.${req.user._id}`]: 0
  });
  res.json({ success: true });
});

module.exports = { getConversations, getConversation, getOrCreate, markRead };
