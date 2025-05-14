const express = require('express');
const { verifyToken } = require('../middlewares/authMiddleware');
const { uploadExcel, multerErrorHandler } = require('../middlewares/uploadExcel');
const { uploadFotosMiddleware } = require('../middlewares/uploadFotos');
const excelController = require('../controllers/excelController'); // ✅ Asegurate que sea el nombre correcto

const router = express.Router();

// 🔹 1. Subida y previsualización del archivo Excel
router.post(
  '/upload-stock',
  verifyToken,
  uploadExcel,
  multerErrorHandler,
  excelController.processExcel
);

// 🔹 2. Subida de fotos generales o por bien (sin IMEI)
router.post(
  '/subir-fotos/:bienKey',
  verifyToken,
  uploadFotosMiddleware, // Usa tu lógica para guardar en Cloudinary
  excelController.subirFotosPorBien
);

// 🔹 3. Finalización del registro de bienes (con stock, imei y fotos)
router.post(
  '/finalizar-creacion',
  verifyToken,
  excelController.finalizarCreacionBienes
);

// 🔹 4. Subida directa de base64 desde el frontend (IMEI específico)
router.post(
  '/subir-foto-base64',
  verifyToken,
  async (req, res) => {
    try {
      const { imagenBase64 } = req.body;
      if (!imagenBase64) return res.status(400).json({ message: 'Falta la imagen.' });

      const url = await excelController.subirFotoACloudinary(imagenBase64);
      return res.status(200).json({ url });
    } catch (error) {
      return res.status(500).json({ message: 'Error al subir imagen.', error: error.message });
    }
  }
);

module.exports = router;
