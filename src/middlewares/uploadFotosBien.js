const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: '154721198775314',
  api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk',
});

// Configuración de Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Subir un archivo a Cloudinary
const subirArchivoACloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'bienes' },
      (error, result) => {
        if (error) {
          console.error('Error en Cloudinary:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

// Middleware Unificado
const uploadFotosBienMiddleware = (req, res, next) => {
  upload.array('fotos', 10)(req, res, async (err) => {
    if (err) {
      console.error('Error en Multer:', err);
      return res.status(400).json({ message: 'Error al procesar las fotos.' });
    }

    if (!req.files || req.files.length === 0) {
      console.error('No se recibieron fotos.');
      req.uploadedPhotos = [];
      return next();
    }

    try {
      const urls = await Promise.all(
        req.files.map((file) => subirArchivoACloudinary(file.buffer))
      );
      req.uploadedPhotos = urls; // Almacena las URLs en el objeto de la solicitud
      console.log('Fotos subidas a Cloudinary:', urls);
      next();
    } catch (error) {
      console.error('Error al subir fotos a Cloudinary:', error);
      return res.status(500).json({ message: 'Error al subir fotos a Cloudinary.', error: error.message });
    }
  });
};

module.exports = { uploadFotosBienMiddleware, subirArchivoACloudinary };

