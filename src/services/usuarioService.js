const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { enviarCorreo } = require('../services/emailService');


async function crearUsuarioPorTercero(data, creadoPorUuid = null) {
  const {
    dni, email, nombre, apellido, tipo,
    razonSocial, cuit, direccion,
    dniResponsable, nombreResponsable, apellidoResponsable,
    cuitResponsable, domicilioResponsable,
  } = data;

  // 1️⃣ Validar existencia previa
  const existe = await Usuario.findOne({ where: { dni } });
  if (existe) return existe; // Reutilizar usuario si ya existe

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
    dniResponsable: tipo === 'juridica' ? dniResponsable : null,
    nombreResponsable: tipo === 'juridica' ? nombreResponsable : null,
    apellidoResponsable: tipo === 'juridica' ? apellidoResponsable : null,
    cuitResponsable: tipo === 'juridica' ? cuitResponsable : null,
    domicilioResponsable: tipo === 'juridica' ? domicilioResponsable : null,
    estado: 'pendiente',
    password: defaultPassword,
    delegadoDe: creadoPorUuid,
  });

  const token = jwt.sign({ uuid: userUuid }, process.env.JWT_SECRET, { expiresIn: '1d' });

  const enlace = `${process.env.FRONTEND_URL}/usuarios/update-account/${token}`;
  const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif;">
      <h2>📦 Registro de Bienes Usados</h2>
      <p>Hola <b>${nombre}</b>,</p>
      <p>Has sido registrado como comprador/vendedor por un tercero.</p>
      <p><a href="${enlace}">👉 Click aquí para completar tu cuenta</a></p>
    </div>
  `;

  await enviarCorreo(email, 'Bienvenido a Registro de Bienes Usados', '', htmlContent);
  return nuevoUsuario;
}

module.exports = { crearUsuarioPorTercero };
