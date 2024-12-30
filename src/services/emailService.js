require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter;

nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error('Error creando cuenta de prueba Ethereal', err);
    return;
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  console.log('Cuenta de prueba Ethereal creada:', account.user);
});

const enviarCorreo = async (to, subject, text, html) => {
  if (!transporter) {
    throw new Error('Transporter no inicializado');
  }

  if (!to || !subject || !text || !html) {
    throw new Error('Datos incompletos para enviar el correo');
  }

  const mailOptions = {
    from: '"Soporte" <no-reply@example.com>',
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
