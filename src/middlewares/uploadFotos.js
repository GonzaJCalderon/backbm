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

// Middleware Multer para manejar múltiples imágenes con nombres dinámicos
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
      console.error('Archivo rechazado:', file.originalname);
      cb(new Error('Error: Solo se permiten imágenes JPG, JPEG y PNG'));
    }
  },
}).any(); // Permitir cualquier campo de archivo

// Middleware para manejar la carga de fotos y subirlas a Cloudinary
const uploadFotosMiddleware = async (req, res, next) => {
  console.log('Inicio del middleware de subida de fotos');

  uploadFotos(req, res, async (err) => {
    if (err) {
      console.error('Error al cargar fotos:', err);
      return res.status(400).json({ error: err.message });
    }

    console.log('Archivos recibidos en req.files:', req.files);

    if (!req.files || req.files.length === 0) {
      console.warn('No se recibieron fotos.');
      req.uploadedPhotos = [];
      return next(); // Continúa sin fotos
    }

    try {
      const uploadedPhotos = {};
      // Procesar cada archivo recibido
for (const file of req.files) {
  console.log('Subiendo archivo a Cloudinary:', file.originalname);
  const fotoUrl = await uploadFileToCloudinary(file.buffer);
  console.log('Foto subida con éxito:', fotoUrl);

  // Extraer el índice y el tipo de campo (ya sea "fotos" o "imeiFoto")
  const fieldName = file.fieldname; // Ejemplo: "bienes[0][fotos]" o "bienes[0][imeiFoto]"
  const match = fieldName.match(/bienes\[(\d+)\]\[(fotos|imeiFoto)\]/);

  if (match) {
    const bienIndex = match[1]; // El índice del bien
    const field = match[2];     // Puede ser "fotos" o "imeiFoto"
    
    if (!uploadedPhotos[bienIndex]) {
      uploadedPhotos[bienIndex] = {};
    }
    
    if (field === 'fotos') {
      // Si el campo es "fotos", guardarlo como array
      if (!uploadedPhotos[bienIndex][field]) {
        uploadedPhotos[bienIndex][field] = [];
      }
      uploadedPhotos[bienIndex][field].push(fotoUrl);
    } else if (field === 'imeiFoto') {
      // Para "imeiFoto", guardamos un único valor (la URL)
      uploadedPhotos[bienIndex][field] = fotoUrl;
    }
  }
}

req.uploadedPhotos = uploadedPhotos; // Guardar en req para su uso en el controlador
console.log('Fotos subidas correctamente:', uploadedPhotos);
next();

    } catch (uploadError) {
      console.error('Error al subir fotos a Cloudinary:', uploadError);
      return res.status(500).json({ error: 'Error al subir fotos a Cloudinary.' });
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
          console.error('Error en Cloudinary:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

module.exports = { uploadFotosMiddleware, uploadFileToCloudinary, uploadFotos };

