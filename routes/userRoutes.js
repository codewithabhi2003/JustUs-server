const express = require('express');
const router  = express.Router();
const { searchUsers, getUserById, updateProfile, uploadAvatar } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload  = require('../middleware/uploadMiddleware');

router.get('/search',    protect, searchUsers);
router.get('/:id',       protect, getUserById);
router.put('/profile',   protect, updateProfile);
router.post('/avatar',   protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
