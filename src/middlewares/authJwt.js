const jwt = require("jsonwebtoken");
const config = require("../config/auth.config");
const { TokenExpiredError } = jwt;
const { Usuario } = require('../models');
// Importa el modelo de usuario

const catchError = (err, res) => {
  if (res.headersSent) return; // Evita múltiples respuestas

  if (err instanceof TokenExpiredError) {
    return res.status(401).json({ message: "Unauthorized! Access Token está vencido!" });
  }

  return res.status(401).json({ message: "Unauthorized!" });
};

const verifyToken = async (req, res, next) => {
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

    // Decodificar el token
    const decoded = jwt.verify(token, config.secret);
    console.log('✅ Token decodificado correctamente:', decoded);

    if (!decoded.uuid) {
      console.warn('⚠️ El token no contiene un UUID válido.');
      return res.status(400).json({ message: 'El token no contiene un UUID válido.' });
    }

    // 🔥 Asegurar que `rolDefinitivo` está presente
    if (!decoded.rolDefinitivo) {
      console.warn('⚠️ `rolDefinitivo` no está en el token, obteniendo desde BD...');

      // Buscar al usuario en la base de datos si el token no tiene `rolDefinitivo`
      const usuario = await Usuario.findOne({ where: { uuid: decoded.uuid } });

      if (!usuario) {
        console.error('❌ ERROR: Usuario no encontrado en la BD.');
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      console.log(`✅ Usuario encontrado en la BD: ${usuario.nombre} ${usuario.apellido}, rol: ${usuario.rolDefinitivo}`);

      // Si el usuario tampoco tiene rol en la BD, asignar uno por defecto
      const rolAsignado = usuario.rolDefinitivo || 'usuario';
      console.log(`🔄 Asignando rol por defecto: ${rolAsignado}`);

      req.user = {
        uuid: usuario.uuid,
        rolDefinitivo: rolAsignado,
        email: usuario.email
      };
    } else {
      req.user = {
        uuid: decoded.uuid,
        rolDefinitivo: decoded.rolDefinitivo,
        email: decoded.email
      };
    }

    console.log('✅ Usuario asignado en req.user:', req.user);
    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error.message);
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};

const verificarPermisos = (rolesPermitidos) => {
  return (req, res, next) => {
    console.log(`🔍 Verificando permisos para usuario:`, req.user);

    if (!req.user || !req.user.rolDefinitivo) {
      console.warn('⚠️ No se pudo determinar el rol del usuario.');
      return res.status(403).json({ message: 'No se pudo determinar el rol del usuario.' });
    }

    console.log(`🔍 Rol detectado: ${req.user.rolDefinitivo}`);
    console.log(`🔍 Roles permitidos: ${rolesPermitidos}`);

    if (!rolesPermitidos.includes(req.user.rolDefinitivo)) {
      console.error(`⛔ Acceso denegado. Rol ${req.user.rolDefinitivo} no está permitido.`);
      return res.status(403).json({
        message: `No tienes permisos para realizar esta acción. Roles permitidos: ${rolesPermitidos.join(', ')}`
      });
    }

    console.log(`✅ Acceso permitido para el rol: ${req.user.rolDefinitivo}`);
    next();
  };
};

const authJwt = {
  verifyToken,
  verificarPermisos
};

module.exports = authJwt;
