const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');



const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');


require('dotenv').config();

const { Usuario, Bien, Stock, Transaccion, HistorialCambios, DetallesBien, PasswordResetToken, Empresa, passwordResetToken } = require('../models'); // Importa los modelos correctamente
const { validate: isUuid } = require('uuid');
const { validarCampos } = require('../utils/validationUtils');
const { enviarCorreo } = require('../services/emailService');
const { activacionDelegadoHTML } = require('../utils/emailTemplates');
const moment = require('moment');
const config = require('../config/auth.config');



const DEFAULT_PASSWORD = 'Contraseña123';
const secretKey = process.env.SECRET_KEY || 'bienes_muebles';
const refreshToken = process.env.REFRESH_SECRET_KEY || 'refresh_token ';
const { v4: uuidv4 } = require('uuid');




/* ──────────────── CREAR USUARIO ──────────────── */
const crearUsuario = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      tipo,
      dni,
      direccion,
      dniResponsable,
      domicilioResponsable,
      nombreResponsable,
      apellidoResponsable,
      cuitResponsable,
      razonSocial,
      direccionEmpresa,
      rolDefinitivo = 'usuario'
    } = req.body;

    if (!email || !password || !tipo) {
      return res.status(400).json({ message: 'Email, contraseña y tipo son obligatorios.' });
    }

    // 🔍 Validar duplicados
    const condicionesWhere = [{ email }];
    if (tipo === 'fisica' && dni) condicionesWhere.push({ dni });
    if (tipo === 'juridica' && dniResponsable) condicionesWhere.push({ dni: dniResponsable });

    const usuarioExistente = await Usuario.findOne({
      where: { [Op.or]: condicionesWhere }
    });

    if (usuarioExistente) {
      return res.status(400).json({ message: 'Ya existe un usuario con este correo electrónico o DNI.' });
    }

    // 🔐 Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🧍 Crear el usuario (primero)
    const nuevoUsuario = await Usuario.create({
      nombre: tipo === 'fisica' ? nombre : nombreResponsable,
      apellido: tipo === 'fisica' ? apellido : apellidoResponsable,
      email,
      password: hashedPassword,
      tipo,
      dni: tipo === 'fisica' ? dni : dniResponsable,
      direccion: tipo === 'fisica' ? direccion : domicilioResponsable,
      cuit: tipo === 'juridica' ? cuitResponsable : null,
      dniResponsable: tipo === 'juridica' ? dniResponsable : null,
      nombreResponsable: tipo === 'juridica' ? nombreResponsable : null,
      apellidoResponsable: tipo === 'juridica' ? apellidoResponsable : null,
      cuitResponsable: tipo === 'juridica' ? cuitResponsable : null,
      domicilioResponsable: tipo === 'juridica' ? domicilioResponsable : null,
      rolEmpresa: tipo === 'juridica' ? 'responsable' : null,
      rolDefinitivo,
    });

    let empresaCreada = null;

    // 🏢 Si es tipo jurídica, creamos la empresa y asociamos al usuario
    if (tipo === 'juridica') {
      if (!razonSocial || !cuitResponsable || !direccionEmpresa) {
        return res.status(400).json({ message: 'Faltan datos obligatorios para la empresa.' });
      }

      const empresaExistente = await Empresa.findOne({ where: { cuit: cuitResponsable } });
      if (empresaExistente) {
        return res.status(400).json({ message: 'Ya existe una empresa con ese CUIT.' });
      }

      empresaCreada = await Empresa.create({
        razonSocial,
        cuit: cuitResponsable,
        direccion: direccionEmpresa,
        email,
        creadoPor: nuevoUsuario.uuid
      });
      
      // 🔗 Asociar empresa recién creada al usuario
      nuevoUsuario.delegadoDeEmpresa = empresaCreada.uuid;
      nuevoUsuario.empresa_uuid = empresaCreada.uuid; // ⚠️ ¡NECESARIO para el frontend!
      await nuevoUsuario.save();
      // 🔥 persistimos asociación
    }

    // 📬 Enviar correo de confirmación
    const htmlContent = `
      <div style="font-family: Arial; padding: 16px">
        <h2>Hola ${nuevoUsuario.nombre},</h2>
        <p>Tu solicitud ha sido recibida y está pendiente de aprobación.</p>
      </div>
    `;

    await enviarCorreo(email, 'Registro recibido', 'Pendiente de aprobación', htmlContent);

    return res.status(201).json({
      message: 'Usuario y empresa creados con éxito.',
      usuario: nuevoUsuario,
      empresa: empresaCreada
    });

  } catch (error) {
    console.error('❌ Error en crearUsuario:', error);
    return res.status(500).json({
      message: 'Error interno del servidor.',
      detalles: error.message
    });
  }
};

