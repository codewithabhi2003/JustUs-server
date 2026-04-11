const asyncHandler  = require('express-async-handler');
const User          = require('../models/User');
const generateToken = require('../utils/generateToken');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { username, displayName, email, password } = req.body;

  if (!username || !displayName || !email || !password) {
    res.status(400);
    throw new Error('All fields are required');
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    res.status(400);
    throw new Error('Username or email already taken');
  }

  const user  = await User.create({ username, displayName, email, password });
  const token = generateToken(user._id);

  res.status(201).json({
    _id: user._id, username: user.username, displayName: user.displayName,
    email: user.email, avatar: user.avatar, status: user.status,
    contacts: user.contacts, token
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user._id);

  res.json({
    _id: user._id, username: user.username, displayName: user.displayName,
    email: user.email, avatar: user.avatar, status: user.status,
    contacts: user.contacts, token
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('contacts', 'username displayName avatar status');
  res.json(user);
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    'status.isOnline': false,
    'status.lastSeen': new Date()
  });
  res.json({ message: 'Logged out' });
});

module.exports = { register, login, getMe, logout };
