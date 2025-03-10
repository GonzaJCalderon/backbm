const express = require('express');
const router = express.Router();
const { searchAll, searchUsers  } = require('../controllers/searchController'); // Ajusta la ruta si el controlador está en otro directorio

// Define la ruta de búsqueda
router.get('/', searchAll);

router.get('/search', searchUsers);

module.exports = router;
