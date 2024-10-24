require('dotenv').config();
const jwt = require('jsonwebtoken');

// Obtén la clave secreta desde las variables de entorno
const SECRET_KEY = process.env.SECRET_KEY || 'bienes_muebles'; // Clave secreta para JWT

const verifyToken = (req, res, next) => {
    // El token debería estar en el header 'Authorization' con el prefijo 'Bearer '
    const authHeader = req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrae el token

    if (!token) return res.status(403).json({ message: 'Token no proporcionado' });

    try {
        // Verifica el token usando la clave secreta
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token inválido o expirado', error });
    }
};

module.exports = verifyToken;
