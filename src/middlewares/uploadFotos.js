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

// ✅ Modificar para aceptar tanto fotos generales como fotos de IMEIs
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
      console.error('❌ Archivo rechazado por tipo no permitido:', file.originalname);
      cb(new Error('Error: Solo se permiten imágenes JPG, JPEG y PNG'));
    }
  },
}).fields([
  { name: 'fotos', maxCount: 10 }, // ✅ Fotos generales (NO IMEIs)
  { name: 'imeis[0][foto]', maxCount: 1 }, // ✅ IMEI 0
  { name: 'imeis[1][foto]', maxCount: 1 }, // ✅ IMEI 1 (Agregar más si es necesario)
  { name: 'imeis[2][foto]', maxCount: 1 }, // ✅ IMEI 2
  { name: 'imeis[3][foto]', maxCount: 1 }, // ✅ IMEI 3
]); 

// Middleware para manejar la carga de fotos y subirlas a Cloudinary
const uploadFotosMiddleware = async (req, res, next) => {
  console.log('📤 Inicio del middleware de subida de fotos');
  uploadFotos(req, res, async (err) => {
    if (err) {
      console.error('❌ Error al cargar fotos:', err);
      return res.status(400).json({ error: err.message });
    }
    
    console.log('📥 Archivos recibidos en req.files:', req.files);
    if (!req.files || Object.keys(req.files).length === 0) {
      console.error('⚠️ No se recibieron fotos en la solicitud.');
      return res.status(400).json({ error: 'No se encontraron fotos para cargar.' });
    }

    try {
      const uploadedPhotos = [];

      // ✅ Subir fotos generales si existen
      if (req.files['fotos']) {
        for (const file of req.files['fotos']) {
          console.log('📤 Subiendo foto general a Cloudinary:', file.originalname);
          const fotoUrl = await uploadFileToCloudinary(file.buffer);
          uploadedPhotos.push(fotoUrl);
        }
      }

      // ✅ Subir fotos de IMEIs si existen
      const uploadedIMEIsPhotos = {};
      for (let i = 0; i < 10; i++) {
        const imeiFotoKey = `imeis[${i}][foto]`;
        if (req.files[imeiFotoKey]) {
          const file = req.files[imeiFotoKey][0];
          console.log(`📤 Subiendo foto del IMEI ${i} a Cloudinary:`, file.originalname);
          const fotoUrl = await uploadFileToCloudinary(file.buffer);
          uploadedIMEIsPhotos[i] = fotoUrl;
        }
      }

      req.uploadedPhotos = uploadedPhotos; // ✅ Fotos generales
      req.uploadedIMEIsPhotos = uploadedIMEIsPhotos; // ✅ Fotos de IMEIs

      console.log('✅ Fotos generales cargadas:', uploadedPhotos);
      console.log('✅ Fotos de IMEIs cargadas:', uploadedIMEIsPhotos);
      next();
    } catch (uploadError) {
      console.error('❌ Error al subir fotos a Cloudinary:', uploadError);
      res.status(500).json({ error: 'Error al subir fotos a Cloudinary.' });
    }
  });
};

// Subir un archivo a Cloudinary
const uploadFileToCloudinary = async (fileBuffer) => {
  console.log('📤 Subiendo archivo a Cloudinary desde buffer');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) {
          console.error('❌ Error al subir archivo a Cloudinary:', error);
          return reject(error);
        }
        console.log('✅ Resultado de la subida a Cloudinary:', result);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

module.exports = { uploadFotosMiddleware, uploadFileToCloudinary, uploadFotos };
