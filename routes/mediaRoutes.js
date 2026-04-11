const express = require('express');
const router  = express.Router();
const { uploadMedia, deleteMedia } = require('../controllers/mediaController');
const { protect } = require('../middleware/authMiddleware');
const upload  = require('../middleware/uploadMiddleware');

router.post('/upload',       protect, upload.single('file'), uploadMedia);
router.delete('/:publicId',  protect, deleteMedia);

module.exports = router;
