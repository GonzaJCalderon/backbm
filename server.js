const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { sequelize, Usuario, Bien, Stock, Transaccion, DetallesBien, HistorialCambios, PasswordResetToken } = require('./src/models'); // Importar modelos configurados
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5005;

// Configuración de CORS
const corsOptions = {
  origin: ['http://localhost:3000', 'http://10.100.1.80:3000'], // Añade todas las URLs necesarias
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Propietario-UUID'],
  credentials: true,
};
app.use(cors(corsOptions));

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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
  app.use('/historialcambios', require('./src/routes/HistorialCambios'));

  
  console.log('Cargando rutas de Uploads...');
  app.use('/uploads', require('./src/routes/uploads'));

  


  


} catch (error) {
  console.error('Error al cargar rutas:', error.message);
}

// Inicialización de la base de datos y sincronización
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos exitosa');

  

    await Usuario.sync({ alter: true }); // Luego sincroniza usuarios con la relación a roles
    console.log('Modelo Usuario sincronizado.');

    // Sincronizar otros modelos
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

    // Inicia el servidor
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error durante la inicialización:', error);
  }
})();


// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error en el servidor:', err.message);
  if (res.headersSent) {
    return next(err); // Si ya se envió una respuesta, termina aquí
  }
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});
