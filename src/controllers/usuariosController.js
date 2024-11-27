const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { enviarCorreo } = require('../services/emailService');
const Usuario = require('../models/Usuario');
const Bien = require('../models/Bien');
const Transaccion = require('../models/Transaccion')
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Esto carga las variables del archivo .env


const secretKey = process.env.SECRET_KEY;

// Crear un nuevo usuario

const MESSAGES = {
  USER_NOT_FOUND: 'Usuario no encontrado',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  ACCOUNT_NOT_APPROVED: 'Cuenta no aprobada',
  USER_REGISTERED: 'Usuario registrado con éxito',
  USER_UPDATED: 'Usuario actualizado correctamente',
  // ... otros mensajes
};

const crearUsuario = async (req, res) => {
  const { nombre, apellido, email, password, direccion, cuit, dni, tipo, razonSocial } = req.body;

  console.log(req.body); // Verificar los datos recibidos

  // Validación de campos requeridos
  if (!nombre || !apellido || !email || !password || !tipo || !direccion || !direccion.calle || !direccion.altura || !direccion.barrio || !direccion.departamento) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  // Validación adicional para 'razonSocial' según el tipo
  if (tipo === 'juridica' && !razonSocial) {
    return res.status(400).json({ message: 'La razón social es obligatoria para tipo "juridica"' });
  }

  // Verificar si el email ya existe
  const existingUser = await Usuario.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
  }

  // Verificar si el DNI ya existe
  const existingDni = await Usuario.findOne({ where: { dni } });
  if (existingDni) {
    return res.status(400).json({ message: 'El DNI ya está registrado' });
  }

  try {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario
    const newUser = await Usuario.create({
      nombre,
      apellido,
      email,
      password: hashedPassword,
      direccion: {
        calle: direccion.calle || '',
        altura: direccion.altura || '',
        barrio: direccion.barrio || '',
        departamento: direccion.departamento || ''
      },
      cuit,
      dni,
      tipo,
      razonSocial: tipo === 'juridica' ? razonSocial : '', // Solo se guarda razonSocial si es tipo 'juridica'
      estado: 'pendiente'
    });

    // Crear token JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.rolDefinitivo },
      secretKey,
      { expiresIn: '1h' }
    );

    res.status(201).json({ message: 'Usuario registrado con éxito', newUser, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
};





// Iniciar sesión
// Iniciar sesión
const loginUsuario = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar el usuario por email
    const user = await Usuario.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar el estado del usuario
    if (user.estado !== 'aprobado') {
      return res.status(403).json({ message: 'Cuenta no aprobada' });
    }

    // Preparar la respuesta del usuario
    const responseUser = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      direccion: user.direccion,
      rolTemporal: user.rolTemporal,
      rolDefinitivo: user.rolDefinitivo,
      tipo: user.tipo,
      cuit: user.cuit,
      dni: user.dni,
    };

    // Generar el token JWT incluyendo rolDefinitivo
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        rolDefinitivo: user.rolDefinitivo, // Asegúrate de incluir rolDefinitivo aquí
      },
      process.env.SECRET_KEY,
      { expiresIn: '1h' }
    );

    // Enviar la respuesta
    res.json({ usuario: responseUser, token });
  } catch (error) {
    console.error('Error en la autenticación:', error);
    res.status(500).json({ message: 'Error en la autenticación', error });
  }
};



