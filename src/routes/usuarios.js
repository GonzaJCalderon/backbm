const express = require('express');
const router = express.Router();
const { Usuario, Empresa } = require('../models'); // Ajusta la ruta según tu estructura de archivos
const jwt = require('jsonwebtoken'); // Importación necesaria
const bcrypt = require('bcryptjs');

require('dotenv').config();




const usuarioController = require('../controllers/usuariosController');
const { validarCampos } = require('../utils/validationUtils');
const { verifyToken, verificarPermisos, puedeActivarDelegado } = require('../middlewares/authJwt');
const { verificarEmpresaJuridica } = require('../middlewares/authTipo');

const secretKey = process.env.SECRET_KEY || 'bienes_muebles'; // Usa la clave secreta de .env



// Rutas de usuario
// Rutas de usuario
router.post(
  '/register',
  validarCampos(), // sin parámetros ahora
  usuarioController.crearUsuario
);



router.post('/login', usuarioController.login);

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET_KEY || 'refresh_bienes'
    );

    const usuario = await Usuario.findOne({ where: { uuid: decoded.uuid } });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado para refrescar token.' });
    }

    // ✅ Payload con datos completos
    const payload = {
      uuid: usuario.uuid,
      email: usuario.email,
      tipo: usuario.tipo,
      rolDefinitivo: usuario.rolDefinitivo,
      empresaUuid: usuario.empresa_uuid || null,
      rolEmpresa: usuario.rolEmpresa || null,
    };

    // ⏱ Access token corto (ej: 30 minutos)
    const newAccessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'bienes_muebles',
      { expiresIn: '30m' }
    );

    // 🔁 Nuevo refresh token (rotado)
    const newRefreshToken = jwt.sign(
      { uuid: usuario.uuid },
      process.env.REFRESH_SECRET_KEY || 'refresh_bienes',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error('❌ Error verificando refresh token:', error);
    return res.status(403).json({ message: 'Refresh token inválido o expirado.' });
  }
});





router.get(
  '/',
  verifyToken,
  verificarPermisos(['admin']), // Solo usuarios con rol "admin" pueden acceder
  usuarioController.obtenerUsuarios
);

router.get('/usuarios', verifyToken, verificarPermisos(['admin', 'moderador']), async (req, res) => {
  const { nombre, email, dni, estado, page = 1, limit = 10 } = req.query;

  try {
    const whereClause = {};

    if (nombre) whereClause.nombre = { [Op.like]: `%${nombre}%` };
    if (email) whereClause.email = { [Op.like]: `%${email}%` };
    if (dni) whereClause.dni = dni;
    if (estado) whereClause.estado = estado;

    const offset = (page - 1) * limit;
    const usuarios = await Usuario.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      total: usuarios.count,
      data: usuarios.rows,
      page,
      pages: Math.ceil(usuarios.count / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al filtrar usuarios.' });
  }
});
// Ruta para obtener usuarios aprobados
router.get('/aprobados', async (req, res) => {
  
  req.query.estado = 'aprobado'; // Filtro correcto
  await usuarioController.obtenerUsuariosPorEstado(req, res);
});

router.get('/historial-cambios', async (req, res) => {
  try {
    const historial = await HistorialCambios.findAll({ order: [['fecha', 'DESC']] });
    res.status(200).json(historial);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial.' });
  }
});

router.get('/dni', verifyToken, verificarPermisos(['admin', 'moderador']), usuarioController.obtenerUsuarioPorDni);

router.post('/register-usuario-por-tercero', usuarioController.registerUsuarioPorTercero);

router.post('/registrar-delegado', verifyToken, verificarEmpresaJuridica, usuarioController.registrarDelegadoEmpresa);



router.post('/update-account/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword, nombre, apellido } = req.body;


  try {
    // Verificamos el token recibido
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    // IMPORTANTE: El token tiene userUuid en vez de id
     const usuario = await Usuario.findOne({ where: { uuid: decoded.uuid } });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (usuario.estado === 'pendiente') {
    }

    // Actualizar los datos del usuario
    if (newPassword) {
      usuario.password = bcrypt.hashSync(newPassword, 10);
    }
    if (nombre) {
      usuario.nombre = nombre;
    }
    if (apellido) {
      usuario.apellido = apellido;
    }

    // Mantenemos el estado como 'pendiente'
    usuario.estado = 'pendiente';

    await usuario.save();

    return res.json({ mensaje: 'Cuenta actualizada exitosamente. El estado sigue siendo pendiente.' });
  } catch (error) {
    return res.status(400).json({ mensaje: 'Token inválido o expirado.' });
  }
});

