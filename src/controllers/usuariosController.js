const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const {Usuario, Bien, Stock, Transaccion, HistorialCambios, DetallesBien, PasswordResetToken} = require('../models'); // Importa los modelos correctamente
const { Op } = require('sequelize');
const { validarCampos } = require('../utils/validationUtils');
const { enviarCorreo } = require('../services/emailService');
const moment = require('moment');



const DEFAULT_PASSWORD = 'Contraseña123';
const secretKey = process.env.SECRET_KEY || 'bienes_muebles';
const refreshToken = process.env.REFRESH_SECRET_KEY || 'refresh_token ';
const { v4: uuidv4 } = require('uuid');



// Crear un nuevo usuario
// Crear un nuevo usuario
const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, dni, cuit, direccion, password, rolDefinitivo, tipo } = req.body;

    // Validar campos obligatorios
    if (!nombre || !email || !password || !tipo) {
      return res.status(400).json({ message: 'Nombre, correo electrónico, contraseña y tipo son obligatorios.' });
    }

    // Normalizar el email
    const emailNormalizado = email.trim().toLowerCase();

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email: emailNormalizado } });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'El usuario ya existe con ese correo electrónico.' });
    }

    // Validar tipo
    const tiposValidos = ['fisica', 'juridica'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ message: 'El tipo debe ser "fisica" o "juridica".' });
    }

    // Asignar rol por defecto si no se especifica
    const rolesValidos = ['admin', 'usuario', 'moderador'];
    const rolAsignado = rolesValidos.includes(rolDefinitivo) ? rolDefinitivo : 'usuario';

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHasheada = await bcrypt.hash(password, salt);

    // Crear el usuario
    const usuario = await Usuario.create({
      nombre,
      apellido,
      email: emailNormalizado,
      dni,
      cuit,
      direccion,
      password: passwordHasheada,
      rolDefinitivo: rolAsignado,
      tipo, // Ahora se incluye el campo tipo
    });

    const usuarioSinPassword = usuario.toJSON();
    delete usuarioSinPassword.password;

    res.status(201).json(usuarioSinPassword);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};



const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const esPasswordCorrecto = await bcrypt.compare(password, usuario.password);
    if (!esPasswordCorrecto) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    const secretKey = process.env.SECRET_KEY || 'bienes_muebles';
    const refreshSecret = process.env.REFRESH_SECRET_KEY || 'refresh_muebles';

    // Generar token principal (JWT)
    const token = jwt.sign(
      { uuid: usuario.uuid, email: usuario.email, rol: usuario.rolDefinitivo },
      secretKey,
      { expiresIn: '1h' }
    );

    // Generar refresh token
    const refreshToken = jwt.sign(
      { uuid: usuario.uuid },
      refreshSecret,
      { expiresIn: '7d' } // El refresh token dura más
    );

    res.status(200).json({
      usuario: {
        uuid: usuario.uuid,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rolDefinitivo: usuario.rolDefinitivo,
      },
      token,
      refreshToken, // Enviar también el refresh token
    });
  } catch (error) {
    console.error('Error en el login:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};





const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['uuid', 'nombre', 'apellido', 'email', 'dni', 'cuit', 'direccion'],
    });
    res.status(200).json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};


const obtenerCompradores = async (req, res) => {
  try {
      const compradores = await Usuario.findAll({
          where: { tipo: 'comprador' }, // Ajusta esta condición según tus necesidades
      });
      res.status(200).json(compradores);
  } catch (error) {
      console.error('Error al obtener compradores:', error);
      res.status(500).json({ message: 'Error al obtener compradores.', error: error.message });
  }
};

