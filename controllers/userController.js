const asyncHandler = require('express-async-handler');
const User         = require('../models/User');
const cloudinary   = require('../config/cloudinary');
const streamifier  = require('streamifier');

// GET /api/users/search?q=
const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const users = await User.find({
    username: { $regex: q, $options: 'i' },
    _id: { $ne: req.user._id }
  }).select('username displayName avatar status').limit(10);

  res.json(users);
});

// GET /api/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) { res.status(404); throw new Error('User not found'); }
  res.json(user);
});

// PUT /api/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { displayName } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { displayName },
    { returnDocument: 'after' }
  ).select('-password');
  res.json(user);
});

// POST /api/users/avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('No file uploaded'); }

  // Delete old avatar if exists
  const currentUser = await User.findById(req.user._id);
  if (currentUser.avatarPublicId) {
    await cloudinary.uploader.destroy(currentUser.avatarPublicId);
  }

  // Upload new avatar to Cloudinary
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'justus/avatars', transformation: [{ width: 200, height: 200, crop: 'fill' }] },
      (error, result) => error ? reject(error) : resolve(result)
    );
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: result.secure_url, avatarPublicId: result.public_id },
    { returnDocument: 'after' }
  ).select('-password');

  res.json(user);
});

module.exports = { searchUsers, getUserById, updateProfile, uploadAvatar };