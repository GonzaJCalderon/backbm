const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');


require('dotenv').config();

const { Usuario, Bien, Stock, Transaccion, HistorialCambios, DetallesBien, PasswordResetToken } = require('../models'); // Importa los modelos correctamente

const { validarCampos } = require('../utils/validationUtils');
const { enviarCorreo } = require('../services/emailService');
const moment = require('moment');
const config = require('../config/auth.config');



const DEFAULT_PASSWORD = 'Contraseña123';
const secretKey = process.env.SECRET_KEY || 'bienes_muebles';
const refreshToken = process.env.REFRESH_SECRET_KEY || 'refresh_token ';
const { v4: uuidv4 } = require('uuid');



// Crear un nuevo usuario
const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, tipo, dni, direccion } = req.body;

    // 🔹 Validar que todos los campos estén completos
    if (!nombre || !apellido || !email || !password || !tipo || !dni || !direccion) {
      return res.status(400).json({
        message: 'Todos los campos obligatorios deben ser proporcionados.',
      });
    }

    // 🔹 Verificar si el usuario ya existe por email o DNI
    const usuarioExistente = await Usuario.findOne({
      where: { [Op.or]: [{ email }, { dni }] },
    });

    if (usuarioExistente) {
      return res.status(400).json({
        message: 'Ya existe un usuario con este correo electrónico o DNI.',
      });
    }

    // 🔹 Hashear la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Crear el usuario en la base de datos
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password: hashedPassword,
      tipo,
      dni,
      direccion,
      estado: 'pendiente', // Estado inicial
    });

    // 🔹 URL del logo en Cloudinary (reemplaza con tu enlace)
    const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';

    // 🔹 Plantilla HTML con la imagen desde la URL
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <table style="width: 100%; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <thead>
                <tr>
                    <th style="background: linear-gradient(to right, #1e3a8a, #3b82f6); color: #fff; padding: 16px; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                            <img 
                                src="${logoSrc}" 
                                alt="Logo Registro de Bienes" 
                                style="max-width: 80px; height: auto;" />
                            <h1 style="margin: 0; font-size: 20px;">
                              ¡Bienvenido al Sistema Provincial Preventivo de Bienes Muebles Usados!
                            </h1>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 16px; text-align: center;">
                        <p>Hola <strong>${nombre}</strong>,</p>
                        <p>
                            Tu solicitud de registro está 
                            <strong>pendiente de revisión</strong>. Pronto te informaremos sobre el estado de tu cuenta.
                        </p>
                        <p>
                            Mientras tanto, si tienes alguna duda o consulta, no dudes en contactarnos. Estamos aquí para ayudarte.
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

    // 🔹 Enviar el correo con la plantilla HTML que incluye la imagen de Cloudinary
    await enviarCorreo(
      email,
      'Solicitud Pendiente en el Sistema Provincial Preventivo de Registro de Bienes Muebles Usados',
      `Hola ${nombre}, tu solicitud está pendiente de revisión.`,
      htmlContent
    );

    // 🔹 Responder con éxito
    res.status(201).json({
      message: 'Usuario creado y correo enviado exitosamente.',
      usuario: nuevoUsuario,
    });

  } catch (error) {
    console.error('Error al crear usuario o enviar correo:', error);
    res.status(500).json({ message: 'Error interno del servidor.', detalles: error.message });
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

    console.log("🔍 Usuario encontrado en la BD:", usuario.toJSON());
    console.log("🔍 Verificando rolDefinitivo:", usuario.rolDefinitivo);

    // 🚀 Si `rolDefinitivo` es `NULL`, asignar un valor predeterminado
    if (!usuario.rolDefinitivo) {
      console.warn('⚠️ Usuario sin rol definido, asignando "usuario" por defecto');
      usuario.rolDefinitivo = 'usuario';
    }

    // Generar token principal (JWT) con rolDefinitivo
    const token = jwt.sign(
      { uuid: usuario.uuid, email: usuario.email, rolDefinitivo: usuario.rolDefinitivo || 'usuario' },
      config.secret,
      { expiresIn: '1h' }
    );
    
    

    // Generar refresh token
    const refreshToken = jwt.sign(
      { uuid: usuario.uuid },
      config.secret,
      { expiresIn: config.jwtRefreshExpiration }
    );

    console.log("📢 Token generado:", token);
    console.log("📢 Token decodificado:", jwt.decode(token));

    // Construir objeto de dirección
    const direccion = usuario.direccion || {
      calle: '',
      altura: '',
      barrio: '',
      departamento: '',
    };

    const response = {
      usuario: {
        uuid: usuario.uuid,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        dni: usuario.dni,
        rolDefinitivo: usuario.rolDefinitivo,
        direccion,
      },
      token,
      refreshToken,
    };

    console.log("✅ Respuesta final del backend:", JSON.stringify(response, null, 2));

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error en el login:', error.message);
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
  try {
    const { dni, email, nombre, apellido, tipo, razonSocial, cuit, direccion } = req.body;

    if (!dni || !email || !nombre || !apellido) {
      return res.status(400).json({
        mensaje: 'Faltan campos obligatorios: DNI, email, nombre y apellido son requeridos.',
      });
    }

    const existingUserByEmail = await Usuario.findOne({ where: { email } });
    if (existingUserByEmail) {
      return res.status(400).json({
        mensaje: 'El email ya está registrado. Intenta con otro correo electrónico.',
      });
    }

    const existingUserByDNI = await Usuario.findOne({ where: { dni } });
    if (existingUserByDNI) {
      return res.status(400).json({
        mensaje: 'El DNI ya está registrado.',
      });
    }

    const defaultPassword = await bcrypt.hash('temporal_' + Date.now(), 10);

    // Generar el UUID manualmente con uuidv4
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
      estado: 'pendiente',
      password: defaultPassword,
    });

    const token = jwt.sign(
      { userUuid: nuevoUsuario.uuid },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('Token generado:', token);
    console.log('Payload utilizado:', { userUuid: nuevoUsuario.uuid });

    const enlace = `${process.env.FRONTEND_URL}/usuarios/update-account/${token}`;

    // 🔹 URL del logo en Cloudinary (reemplaza con tu enlace)
    const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';

    // 🔹 Diseño HTML actualizado (imagen desde la URL)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <table style="width: 100%; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <thead>
            <tr>
              <th style="background: linear-gradient(to right, #1e3a8a, #3b82f6); color: #fff; padding: 16px; text-align: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                  <img
                    src="${logoSrc}"
                    alt="Logo Registro de Bienes"
                    style="max-width: 80px; height: auto;"
                  />
                  <h1 style="margin: 0; font-size: 20px;">
                    ¡Bienvenido al Sistema Provincial Preventivo de Registro de Bienes Muebles Usados!
                  </h1>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 16px; text-align: center;">
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>
                  Has sido registrado en nuestra plataforma. Para completar tu registro y actualizar tu contraseña, haz clic en el siguiente enlace:
                </p>
                <p>
                  <a href="${enlace}" style="display: inline-block; padding: 12px 24px; background-color: #1e88e5; color: #fff; text-decoration: none; border-radius: 4px;">Actualizar Cuenta</a>
                </p>
                <p>
                  Si no solicitaste este registro, ignora este mensaje.
                </p>
                <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
                  Atentamente,<br>
                  El equipo del Sistema Provincial Preventivo de Bienes Muebles Usados.
                </p>
              </td>
            </tr>
          </tbody>
          <tfoot>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // 🔹 Enviar correo con HTML que incluye la imagen de Cloudinary
    await enviarCorreo(
      email,
      'Completa tu registro en el Sistema Provincial Preventivo de Registro de Bienes Muebles Usados',
      `Hola ${nombre}, haz clic en el enlace para completar tu registro.`,
      htmlContent
    );

    res.status(201).json({
      mensaje: 'Usuario registrado y correo enviado con éxito.',
      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error('Error al registrar usuario por tercero:', error);
    res.status(500).json({
      mensaje: 'Error interno al registrar el usuario.',
      detalles: error.message,
    });
  }
};


const updateAccount = async (req, res) => {
  const { token } = req.params; // Extrae el token de los parámetros de la URL

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);

    // Extraer la propiedad userUuid del token
    const { userUuid } = decoded;
    if (!userUuid) {
      return res.status(400).json({ mensaje: 'Token inválido: no contiene UUID.' });
    }

    console.log('UUID decodificado:', userUuid);

    // Buscar al usuario en la base de datos usando el userUuid
    // -- Ajusta "userUuid" en el WHERE por el nombre de la columna de tu tabla (o modelo).
    //    Si tu columna se llama "uuid", entonces usa: { where: { uuid: userUuid } }
    const usuario = await Usuario.findOne({ where: { userUuid } });
    console.log('Usuario encontrado:', usuario);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    // Actualizar datos del usuario
    const { nombre, apellido, newPassword } = req.body;

    if (!nombre || !apellido || !newPassword) {
      return res.status(400).json({ mensaje: 'Nombre, apellido y contraseña son obligatorios.' });
    }

    // Asignar valores
    usuario.nombre = nombre;
    usuario.apellido = apellido;
    usuario.password = await bcrypt.hash(newPassword, 10);
    usuario.estado = 'aprobado'; // Cambia el estado si tu lógica lo requiere

    // Guardar cambios
    await usuario.save();

    return res.status(200).json({ mensaje: 'Cuenta actualizada con éxito.' });

  } catch (error) {
    console.error('Error al procesar el token:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Token expirado.' });
    }

    return res.status(400).json({
      mensaje: 'Token inválido o error interno.',
      detalles: error.message
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
      console.error('Error en resetPassword:', error);
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
    console.error('Error al aprobar usuario:', error);
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

  console.log(`\n=== Cambiar estado del usuario ===`);
  console.log(`UUID recibido: ${uuid}`);
  console.log('Payload recibido:', req.body);

  try {
    console.log(`Buscando usuario con UUID: ${uuid}`);
    const usuario = await Usuario.findOne({ where: { uuid } });
    if (!usuario) {
      console.error(`Usuario con UUID ${uuid} no encontrado`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log('Usuario encontrado:', usuario);

    console.log(`Actualizando estado del usuario a: ${estado}`);
    usuario.estado = estado;

    // URL del logo
    const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';

    if (estado === 'aprobado') {
      console.log('Procesando aprobación...');
      usuario.fechaAprobacion = fechaAprobacion || new Date().toISOString();
      usuario.aprobadoPor = aprobadoPor;

      if (usuario.email) {
        console.log(`Enviando correo de aprobación a: ${usuario.email}`);
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
          console.log(`Correo de aprobación enviado a: ${usuario.email}`);
        } catch (emailError) {
          console.error('Error al enviar correo de aprobación:', emailError);
        }
      }
    }

    if (estado === 'rechazado') {
      console.log('Procesando rechazo...');
      usuario.fechaRechazo = fechaRechazo || new Date().toISOString();
      usuario.rechazadoPor = rechazadoPor;
      usuario.motivoRechazo = motivoRechazo;

      if (usuario.email) {
        console.log(`Enviando correo de rechazo a: ${usuario.email}`);
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
          console.log(`Correo de rechazo enviado a: ${usuario.email}`);
        } catch (emailError) {
          console.error('Error al enviar correo de rechazo:', emailError);
        }
      }
    }

    await usuario.save();
    console.log(`Usuario ${uuid} actualizado a estado ${estado}`);

    return res.status(200).json({
      message: `Usuario ${estado} correctamente`,
      usuario,
    });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    return res.status(500).json({ message: 'Error interno al cambiar estado del usuario.' });
  }
};



const reintentarRegistro = async (req, res) => {
  const { uuid } = req.params;
  const { nombre, apellido, email, dni, direccion } = req.body;

  try {
    console.log('UUID recibido:', uuid);
    console.log('Datos recibidos:', req.body);

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

    console.log('Usuario actualizado:', usuario);
    res.status(200).json({
      message: 'Registro reenviado correctamente para su revisión.',
      usuario,
    });
  } catch (error) {
    console.error('Error al reenviar registro:', error);
    res.status(500).json({ message: 'Error interno al reenviar registro.' });
  }
};



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
    const usuariosPendientes = await Usuario.findAll({
      where: {
        estado: ['pendiente', 'pendiente_revision'], // Incluye ambos estados
      },
    });

    res.status(200).json(usuariosPendientes);
  } catch (error) {
    console.error('Error al obtener usuarios pendientes:', error);
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
  const { dni, nombre, apellido } = req.body;

  try {
    if (!dni || !nombre || !apellido) {
      return res.status(400).json({ mensaje: "DNI, nombre y apellido son requeridos." });
    }

    const usuario = await Usuario.findOne({ where: { dni, nombre, apellido } });

    if (usuario) {
      return res.status(200).json({
        existe: true,
        usuario,
        mensaje: "El usuario ya existe.",
      });
    }

    return res.status(200).json({ existe: false, mensaje: "Usuario no encontrado." });
  } catch (error) {
    console.error("Error en checkExistingUser:", error.message);
    res.status(500).json({ mensaje: "Error al verificar el usuario.", detalles: error.message });
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
      process.env.SECRET_KEY,
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
    console.error('Error en solicitarResetPassword:', error);
    res.status(500).json({
      message: 'Error al solicitar reseteo de contraseña.',
      error: error.message,
    });
  }
};



