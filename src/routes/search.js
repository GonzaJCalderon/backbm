const express = require('express');
const router = express.Router();
const { searchAll } = require('../controllers/searchController'); // Ajusta la ruta si el controlador está en otro directorio

// Define la ruta de búsqueda
router.get('/', searchAll);



module.exports = router;