router.get('/usuarios/pendientes', verifyToken, verificarPermisos(['admin', 'moderador']), (req, res) => {
  req.query.estado = 'pendiente';
  usuarioController.obtenerUsuariosPorEstado(req, res);
});

router.get('/usuarios/rechazados', verifyToken, verificarPermisos(['admin', 'moderador']), (req, res) => {
  req.query.estado = 'rechazado';
  usuarioController.obtenerUsuariosPorEstado(req, res);
});
// routes/usuarios.js

router.get('/detalles', verifyToken, verificarPermisos(['admin', 'moderador']), usuarioController.obtenerUsuarioDetalles);


router.get('/compradores', verifyToken, verificarPermisos(['admin', 'moderador']), usuarioController.obtenerCompradores);

router.put('/:uuid', verifyToken, verificarPermisos(['admin', 'usuario']), usuarioController.actualizarUsuario);

router.delete('/:uuid', verifyToken, verificarPermisos(['admin']), usuarioController.eliminarUsuario);

router.put('/:uuid/rolTemporal', verifyToken, verificarPermisos(['admin']), usuarioController.asignarRolTemporal);

router.get('/:uuid/rolTemporal', verifyToken, verificarPermisos(['admin', 'moderador']), usuarioController.obtenerRolTemporal);

router.delete('/:uuid/rolTemporal', verifyToken, verificarPermisos(['admin']), usuarioController.removerRolTemporal);

// Ruta para solicitar el reseteo de contraseña
router.post('/forgot-password', usuarioController.solicitarResetPassword);
router.get('/reset-password/:token', (req, res) => {
  res.send('Ruta de reset de contraseña accesible.'); 
});


// Ruta para confirmar el cambio de contraseña
router.post('/reset-password/:token', usuarioController.resetPassword)

router.put('/:uuid/aprobar', verifyToken, verificarPermisos(['admin']), async (req, res) => {

  if (!req.body.aprobadoPor || !req.body.aprobadoPorNombre) {
    return res.status(400).json({ message: 'Los campos aprobadoPor y aprobadoPorNombre son obligatorios.' });
  }

  req.body.estado = 'aprobado';
  req.body.fechaAprobacion = req.body.fechaAprobacion || new Date().toISOString();

  await usuarioController.cambiarEstadoUsuario(req, res);
});


// Ruta para rechazar un usuario
router.put('/:uuid/rechazar', verifyToken, verificarPermisos(['admin']), async (req, res) => {
  const { motivoRechazo } = req.body;

  if (!motivoRechazo) {
    return res.status(400).json({ message: 'El motivo del rechazo es obligatorio.' });
  }

  req.body.estado = 'rechazado';
  req.body.fechaRechazo = new Date().toISOString();
  req.body.rechazadoPor = req.user?.uuid; // Usuario autenticado que rechaza al usuario

  await usuarioController.cambiarEstadoUsuario(req, res);
});

// Ruta para actualizar el rol del usuario
router.patch('/usuarios/:uuid/rol', usuarioController.actualizarRolUsuario);

router.patch('/usuarios/:uuid/estado', usuarioController.cambiarEstadoUsuario);

router.patch('/usuarios/:uuid', usuarioController.actualizarUsuario);

router.put('/:uuid/reintentar', usuarioController.reintentarRegistro);


router.post('/check', usuarioController.checkExistingUser);