/* ──────────────── LOGIN ──────────────── */
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno.');
    }

    // 👇 Buscar empresa solo si el usuario tiene empresa asociada
    let razonSocial = null;
    if (usuario.empresa_uuid) {
      const empresa = await Empresa.findOne({ where: { uuid: usuario.empresa_uuid } });
      razonSocial = empresa?.razonSocial || null;
    }

    const token = jwt.sign({
      uuid: usuario.uuid,
      email: usuario.email,
      tipo: usuario.tipo,
      rolDefinitivo: usuario.rolDefinitivo,
      empresaUuid: usuario.empresa_uuid || null,
      rolEmpresa: usuario.rolEmpresa || null,
    }, jwtSecret, { expiresIn: '30m' });

    const refreshSecret = process.env.REFRESH_SECRET_KEY || 'refresh_bienes';
    const refreshToken = jwt.sign({ uuid: usuario.uuid }, refreshSecret, { expiresIn: '7d' });
    


    // ✅ Enviamos razonSocial también
    res.status(200).json({
      usuario: {
        uuid: usuario.uuid,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        dni: usuario.dni,
        rolDefinitivo: usuario.rolDefinitivo,
        empresaUuid: usuario.empresa_uuid || null,
        tipo: usuario.tipo || null,
        rolEmpresa: usuario.rolEmpresa || null,
        razonSocial: razonSocial, // ← AHORA SÍ 🎯
      },
      token,
      refreshToken,
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ message: 'Error en login.', error: error.message });
  }
};

const registrarDelegadoEmpresa = async (req, res) => {
  try {
    const { nombre, apellido, email, dni, cuit, direccion } = req.body;
    const empresaUuid = req.user?.empresaUuid || req.user?.uuid;

    console.log('🧠 Usuario en token:', req.user);
    console.log('🏢 empresaUuid detectado:', empresaUuid);

    if (!empresaUuid) {
      return res.status(401).json({ message: 'Usuario no autorizado. Falta empresaUuid.' });
    }

    const empresa = await Empresa.findByPk(empresaUuid);
    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada. No se puede registrar delegado.' });
    }

    if (!nombre || !apellido || !email || !dni || !direccion) {
      return res.status(400).json({ message: 'Faltan datos obligatorios.' });
    }

    const existeEmail = await Usuario.findOne({ where: { email } });
    if (existeEmail) {
      return res.status(409).json({ message: 'Este email ya está registrado.' });
    }

    const defaultPassword = await bcrypt.hash('temporal_' + Date.now(), 10);

    const nuevoDelegado = await Usuario.create({
      uuid: uuidv4(),
      nombre,
      apellido,
      email,
      dni,
      cuit: cuit || '',
      direccion,
      tipo: 'fisica',
      estado: 'pendiente',
      password: defaultPassword,
      rolDefinitivo: 'usuario',
      delegadoDeEmpresa: empresaUuid,
      empresa_uuid: empresaUuid, // ✅ ¡AGREGALO AQUÍ!
      rolEmpresa: 'delegado',
    });
    

    const token = jwt.sign(
      { uuid: nuevoDelegado.uuid },  // ✅ Acá ya está bien
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    

    const enlace = `${process.env.FRONTEND_URL}/usuarios/update-account/${token}`;
    const html = activacionDelegadoHTML({ nombre, enlace });

    await enviarCorreo(
      email,
      'Fuiste registrado como delegado de empresa',
      `Hola ${nombre}, haz clic para completar tu cuenta`,
      html
    );

    res.status(201).json({
      message: 'Delegado registrado correctamente. Se envió el mail de activación.',
      usuario: nuevoDelegado,
    });
  } catch (err) {
    console.error('❌ Error al registrar delegado:', err);
    res.status(500).json({ message: 'Error interno del servidor', error: err.message });
  }
};


const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['uuid', 'nombre', 'apellido', 'email', 'dni', 'cuit', 'direccion'],
    });
    res.status(200).json(usuarios);
  } catch (error) {
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
    res.status(500).json({ message: 'Error al obtener compradores.', error: error.message });
  }
};

