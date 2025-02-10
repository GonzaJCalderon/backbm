const express = require('express');
const router = express.Router();
const { getData } = require('../controllers/renaperController');
const validateDocumentNumber = require('../middlewares/renaperMiddleware');




// Ruta que usa middleware y controlador
router.get('/:nroDoc', validateDocumentNumber, getData);

module.exports = router;