const registerUsuarioPorTercero = async (req, res) => {
  const { dni, email, nombre, apellido, tipo, razonSocial, cuit, direccion } = req.body;

  if (!dni || !email || !nombre || !apellido) {
    return res.status(400).json({
      mensaje: 'Faltan campos obligatorios. Asegúrate de enviar dni, email, nombre y apellido.',
    });
  }

  try {
    const existingUser = await Usuario.findOne({ where: { email } });

    if (existingUser) {
      // El usuario ya existe, no enviar enlace
      return res.status(200).json({
        mensaje: 'El usuario ya existe en el sistema.',
        usuario: existingUser, // Opcional: devolver datos del usuario existente si lo necesitas
      });
    }

    // Crear un nuevo usuario
    const nuevoUsuario = await Usuario.create({
      uuid: uuidv4(),
      dni,
      email,
      nombre,
      apellido,
      tipo,
      razonSocial: tipo === 'juridica' ? razonSocial : null,
      cuit,
      direccion,
      password: await bcrypt.hash('default_password', 10), // Contraseña por defecto
      estado: 'pendiente',
      rolDefinitivo: 'usuario',
    });

    // Generar un token JWT para el nuevo usuario
    const token = jwt.sign(
      { id: nuevoUsuario.uuid }, // Payload
      process.env.JWT_SECRET || 'bienes_muebles', // Clave secreta
      { expiresIn: '24h' } // Tiempo de expiración
    );

    const resetLink = `${process.env.FRONTEND_URL}/usuarios/update-account/${token}`;

    const emailBody = `
      <p>Hola ${nombre},</p>
      <p>Has sido registrado por un tercero. Para completar tu registro y cambiar tu contraseña, haz clic en el siguiente enlace:</p>
      <a href="${resetLink}">Completar registro</a>
      <p>Este enlace es válido por 24 horas.</p>
    `;

    // Enviar correo al nuevo usuario
    await enviarCorreo(email, 'Registro exitoso - Completa tu cuenta', emailBody, emailBody);

    res.status(201).json({
      mensaje: 'Usuario registrado con éxito. Se ha enviado un correo para completar su registro.',
      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error('Error al registrar usuario por tercero:', error.message);
    res.status(500).json({
      mensaje: 'Error interno al registrar el usuario.',
      detalles: error.message,
    });
  }
};


const updateAccount = async (req, res) => {
  const { token } = req.params; // Token recibido en la URL
  const { newPassword, nombre, apellido } = req.body;

  try {
    // Decodificar el token y verificar si el usuario existe
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findOne({ where: { uuid: decoded.id, estado: 'pendiente' } });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado o ya está activo.' });
    }

    // Actualizar la información del usuario
    if (newPassword) {
      usuario.password = await bcrypt.hash(newPassword, 10);
    }
    if (nombre) usuario.nombre = nombre;
    if (apellido) usuario.apellido = apellido;

    // Cambiar estado a "activo"
    usuario.estado = 'aprobado';

    await usuario.save();

    res.status(200).json({ message: 'Cuenta actualizada y activada exitosamente.' });
  } catch (error) {
    console.error('Error al procesar el token:', error);
    res.status(400).json({ message: 'Token inválido o expirado.' });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const passwordResetToken = await PasswordResetToken.findOne({
      where: { token },
    });

    if (!passwordResetToken || passwordResetToken.expiresAt < new Date()) {
      return res.status(400).json({ mensaje: 'El enlace ha expirado o es inválido.' });
    }

    const user = await Usuario.findByPk(passwordResetToken.userId);

    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.estado = 'activo';
    await user.save();

    await passwordResetToken.destroy();

    res.status(200).json({ mensaje: 'Contraseña cambiada con éxito.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error.message);
    res.status(500).json({ mensaje: 'Error interno.', detalles: error.message });
  }
};




const aprobarUsuario = async (req, res) => {
  const { uuid } = req.params;

  try {
    const usuario = await Usuario.findOne({ where: { uuid } }); // Cambiado de `findByPk(id)`
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    usuario.estado = 'aprobado';
    await usuario.save();

    res.status(200).json({ message: 'Usuario aprobado correctamente', usuario });
  } catch (error) {
    console.error('Error al aprobar usuario:', error);
    res.status(500).json({ message: 'Error al aprobar usuario.', error: error.message });
  }
};


// Aprobar o rechazar usuarios

const cambiarEstadoUsuario = async (req, res) => {
  const { uuid } = req.params;
  const { estado, fechaAprobacion, aprobadoPor, motivoRechazo } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { uuid } });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    usuario.estado = estado;

    if (estado === 'aprobado') {
      usuario.fechaAprobacion = fechaAprobacion;
      usuario.aprobadoPor = aprobadoPor;

      try {
        await enviarCorreo(
          usuario.email,
          '¡Tu registro ha sido aprobado!',
          `Hola ${usuario.nombre}, tu registro ha sido aprobado.`,
          `<p>Hola <strong>${usuario.nombre}</strong>, tu registro ha sido aprobado.</p>`
        );
        console.log('Correo de aprobación enviado correctamente.');
      } catch (error) {
        console.error('Error al enviar correo de aprobación:', error.message);
      }
    } else if (estado === 'rechazado') {
      usuario.motivoRechazo = motivoRechazo;
      usuario.rechazadoPor = aprobadoPor;
      usuario.fechaRechazo = new Date();

      try {
        await enviarCorreo(
          usuario.email,
          'Tu registro ha sido rechazado',
          `Hola ${usuario.nombre}, lamentamos informarte que tu registro ha sido rechazado. Motivo: ${motivoRechazo}`,
          `<p>Hola <strong>${usuario.nombre}</strong>, lamentamos informarte que tu registro ha sido rechazado.<br>Motivo: ${motivoRechazo}</p>`
        );
        console.log('Correo de rechazo enviado correctamente.');
      } catch (error) {
        console.error('Error al enviar correo de rechazo:', error.message);
      }
    }

    await usuario.save();

    res.status(200).json({
      message: `Usuario ${estado} correctamente`,
      usuario,
    });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error.message);
    res.status(500).json({ message: 'Error interno al cambiar estado del usuario.' });
  }
};





