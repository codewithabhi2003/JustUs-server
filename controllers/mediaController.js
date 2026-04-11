const asyncHandler = require('express-async-handler');
const cloudinary   = require('../config/cloudinary');
const streamifier  = require('streamifier');

// POST /api/media/upload
const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('No file uploaded'); }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'justus/media', resource_type: 'auto' },
      (error, result) => error ? reject(error) : resolve(result)
    );
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });

  res.json({
    url:        result.secure_url,
    publicId:   result.public_id,
    resourceType: result.resource_type,
    bytes:      result.bytes,
    originalName: req.file.originalname
  });
});

// DELETE /api/media/:publicId
const deleteMedia = asyncHandler(async (req, res) => {
  const publicId = decodeURIComponent(req.params.publicId);
  await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
  res.json({ success: true });
});

module.exports = { uploadMedia, deleteMedia };
