const express = require('express');
const router  = express.Router();
const { getMessages, editMessage, deleteMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:conversationId',    protect, getMessages);
router.put('/:messageId',         protect, editMessage);
router.delete('/:messageId',      protect, deleteMessage);

module.exports = router;
