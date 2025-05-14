const express = require('express');
const router = express.Router();
const { searchAll, searchUsers  } = require('../controllers/searchController'); // Ajusta la ruta si el controlador está en otro directorio


// Define la ruta de búsqueda
// backend/routes/search.js
router.get('/all', searchAll);         // GET /search/all
router.get('/users', searchUsers);     // GET /search/users





module.exports = router;
