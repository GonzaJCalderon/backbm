const express = require('express');
const router = express.Router();
const historialCambiosController = require('../controllers/historialCambiosController');

// Ruta para obtener historial de cambios
router.get('/historial-cambios/:uuid', historialCambiosController.getHistorialCambios);

module.exports = router;
