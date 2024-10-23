const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Bien = require('../models/Bien');
const searchController = require('../controllers/searchController');

// Definición de rutas
router.get('/search', searchController.searchAll);

module.exports = router;