// Obtener usuarios por estado
// Obtener usuarios por estado
// Obtener usuarios por estado
const obtenerUsuariosPorEstado = async (req, res) => {
  const { estado } = req.query;

  if (!estado) {
    console.error('El parámetro "estado" es obligatorio.');
    return res.status(400).json({ message: 'El parámetro "estado" es obligatorio.' });
  }

  try {
    // Consultar usuarios con el estado especificado
    const usuarios = await Usuario.findAll({
      where: { estado },
      attributes: [
        'uuid',
        'nombre',
        'apellido',
        'email',
        'dni',
        'direccion',
        'estado',
        'rolDefinitivo',
        'aprobadoPor',
        'fechaAprobacion',
        'rechazadoPor',
        'fechaRechazo',
        'motivoRechazo',
        'createdAt',
        'updatedAt',
      ],
    });

    console.log(`Usuarios encontrados con estado "${estado}":`, usuarios.length);

    if (!usuarios.length) {
      console.log(`No se encontraron usuarios con el estado: ${estado}`);
      return res.status(200).json([]);
    }

    // Formatear cada usuario
    const usuariosFormateados = await Promise.all(
      usuarios.map(async (usuario) => {
        let direccionFormateada = null;

        // Intentar parsear la dirección si es una cadena
        try {
          direccionFormateada = typeof usuario.direccion === 'string'
            ? JSON.parse(usuario.direccion)
            : usuario.direccion;
        } catch (e) {
          console.error('Error al parsear dirección:', e);
          direccionFormateada = usuario.direccion;
        }

        // Obtener el nombre y apellido del usuario que rechazó
        let rechazadoPorNombreApellido = usuario.rechazadoPor;
        if (usuario.rechazadoPor) {
          const rechazador = await Usuario.findOne({
            where: { uuid: usuario.rechazadoPor },
            attributes: ['nombre', 'apellido'],
          });

          if (rechazador) {
            rechazadoPorNombreApellido = `${rechazador.nombre} ${rechazador.apellido}`;
          }
        }

        // Obtener el nombre y apellido del usuario que aprobó
        let aprobadoPorNombreApellido = usuario.aprobadoPor;
        if (usuario.aprobadoPor) {
          const aprobador = await Usuario.findOne({
            where: { uuid: usuario.aprobadoPor },
            attributes: ['nombre', 'apellido'],
          });

          if (aprobador) {
            aprobadoPorNombreApellido = `${aprobador.nombre} ${aprobador.apellido}`;
          }
        }

        return {
          ...usuario.toJSON(),
          direccion: direccionFormateada,
          rechazadoPor: rechazadoPorNombreApellido,
          aprobadoPor: aprobadoPorNombreApellido,
        };
      })
    );

    res.status(200).json(usuariosFormateados);
  } catch (error) {
    console.error('Error al obtener usuarios por estado:', error.message);
    res.status(500).json({
      message: 'Error al obtener usuarios por estado.',
      detalles: error.message,
    });
  }
};



