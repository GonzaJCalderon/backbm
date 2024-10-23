require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/Usuario'); // Ajusta el path según tu estructura
const router = express.Router();
const { loginUsuario } = require('../controllers/authController'); // Asegúrate de que esta ruta es correcta

// Secret Key para JWT
const SECRET_KEY = process.env.SECRET_KEY;

// Ruta de registro
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await Usuario.create({ email, password: hashedPassword });
        res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error registrando usuario', error });
    }
});

// Verifica si la función `loginUsuario` está siendo importada correctamente
console.log('loginUsuario function:', loginUsuario);

router.post('/login', loginUsuario);

module.exports = router;
