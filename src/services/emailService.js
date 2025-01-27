require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración del transporter con Postmark

const transporter = nodemailer.createTransport({
  host: 'smtps.mendoza.gov.ar',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true, // Para registrar el proceso
  debug: true,  // Para obtener más detalles en caso de error
});

// Función para enviar correos
const enviarCorreo = async (to, subject, text, html, attachments = []) => {
  const mailOptions = {
    from: '"Registro de Bienes" <reg-bienesmuebles@mendoza.gov.ar>',
    to,
    subject,
    text,
    html,
    attachments, // Agregar archivos adjuntos
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.messageId);
  } catch (error) {
    console.error('Error enviando correo:', error.message);
    throw error;
  }
};


module.exports = { enviarCorreo };