// Obtener todos los usuarios
const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener un usuario por ID
const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
    } else {
      res.json(usuario);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const obtenerUsuarioPorDni = async (req, res) => {
  try {
    const { dni } = req.query;

    // Verifica si el parámetro dni está presente en la consulta
    if (!dni) {
      return res.status(400).json({ error: 'El parámetro dni es requerido' });
    }

    // Busca el usuario en la base de datos usando el DNI
    const usuario = await Usuario.findOne({ where: { dni: String(dni) } }); // Asegúrate de tratar el dni como un string

    // Si no se encuentra el usuario, devuelve un array vacío con código 202
    if (!usuario) {
      return res.status(202).json([]);
    }

    // Si se encuentra el usuario, devuelve la información
    res.json({ usuario });
  } catch (error) {
    // Manejo de errores del servidor
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};



// Aprobar usuario
// Aprobar usuario
const aprobarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Cambiar el estado del usuario a 'aprobado'
    usuario.estado = 'aprobado';
    await usuario.save();

    // El correo de aprobación está temporalmente suspendido
    // await enviarCorreo(usuario.email, 'Aprobación de Cuenta', 'Tu cuenta ha sido aprobada', '<h1>Tu cuenta ha sido aprobada</h1>');

    // Enviar la respuesta de éxito
    res.json({ message: 'Usuario aprobado correctamente', usuario });
  } catch (error) {
    // Manejo del error en caso de fallo
    res.status(500).json({ message: 'Error al aprobar usuario', error });
  }
};


// Rechazar usuario
const rechazarUsuario = async (req, res) => {
  const { id } = req.params;
  const { motivoRechazo, rechazadoPor } = req.body; // Asegúrate de que se envían estos datos

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Asignar los valores correspondientes
    usuario.estado = 'rechazado';
    usuario.motivoRechazo = motivoRechazo; // Asignar el motivo de rechazo
    usuario.rechazadoPor = rechazadoPor; // Asignar el ID del administrador
    usuario.fechaRechazo = new Date(); // Asignar la fecha actual de rechazo

    await usuario.save();

    // Enviar correo de rechazo
    await enviarCorreo(usuario.email, 'Rechazo de Cuenta', 'Tu cuenta ha sido rechazada', '<h1>Tu cuenta ha sido rechazada</h1>');

    console.log(`Usuario con ID ${id} ha sido rechazado por el administrador con ID ${rechazadoPor}`);

    res.json({ message: 'Usuario rechazado correctamente', usuario });
  } catch (error) {
    res.status(500).json({ message: 'Error al rechazar usuario', error });
  }
};






// Obtener usuarios pendientes
// Obtener usuarios pendientes
const obtenerUsuariosPendientes = async (req, res) => {
  try {
    // Consulta para obtener usuarios con estado 'pendiente'
    const usuariosPendientes = await Usuario.findAll({
      where: {
        estado: 'pendiente'  // Consulta directa por el valor exacto del estado
      }
    });

    // Verifica si hay usuarios pendientes
    if (usuariosPendientes.length === 0) {
      return res.status(404).json({ message: 'No hay usuarios pendientes' });
    }

    // Devuelve los usuarios pendientes
    res.json(usuariosPendientes);
  } catch (error) {
    console.error('Error al obtener usuarios pendientes:', error); // Imprimir el error en la consola
    res.status(500).json({ message: 'Error al obtener usuarios pendientes', error: error.message });
  }
};




// Registrar usuario por tercero
const registerUsuarioPorTercero = async (req, res) => {
  const { dni, cuit, nombre, apellido, email, direccion, password, tipo, razonSocial } = req.body;

  console.log("Datos recibidos en el backend:", req.body);

  // Validación de campos requeridos
  if (!dni || !cuit || !nombre || !apellido || !email || !direccion || !direccion.calle || !direccion.altura || !direccion.departamento || !password || !tipo) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  // Validación de razón social para tipo jurídico
  if (tipo === 'juridica' && !razonSocial) {
    return res.status(400).json({ message: 'La razón social es obligatoria para tipo "juridica"' });
  }

  // Verificar si el email ya existe
  const existingUser = await Usuario.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
  }

  // Verificar si el DNI ya existe
  const existingDni = await Usuario.findOne({ where: { dni } });
  if (existingDni) {
    return res.status(400).json({ message: 'El DNI ya está registrado' });
  }

  try {
    // Encriptar la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario
    const usuario = await Usuario.create({
      dni,
      cuit,
      nombre,
      apellido,
      email,
      direccion: {
        calle: direccion.calle,
        numero: direccion.altura,  // Usamos 'altura' como 'numero' para la consistencia
        departamento: direccion.departamento,
      },
      password: hashedPassword, // Guardamos la contraseña encriptada
      rolDefinitivo: 'usuario',
      tipo,
      razonSocial: tipo === 'juridica' ? razonSocial : null,
    });

    // Responder con los datos del usuario, omitiendo la contraseña
    res.json({
      usuario: {
        id: usuario.id,
        dni: usuario.dni,
        cuit: usuario.cuit,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        direccion: usuario.direccion,
        tipo: usuario.tipo,
        razonSocial: usuario.razonSocial,
      }
    });
  } catch (error) {
    console.log("Error al registrar usuario por tercero:", error);
    res.status(500).json({ message: 'Error al registrar usuario por tercero' });
  }
};






