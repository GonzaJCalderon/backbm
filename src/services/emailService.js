// src/services/emailService.js

require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración del transporte con Mailtrap
const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
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
