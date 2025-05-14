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
  origin: [
    'http://localhost:3000',
    'http://10.100.1.80:3000',
    'http://10.100.1.216:9501',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

// Manejo explícito de solicitudes OPTIONS
app.options('*', cors(corsOptions));

// Configuración de límites para solicitudes grandes
app.use(express.json({ limit: '1gb' })); // Límite de 1GB para solicitudes JSON
app.use(express.urlencoded({ limit: '1gb', extended: true })); // Límite de 1GB para formularios codificados

app.use(cookieParser());

// Cargar rutas
try {
  app.use('/bienes', require('./src/routes/bienes'));

  app.use('/usuarios', require('./src/routes/usuarios'));

  app.use('/auth', require('./src/routes/auth'));

  app.use('/stock', require('./src/routes/stock'));

  app.use('/search', require('./src/routes/search'));

  app.use('/transacciones', require('./src/routes/transacciones'));

  app.use('/excel', require('./src/routes/excel'));

  app.use('/historialcambios', require('./src/routes/HistorialCambios'));

  app.use('/uploads', require('./src/routes/uploads'));

  app.use('/renaper', require('./src/routes/renaper'));


} catch (error) {
}



// Inicialización de la base de datos y sincronización
(async () => {
  try {
    await sequelize.authenticate();

    await Usuario.sync({ alter: true });

    await Bien.sync({ alter: true });

    await Stock.sync({ alter: true });

    await Transaccion.sync({ alter: true });

    await DetallesBien.sync({ alter: true });

    await HistorialCambios.sync({ alter: true });

    await PasswordResetToken.sync({ alter: true });

    // Inicia el servidor
    app.listen(PORT, '0.0.0.0', () => {
    });
  } catch (error) {
    process.exit(1); // Salir si no puede inicializar correctamente
  }
})();

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err); // Si ya se envió una respuesta, termina aquí
  }
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Contacte al soporte',
  });
});

// Logs para asegurar que las variables de entorno están configuradas