// Completar registro
const completarRegistro = async (req, res) => {
  const { id, password } = req.body;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (password) {
      usuario.password = await bcrypt.hash(password, 10);
    }

    usuario.estado = 'aprobado';
    await usuario.save();

    res.json({ message: 'Registro completado correctamente', usuario });
  } catch (error) {
    res.status(500).json({ message: 'Error al completar el registro', error });
  }
};

// Obtener vendedores
const obtenerVendedores = async (req, res) => {
  try {
    const vendedores = await Usuario.findAll({ where: { rolDefinitivo: 'vendedor' } });
    res.json(vendedores);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener vendedores', error });
  }
};

// Obtener compradores
const obtenerCompradores = async (req, res) => {
  try {
    const compradores = await Usuario.findAll({ where: { rolDefinitivo: 'comprador' } });
    res.json(compradores);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener compradores', error });
  }
};

// Actualizar usuario
const actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, direccion, password, rolDefinitivo } = req.body;

  try {
      const usuario = await Usuario.findByPk(id);
      if (!usuario) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Asegurarse de que `direccion` se trate como objeto
      usuario.direccion = typeof usuario.direccion === 'string' ? JSON.parse(usuario.direccion) : usuario.direccion;

      // Asignar nuevos valores
      if (nombre) usuario.nombre = nombre;
      if (apellido) usuario.apellido = apellido;
      if (email) usuario.email = email;

      // Sobrescribir `direccion` solo si es un objeto
      if (direccion && typeof direccion === 'object') {
          usuario.direccion = direccion;
      }

      // Guardar cambios
      await usuario.save();

      return res.status(200).json({ message: 'Usuario actualizado exitosamente', data: usuario });
  } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar el usuario', error: error.message });
  }
};





// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await usuario.destroy();

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error });
  }
};

// Obtener compras y ventas por usuario
// Obtener compras y ventas por usuario
const obtenerComprasVentasPorUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id, {
      include: [
        {
          model: Transaccion,
          as: 'compras', // Cambia el alias según la asociación en tu modelo
          include: [
            {
              model: Bien,
              as: 'bien', // Usa el alias definido en la asociación
              attributes: ['uuid', 'descripcion', 'precio', 'fecha'] // Cambia 'id' a 'uuid'
            }
          ],
          attributes: ['id', 'compradorId', 'vendedorId', 'fecha'] // Agrega atributos relevantes de la transacción
        },
        {
          model: Transaccion,
          as: 'ventas', // Cambia el alias según la asociación en tu modelo
          include: [
            {
              model: Bien,
              as: 'bien', // Usa el alias definido en la asociación
              attributes: ['uuid', 'descripcion', 'precio', 'fecha'] // Cambia 'id' a 'uuid'
            }
          ],
          attributes: ['id', 'compradorId', 'vendedorId', 'fecha'] // Agrega atributos relevantes de la transacción
        }
      ]
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si el usuario tiene transacciones, las incluirá en la respuesta
    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener compras y ventas:', error);
    res.status(500).json({ message: 'Error al obtener compras y ventas', error: error.message });
  }
};


