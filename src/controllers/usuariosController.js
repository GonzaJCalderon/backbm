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
  const { nombre, apellido, email, password, direccion, cuit, dni, tipo } = req.body;

  console.log(req.body); // Verificar datos recibidos

  // Validación de campos requeridos
  if (!nombre || !apellido || !email || !password || !tipo || !direccion) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  // Verificar si el email ya existe
  const existingUser = await Usuario.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
  }

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
    estado: 'pendiente'
  });

  // Crear token JWT
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.rolDefinitivo },
    secretKey,
    { expiresIn: '1h' }
  );

  res.status(201).json({ message: 'Usuario registrado con éxito', newUser, token });
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
const obtenerUsuariosPendientes = async (req, res) => {
  try {
    // Consulta para obtener usuarios con estado 'pendiente'
    const usuariosPendientes = await Usuario.findAll({ where: { estado: 'pendiente' } });
    
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
// Registrar usuario por tercero


// Registrar usuario por tercero
const registerUsuarioPorTercero = async (req, res) => {
  const { dniCuit, firstName, lastName, email, address } = req.body;
  console.log("Datos recibidos en el backend:", req.body); // Agrega este log para debug

  // Validación de los campos requeridos
  if (!dniCuit || !firstName || !lastName || !email || !address) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    // Busca un usuario existente con el dniCuit proporcionado
    let usuario = await Usuario.findOne({ where: { dni: dniCuit } });

    if (usuario) {
      // Si el usuario existe, verifica si los datos coinciden
      if (
        usuario.nombre === firstName &&
        usuario.apellido === lastName &&
        usuario.email === email &&
        usuario.direccion === address
      ) {
        // Si los datos coinciden, devuelve el usuario existente
        return res.json({ usuario });
      } else {
        // Si los datos no coinciden, devuelve un error
        return res.status(400).json({
          message: 'El DNI/CUIT ya está registrado con datos que no coinciden. Verifica la información.'
        });
      }
    } else {
      // Si no se encuentra el usuario, lo crea
      usuario = await Usuario.create({
        dni: dniCuit,
        nombre: firstName,
        apellido: lastName,
        email,
        direccion: address,
        password: 'default_password', // Asigna la contraseña por defecto
        rolDefinitivo: 'usuario'
      });

      // Responde con el usuario registrado
      return res.json({ usuario });
    }
  } catch (error) {
    console.log("Error al registrar usuario por tercero:", error); // Log de error para debug
    res.status(500).json({ message: 'Error al registrar usuario por tercero', error });
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
// Modificación del controlador
const actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, direccion, password, rolDefinitivo } = req.body;

  try {
      const usuario = await Usuario.findByPk(id);
      if (!usuario) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Validaciones de datos
      if (nombre) {
          usuario.nombre = nombre;
      }
      if (apellido) {
          usuario.apellido = apellido;
      }
      if (email) {
          // Validar el formato del email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
              return res.status(400).json({ message: 'El email no es válido' });
          }
          usuario.email = email;
      }

      // Actualizar dirección si se proporciona
      if (direccion) {
          // Aquí puedes agregar más validaciones para los campos de dirección si es necesario
          usuario.direccion = {
              ...usuario.direccion, // Mantener campos existentes
              ...direccion // Actualizar solo los que se proporcionan
          };
      }

      // Actualizar rol
      if (rolDefinitivo) {
          usuario.rolDefinitivo = rolDefinitivo; // Forzar cambio de rol
          console.log("Actualizando rol a:", rolDefinitivo);
      }

      // Actualizar contraseña si se proporciona
      if (password) {
          usuario.password = await bcrypt.hash(password, 10);
      }

      // Guardar los cambios
      await usuario.save();

      res.json({ message: 'Usuario actualizado correctamente', usuario });
  } catch (error) {
      console.error('Error al actualizar el usuario:', error);
      res.status(500).json({ message: 'Error al actualizar usuario', error });
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
};
