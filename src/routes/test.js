const express = require('express');
const router = express.Router();
const testController = require('../controllers/catotoController');


// Middleware de ejemplo (puedes añadir más lógica aquí)
// const exampleMiddleware = require('../middlewares/exampleMiddleware');

// Ruta que usa middleware y controlador
router.get('/', testController.saludoCatoto);



module.exports = router;