const actualizarUsuario = async (req, res) => {
  const { uuid } = req.params;
  const { nombre, apellido, email, dni, direccion, contraseña, rol } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { uuid } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const cambios = [];

    if (nombre && nombre !== usuario.nombre) {
      cambios.push({ campo: 'nombre', valor_anterior: usuario.nombre, valor_nuevo: nombre });
      usuario.nombre = nombre;
    }

    if (apellido && apellido !== usuario.apellido) {
      cambios.push({ campo: 'apellido', valor_anterior: usuario.apellido, valor_nuevo: apellido });
      usuario.apellido = apellido;
    }

    if (email && email !== usuario.email) {
      cambios.push({ campo: 'email', valor_anterior: usuario.email, valor_nuevo: email });
      usuario.email = email;
    }

    if (dni && dni !== usuario.dni) {
      cambios.push({ campo: 'dni', valor_anterior: usuario.dni, valor_nuevo: dni });
      usuario.dni = dni;
    }

    if (direccion) {
      const nuevaDireccion = JSON.stringify(direccion);
      const direccionActual = JSON.stringify(usuario.direccion);
      if (nuevaDireccion !== direccionActual) {
        cambios.push({ campo: 'direccion', valor_anterior: direccionActual, valor_nuevo: nuevaDireccion });
        usuario.direccion = direccion;
      }
    }

    if (contraseña) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(contraseña, 10);
      cambios.push({ campo: 'contraseña', valor_anterior: '******', valor_nuevo: '******' });
      usuario.password = hashedPassword;
    }

    if (rol && rol !== usuario.rolDefinitivo) {
      cambios.push({ campo: 'rol', valor_anterior: usuario.rolDefinitivo, valor_nuevo: rol });
      usuario.rolDefinitivo = rol;
    }

    await usuario.save();

    // Guardar los cambios en el historial
    for (const cambio of cambios) {
      await HistorialCambios.create({
        usuario_id: uuid,
        campo: cambio.campo,
        valor_anterior: cambio.valor_anterior,
        valor_nuevo: cambio.valor_nuevo,
      });
    }

    res.status(200).json({
      message: 'Usuario actualizado con éxito.',
      cambios, // Devuelve el historial de cambios
      usuario,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error.message);
    res.status(500).json({ message: 'Error al actualizar usuario.', detalles: error.message });
  }
};



// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  const { uuid } = req.params;

  try {
    const usuario = await Usuario.findOne({ where: { uuid } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await usuario.destroy();
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario.', error: error.message });
  }
};

const obtenerUsuarioPorId = async (req, res) => {
  const { uuid } = req.params;

  try {
    const usuario = await Usuario.findOne({ where: { uuid } }); // Cambiado de `findByPk(id)`
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    res.status(500).json({ message: 'Error al obtener usuario.', error: error.message });
  }
};

const obtenerUsuariosPendientes = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({ where: { estado: 'pendiente' } });
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios pendientes:', error);
    res.status(500).json({ message: 'Error al obtener usuarios pendientes.', error: error.message });
  }
};

const asignarRolTemporal = async (req, res) => {
  const { uuid } = req.params;
  const { rolTemporal } = req.body;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    usuario.rolTemporal = rolTemporal;
    await usuario.save();

    res.json({ message: 'Rol temporal asignado correctamente.', usuario });
  } catch (error) {
    console.error('Error al asignar rol temporal:', error);
    res.status(500).json({ message: 'Error al asignar rol temporal.', error: error.message });
  }
};

const obtenerRolTemporal = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id, { attributes: ['rolTemporal'] });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json({ rolTemporal: usuario.rolTemporal });
  } catch (error) {
    console.error('Error al obtener rol temporal:', error);
    res.status(500).json({ message: 'Error al obtener rol temporal.', error: error.message });
  }
};

