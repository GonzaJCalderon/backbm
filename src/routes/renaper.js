const express = require('express');
const router = express.Router();
const reanaperController = require('../controllers/renaperController');
const validateDocumentNumber = require('../middlewares/renaperMiddleware');




// Ruta que usa middleware y controlador
router.get('/:nroDoc', validateDocumentNumber, reanaperController.getData);

module.exports = router;