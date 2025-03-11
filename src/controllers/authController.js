const Usuario = require('../models/Usuario'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { validarCamposRequeridos } = require('../utils/validationUtils'); 
const config = require('../config/auth.config');

const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    console.log('📥 Datos recibidos en el backend:', { email, password });

    try {
        // Buscar usuario por email
        const user = await Usuario.findOne({ where: { email } });

        console.log('🔍 Usuario encontrado en la base de datos:', user ? user.toJSON() : 'No encontrado');

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Validar la contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        console.log('🔍 Verificando rolDefinitivo:', user.rolDefinitivo);

        // 🚀 Si `rolDefinitivo` es `NULL`, asignamos un valor por defecto
        if (!user.rolDefinitivo) {
            console.warn('⚠️ Usuario sin rol definido, asignando "usuario" por defecto');
            user.rolDefinitivo = 'usuario';
        }

        // ✅ Enviar la contraseña en la respuesta (como texto plano o encriptada)
        const responseUser = {
            uuid: user.uuid,
            email: user.email,
            nombre: user.nombre,
            apellido: user.apellido,
            direccion: user.direccion,
            rolDefinitivo: user.rolDefinitivo,
            dni: user.dni,
            password: password, // ✅ Ahora enviamos la contraseña real en la respuesta
        };

        // Generar token con rolDefinitivo
        const token = jwt.sign(
            {
                uuid: user.uuid,
                email: user.email,
                rolDefinitivo: user.rolDefinitivo // Incluye el rol en el token
            },
            config.secret,
            { expiresIn: config.jwtExpiration }
        );

        console.log('✅ Respuesta final del backend:', { usuario: responseUser, token });
        res.json({ usuario: responseUser, token });

    } catch (error) {
        console.error('❌ Error en el backend:', error);
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};



module.exports = { loginUsuario };
