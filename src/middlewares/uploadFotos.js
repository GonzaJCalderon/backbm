const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuración de Cloudinary con tus credenciales
cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: '154721198775314',
  api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk'
});

// Configuración de almacenamiento en memoria para fotos (multer)
const storageFotos = multer.memoryStorage();

// Configuración de Multer para la carga de fotos
const uploadFotos = multer({
  storage: storageFotos, // Usar memoryStorage para tener acceso al buffer
  limits: { fileSize: 5 * 1024 * 1024 }, // Limitar el tamaño del archivo a 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true); // Si el archivo es válido
    } else {
      return cb(new Error('Error: Solo se permiten imágenes JPG, JPEG, PNG!'));
    }
  },
}).array('fotos'); // Espera múltiples fotos con el campo 'fotos'

// Middleware de carga de fotos
const uploadFotosMiddleware = (req, res, next) => {
  uploadFotos(req, res, (err) => {
    if (err) {
      console.error('Error al cargar fotos:', err);
      return res.status(400).json({ error: err.message });
    }
    console.log('Fotos cargadas correctamente:', req.files);  // Verifica que las fotos están en req.files
    next();  // Llamar al siguiente middleware
  });
};

// Función para subir un archivo a Cloudinary
const uploadFileToCloudinary = async (file) => {
  if (!file || !file.originalname || !file.buffer || !file.mimetype) {
    throw new Error('El archivo proporcionado no es válido o está incompleto');
  }

  try {
    // Subir la imagen a Cloudinary usando un stream
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: `uploads/${uuidv4()}-${file.originalname}`, // Nombre único para el archivo
        },
        (error, result) => {
          if (error) {
            return reject(new Error('Error al subir la imagen a Cloudinary'));
          }
          resolve(result);  // Resuelve con el resultado de la subida
        }
      ).end(file.buffer);  // Pasa el buffer del archivo
    });

    // Devolver la URL pública de la imagen subida
    return result.secure_url;
  } catch (error) {
    console.error('Error al subir el archivo a Cloudinary:', error);
    throw error;
  }
};

module.exports = { uploadFotos, uploadFileToCloudinary, uploadFotosMiddleware };
