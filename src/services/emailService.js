require('dotenv').config();
const nodemailer = require('nodemailer');

// Configurar el transporter con credenciales reales
const transporter = nodemailer.createTransport({
  host: '10.160.1.86', // Dirección del servidor SMTP
  port: 587,           // Puerto SMTP
  secure: false,       // Usa `true` si estás usando el puerto 465 (conexión segura)
  auth: {
    user: process.env.SMTP_USER || 'reg-bienesmuebles@mendoza.gov.ar', // Tu usuario
    pass: process.env.SMTP_PASSWORD || '8=bbucjo', // Tu contraseña
  },
  tls: {
    rejectUnauthorized: false, // Permitir certificados no verificados (solo si es necesario)
  },
});


// Función para enviar correos
const enviarCorreo = async (to, subject, text, html) => {
  if (!to || !subject || !text || !html) {
    throw new Error('Datos incompletos para enviar el correo');
  }

  const mailOptions = {
    from: '"Registro de Bienes" <reg-bienesmuebles@mendoza.gov.ar>',
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.messageId);
    console.log('Vista previa del correo:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error enviando correo:', error.message);
    throw error;
  }
};

module.exports = { enviarCorreo };
