const Usuario = require('../models/Usuario'); // Modelo de usuario
const bcrypt = require('bcryptjs'); // Para comparar contraseñas
const jwt = require('jsonwebtoken'); // Para generar tokens
const { validarCamposRequeridos } = require('../utils/validationUtils'); // Validación

const SECRET_KEY = process.env.SECRET_KEY || 'bienes_muebles'; // Clave secreta para JWT

const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    // Validar campos requeridos
    const error = validarCamposRequeridos(['email', 'password'], req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    console.log('Datos recibidos en el backend:', { email, password });

    try {
        // Buscar usuario por email
        const user = await Usuario.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Validar la contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Construir respuesta del usuario
        const responseUser = {
            uuid: user.uuid, // ✅ Asegurar uso de uuid
            email: user.email,
            nombre: user.nombre,
            apellido: user.apellido,
            direccion: user.direccion,
            rolDefinitivo: user.rolDefinitivo,
            dni: user.dni,
        };

        // ✅ Generar token con uuid y rol
        const token = jwt.sign(
            { 
                uuid: user.uuid,  // ✅ Usar uuid en lugar de id
                email: user.email, 
                rol: user.rolDefinitivo // ✅ Incluir rol en el token
            }, 
            SECRET_KEY, 
            { expiresIn: '4h' } // Token expira en 4 horas
        );

        console.log('Respuesta final del backend:', { usuario: responseUser, token });
        res.json({ usuario: responseUser, token });
    } catch (error) {
        console.error('Error en el backend:', error);
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};

module.exports = { loginUsuario };
