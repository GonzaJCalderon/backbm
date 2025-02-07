const Usuario = require('../models/Usuario'); // Importa tu modelo de usuario
const bcrypt = require('bcryptjs'); // Importa bcrypt para la verificación de contraseñas
const jwt = require('jsonwebtoken'); // Importa jwt para la generación de tokens
const { validarCamposRequeridos } = require('../utils/validationUtils'); // Importa la función de validación
const config = require('../config/auth.config');



const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    // Validar campos requeridos
    const error = validarCamposRequeridos(['email', 'password'], req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    console.log('Datos recibidos en el backend:', { email, password });

    try {
        // Buscar el usuario por email
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
            uuid: user.uuid, // Cambiado de `id` a `uuid` para consistencia
            email: user.email,
            nombre: user.nombre,
            apellido: user.apellido,
            direccion: user.direccion,
            rolDefinitivo: user.rolDefinitivo,
            dni: user.dni, // Asegúrate de que este valor esté disponible en el modelo y la base de datos
        };

        // Generar token con rolDefinitivo
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                rolDefinitivo: user.rolDefinitivo // Incluye el rol en el token
            },
            config.secret,
            { expiresIn: config.jwtExpiration } // Expiración del token
        );

        console.log('Respuesta final del backend:', { usuario: responseUser, token });
        res.json({ usuario: responseUser, token });
    } catch (error) {
        console.error('Error en el backend:', error);
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};

module.exports = { loginUsuario };
