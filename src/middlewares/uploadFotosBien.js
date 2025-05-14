const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: 'TU_API_KEY',
  api_secret: 'TU_API_SECRET',
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const subirArchivoACloudinary = (fileBuffer, folder = 'bienes') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

const uploadFotosBienMiddleware = (req, res, next) => {
  upload.any()(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error al procesar las fotos.' });
    }

    // ✅ Adaptado al formato esperado por el controller
    req.uploadedPhotos = [{ fotos: [] }];
    req.uploadedImeiPhotos = {};

    if (!req.files || req.files.length === 0) return next();

    try {
      for (const file of req.files) {
        const url = await subirArchivoACloudinary(file.buffer);

        if (file.fieldname === 'fotos') {
          req.uploadedPhotos[0].fotos.push(url);
        } else if (file.fieldname.startsWith('imeiFoto_')) {
          req.uploadedImeiPhotos[file.fieldname] = url;
        }
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        message: 'Error al subir fotos a Cloudinary.',
        error: error.message,
      });
    }
  });
};

module.exports = { uploadFotosBienMiddleware, subirArchivoACloudinary };
