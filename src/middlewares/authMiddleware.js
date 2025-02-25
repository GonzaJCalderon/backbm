require('dotenv').config();
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config'); 
const { Usuario } = require('../models');


const verifyToken = (req, res, next) => {
  try {
    console.log('🟢 Verificando token...');

    const authHeader = req.headers['authorization'];
    console.log('🔍 Header recibido en backend:', authHeader);

    if (!authHeader) {
      console.warn('⚠️ No hay token en la solicitud.');
      return res.status(401).json({ message: 'Token no proporcionado.' });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.warn('⚠️ El token no tiene el formato correcto.');
      return res.status(400).json({ message: 'Formato de token inválido.' });
    }

    const token = authHeader.split(' ')[1];
    console.log('📌 Token limpio recibido:', token);

    // Intentar decodificar el token
    const decoded = jwt.verify(token, config.secret);
    console.log('✅ Token decodificado correctamente:', decoded);

    if (!decoded.uuid) {
      console.warn('⚠️ El token no contiene un UUID válido.');
      return res.status(400).json({ message: 'El token no contiene un UUID válido.' });
    }

    req.user = {
      uuid: decoded.uuid,
      rol: decoded.rol || 'usuario',
      email: decoded.email
    };

    console.log('✅ Usuario asignado en req.user:', req.user);
    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error.message);
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};





// Middleware para verificar permisos de rol
const verificarPermisos = (rolesPermitidos) => {
  return (req, res, next) => {
    console.log(`🔍 Verificando permisos para:`, req.user);

    if (!req.user || !req.user.rolDefinitivo) {
      console.warn('⚠️ No se pudo determinar el rol del usuario.');
      return res.status(403).json({ message: 'No se pudo determinar el rol del usuario.' });
    }

    console.log(`🔍 Rol detectado: ${req.user.rolDefinitivo}`);
    console.log(`🔍 Roles permitidos: ${rolesPermitidos}`);

    if (!rolesPermitidos.includes(req.user.rolDefinitivo)) {
      console.error(`⛔ Acceso denegado. Rol ${req.user.rolDefinitivo} no permitido.`);
      return res.status(403).json({
        message: `No tienes permisos. Roles permitidos: ${rolesPermitidos.join(', ')}`
      });
    }

    console.log(`✅ Acceso permitido para el rol: ${req.user.rolDefinitivo}`);
    next();
  };
};






// Middleware para verificar el token en todas las rutas protegidas
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.warn('⚠️ No autorizado. Token no proporcionado.');
      return res.status(403).json({ message: 'No autorizado. Token no proporcionado.' });
    }

    // Validar que el token esté en el formato correcto
    if (!authHeader.startsWith("Bearer ")) {
      console.warn('⚠️ Token malformado.');
      return res.status(400).json({ message: 'Formato de token inválido.' });
    }

    const token = authHeader.split(' ')[1];

    const decodedToken = jwt.verify(token, config.secret); // 🔹 Usa SIEMPRE config.secret

    console.log('✅ Token decodificado:', decodedToken);

    req.user = decodedToken; // Asigna el usuario decodificado al request

    next();
  } catch (error) {
    console.error('❌ Error al verificar el token:', error.message);
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};


module.exports = { verifyToken, verificarPermisos,authMiddleware };
