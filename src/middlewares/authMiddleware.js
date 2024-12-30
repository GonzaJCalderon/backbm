require('dotenv').config();
const jwt = require('jsonwebtoken');

// Obtén la clave secreta desde las variables de entorno
const SECRET_KEY = process.env.SECRET_KEY || 'bienes_muebles'; // Clave secreta para JWT

// Middleware para verificar el token
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado.' });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    console.log('Token decodificado completo:', decoded); // Verifica aquí que el campo rol exista

    req.user = decoded; // Guarda el token completo en req.user
    next();
  } catch (error) {
    console.error('Error al verificar token:', error.message);
    res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};





// Middleware para verificar permisos de rol
const verificarPermisos = (rolesPermitidos) => {
  return (req, res, next) => {
    const { rol } = req.user || {}; // Cambiar rolDefinitivo a rol
    console.log(`Token decodificado:`, req.user);
    console.log(`Rol detectado: ${rol}`);
    console.log(`Roles permitidos: ${rolesPermitidos}`);

    if (!rol) {
      return res.status(403).json({ message: 'No se pudo determinar el rol del usuario.' });
    }

    if (!rolesPermitidos.includes(rol)) {
      console.error(`Acceso denegado. Rol ${rol} no está permitido.`);
      return res.status(403).json({
        message: `No tienes permisos para realizar esta acción. Roles permitidos: ${rolesPermitidos.join(', ')}`,
      });
    }

    console.log(`Acceso permitido para el rol: ${rol}`);
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
