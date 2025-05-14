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

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: 'Token no proporcionado o mal formado.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.secret);

    console.log('🧾 Decoded token:', decoded);

    let user = null;

    const requiredFields = ['rolDefinitivo', 'tipo', 'empresaUuid', 'rolEmpresa'];
    const faltanCampos = requiredFields.some(field => !decoded[field]);

    if (faltanCampos) {
      console.warn('⚠️ Faltan campos en el token, se buscan desde la DB');

      const usuario = await Usuario.findOne({
        where: { uuid: decoded.uuid },
        attributes: ['uuid', 'email', 'rolDefinitivo', 'tipo', 'empresa_uuid', 'rolEmpresa'],
      });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado en la DB' });
      }

      user = {
        uuid: usuario.uuid,
        email: usuario.email,
        rolDefinitivo: usuario.rolDefinitivo,
        tipo: usuario.tipo,
        empresaUuid: usuario.empresa_uuid,
        rolEmpresa: usuario.rolEmpresa,
      };

    } else {
      user = {
        uuid: decoded.uuid,
        email: decoded.email,
        rolDefinitivo: decoded.rolDefinitivo,
        tipo: decoded.tipo,
        empresaUuid: decoded.empresaUuid,
        rolEmpresa: decoded.rolEmpresa,
      };
    }

    console.log('✅ Usuario final del middleware:', user);

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Error en verifyToken:', err);
  
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expirado.' }); // ⚠️ CLAVE: debe ser 401, no 403
    }
  
    return res.status(401).json({ message: 'Token inválido.' });
  }
  
};

const verificarPermisos = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rolDefinitivo) {
      return res.status(403).json({ message: 'No se pudo determinar el rol del usuario.' });
    }

    if (!rolesPermitidos.includes(req.user.rolDefinitivo)) {
      return res.status(403).json({
        message: `No tienes permisos para realizar esta acción. Roles permitidos: ${rolesPermitidos.join(', ')}`
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
