const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Función para subir un archivo a Cloudinary y devolver una promesa
const subirArchivoACloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'bienes' }, // Carpeta donde se almacenarán las imágenes
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Ruta para subir imágenes a Cloudinary
router.post('/upload', upload.array('fotos', 10), async (req, res) => {
  try {
    const archivos = req.files;

    if (!archivos || archivos.length === 0) {
      return res.status(400).json({ message: 'No se recibieron archivos.' });
    }

    // Subir cada archivo a Cloudinary y obtener las URLs
    const urls = await Promise.all(
      archivos.map((file) => subirArchivoACloudinary(file.buffer))
    );

    res.status(200).json({ urls }); // Responder con las URLs generadas
  } catch (error) {
    res.status(500).json({ message: 'Error al subir imágenes.' });
  }
});

module.exports = router;
