const jwt = require("jsonwebtoken");
const config = require("../config/auth.config");
const { TokenExpiredError } = jwt;
const { Usuario } = require('../models');

const catchError = (err, res) => {
  if (res.headersSent) return;

  if (err instanceof TokenExpiredError) {
    return res.status(401).json({ message: "Unauthorized! Access Token está vencido!" });
  }

  return res.status(401).json({ message: "Unauthorized!" });
};

// 🔐 Mejorado verifyToken middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    console.log("🔑 Header recibido:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado o mal formado.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.secret);

    console.log("👤 Decoded:", decoded);

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

    req.user = {
      uuid: usuarioDB.uuid,
      email: usuarioDB.email,
      rolDefinitivo: usuarioDB.rolDefinitivo,
      empresaUuid: usuarioDB.empresa_uuid,
      rolEmpresa: usuarioDB.rolEmpresa,
      tipo: decoded.tipo, // ✅ ESTA LÍNEA AGREGA `tipo` CORRECTAMENTE
      delegadoDeEmpresa:
        usuarioDB.rolEmpresa === 'responsable' ? usuarioDB.empresa_uuid : null,
    };

    console.log("✅ Usuario autenticado:", req.user);
    next();

  } catch (error) {
    console.error('❌ Error en verifyToken:', error.message);
    return res.status(403).json({ message: 'Token inválido o expirado.', error: error.message });
  }
};



const verificarPermisos = (rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.user?.rolDefinitivo;

    console.log('🔐 Rol en verificarPermisos:', rol);
    console.log('🎯 Roles permitidos:', rolesPermitidos);

    if (!rol || typeof rol !== 'string') {
      return res.status(403).json({ message: 'No se pudo determinar el rol del usuario.' });
    }

    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        message: `No tienes permisos para realizar esta acción. Se requiere uno de: ${rolesPermitidos.join(', ')}`
      });
    }

    next();
  };
};


// middlewares/authPermisos.js
const puedeActivarDelegado = (req, res, next) => {
  const { rolDefinitivo, tipo, rolEmpresa } = req.user;

  const esAdmin = rolDefinitivo === 'admin';
  const esResponsable = tipo === 'juridica' && rolEmpresa === 'responsable';

  if (esAdmin || esResponsable) {
    console.log('✅ Permiso concedido para activar/desactivar delegados');
    return next();
  }

  console.warn('🚫 Permiso denegado. Usuario:', req.user);
  return res.status(403).json({
    message: 'No estás autorizado para activar o desactivar delegados.',
  });
};



const authJwt = {
  verifyToken,
  verificarPermisos,
  puedeActivarDelegado
};

module.exports = authJwt;
