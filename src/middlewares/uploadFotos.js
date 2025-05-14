const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: '154721198775314',
  api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk',
});

// Almacenamiento en memoria
const storage = multer.memoryStorage();
const uploadFotos = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) cb(null, true);
    else cb(new Error('Solo imágenes JPG, JPEG o PNG'));
  },
}).any();

// Subida a Cloudinary
const uploadFileToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

// Middleware principal
const uploadFotosMiddleware = async (req, res, next) => {
  uploadFotos(req, res, async (err) => {
    if (err) {
      console.error('❌ Error en uploadFotosMiddleware:', err);
      if (!res.headersSent) {
        return res.status(400).json({ error: err.message });
      }
      return;
    }

    try {
      // Parsear el body por si hay objetos serializados
      for (let key in req.body) {
        if (typeof req.body[key] === 'string') {
          try {
            const parsed = JSON.parse(req.body[key]);
            if (typeof parsed === 'object') {
              req.body[key] = parsed;
            }
          } catch (e) {
            // No es JSON, mantener como string
          }
        }
      }

      const uploadedPhotos = {};

      // Subir todas las fotos en paralelo
      const uploadPromises = req.files.map(async (file) => {
        const url = await uploadFileToCloudinary(file.buffer);
        return { file, url };
      });

      const results = await Promise.all(uploadPromises);
for (const { file, url } of results) {
  const fieldName = file.fieldname;

  const matchFotosClassic = fieldName.match(/^bienes\[(\d+)\]\[fotos\]\[(\d+)\]$/);
  const matchImei = fieldName.match(/^bienes\[(\d+)\]\[imeiFoto_(\d+)\]$/);
  const matchFotosAlt = fieldName.match(/^fotos_bien_(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})_\d+$/); // UUID
  const matchFotosIndexado = fieldName.match(/^fotos_bien_(\d+)_(\d+)$/); // nuevo: fotos_bien_0_1

  // 👇 NUEVO: soporta imeiFoto_0, imeiFoto_1
  const matchImeiFlat = fieldName.match(/^imeiFoto_(\d+)$/);

  if (matchFotosClassic) {
    const [_, bienIndex] = matchFotosClassic;
    if (!uploadedPhotos[bienIndex]) uploadedPhotos[bienIndex] = { fotos: [], imeiFotos: {} };
    uploadedPhotos[bienIndex].fotos.push(url);

  } else if (matchImei) {
    const [_, bienIndex, imeiIndex] = matchImei;
    if (!uploadedPhotos[bienIndex]) uploadedPhotos[bienIndex] = { fotos: [], imeiFotos: {} };
    uploadedPhotos[bienIndex].imeiFotos[imeiIndex] = url;

  } else if (matchImeiFlat) {
    const [_, imeiIndex] = matchImeiFlat;
    if (!uploadedPhotos[0]) uploadedPhotos[0] = { fotos: [], imeiFotos: {} };
    uploadedPhotos[0].imeiFotos[imeiIndex] = url;

  } else if (matchFotosIndexado) {
    const [_, bienIndex] = matchFotosIndexado;
    if (!uploadedPhotos[bienIndex]) uploadedPhotos[bienIndex] = { fotos: [], imeiFotos: {} };
    uploadedPhotos[bienIndex].fotos.push(url);

  } else if (matchFotosAlt) {
    const [_, bienUuid] = matchFotosAlt;
    if (!uploadedPhotos[bienUuid]) uploadedPhotos[bienUuid] = { fotos: [], imeiFotos: {} };
    uploadedPhotos[bienUuid].fotos.push(url);

  } else {
    console.warn(`⚠️ Campo no reconocido: ${fieldName}`);
  }
}


      console.log('📎 FOTOS RECIBIDAS:', uploadedPhotos);
      req.uploadedPhotos = uploadedPhotos;
      return next();
    } catch (error) {
      console.error('❌ Error al procesar archivos:', error);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Error al subir imágenes a Cloudinary.' });
      }
    }
  });
};

module.exports = {
  uploadFotosMiddleware,
  uploadFileToCloudinary,
  uploadFotos,
};
