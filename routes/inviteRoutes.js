const express = require('express');
const router  = express.Router();
const { generateInvite, getInvite, acceptInvite } = require('../controllers/inviteController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate',       protect, generateInvite);
router.get('/:token',          getInvite);
router.post('/:token/accept',  protect, acceptInvite);

module.exports = router;