// Obtener detalles de usuario
const obtenerUsuarioDetalles = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id, {
      include: [
        {
          model: Bien,
          as: 'bienesComprados',
          attributes: ['uuid', 'descripcion', 'precio', 'fecha'] // Cambié 'id' por 'uuid'
        },
        {
          model: Bien,
          as: 'bienesVendidos',
          attributes: ['uuid', 'descripcion', 'precio', 'fecha'] // Cambié 'id' por 'uuid'
        }
      ]
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener detalles del usuario:', error);
    res.status(500).json({ message: 'Error al obtener detalles del usuario', error: error.message });
  }
};



const obtenerComprasVentas = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id, {
      include: [
        {
          model: Bien,
          as: 'bienesComprados', // Asegúrate que el alias coincida con tu modelo
          attributes: ['uuid', 'descripcion', 'precio', 'fecha']
        },
        {
          model: Bien,
          as: 'bienesVendidos', // Asegúrate que el alias coincida con tu modelo
          attributes: ['uuid', 'descripcion', 'precio', 'fecha']
        }
      ]
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const response = {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni,
      cuit: usuario.cuit,
      email: usuario.email,
      direccion: usuario.direccion,
      bienesComprados: usuario.bienesComprados,
      bienesVendidos: usuario.bienesVendidos,
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener compras y ventas:', error);
    res.status(500).json({ message: 'Error al obtener compras y ventas', error: error.message });
  }
};


// Asignar rol temporal
const asignarRolTemporal = async (req, res) => {
  const { id } = req.params;
  const { rolTemporal } = req.body;

  if (!rolTemporal) {
    return res.status(400).json({ message: 'El rol temporal es obligatorio' });
  }

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    usuario.rolTemporal = rolTemporal;
    await usuario.save();

    res.json({ message: 'Rol temporal asignado correctamente', usuario });
  } catch (error) {
    res.status(500).json({ message: 'Error al asignar rol temporal', error });
  }
};

// Controlador para obtener el rol temporal de un usuario
const obtenerRolTemporal = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id, {
      attributes: ['rolTemporal']
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ rolTemporal: usuario.rolTemporal });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rol temporal del usuario', error });
  }
};

const removerRolTemporal = async (req, res) => {
  try {
    const userId = req.params.id;

    // Buscar el usuario por su ID
    const usuario = await Usuario.findByPk(userId);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Remover el rol temporal del usuario
    usuario.rolTemporal = null;

    // Guardar los cambios en la base de datos
    await usuario.save();

    // Responder con un mensaje de éxito
    res.status(200).json({ message: 'Rol temporal removido', usuario });
  } catch (error) {
    console.error('Error al remover el rol temporal:', error);
    res.status(500).json({ message: 'Error al remover el rol temporal', error });
  }
};

const cambiarRol = async (req, res) => {
  const { id } = req.params;  // El ID del usuario que deseas actualizar
  const { nuevoRol } = req.body;  // El nuevo rol que enviarás en la solicitud

  try {
    // Buscar el usuario por ID
    const usuario = await Usuario.findByPk(id);

    // Verificar si el usuario existe
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar el rol del usuario
    usuario.rolDefinitivo = nuevoRol;
    await usuario.save();

    // Responder con el usuario actualizado
    res.json({ message: 'Rol del usuario actualizado correctamente', usuario });
  } catch (error) {
    console.error('Error actualizando el rol:', error);
    res.status(500).json({ message: 'Error al actualizar el rol del usuario', error });
  }
};


const obtenerUsuariosAprobados = async (req, res) => {
  try {
    // Consulta para obtener usuarios con estado 'aprobado'
    const usuariosAprobados = await Usuario.findAll({
      where: {
        estado: 'aprobado' // Asegúrate de que el estado sea una cadena
      }
    });

    // Verifica si hay usuarios aprobados
    if (usuariosAprobados.length === 0) {
      return res.status(404).json({ message: 'No se encontraron usuarios aprobados' });
    }

    // Devuelve los usuarios aprobados
    res.status(200).json(usuariosAprobados);
  } catch (error) {
    console.error('Error al obtener usuarios aprobados:', error);
    res.status(500).json({ message: 'Error al obtener usuarios aprobados' });
  }
};

