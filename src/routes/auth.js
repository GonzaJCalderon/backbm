require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/Usuario'); // Ajusta el path según tu estructura
const { loginUsuario } = require('../controllers/authController'); // Asegúrate de que esta ruta es correcta
const { validarCamposRequeridos } = require('../utils/validationUtils'); // Función para validar campos requeridos
const router = express.Router();

// Verificar que la clave JWT esté configurada
if (!process.env.SECRET_KEY) {
    console.error('SECRET_KEY no configurado. Revisa tu archivo .env.');
    process.exit(1);
}

const SECRET_KEY = process.env.SECRET_KEY;

// Ruta de registro
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    // Validar campos requeridos
    const error = validarCamposRequeridos(['email', 'password'], req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el usuario
        const newUser = await Usuario.create({ email, password: hashedPassword });
        res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Error registrando usuario', error: error.message });
    }
});

// Ruta de login
router.post('/login', loginUsuario);

module.exports = router;
