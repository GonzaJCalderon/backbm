const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';

exports.activacionDelegadoHTML = ({ nombre, enlace }) => `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Activación de Cuenta</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 30px;">
      <img src="${logoSrc}" alt="Gobierno de Mendoza" style="width: 120px; display: block; margin: 0 auto 20px;" />
      <h2 style="text-align: center; color: #2c3e50;">Registro de Bienes Muebles Usados</h2>
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Has sido asignado como delegado por tu empresa en el sistema.</p>
      <p>Para completar tu registro y establecer tu contraseña, hacé clic en el siguiente botón:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${enlace}" style="background-color: #2c7be5; color: white; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
          Activar Cuenta
        </a>
      </div>
      <p>Si no solicitaste este correo, podés ignorarlo.</p>
      <p style="font-size: 12px; color: #888; text-align: center;">Gobierno de Mendoza · Registro de Bienes</p>
    </div>
  </body>
</html>
`;
