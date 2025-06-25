require('dotenv').config();
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const { Usuario } = require('../models');

// 🛡️ Middleware principal para validar token y extraer datos del usuario
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado o mal formado.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.secret);

    if (!decoded?.uuid) {
      return res.status(400).json({ message: 'El token no contiene UUID válido.' });
    }

    const usuarioDB = await Usuario.findOne({
      where: { uuid: decoded.uuid },
      attributes: ['uuid', 'email', 'rolDefinitivo', 'empresa_uuid', 'rolEmpresa']
    });

    if (!usuarioDB) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // ✅ Inyectar info actualizada del usuario en la request
    req.user = {
      uuid: usuarioDB.uuid,
      email: usuarioDB.email,
      rolDefinitivo: usuarioDB.rolDefinitivo,
      empresaUuid: usuarioDB.empresa_uuid,
      rolEmpresa: usuarioDB.rolEmpresa,
      delegadoDeEmpresa: usuarioDB.rolEmpresa === 'responsable' ? usuarioDB.empresa_uuid : null
    };

    next();
  } catch (error) {
    console.error('❌ Error en verifyToken:', error.message);
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};

// 🔐 Middleware para verificar si el usuario tiene un rol permitido
const verificarPermisos = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rolDefinitivo) {
      return res.status(403).json({ message: 'No se pudo determinar el rol del usuario.' });
    }

    if (!rolesPermitidos.includes(req.user.rolDefinitivo)) {
      return res.status(403).json({
        message: `No tienes permisos para esta acción. Roles válidos: ${rolesPermitidos.join(', ')}`,
      });
    }

    next();
  };
};

// Alias opcional si querés usar verifyToken como authMiddleware
const authMiddleware = verifyToken;

module.exports = {
  verifyToken,
  verificarPermisos,
  authMiddleware,
};
