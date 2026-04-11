const asyncHandler = require('express-async-handler');
const User         = require('../models/User');

// GET /api/contacts
const getContacts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('contacts', 'username displayName avatar status');
  res.json(user.contacts);
});

// POST /api/contacts/add/:userId
const addContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user._id.toString()) {
    res.status(400); throw new Error('Cannot add yourself');
  }

  await User.findByIdAndUpdate(req.user._id, { $addToSet: { contacts: userId } });
  await User.findByIdAndUpdate(userId, { $addToSet: { contacts: req.user._id } });

  res.json({ success: true });
});

module.exports = { getContacts, addContact };
