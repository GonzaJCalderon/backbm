require('dotenv').config();
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config'); 

const SECRET_KEY = process.env.SECRET_KEY || 'bienes_muebles'; // Clave secreta para JWT

// Middleware para verificar el token

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado.' });
    }

    const decoded = jwt.verify(token, config.secret); // Usamos config.secret aquí

    if (!decoded.uuid) {
      return res.status(400).json({ message: 'El token no contiene un UUID válido.' });
    }

    console.log('Token decodificado completo:', decoded);

    req.user = {
      uuid: decoded.uuid,
      rol: decoded.rol || 'usuario'
    };

    next();
  } catch (error) {
    console.error('Error al verificar token:', error.message);
    res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};




// Middleware para verificar permisos de rol
const verificarPermisos = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(403).json({ message: 'No se pudo determinar el rol del usuario.' });
    }

    console.log(`Token decodificado:`, req.user);
    console.log(`Rol detectado: ${req.user.rol}`);
    console.log(`Roles permitidos: ${rolesPermitidos}`);

    if (!rolesPermitidos.includes(req.user.rol)) {
      console.error(`Acceso denegado. Rol ${req.user.rol} no está permitido.`);
      return res.status(403).json({
        message: `No tienes permisos para realizar esta acción. Roles permitidos: ${rolesPermitidos.join(', ')}`,
      });
    }

    console.log(`Acceso permitido para el rol: ${req.user.rol}`);
    next();
  };
};





const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(403).json({ message: 'No autorizado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY || 'bienes_muebles');

    req.user = decodedToken; // Incluye el `uuid` del usuario en `req.user`
    console.log('Token decodificado:', decodedToken);

    next();
  } catch (error) {
    console.error('Error al verificar el token:', error.message);
    res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};







module.exports = { verifyToken, verificarPermisos,authMiddleware };
