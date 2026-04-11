const express = require('express');
const router  = express.Router();
const { getConversations, getConversation, getOrCreate, markRead } = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/',                protect, getConversations);
router.get('/:id',             protect, getConversation);
router.post('/get-or-create',  protect, getOrCreate);
router.put('/:id/read',        protect, markRead);

module.exports = router;
