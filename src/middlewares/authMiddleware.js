require('dotenv').config(); 
const jwt = require('jsonwebtoken');

// Obtén la clave secreta desde las variables de entorno
const SECRET_KEY = process.env.SECRET_KEY || 'bienes_muebles'; // Clave secreta para JWT

// Middleware para verificar el token
const verifyToken = (req, res, next) => {
    console.log("Encabezados:", req.headers); // Muestra todos los encabezados

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(403).json({ message: 'Token no proporcionado' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log("Usuario decodificado:", decoded); // Muestra el payload decodificado
        req.user = decoded; // Adjunta la info del usuario al req
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token inválido o expirado', error: error.message });
    }
};



// Middleware para verificar permisos de rol
const verificarPermisos = (rolesPermitidos) => {
    return (req, res, next) => {
        const { rolDefinitivo } = req.user; // Debe extraer correctamente rolDefinitivo
        console.log("Rol del usuario:", rolDefinitivo); // Para ver el rol en la consola

        if (!rolesPermitidos.includes(rolDefinitivo)) {
            return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
        }
        next();
    };
};



module.exports = { verifyToken, verificarPermisos };
