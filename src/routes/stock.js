const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/bienes-stock', stockController.obtenerBienesStock);
router.post('/bienes', stockController.crearBien);
router.post('/transacciones', stockController.registrarTransaccion);
router.get('/bienes/:id', stockController.obtenerBienPorId);
router.put('/bienes/:id', stockController.actualizarBien);
router.delete('/bienes/:id', stockController.eliminarBien);
// routes/stockRoutes.js
router.get('/bienes/:vendedorId', stockController.obtenerBienesPorVendedor);


module.exports = router;
