require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración del transporter con Postmark
const transporter = nodemailer.createTransport({
    host: 'smtps.mendoza.gov.ar', // Dirección del servidor SMTP
    port: 465,                    // Puerto seguro con SSL
    secure: true,                 // SSL habilitado
    auth: {
      user: process.env.SMTP_USER, // Se carga desde el archivo .env
      pass: process.env.SMTP_PASS, // Se carga desde el archivo .env
    },
  });
  

// Función para enviar correos
const enviarCorreo = async (to, subject, text, html) => {
  if (!to || !subject || !text || !html) {
    throw new Error('Datos incompletos para enviar el correo');
  }

  const mailOptions = {
    from: '"Registro de Bienes" <reg-bienesmuebles@mendoza.gov.ar>', // Dirección verificada en el servidor
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
  } catch (error) {
    throw error;
  }
};

// Ejecutar prueba
(async () => {
  try {
    await enviarCorreo(
      'destinatario@example.com', // Cambia por un correo válido para la prueba
      'Prueba de Correo',
      'Este es un correo de prueba enviado desde el servicio.',
      '<p>Este es un correo de <b>prueba</b> enviado desde el servicio.</p>'
    );
  } catch (error) {
  }
})();
