const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const conversationSchema = new mongoose.Schema({
  participants: [{ type: ObjectId, ref: 'User', required: true }],
  lastMessage:  { type: ObjectId, ref: 'Message', default: null },
  lastActivity: { type: Date, default: Date.now },
  unreadCount:  { type: Map, of: Number, default: {} }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
