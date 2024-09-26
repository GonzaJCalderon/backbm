const express = require('express');
const router = express.Router();
const { Transaccion } = require('../models'); 
const { Usuario } = require('../models'); 
const bienesController = require('../controllers/bienesController');
const { obtenerTransaccionesPorUsuario } = require('../controllers/bienesController');
const verifyToken = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = require('../config/multerConfig'); 



// Ruta para obtener todos los bienes
router.get('/', bienesController.obtenerBienes);

// Ruta para crear un nuevo bien
router.post('/', verifyToken, bienesController.crearBien);

// Ruta para obtener un bien por su ID
router.get('/:id', bienesController.obtenerBienPorId);

// Ruta para registrar una transacción (compra/venta)
router.post('/transaccion', verifyToken, bienesController.registrarTransaccion);

// Ruta para actualizar un bien por su ID
router.put('/:id', verifyToken, bienesController.actualizarBien);

// Ruta para eliminar un bien por su ID
router.delete('/:id', verifyToken, bienesController.eliminarBien);

// Ruta para subir y procesar el archivo Excel
router.post('/subir-stock', upload.single('archivoExcel'), bienesController.subirStockExcel);

// Ruta para obtener transacciones por ID de bien
router.get('/transacciones/bien/:id', bienesController.obtenerTransaccionesPorBien);


router.get('/trazabilidad/:uuid',  bienesController.obtenerTrazabilidadPorBien); // Cambia bienId a uuid


// Ruta para obtener transacciones por ID de usuario
// Ruta para obtener transacciones por ID de usuario
router.get('/transacciones/usuario/:userId', bienesController.obtenerTransaccionesPorUsuario);


// Ruta para obtener el stock de bienes de un usuario
router.get('/usuario/:userId/stock', verifyToken, bienesController.obtenerBienesDisponibles);

// Ruta para registrar una compra
router.post('/comprar', verifyToken, bienesController.registrarCompra);

// Ruta para obtener bienes en stock
router.get('/stock', bienesController.obtenerBienesStock);

// Ruta para registrar una venta
router.post('/vender', verifyToken, bienesController.registrarVenta);




module.exports = router;
