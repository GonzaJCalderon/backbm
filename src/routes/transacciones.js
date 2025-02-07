const express = require('express');
const router = express.Router();
const transaccionesController = require('../controllers/transaccionesController');

const { verificarPermisos } = require('../middlewares/authMiddleware');
const { uploadFotosMiddleware } = require('../middlewares/uploadFotos');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { verifyToken } = require('../middlewares/authJwt');


// Registrar compra
// Ruta para registrar compra
router.post('/comprar', authMiddleware, verifyToken, uploadFotosMiddleware, transaccionesController.registrarCompra);

// Registrar venta

router.post('/vender', authMiddleware, verifyToken, uploadFotosVentaMiddleware, transaccionesController.registrarVenta);







// Obtener transacciones por bien
router.get('/bien/:id', transaccionesController.obtenerTransaccionesPorBien);

// Ruta para registrar una transacción
router.post('/', verifyToken, transaccionesController.registrarTransaccion);

// Ruta para obtener transacciones por usuario
router.get('/usuario/:uuid', verifyToken, transaccionesController.obtenerTransaccionesPorUsuario);


// Ruta para obtener transacciones por bien
router.get('/bien/:bienId', verifyToken, transaccionesController.obtenerTransaccionesPorBien);

// Ruta para eliminar una transacción
router.delete('/:id', verifyToken, verificarPermisos(['administrador']), transaccionesController.eliminarTransaccion);

module.exports = router;
