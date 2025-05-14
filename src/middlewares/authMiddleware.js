require('dotenv').config();
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config'); 
const { Usuario } = require('../models');


const verifyToken = (req, res, next) => {
  try {

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ message: 'Token no proporcionado.' });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ message: 'Formato de token inválido.' });
    }

    const token = authHeader.split(' ')[1];

    // Intentar decodificar el token
    const decoded = jwt.verify(token, config.secret);

    if (!decoded.uuid) {
      return res.status(400).json({ message: 'El token no contiene un UUID válido.' });
    }

    req.user = {
      uuid: decoded.uuid,
      rolDefinitivo: decoded.rolDefinitivo,
      email: decoded.email
    };

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};





// Middleware para verificar permisos de rol
const verificarPermisos = (rolesPermitidos) => {
  return (req, res, next) => {

    if (!req.user || !req.user.rolDefinitivo) {
      return res.status(403).json({ message: 'No se pudo determinar el rol del usuario.' });
    }


    if (!rolesPermitidos.includes(req.user.rolDefinitivo)) {
      return res.status(403).json({
        message: `No tienes permisos. Roles permitidos: ${rolesPermitidos.join(', ')}`
      });
    }

    next();
  };
};






// Middleware para verificar el token en todas las rutas protegidas
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(403).json({ message: 'No autorizado. Token no proporcionado.' });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ message: 'Formato de token inválido.' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, config.secret);

    // 🔍 Buscar el usuario completo desde DB (para obtener empresa_uuid, rolEmpresa, etc.)
    const usuarioDB = await Usuario.findOne({ where: { uuid: decodedToken.uuid } });

    if (!usuarioDB) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // ✅ Inyectar datos del token + datos extendidos (como empresa_uuid y rolEmpresa)
    req.user = {
      ...decodedToken,
      empresaUuid: usuarioDB.empresa_uuid,
      rolEmpresa: usuarioDB.rolEmpresa,
      delegadoDeEmpresa: usuarioDB.rolEmpresa === 'responsable' ? usuarioDB.empresa_uuid : null
    };

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};



module.exports = { verifyToken, verificarPermisos,authMiddleware };
