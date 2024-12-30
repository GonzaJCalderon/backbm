const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta para subir imágenes a Cloudinary
router.post('/upload', upload.array('fotos', 10), async (req, res) => {
  try {
    const archivos = req.files;

    if (!archivos || archivos.length === 0) {
      return res.status(400).json({ message: 'No se recibieron archivos.' });
    }

    // Subir cada archivo a Cloudinary y obtener las URLs
    const urls = await Promise.all(
      archivos.map(async (file) => {
        const result = await cloudinary.uploader.upload_stream({ 
          folder: 'bienes', // Carpeta donde se almacenarán las imágenes
        }, (error, result) => {
          if (error) {
            console.error('Error al subir a Cloudinary:', error);
            throw new Error(error);
          }
          return result.secure_url;
        });

        return result;
      })
    );

    res.status(200).json({ urls }); // Responder con las URLs generadas
  } catch (error) {
    console.error('Error en el endpoint de subida:', error);
    res.status(500).json({ message: 'Error al subir imágenes.' });
  }
});

module.exports = router;
