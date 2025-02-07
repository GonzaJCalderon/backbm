
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

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
      console.error('Archivo rechazado por tipo o extensión no permitida:', file.originalname);
      cb(new Error('Error: Solo se permiten imágenes JPG, JPEG y PNG'));
    }
  },
}).array('fotos', 10); // Soporte para 10 fotos máximo

// Middleware para manejar la carga de fotos y subirlas a Cloudinary
const uploadFotosMiddleware = async (req, res, next) => {
  console.log('Inicio del middleware de subida de fotos');
  uploadFotos(req, res, async (err) => {
    if (err) {
      console.error('Error al cargar fotos:', err);
      return res.status(400).json({ error: err.message });
    }
    
    console.log('Archivos recibidos en req.files:', req.files); // Log para depurar archivos recibidos
    if (!req.files || req.files.length === 0) {
      console.error('No se recibieron fotos en la solicitud.');
      return res.status(400).json({ error: 'No se encontraron fotos para cargar.' });
    }

    try {
      const uploadedPhotos = [];
      for (const file of req.files) {
        console.log('Subiendo archivo a Cloudinary:', file.originalname); // Log por archivo
        const fotoUrl = await uploadFileToCloudinary(file.buffer); // Sube el buffer directamente a Cloudinary
        console.log('URL de la foto subida:', fotoUrl); // Log de la URL devuelta por Cloudinary
        uploadedPhotos.push(fotoUrl);
      }
      req.uploadedPhotos = uploadedPhotos; // Añade las fotos subidas al objeto de la solicitud
      console.log('Fotos cargadas correctamente:', uploadedPhotos);
      next();
    } catch (uploadError) {
      console.error('Error al subir fotos a Cloudinary:', uploadError);
      res.status(500).json({ error: 'Error al subir fotos a Cloudinary.' });
    }
  });
};

// Subir un archivo a Cloudinary
const uploadFileToCloudinary = async (fileBuffer) => {
  console.log('Subiendo archivo a Cloudinary desde buffer');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) {
          console.error('Error al subir archivo a Cloudinary:', error);
          return reject(error);
        }
        console.log('Resultado de la subida a Cloudinary:', result);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};







module.exports = { uploadFotosMiddleware, uploadFileToCloudinary, uploadFotos };
