const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema({
  conversationId: { type: ObjectId, ref: 'Conversation', required: true, index: true },
  senderId:       { type: ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video', 'system'],
    default: 'text'
  },
  content:       { type: String, default: '' },
  mediaUrl:      { type: String, default: null },
  mediaPublicId: { type: String, default: null },
  fileName:      { type: String, default: null },
  fileSize:      { type: Number, default: null },
  isEdited:      { type: Boolean, default: false },
  editedAt:      { type: Date,    default: null },
  isDeleted:     { type: Boolean, default: false },
  deletedFor:    [{ type: ObjectId, ref: 'User' }],
  readBy:        [{ type: ObjectId, ref: 'User' }],
  replyTo:       { type: ObjectId, ref: 'Message', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
