// src/services/emailService.js

require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración del transporte
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Puedes cambiar esto según el servicio que estés usando
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para enviar correos electrónicos
const enviarCorreo = (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { enviarCorreo };
