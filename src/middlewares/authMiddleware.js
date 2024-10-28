require('dotenv').config(); 
const jwt = require('jsonwebtoken');

// Obtén la clave secreta desde las variables de entorno
const SECRET_KEY = process.env.SECRET_KEY || 'bienes_muebles'; // Clave secreta para JWT

// Middleware para verificar el token
const verifyToken = (req, res, next) => {
    // El token debería estar en el header 'Authorization' con el prefijo 'Bearer '
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrae el token

    if (!token) return res.status(403).json({ message: 'Token no proporcionado' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Adjunta la info del usuario al req
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token inválido o expirado', error: error.message });
    }
};

// Middleware para verificar permisos de rol
const verificarPermisos = (rolesPermitidos) => {
    return (req, res, next) => {
        const { rolDefinitivo } = req.user; // Usa req.user adjuntado en verifyToken
        if (!rolesPermitidos.includes(rolDefinitivo)) {
            return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
        }
        next();
    };
};

module.exports = { verifyToken, verificarPermisos };