const checkExistingUser = async (req, res) => {
  const { dni, email } = req.body;

  try {
    const usuario = await Usuario.findOne({
      where: {
        [Op.or]: [{ dni }, { email }],
      },
    });

    if (usuario) {
      return res.status(200).json({
        existe: true,
        usuario,
        mensaje: 'El usuario ya existe.',
      });
    }

    return res.status(200).json({
      existe: false,
      mensaje: 'Usuario no encontrado.',
    });
  } catch (error) {
    console.error('Error en checkExistingUser:', error.message);
    res.status(500).json({ message: 'Error al verificar el usuario.', detalles: error.message });
  }
};




const removerRolTemporal = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    usuario.rolTemporal = null;
    await usuario.save();

    res.json({ message: 'Rol temporal removido correctamente.', usuario });
  } catch (error) {
    console.error('Error al remover rol temporal:', error);
    res.status(500).json({ message: 'Error al remover rol temporal.', error: error.message });
  }
};

const obtenerUsuarioDetalles = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id, {
      include: [
        {
          model: Bien,
          as: 'bienesComprados',
          attributes: ['descripcion', 'marca', 'modelo'],
        },
        {
          model: Bien,
          as: 'bienesVendidos',
          attributes: ['descripcion', 'marca', 'modelo'],
        },
      ],
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener detalles del usuario:', error);
    res.status(500).json({ message: 'Error al obtener detalles del usuario.', error: error.message });
  }
};

// controllers/usuarioController.js
const actualizarRolUsuario = async (req, res) => {
  const { uuid } = req.params;
  const { rolDefinitivo } = req.body;

  console.log('UUID recibido:', uuid);
  console.log('Rol recibido:', rolDefinitivo);

  const rolesValidos = ['admin', 'usuario', 'moderador'];
  if (!rolDefinitivo || !rolesValidos.includes(rolDefinitivo)) {
    return res.status(400).json({ message: 'Rol definitivo válido es obligatorio.' });
  }

  try {
    // Buscar el usuario por UUID
    const usuario = await Usuario.findOne({ where: { uuid } });
    if (!usuario) {
      console.log(`Usuario no encontrado con UUID: ${uuid}`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar el rol actual antes de actualizar
    console.log('Rol actual antes de actualizar:', usuario.rolDefinitivo);

    // Actualizar el rol definitivo
    usuario.rolDefinitivo = rolDefinitivo;
    await usuario.save();

    // Verificar el rol después de actualizar
    console.log('Rol actual después de actualizar:', usuario.rolDefinitivo);

    // Devolver el usuario actualizado
    res.json({
      message: 'Rol del usuario actualizado correctamente',
      usuario: {
        uuid: usuario.uuid,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rolDefinitivo: usuario.rolDefinitivo, // Aquí está el rol actualizado
      },
    });
  } catch (error) {
    console.error('Error al actualizar rol del usuario:', error);
    res.status(500).json({ message: 'Error al actualizar rol del usuario.' });
  }
};



const obtenerUsuarioPorDni = async (req, res) => {
  const { dni } = req.params;

  try {
    const usuario = await Usuario.findOne({ where: { dni } });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.status(200).json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario por DNI:', error);
    res.status(500).json({ message: 'Error al obtener usuario.', error: error.message });
  }
};






module.exports = {
  crearUsuario,
  login,
  cambiarEstadoUsuario, // Incluye la aprobación y rechazo de usuarios
  obtenerUsuariosPorEstado, // Para obtener usuarios aprobados, rechazados, pendientes, etc.
  actualizarUsuario,
  eliminarUsuario,
  obtenerUsuarios, // Obtener todos los usuarios
  obtenerUsuarioPorId, // Obtener un usuario por su ID
  obtenerUsuarioPorDni, // Obtener un usuario por su DNI
  registerUsuarioPorTercero, // Registrar un usuario a través de terceros
  obtenerUsuarioDetalles, // Obtener detalles de un usuario autenticado
  obtenerCompradores, // Obtener compradores
  obtenerUsuariosPendientes, // Obtener usuarios pendientes
  asignarRolTemporal, // Asignar rol temporal a un usuario
  obtenerRolTemporal, // Obtener rol temporal de un usuario
  removerRolTemporal, // Remover rol temporal de un usuario
  actualizarRolUsuario, // Cambiar el rol definitivo de un usuario
  checkExistingUser, // Verificar si un usuario existe
  resetPassword,
  updateAccount,
};