const registerUsuarioPorTercero = async (req, res) => {
  try {
    const {
      dni,
      email,
      nombre,
      apellido,
      tipo,
      razonSocial,
      cuit,
      direccion,

      // ✅ Nuevos campos para persona jurídica
      dniResponsable,
      nombreResponsable,
      apellidoResponsable,
      cuitResponsable,
      domicilioResponsable,
    } = req.body;

    // Validación común
    if (!dni || !email || !nombre || !apellido) {
      return res.status(400).json({
        mensaje: 'Faltan campos obligatorios: DNI, email, nombre y apellido son requeridos.',
      });
    }

    // Validación especial para personas jurídicas
    if (tipo === 'juridica') {
      if (!razonSocial || !cuit) {
        return res.status(400).json({ mensaje: 'Razon social y CUIT son obligatorios para personas jurídicas.' });
      }

      if (!dniResponsable || !nombreResponsable || !apellidoResponsable || !cuitResponsable || !domicilioResponsable) {
        return res.status(400).json({
          mensaje: 'Faltan datos del responsable de la persona jurídica.',
        });
      }
    }

    // Validar que el email y el DNI no estén duplicados
    const existingUserByEmail = await Usuario.findOne({ where: { email } });
    if (existingUserByEmail) {
      return res.status(400).json({ mensaje: 'El email ya está registrado. Intenta con otro correo electrónico.' });
    }

    const existingUserByDNI = await Usuario.findOne({ where: { dni } });
    if (existingUserByDNI) {
      return res.status(400).json({ mensaje: 'El DNI ya está registrado.' });
    }

    const defaultPassword = await bcrypt.hash('temporal_' + Date.now(), 10);
    const userUuid = uuidv4();

    const nuevoUsuario = await Usuario.create({
      uuid: userUuid,
      dni,
      email,
      nombre,
      apellido,
      tipo,
      razonSocial: tipo === 'juridica' ? razonSocial : null,
      cuit,
      direccion,

      // ✅ Agregamos responsable si es juridica
      dniResponsable: tipo === 'juridica' ? dniResponsable : null,
      nombreResponsable: tipo === 'juridica' ? nombreResponsable : null,
      apellidoResponsable: tipo === 'juridica' ? apellidoResponsable : null,
      cuitResponsable: tipo === 'juridica' ? cuitResponsable : null,
      domicilioResponsable: tipo === 'juridica' ? domicilioResponsable : null,

      estado: 'pendiente',
      password: defaultPassword,
      delegadoDe: req.user?.uuid || null, // Asociar al creador si está logueado
    });
    const token = jwt.sign(
      { uuid: nuevoUsuario.uuid },  // ✅ CORRECTO
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    
    
    

    const enlace = `${process.env.FRONTEND_URL}/usuarios/update-account/${token}`;
    const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <table style="width: 100%; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <thead>
            <tr>
              <th style="background: linear-gradient(to right, #1e3a8a, #3b82f6); color: #fff; padding: 16px; text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                  <img src="${logoSrc}" alt="Logo" style="max-width: 80px; height: auto;" />
                  <h1 style="margin: 0; font-size: 20px;">Registro de Bienes Muebles Usados</h1>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 16px; text-align: center;">
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>Has sido registrado como delegado. Para completar tu registro y crear tu contraseña, haz clic en el siguiente botón:</p>
                <p>
                  <a href="${enlace}" style="display: inline-block; padding: 12px 24px; background-color: #1e88e5; color: #fff; text-decoration: none; border-radius: 4px;">Actualizar Cuenta</a>
                </p>
                <p>Si no solicitaste este registro, ignora este mensaje.</p>
                <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
                  Atentamente,<br>Equipo de Bienes Muebles Usados.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    await enviarCorreo(
      email,
      'Completa tu registro - Delegado de Bienes Muebles Usados',
      `Hola ${nombre}, haz clic en el enlace para completar tu registro.`,
      htmlContent
    );

    res.status(201).json({
      mensaje: 'Usuario delegado registrado correctamente.',
      usuario: nuevoUsuario,
    });

  } catch (error) {
    console.error('Error al registrar usuario por tercero:', error);
    res.status(500).json({
      mensaje: 'Error interno al registrar delegado.',
      detalles: error.message,
    });
  }
};



const updateAccount = async (req, res) => {
  const { token } = req.params;

  try {
    // ✅ Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { uuid } = decoded;

    console.log('🧩 Token decodificado correctamente:', decoded);

    // ❌ Error original: usabas `userUuid` que no existía
    if (!uuid) {
      return res.status(400).json({ mensaje: 'Token inválido: no contiene UUID.' });
    }

    // 🔍 Buscar el usuario con el UUID del token
    const usuario = await Usuario.findOne({ where: { uuid: decoded.uuid } });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    // ✅ Obtener los campos enviados desde el formulario
    const {
      nombre,
      apellido,
      email,
      newPassword,
      direccion, // opcional
    } = req.body;

    // 🧪 Validaciones mínimas
    if (!nombre || !apellido || !email) {
      return res.status(400).json({
        mensaje: 'Nombre, apellido y email son obligatorios.',
      });
    }

    // 📝 Actualizar campos del usuario
    usuario.nombre = nombre;
    usuario.apellido = apellido;
    usuario.email = email;

    if (newPassword) {
      usuario.password = await bcrypt.hash(newPassword, 10);
    }

    if (direccion && typeof direccion === 'object') {
      usuario.direccion = {
        ...usuario.direccion,
        ...direccion, // mergea con la anterior
      };
    }

    // 🟢 Activamos la cuenta
    usuario.estado = 'aprobado';

    await usuario.save();

    return res.status(200).json({
      mensaje: 'Cuenta actualizada con éxito.',
      usuario: {
        uuid: usuario.uuid, // ✅ corregido
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        direccion: usuario.direccion || {},
        estado: usuario.estado,
      },
    });
  } catch (error) {
    console.error('❌ Error al actualizar cuenta:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Token expirado.' });
    }

    return res.status(400).json({
      mensaje: 'Token inválido o error interno.',
      detalles: error.message,
    });
  }
};


