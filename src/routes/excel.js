const express = require('express');
const { sequelize } = require('../models');
const { Bien } = require('../models');
const { Stock } = require('../models');
const { DetallesBien } = require('../models');
const { uploadFileToCloudinary } = require('../middlewares/uploadFotos');



const { uploadExcel, multerErrorHandler } = require('../middlewares/uploadExcel'); // Middleware de subida
const excelController = require('../controllers/excelController'); // Controladores
const { verifyToken } = require('../middlewares/authMiddleware');
const { uploadFotosMiddleware } = require('../middlewares/uploadFotos');
const { v4: uuidv4 } = require('uuid');


const cloudinary = require('cloudinary').v2; // Importar Cloudinary

const router = express.Router();

// Verifica que los controladores sean funciones
console.log('Tipo de uploadExcel:', typeof uploadExcel); // Debería ser "function"
console.log('Tipo de multerErrorHandler:', typeof multerErrorHandler); // Debería ser "function"
console.log('Tipo de processExcel:', typeof excelController.processExcel); // Debería ser "function"
console.log('Tipo de subirFotos:', typeof excelController.subirFotos); // Debería ser "function"


// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: '154721198775314',
  api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk',
});

// Ruta POST para subir y procesar archivo Excel
router.post(
  '/upload-stock',
  verifyToken,         // Middleware para verificar el token
  uploadExcel,         // Middleware de multer
  multerErrorHandler,  // Middleware para manejar errores de multer
  excelController.processExcel // Controlador para procesar el archivo
);

// Ruta POST para subir fotos
router.post('/subir-fotos/:bienKey', uploadFotosMiddleware, async (req, res) => {
    const { bienKey } = req.params;
    console.log('BienKey recibido:', bienKey);
  
    try {
      const fotos = req.uploadedPhotos; // Fotos procesadas por el middleware
      console.log('Fotos cargadas correctamente:', fotos);
  
      if (!fotos || fotos.length === 0) {
        console.error('No se encontraron fotos después de la carga.');
        return res.status(400).json({ message: 'No se subieron fotos válidas.' });
      }
  
      res.status(200).json({ fotos });
    } catch (error) {
      console.error('Error al manejar las fotos cargadas:', error);
      res.status(500).json({ error: 'Error interno al procesar las fotos cargadas.' });
    }
  });
  


 // Usa el controlador 'finalizarCreacionBienes' para la ruta
router.post('/finalizar-creacion', verifyToken, excelController.finalizarCreacionBienes);


  
  
  

module.exports = router;