const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
      console.log("📩 Iniciando proceso de recuperación para:", email);

      const usuario = await Usuario.findOne({ where: { email } });

      if (!usuario) {
          console.log("❌ Usuario no encontrado con email:", email);
          return res.status(404).json({ message: 'No se encontró una cuenta con este correo electrónico.' });
      }

      const resetToken = jwt.sign({ uuid: usuario.uuid }, process.env.JWT_SECRET, { expiresIn: '1h' });

      console.log("🔑 Token generado:", resetToken);

      await PasswordResetToken.create({
          userId: usuario.id,
          token: resetToken,
          expiresAt: new Date(Date.now() + 3600000)
      });

      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      console.log("🔗 Link de recuperación generado:", resetLink);

      await enviarCorreo(usuario.email, 'Recuperación de Contraseña', 'Haz clic en el enlace para restablecer tu contraseña.', `
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <p><a href="${resetLink}" style="color:blue;">Restablecer Contraseña</a></p>
      `);

      console.log(`✅ Correo enviado a: ${usuario.email}`);

      return res.json({ message: 'Correo de recuperación enviado con éxito.' });
  } catch (error) {
      console.error('❌ Error en forgotPassword:', error);
      return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
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
  reintentarRegistro,
  solicitarResetPassword,
  forgotPassword,


};