// Controller para obtener usuarios rechazados
// Controller para obtener usuarios rechazados
const obtenerUsuariosRechazados = async (req, res) => {
  try {
    // Consulta para obtener usuarios con estado 'rechazado'
    const usuariosRechazados = await Usuario.findAll({
      where: {
        estado: 'rechazado' // Usa el valor como string
      }
    });

    // Verifica si hay usuarios rechazados
    if (usuariosRechazados.length === 0) {
      return res.status(404).json({ message: 'No se encontraron usuarios rechazados' });
    }

    // Devuelve los usuarios rechazados, incluyendo toda la información
    const usuariosConInfoCompleta = usuariosRechazados.map(usuario => ({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni,
      cuit: usuario.cuit,
      email: usuario.email,
      password: usuario.password,
      direccion: usuario.direccion,
      rolTemporal: usuario.rolTemporal,
      rolDefinitivo: usuario.rolDefinitivo,
      tipo: usuario.tipo,
      estado: usuario.estado,
      motivoRechazo: usuario.motivoRechazo, // Asegúrate de que este campo esté definido en tu modelo
      rechazadoPor: usuario.rechazadoPor,   // Incluye el ID del admin que rechazó
      fechaRechazo: usuario.fechaRechazo    // Incluye la fecha de rechazo
    }));

    res.status(200).json(usuariosConInfoCompleta);
  } catch (error) {
    console.error('Error al obtener usuarios rechazados:', error);
    res.status(500).json({ message: 'Error al obtener usuarios rechazados' });
  }
};

const verificarUsuarioExistente = async (req, res) => {
  try {
    const { nombre, apellido, dni, cuit, email } = req.body;

    // Verificar que los campos requeridos no sean undefined
    if (!dni || !email) {
      return res.status(400).json({ mensaje: 'DNI y email son obligatorios.' });
    }

    const usuarioExistente = await Usuario.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { dni: dni },
        ],
      },
    });

    if (usuarioExistente) {
      const inconsistencias = [];
      if (usuarioExistente.nombre && nombre && usuarioExistente.nombre !== nombre) inconsistencias.push('nombre');
      if (usuarioExistente.apellido && apellido && usuarioExistente.apellido !== apellido) inconsistencias.push('apellido');
      if (usuarioExistente.dni && dni && usuarioExistente.dni !== dni) inconsistencias.push('dni');
      if (usuarioExistente.cuit && cuit && usuarioExistente.cuit !== cuit) inconsistencias.push('cuit');

      if (inconsistencias.length > 0) {
        return res.status(200).json({ existe: true, mensaje: 'Datos inconsistentes', inconsistencias, usuario: usuarioExistente });
      } else {
        return res.status(200).json({ existe: true, usuario: usuarioExistente });
      }
    }

    return res.status(200).json({ existe: false, mensaje: 'Usuario no encontrado' });
  } catch (error) {
    console.error('Error en verificarUsuarioExistente:', error);
    return res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};










module.exports = {
  crearUsuario,
  loginUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  obtenerUsuarioPorDni,
  aprobarUsuario,
  rechazarUsuario,
  obtenerUsuariosPendientes,
  registerUsuarioPorTercero,
  completarRegistro,
  obtenerVendedores,
  obtenerCompradores,
  actualizarUsuario,
  eliminarUsuario,
  obtenerUsuarioDetalles,
  obtenerComprasVentasPorUsuario,
  obtenerComprasVentas,
  asignarRolTemporal,
  obtenerRolTemporal,
  obtenerUsuariosAprobados,
  removerRolTemporal,
  cambiarRol,
  obtenerUsuariosRechazados,
  verificarUsuarioExistente,
};
