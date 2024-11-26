const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: '154721198775314',
  api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk',
});

// Configuración de almacenamiento en memoria para Multer
const storageFotos = multer.memoryStorage();

// Configuración de Multer
const uploadFotos = multer({
  storage: storageFotos,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limitar a 5MB por archivo
  fileFilter: (req, file, cb) => {
    const allowedFiletypes = /jpeg|jpg|png/;
    const extname = allowedFiletypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFiletypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Error: Solo se permiten imágenes JPG, JPEG y PNG'));
    }
  },
}).array('fotos', 10); // Soporte para 10 fotos máximo

// Middleware para manejar la carga de fotos
const uploadFotosMiddleware = (req, res, next) => {
  uploadFotos(req, res, (err) => {
    if (err) {
      console.error('Error al cargar fotos:', err);
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      console.error('No se recibieron fotos en la solicitud.');
      return res.status(400).json({ error: 'No se encontraron fotos para cargar.' });
    }
    console.log('Fotos cargadas correctamente:', req.files);
    next();
  });
};




// Subir un archivo a Cloudinary
const uploadFileToCloudinary = async (file) => {
  try {
    console.log('Subiendo archivo:', file.originalname); // Log del nombre del archivo
    const publicId = `uploads/${uuidv4()}-${Date.now()}-${file.originalname}`;
    console.log(`Public ID: ${publicId}`);
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'image', public_id: publicId },
        (error, result) => {
          if (error) {
            console.error('Error al subir a Cloudinary:', error);
            return reject(new Error('Error al subir la imagen a Cloudinary'));
          }
          resolve(result);
        }
      ).end(file.buffer);
    });
    console.log('Archivo subido a Cloudinary:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error('Error al subir archivo a Cloudinary:', error);
    throw error;
  }
};



module.exports = { uploadFotosMiddleware, uploadFileToCloudinary };
