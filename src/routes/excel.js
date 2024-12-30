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
  



router.post('/finalizar-creacion', verifyToken, async (req, res) => {
  const { bienes } = req.body;
  console.log('Procesando creación de bienes:', bienes);

  try {
      const transaction = await sequelize.transaction();

      for (const bien of bienes) {
          // Crear el bien
          const nuevoBien = await Bien.create({
              tipo: bien.tipo,
              descripcion: bien.descripcion,
              precio: bien.precio,
              marca: bien.marca,
              modelo: bien.modelo,
              fotos: bien.fotos, // Fotos subidas
              propietario_uuid: req.user.uuid,
          }, { transaction });

          console.log('Bien creado:', nuevoBien);

          // Crear el registro de stock
          const stock = await Stock.create({
              bien_uuid: nuevoBien.uuid,
              cantidad: bien.cantidadStock,
              usuario_uuid: req.user.uuid,
          }, { transaction });

          console.log('Stock creado:', stock);

          // Generar identificadores únicos para cada bien
          const identificadores = [];
          for (let i = 0; i < bien.cantidadStock; i++) {
              identificadores.push({
                  bien_uuid: nuevoBien.uuid,
                  identificador_unico: `${bien.tipo.toUpperCase()}-${uuidv4()}`,
              });
          }

          // Insertar los identificadores en la tabla DetallesBien
          await DetallesBien.bulkCreate(identificadores, { transaction });
          console.log('Identificadores creados:', identificadores);
      }

      await transaction.commit();
      res.status(201).json({ message: 'Bienes creados exitosamente.' });
  } catch (error) {
      console.error('Error al finalizar creación de bienes:', error);
      res.status(500).json({ message: 'Error al registrar los bienes.', detalles: error.message });
  }
});

module.exports = router;
