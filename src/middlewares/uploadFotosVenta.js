const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { uploadFotosMiddleware } = require('./uploadFotos')


// 🔐 Configuración de Cloudinary
cloudinary.config({
  cloud_name: "dtx5ziooo",
  api_key: "154721198775314",
  api_secret: "4HXf6T4SIh_Z5RjmeJtmM6hEYdk",
});

// 📌 Almacenamiento en memoria para evitar archivos temporales
const storageFotosVenta = multer.memoryStorage();

// 📌 Configuración de Multer con validaciones mejoradas
const uploadFotosVenta = multer({
  storage: storageFotosVenta,
  limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5MB por imagen
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen."), false);
    }
    cb(null, true);
  },
}).any();

// 📌 Función para subir archivos a Cloudinary
const uploadFileToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

// 📌 Middleware para procesar la subida de imágenes

const uploadFotosVentaMiddleware = async (req, res, next) => {
  uploadFotosMiddleware(req, res, (err) => {
    if (err) {
      console.error('❌ Error en uploadFotosVentaMiddleware:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      // Renombramos a uploadedPhotosVenta para distinguirlo
      req.uploadedPhotosVenta = req.uploadedPhotos || {};
      delete req.uploadedPhotos;

      return next();
    } catch (error) {
      console.error('❌ Error procesando imágenes para venta:', error);
      return res.status(500).json({ error: 'Error procesando imágenes.' });
    }
  });
};


module.exports = { uploadFotosVentaMiddleware };
