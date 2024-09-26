const Usuario = require('../models/Usuario'); // Importa tu modelo de usuario
const bcrypt = require('bcryptjs'); // Importa bcrypt para la verificación de contraseñas
const jwt = require('jsonwebtoken'); // Importa jwt para la generación de tokens

const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key'; // Clave secreta para JWT

const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    console.log('Datos recibidos en el backend:', { email, password });

    try {
        const user = await Usuario.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Crear la respuesta del usuario sin `rolTemporal`
        const responseUser = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            apellido: user.apellido,
            direccion: user.direccion,
            rolDefinitivo: user.rolDefinitivo,
            tipo: user.tipo,
            cuit: user.cuit,  // Incluye el CUIT
            dni: user.dni, 
        };

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

        console.log('Respuesta final del backend:', { usuario: responseUser, token });
        res.json({ usuario: responseUser, token });
    } catch (error) {
        console.error('Error en el backend:', error);
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};

module.exports = { loginUsuario };
