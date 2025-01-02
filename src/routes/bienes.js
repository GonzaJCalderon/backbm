const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const Bien = require('../models/Bien');
const bienesController = require('../controllers/bienesController');
const transaccionesController = require('../controllers/transaccionesController');
const { verifyToken, verificarPermisos } = require('../middlewares/authMiddleware');
const { uploadFotosMiddleware, uploadFileToCloudinary } = require('../middlewares/uploadFotos');
const { v4: uuidv4 } = require('uuid');



// Obtener todos los bienes
router.get('/', bienesController.obtenerBienes);

// Crear un nuevo bien con fotos y stock inicial
router.post(
  '/add',
  verifyToken,
  uploadFotosMiddleware,
  bienesController.crearBien
);

// Obtener bienes filtrados por marca, tipo y modelo
router.get('/filtrados', bienesController.getBienesPorMarcaTipoModelo);

// Actualizar el stock de bienes por parámetros (tipo, marca, modelo)
router.put(
  '/actualizar-por-parametros',
  verifyToken,
  verificarPermisos(['administrador', 'usuario']),
  bienesController.actualizarStockPorParametros
);

// Inicializar stock
router.post('/inicializarStock', bienesController.inicializarStock);

// Obtener un bien por su ID
router.get('/:uuid', bienesController.obtenerBienPorUuid);


// Actualizar un bien por su ID
// Actualizar un bien por su UUID
router.put(
  '/:uuid', // Cambiado de :id a :uuid
  verifyToken,
  verificarPermisos(['admin', 'usuario']),
  bienesController.actualizarBien
);


// Eliminar un bien por su ID
router.delete('/:uuid', verifyToken, verificarPermisos(['admin']), bienesController.eliminarBien);



// Obtener bienes en stock
router.get('/stock', bienesController.obtenerBienesStock);

// Obtener la trazabilidad de un bien
router.get('/trazabilidad/:uuid', bienesController.obtenerTrazabilidadPorBien);

// Registrar una compra de bienes
router.post(
  '/comprar',
  verifyToken,
  uploadFotosMiddleware,
  transaccionesController.registrarCompra
);

// Obtener bienes relacionados con un usuario
router.get('/usuario/:uuid', verifyToken, bienesController.obtenerBienesPorUsuario);

// Actualizar stock por parámetros
router.post('/bienes/actualizarStock', bienesController.actualizarStockPorParametros);

// Registrar un modelo
router.post('/bienes/modelos', bienesController.registrarModelo);

// Registrar una marca
router.post('/bienes/marcas', bienesController.registrarMarca);

router.get('/bienes/marcas', verifyToken, bienesController.obtenerMarcas);


// Obtener modelos por tipo y marca
router.get('/bienes/modelos', verifyToken, bienesController.obtenerModelos);


module.exports = router;
