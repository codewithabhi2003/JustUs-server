const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const inviteLinkSchema = new mongoose.Schema({
  token:          { type: String,  required: true, unique: true },
  createdBy:      { type: ObjectId, ref: 'User', required: true },
  usedBy:         { type: ObjectId, ref: 'User', default: null },
  isUsed:         { type: Boolean, default: false },
  expiresAt:      { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  conversationId: { type: ObjectId, ref: 'Conversation', default: null }
}, { timestamps: true });

module.exports = mongoose.model('InviteLink', inviteLinkSchema);
