const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const { ObjectId } = mongoose.Schema.Types;

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true,
    trim: true, lowercase: true,
    minlength: 3, maxlength: 20,
    match: /^[a-zA-Z0-9_]+$/
  },
  displayName:    { type: String, required: true, trim: true, maxlength: 40 },
  email:          { type: String, required: true, unique: true, lowercase: true },
  password:       { type: String, required: true, select: false },
  avatar:         { type: String, default: null },
  avatarPublicId: { type: String, default: null },
  contacts:       [{ type: ObjectId, ref: 'User' }],
  status: {
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date,    default: Date.now },
    socketId: { type: String,  default: null }
  },
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);