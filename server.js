const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { sequelize, Usuario, Bien, Stock, Transaccion, DetallesBien, HistorialCambios, PasswordResetToken, Message } = require('./src/models'); // Importar modelos configurados
require('dotenv').config();
const bcrypt = require('bcryptjs');


const app = express();
const PORT = process.env.PORT || 5005;

// Configuración de CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://10.100.1.80:3000',
    'http://10.100.1.80:5005', // Asegura que el frontend puede acceder al backend
    'http://10.100.1.216:9501',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


// Configuración de límites para solicitudes grandes
app.use(express.json({ limit: '1gb' })); // Límite de 1GB para solicitudes JSON
app.use(express.urlencoded({ limit: '1gb', extended: true })); // Límite de 1GB para formularios codificados

app.use(cookieParser());

// Cargar rutas
try {
  console.log('Cargando rutas de bienes...');
  app.use('/bienes', require('./src/routes/bienes'));

  console.log('Cargando rutas de usuarios...');
  app.use('/usuarios', require('./src/routes/usuarios'));

  console.log('Cargando rutas de auth...');
  app.use('/auth', require('./src/routes/auth'));

  console.log('Cargando rutas de stock...');
  app.use('/stock', require('./src/routes/stock'));

  console.log('Cargando rutas de búsqueda...');
  app.use('/search', require('./src/routes/search'));

  console.log('Cargando rutas de transacciones...');
  app.use('/transacciones', require('./src/routes/transacciones'));

  console.log('Cargando rutas de Excel...');
  app.use('/excel', require('./src/routes/excel'));

  console.log('Cargando rutas de Historial Cambios...');
  app.use('/historialcambios', require('./src/routes/historialCambios'));

  console.log('Cargando rutas de Uploads...');
  app.use('/uploads', require('./src/routes/uploads'));

  console.log('Cargando rutas de renaper...');
  app.use('/renaper', require('./src/routes/renaper'));

  console.log('Cargando rutas de mensajes...');
  app.use('/messages', require('./src/routes/messages'));


} catch (error) {
  console.error('Error al cargar rutas:', error.message);
}



// Inicialización de la base de datos y sincronización
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos exitosa');

    await Usuario.sync({ alter: true });
    console.log('Modelo Usuario sincronizado.');

    await Bien.sync({ alter: true });
    console.log('Modelo Bien sincronizado.');

    await Stock.sync({ alter: true });
    console.log('Modelo Stock sincronizado.');

    await Transaccion.sync({ alter: true });
    console.log('Modelo Transaccion sincronizado.');

    await DetallesBien.sync({ alter: true });
    console.log('Modelo DetallesBien sincronizado.');

    await HistorialCambios.sync({ alter: true });
    console.log('Modelo HistorialCambios sincronizado.');

    await PasswordResetToken.sync({ alter: true });
    console.log('Modelo PasswordResetToken sincronizado.');

    await Message.sync({ alter: true });
    console.log('Modelo Message sincronizado.');

    // Inicia el servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error durante la inicialización:', error.message);
    process.exit(1); // Salir si no puede inicializar correctamente
  }
})();

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error en el servidor:', err.message);
  if (res.headersSent) {
    return next(err); // Si ya se envió una respuesta, termina aquí
  }
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Contacte al soporte',
  });
});

// Logs para asegurar que las variables de entorno están configuradas
console.log('Puerto configurado:', process.env.PORT);
console.log('API URL Remote:', process.env.API_URL_REMOTE);