router.get('/:uuid/stock', verifyToken, verificarPermisos(['admin', 'usuario']), async (req, res) => {
  const { id } = req.params;

  try {
    const stocks = await StockUsuario.findAll({
      where: { usuarioId: id },
      include: [{ model: Bien, as: 'bien' }],
    });

    res.status(200).json({
      success: true,
      stocks,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
});

router.put('/:uuid/stock', verifyToken, verificarPermisos(['admin']), async (req, res) => {
  const { id } = req.params;
  const { bienId, cantidad } = req.body;

  try {
    const stock = await StockUsuario.findOne({
      where: { usuarioId: id, bienId },
    });

    if (!stock) {
      return res.status(404).json({ error: 'Stock no encontrado.' });
    }

    stock.cantidad = cantidad;
    await stock.save();

    res.status(200).json({
      success: true,
      message: 'Stock actualizado con éxito.',
      stock,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
});

// Ruta para reenviar datos de usuario rechazado
// Ruta para reenviar datos de usuario rechazado
router.put('/:uuid/reenviar', async (req, res) => {
  const { uuid } = req.params;
  const { nombre, apellido, email, dni } = req.body;

  if (!nombre || !apellido || !email || !dni) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  try {
    const usuario = await Usuario.findOne({ where: { uuid } });

    if (!usuario || usuario.estado !== 'rechazado') {
      return res.status(404).json({ message: 'El usuario no está en estado rechazado o no existe.' });
    }

    // Actualizar datos del usuario
    usuario.nombre = nombre;
    usuario.apellido = apellido;
    usuario.email = email;
    usuario.dni = dni;
    usuario.estado = 'pendiente_revision'; // Cambiar estado para reingreso
    usuario.fechaReenvio = new Date();

    await usuario.save();

    // Generar token y enlace
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ uuid: usuario.uuid }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const updateAccountLink = `${process.env.FRONTEND_URL}/update-account/${token}`;

    // Enviar correo
    const enviarCorreo = require('../utils/enviarCorreo');
    const subject = 'Solicitud de actualización de cuenta rechazada';
    const text = `
        Hola ${nombre},

        Tu solicitud de registro fue rechazada debido a que algunos datos no cumplían con los requisitos.

        Por favor, haz clic en el siguiente enlace para actualizar tu información:
        ${updateAccountLink}

        Atentamente,
        El equipo de Bienes Muebles.
      `;
    const html = `
        <p>Hola ${nombre},</p>
        <p>Tu solicitud de registro fue rechazada debido a que algunos datos no cumplían con los requisitos.</p>
        <p>Por favor, haz clic en el siguiente enlace para actualizar tu información:</p>
        <a href="${updateAccountLink}" style="color: blue; font-weight: bold;">Actualizar Cuenta</a>
        <p>Atentamente,<br>El equipo de Bienes Muebles.</p>
      `;

    await enviarCorreo(email, subject, text, html);

    res.status(200).json({
      message: 'Solicitud reenviada correctamente. Revisa tu correo electrónico para actualizar la cuenta.',
      usuario,
      link: updateAccountLink, // Para depuración
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno al reenviar solicitud.' });
  }
});

router.get('/usuario/:uuid', async (req, res) => {
  const { uuid } = req.params;

  try {
    const usuario = await Usuario.findOne({
      where: { uuid },
      include: [
        {
          model: Empresa,
          as: 'empresa',
          attributes: ['uuid', 'razonSocial'],
        },
      ],
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      usuario: {
        uuid: usuario.uuid,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rolEmpresa || 'desconocido',
        empresa: usuario.empresa ? {
          uuid: usuario.empresa.uuid,
          razonSocial: usuario.empresa.razonSocial
        } : null
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});




// GET /empresas/:uuid
router.get('/empresas/:uuid', usuarioController.getEmpresaByUuid);


router.post('/delegados/invitar', usuarioController.invitarDelegado); 

router.patch(
  '/:uuid/activar',
  verifyToken,
  puedeActivarDelegado,
  async (req, res) => {
    const { uuid } = req.params;
    const { activo } = req.body;

    const usuario = await Usuario.findOne({ where: { uuid } });

    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });

    // Verificamos permisos
    const esAdmin = req.user.rolDefinitivo === 'admin';
    const esResponsableDeLaEmpresa =
      req.user.rolEmpresa === 'responsable' &&
      usuario.empresa_uuid?.toString() === req.user.empresaUuid?.toString();

    console.log('🛠 Comparando empresas:', {
      delUsuario: usuario.empresa_uuid,
      delResponsable: req.user.empresaUuid
    });

    if (!esAdmin && !esResponsableDeLaEmpresa) {
      return res.status(403).json({ message: 'No puedes modificar delegados fuera de tu empresa.' });
    }

    usuario.activo = activo;
    await usuario.save();

    return res.status(200).json({ message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente.` });
  }
);




module.exports = router;