// Función para restablecer la contraseña con el token
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
      const passwordResetToken = await PasswordResetToken.findOne({ where: { token } });

      if (!passwordResetToken || passwordResetToken.expiresAt < new Date()) {
          return res.status(400).json({ message: 'El enlace ha expirado o es inválido.' });
      }

      const usuario = await Usuario.findByPk(passwordResetToken.userId);
      if (!usuario) {
          return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      usuario.password = await bcrypt.hash(newPassword, 10);
      await usuario.save();

      await passwordResetToken.destroy(); // Eliminar el token de la base de datos

      return res.json({ message: 'Contraseña restablecida con éxito.' });
  } catch (error) {
      return res.status(500).json({ message: 'Error interno del servidor.' });
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
    res.status(500).json({ message: 'Error al aprobar usuario.', error: error.message });
  }
};

const cambiarEstadoUsuario = async (req, res) => {
  const { uuid } = req.params;
  const {
    estado,
    fechaAprobacion,
    aprobadoPor,
    motivoRechazo,
    fechaRechazo,
    rechazadoPor,
  } = req.body;


  try {
    const usuario = await Usuario.findOne({ where: { uuid } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }


    usuario.estado = estado;

    // URL del logo
    const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';

    if (estado === 'aprobado') {
      usuario.fechaAprobacion = fechaAprobacion || new Date().toISOString();
      usuario.aprobadoPor = aprobadoPor;

      if (usuario.email) {
        const subject = 'Su cuenta ha sido aprobada';

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <table style="width: 100%; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <thead>
                    <tr>
                        <th style="background: linear-gradient(to right, #1e3a8a, #3b82f6); color: #fff; padding: 16px; text-align: center;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                <img src="${logoSrc}" alt="Logo Registro de Bienes" style="max-width: 80px; height: auto;" />
                                <h1 style="margin: 0; font-size: 20px;">
                                  ¡Su cuenta ha sido aprobada!
                                </h1>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 16px; text-align: center;">
                            <p>Hola <strong>${usuario.nombre}</strong>,</p>
                            <p>
                                ¡Nos complace informarle que su cuenta ha sido <strong>aprobada</strong> exitosamente! 
                            </p>
                            <p>
                                Ahora puede acceder a nuestro sistema y comenzar a utilizar nuestros servicios.
                            </p>
                            <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
                                Atentamente,<br>
                                El equipo del Sistema Provincial Preventivo de Bienes Muebles Usados.
                            </p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        try {
          await enviarCorreo(usuario.email, subject, `Hola ${usuario.nombre}, su cuenta ha sido aprobada.`, htmlContent);
        } catch (emailError) {
        }
      }
    }

    if (estado === 'rechazado') {
      usuario.fechaRechazo = fechaRechazo || new Date().toISOString();
      usuario.rechazadoPor = rechazadoPor;
      usuario.motivoRechazo = motivoRechazo;

      if (usuario.email) {
        const subject = 'Su cuenta ha sido rechazada';

        const reintentarRegistroLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/usuarios/${usuario.uuid}/reintentar`;

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <table style="width: 100%; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <thead>
                    <tr>
                        <th style="background: linear-gradient(to right, #b91c1c, #ef4444); color: #fff; padding: 16px; text-align: center;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                <img src="${logoSrc}" alt="Logo Registro de Bienes" style="max-width: 80px; height: auto;" />
                                <h1 style="margin: 0; font-size: 20px;">
                                  Su cuenta ha sido rechazada
                                </h1>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 16px; text-align: center;">
                            <p>Hola <strong>${usuario.nombre}</strong>,</p>
                            <p style="color: red;">
                                Lamentamos informarle que su cuenta ha sido <strong>rechazada</strong>.
                            </p>
                            <p style="color: red;">
                                Motivo: "${motivoRechazo}"
                            </p>
                            <p>
                                Puede reenviar su solicitud haciendo clic en el siguiente enlace:
                            </p>
                            <a href="${reintentarRegistroLink}" style="color: blue; font-weight: bold;">Reenviar Registro</a>
                            <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
                                Atentamente,<br>
                                El equipo del Sistema Provincial Preventivo de Bienes Muebles Usados.
                            </p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        try {
          await enviarCorreo(usuario.email, subject, `Hola ${usuario.nombre}, su cuenta ha sido rechazada. Motivo: "${motivoRechazo}"`, htmlContent);
        } catch (emailError) {
        }
      }
    }

    await usuario.save();

    return res.status(200).json({
      message: `Usuario ${estado} correctamente`,
      usuario,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno al cambiar estado del usuario.' });
  }
};



const reintentarRegistro = async (req, res) => {
  const { uuid } = req.params;
  const { nombre, apellido, email, dni, direccion } = req.body;

  try {

    const usuario = await Usuario.findOne({ where: { uuid } });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (usuario.estado !== 'rechazado') {
      return res.status(400).json({ message: 'Solo los usuarios rechazados pueden reenviar su registro.' });
    }

    // Asignar datos obligatorios
    usuario.nombre = nombre || usuario.nombre;
    usuario.apellido = apellido || usuario.apellido;
    usuario.email = email || usuario.email;
    usuario.dni = dni || usuario.dni;

    // Verifica si hay un campo "direccion"
    if (direccion) {
      usuario.calle = direccion.calle || usuario.calle;
      usuario.altura = direccion.altura || usuario.altura;
    }

    usuario.estado = 'pendiente';
    usuario.motivoRechazo = null;

    await usuario.save();

    res.status(200).json({
      message: 'Registro reenviado correctamente para su revisión.',
      usuario,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno al reenviar registro.' });
  }
};



// Obtener usuarios por estado
const obtenerUsuariosPorEstado = async (req, res) => {
  const { estado } = req.query;
  console.log('👉 Estado recibido:', estado);

  // Validación de estados permitidos
  const estadosValidos = ['pendiente', 'rechazado', 'aprobado'];
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({
      message: 'El parámetro "estado" es obligatorio y debe ser: "pendiente", "rechazado" o "aprobado".',
    });
  }

  try {
    console.log(`🔍 Buscando usuarios con estado: ${estado}`);

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
        'rolEmpresa',
        'delegadoDeEmpresa',   // ✅ corregido
        'delegadoDeUsuario',   // ✅ corregido
        'aprobadoPor',
        'fechaAprobacion',
        'rechazadoPor',
        'fechaRechazo',
        'motivoRechazo',
        'createdAt',
        'updatedAt',
      ],
      include: [
        {
          model: Empresa,
          as: 'empresa',
          attributes: ['uuid', 'razonSocial', 'cuit', 'email']
        }
      ]
    });

    if (!usuarios.length) return res.status(200).json([]);

    // Obtener nombres de aprobadores y rechazadores
    const aprobadoresIds = [...new Set(usuarios.map(u => u.aprobadoPor).filter(Boolean))];
    const rechazadoresIds = [...new Set(usuarios.map(u => u.rechazadoPor).filter(Boolean))];

    const [aprobadores, rechazadores] = await Promise.all([
      Usuario.findAll({ where: { uuid: aprobadoresIds }, attributes: ['uuid', 'nombre', 'apellido'] }),
      Usuario.findAll({ where: { uuid: rechazadoresIds }, attributes: ['uuid', 'nombre', 'apellido'] }),
    ]);

    const aprobadoresMap = Object.fromEntries(aprobadores.map(user => [user.uuid, `${user.nombre} ${user.apellido}`]));
    const rechazadoresMap = Object.fromEntries(rechazadores.map(user => [user.uuid, `${user.nombre} ${user.apellido}`]));

    const usuariosFormateados = usuarios.map(usuario => {
      let direccionFormateada = null;

      try {
        direccionFormateada = typeof usuario.direccion === 'string'
          ? JSON.parse(usuario.direccion)
          : usuario.direccion;
      } catch {
        direccionFormateada = usuario.direccion;
      }

      return {
        ...usuario.toJSON(),
        direccion: direccionFormateada,
        aprobadoPor: aprobadoresMap[usuario.aprobadoPor] || null,
        rechazadoPor: rechazadoresMap[usuario.rechazadoPor] || null,
      };
    });

    return res.status(200).json(usuariosFormateados);
  } catch (error) {
    console.error('🔥 Error en obtenerUsuariosPorEstado:', error);
    return res.status(500).json({
      message: 'Error al obtener usuarios por estado.',
      detalles: error.message,
      stack: error.stack,
    });
  }
};






const actualizarUsuario = async (req, res) => {
  const { uuid } = req.params;
  const { nombre, apellido, email, dni, direccion, contraseña, rol } = req.body;

  try {
    // Buscar el usuario por UUID
    const usuario = await Usuario.findOne({ where: { uuid } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const cambios = [];
    const descripcionCambios = [];

    // Verificar y registrar cambios en cada campo
    if (nombre && nombre !== usuario.nombre) {
      cambios.push({ campo: 'nombre', valor_anterior: usuario.nombre, valor_nuevo: nombre });
      descripcionCambios.push(`Nombre cambiado de '${usuario.nombre}' a '${nombre}'`);
      usuario.nombre = nombre;
    }

    if (apellido && apellido !== usuario.apellido) {
      cambios.push({ campo: 'apellido', valor_anterior: usuario.apellido, valor_nuevo: apellido });
      descripcionCambios.push(`Apellido cambiado de '${usuario.apellido}' a '${apellido}'`);
      usuario.apellido = apellido;
    }

    if (email && email !== usuario.email) {
      cambios.push({ campo: 'email', valor_anterior: usuario.email, valor_nuevo: email });
      descripcionCambios.push(`Email cambiado de '${usuario.email}' a '${email}'`);
      usuario.email = email;
    }

    if (dni && dni !== usuario.dni) {
      cambios.push({ campo: 'dni', valor_anterior: usuario.dni, valor_nuevo: dni });
      descripcionCambios.push(`DNI cambiado de '${usuario.dni}' a '${dni}'`);
      usuario.dni = dni;
    }

    if (direccion) {
      const nuevaDireccion = JSON.stringify(direccion);
      const direccionActual = usuario.direccion ? JSON.stringify(usuario.direccion) : null;

      if (nuevaDireccion !== direccionActual) {
        const camposDireccion = ['calle', 'altura', 'barrio', 'departamento'];
        camposDireccion.forEach((campo) => {
          const valorAnterior = usuario.direccion?.[campo] || '-';
          const valorNuevo = direccion[campo] || '-';

          if (valorAnterior !== valorNuevo) {
            cambios.push({
              campo: `direccion.${campo}`,
              valor_anterior: valorAnterior,
              valor_nuevo: valorNuevo,
            });
            descripcionCambios.push(`Campo "direccion.${campo}" cambiado de '${valorAnterior}' a '${valorNuevo}'`);
          }
        });

        usuario.direccion = direccion;
      }
    }

    if (contraseña) {
      const hashedPassword = await bcrypt.hash(contraseña, 10);
      cambios.push({ campo: 'contraseña', valor_anterior: '******', valor_nuevo: '******' });
      descripcionCambios.push('Contraseña actualizada para el usuario.');
      usuario.password = hashedPassword;
    }

    if (rol && rol !== usuario.rolDefinitivo) {
      cambios.push({ campo: 'rol', valor_anterior: usuario.rolDefinitivo, valor_nuevo: rol });
      descripcionCambios.push(`Rol cambiado de '${usuario.rolDefinitivo}' a '${rol}'`);
      usuario.rolDefinitivo = rol;
    }

    // Guardar cambios en el usuario
    await usuario.save();

    // Registrar los cambios en el historial
    for (const [index, cambio] of cambios.entries()) {
      await HistorialCambios.create({
        usuario_id: uuid,
        campo: cambio.campo,
        valor_anterior: cambio.valor_anterior,
        valor_nuevo: cambio.valor_nuevo,
        descripcion: descripcionCambios[index],
      });
    }

    res.status(200).json({
      message: 'Usuario actualizado con éxito.',
      cambios,
      usuario,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario.', detalles: error.message });
  }
};


// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userRequesting = req.user;

    const usuario = await Usuario.findOne({ where: { uuid } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // ⚠️ Verificamos permisos
    const isAdmin = userRequesting.rolDefinitivo === 'admin';
    const esResponsableYDelegado = (
      userRequesting.tipo === 'juridica' &&
      !userRequesting.empresaUuid &&
      usuario.delegadoDe === userRequesting.uuid
    );

    if (!isAdmin && !esResponsableYDelegado) {
      return res.status(403).json({ message: 'No autorizado para eliminar este usuario.' });
    }

    await usuario.destroy();
    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario.' });
  }
};




const getUsuarioByUuid = async (req, res) => {
  const { uuid } = req.params;

  // ✅ Validación previa
  if (!uuid || !isUuid(uuid)) {
    return res.status(400).json({ mensaje: 'UUID inválido o no proporcionado.' });
  }

  try {
    const usuario = await Usuario.findOne({
      where: { uuid },
      attributes: ['uuid', 'nombre', 'apellido', 'email', 'dni', 'direccion', 'rolDefinitivo']
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al obtener el usuario.', error: error.message });
  }
};



const obtenerUsuariosPendientes = async (req, res) => {
  try {
    const usuariosPendientes = await Usuario.findAll({
      where: {
        estado: ['pendiente', 'pendiente_revision'], // Incluye ambos estados
      },
    });

    res.status(200).json(usuariosPendientes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios pendientes.' });
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
    res.status(500).json({ message: 'Error al obtener rol temporal.', error: error.message });
  }
};
const checkExistingUser = async (req, res) => {
  const { dni, email, nombre, apellido } = req.body;

  try {
    if (!dni && !email) {
      return res.status(400).json({
        mensaje: "Debes proporcionar al menos DNI o email.",
      });
    }

    // Construir cláusula dinámica
    const condiciones = [];

    if (dni) condiciones.push({ dni });
    if (email) condiciones.push({ email });

    // También agregamos búsqueda más estricta si se proporciona nombre/apellido
    if (dni && nombre && apellido) {
      condiciones.push({ dni, nombre, apellido });
    }

    const usuario = await Usuario.findOne({
      where: {
        [Op.or]: condiciones,
      },
    });

    if (usuario) {
      return res.status(200).json({
        existe: true,
        usuario,
        mensaje: "El usuario ya existe.",
      });
    }

    return res.status(200).json({
      existe: false,
      mensaje: "Usuario no encontrado.",
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al verificar el usuario.",
      detalles: error.message,
    });
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
    res.status(500).json({ message: 'Error al remover rol temporal.', error: error.message });
  }
};
const obtenerUsuarioDetalles = async (req, res) => {
  const { uuid } = req.query;
  console.log('➡️ UUID recibido:', uuid);

  // ✅ Prevención de error por UUID inválido
  if (!uuid || uuid === 'nuevo') {
    console.warn('⚠️ UUID no válido o creación de nuevo usuario. No se hace query.');
    return res.status(200).json({ usuario: null, mensaje: 'Modo creación: sin datos previos.' });
  }

  try {
    const usuario = await Usuario.findOne({
      where: { uuid },
      include: [
        {
          model: Empresa,
          as: 'empresa',
          attributes: ['uuid', 'razonSocial', 'cuit', 'email', 'direccion', 'estado', 'createdAt']
        },
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
    console.error('🔥 Error en obtenerUsuarioDetalles:', error);
    res.status(500).json({
      message: 'Error al obtener detalles del usuario.',
      detalles: error.message,
    });
  }
};




// controllers/usuarioController.js
const actualizarRolUsuario = async (req, res) => {
  const { uuid } = req.params;
  const { rolDefinitivo } = req.body;


  const rolesValidos = ['admin', 'usuario', 'moderador'];
  if (!rolDefinitivo || !rolesValidos.includes(rolDefinitivo)) {
    return res.status(400).json({ message: 'Rol definitivo válido es obligatorio.' });
  }

  try {
    // Buscar el usuario por UUID
    const usuario = await Usuario.findOne({ where: { uuid } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar el rol actual antes de actualizar

    // Actualizar el rol definitivo
    usuario.rolDefinitivo = rolDefinitivo;
    await usuario.save();

    // Verificar el rol después de actualizar

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
    res.status(500).json({ message: 'Error al obtener usuario.', error: error.message });
  }
};

const solicitarResetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      return res.status(404).json({ message: 'No se encontró un usuario con ese correo.' });
    }

    // 🔹 Generar un token único con vencimiento
    const resetToken = jwt.sign(
      { uuid: usuario.uuid },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // 🔹 Guardar el token en la base de datos
    await PasswordResetToken.create({
      userId: usuario.uuid,
      token: resetToken,
      expiresAt: new Date(Date.now() + 3600000),
    });

    // 🔹 Construcción del enlace de reseteo
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // 🔹 URL del logo en Cloudinary
    const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';

    // 🔹 Plantilla HTML con diseño mejorado
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <table style="width: 100%; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <thead>
            <tr>
              <th style="background: linear-gradient(to right, #1e3a8a, #3b82f6); color: #fff; padding: 16px; text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                  <img src="${logoSrc}" alt="Logo Registro de Bienes" style="max-width: 80px; height: auto;" />
                  <h1 style="margin: 0; font-size: 20px;">
                    Recuperación de Contraseña - Sistema Provincial Preventivo de Bienes Muebles Usados
                  </h1>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 16px; text-align: center;">
                <p>Hola <strong>${usuario.nombre}</strong>,</p>
                <p>
                  Hemos recibido una solicitud para restablecer tu contraseña.  
                  Para continuar con el proceso, haz clic en el siguiente botón:
                </p>
                <p>
                  <a href="${resetLink}" 
                     style="display: inline-block; background-color: #1e3a8a; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Restablecer Contraseña
                  </a>
                </p>
                <p>Si no realizaste esta solicitud, ignora este mensaje.</p>
                <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
                  Atentamente,<br>
                  El equipo del Sistema Provincial Preventivo de Bienes Muebles Usados.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // 🔹 Enviar el correo con la plantilla mejorada
    await enviarCorreo(
      email,
      'Recuperación de Contraseña - Sistema Provincial Preventivo de Bienes Muebles Usados',
      `Hola ${usuario.nombre}, hemos recibido una solicitud para restablecer tu contraseña.`,
      htmlContent
    );

    // 🔹 Responder con éxito
    res.status(200).json({
      message: 'Correo de recuperación enviado correctamente.',
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error al solicitar reseteo de contraseña.',
      error: error.message,
    });
  }
};



const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {

      const usuario = await Usuario.findOne({ where: { email } });

      if (!usuario) {
          return res.status(404).json({ message: 'No se encontró una cuenta con este correo electrónico.' });
      }

      const resetToken = jwt.sign({ uuid: usuario.uuid }, process.env.JWT_SECRET, { expiresIn: '1h' });

      await PasswordResetToken.create({
        userId: usuario.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      const resetLink = `https://regbim.minsegmza.gob.ar/reset-password/${resetToken}`;
      



      await enviarCorreo(usuario.email, 'Recuperación de Contraseña', 'Haz clic en el enlace para restablecer tu contraseña.', `
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <p><a href="${resetLink}" style="color:blue;">Restablecer Contraseña</a></p>
      `);


      return res.json({ message: 'Correo de recuperación enviado con éxito.' });
  } catch (error) {
      return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

const invitarDelegado = async (req, res) => {
  try {
    const { nombre, apellido, email, rolEmpresa } = req.body;
    const empresaUuid = req.user?.empresaUuid || req.user?.uuid;

    if (!empresaUuid) {
      return res.status(400).json({ message: 'No se pudo determinar la empresa emisora.' });
    }

    const yaExiste = await Usuario.findOne({ where: { email } });
    if (yaExiste) {
      return res.status(409).json({ message: 'Ese correo ya está registrado' });
    }

    const nuevoUuid = uuidv4();
    const passwordTemporal = await bcrypt.hash('temporal_' + Date.now(), 10);

    const delegado = await Usuario.create({
      uuid: nuevoUuid,
      nombre,
      apellido,
      email,
      estado: 'pendiente',
      tipo: 'fisica', // ✅ delegado es persona
      rolEmpresa,
      delegadoDeEmpresa: empresaUuid, // ✅ relación correcta
      password: passwordTemporal,
      rolDefinitivo: 'usuario',
    });

    const token = jwt.sign(
      { uuid: nuevoDelegado.uuid },  // ✅ Acá ya está bien
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    const linkActivacion = `${process.env.FRONTEND_URL}/usuarios/update-account/${token}`;

    const html = activacionDelegadoHTML({ nombre, enlace: linkActivacion });

    await enviarCorreo(
      email,
      'Fuiste invitado como delegado de empresa',
      `Hola ${nombre}, hacé clic para activar tu cuenta.`,
      html
    );

    return res.status(200).json({ message: '📨 Invitación enviada exitosamente al delegado.' });

  } catch (error) {
    console.error('❌ Error al invitar delegado:', error);
    return res.status(500).json({ message: 'Error interno al invitar delegado.' });
  }
};


const activarCuenta = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.uuid);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Solo permitir activación si no tenía password antes
    if (usuario.password) {
      return res.status(400).json({ message: 'La cuenta ya fue activada anteriormente' });
    }

    usuario.password = await bcrypt.hash(password, 10);
    usuario.estado = 'activo';
    usuario.mensajeBienvenidaEnviada = true;

    await usuario.save();

    return res.json({ success: true, message: 'Cuenta activada correctamente' });

  } catch (error) {
    console.error('❌ Error en activación:', error);
    return res.status(400).json({ message: 'Token inválido o expirado' });
  }
}; 



const getEmpresaByUuid = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid || !isUuid(uuid)) {
    return res.status(400).json({ message: 'UUID de empresa inválido.' });
  }

  try {
    const empresa = await Empresa.findOne({ where: { uuid } });

    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    res.status(200).json(empresa);
  } catch (error) {
    console.error('❌ Error al obtener empresa por UUID:', error);
    res.status(500).json({ message: 'Error del servidor', detalle: error.message });
  }
};



const asociarDelegadoExistente = async (req, res) => {
  const { usuarioUuid, empresaUuid } = req.body;

  if (!usuarioUuid || !empresaUuid) {
    return res.status(400).json({ message: 'Faltan datos' });
  }

  try {
    const usuario = await Usuario.findOne({ where: { uuid: usuarioUuid } });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    usuario.empresa_uuid = empresaUuid;
    usuario.delegadoDeEmpresa = empresaUuid;
    usuario.rolEmpresa = 'delegado';

    await usuario.save();

    return res.status(200).json({ message: 'Delegado asociado correctamente', usuario });
  } catch (error) {
    return res.status(500).json({ message: 'Error al asociar delegado', error: error.message });
  }
};



module.exports = {
  crearUsuario,
  login,
  cambiarEstadoUsuario, // Incluye la aprobación y rechazo de usuarios
  obtenerUsuariosPorEstado, // Para obtener usuarios aprobados, rechazados, pendientes, etc.
  actualizarUsuario,
  aprobarUsuario,
  eliminarUsuario,
  obtenerUsuarios, // Obtener todos los usuarios
  getUsuarioByUuid, // Obtener un usuario por su ID
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
  reintentarRegistro,
  solicitarResetPassword,
  forgotPassword,
  registrarDelegadoEmpresa,
  invitarDelegado,
  activarCuenta, 
  getEmpresaByUuid,
   asociarDelegadoExistente,
};

