const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Usuario, Bien, Stock, Transaccion, DetallesBien, HistorialCambios, Message, Empresa, PasswordResetToken, TransaccionDetalle } = require('./src/models');

const app = express();
const PORT = process.env.PORT || 5005;

// ✅ Verificar que las variables de entorno están bien cargadas
console.log('🔹 Modo:', process.env.NODE_ENV);
console.log('🔹 Puerto configurado:', PORT);
console.log('🔹 Base de datos:', process.env.DB_NAME || 'No configurado');

// Configuración de CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://10.100.1.80:3000',
    'http://10.100.1.80:5005',
    'http://10.100.1.216:9501',
    ''
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1gb' })); 
app.use(express.urlencoded({ limit: '1gb', extended: true }));

app.use(cookieParser());

// ✅ Carga de Rutas con Logs
const routes = [

  { path: '/bienes', file: './src/routes/bienes' },
  { path: '/usuarios', file: './src/routes/usuarios' },
  { path: '/auth', file: './src/routes/auth' },
  { path: '/stock', file: './src/routes/stock' },
  { path: '/search', file: './src/routes/search' },
  { path: '/transacciones', file: './src/routes/transacciones' },
  { path: '/excel', file: './src/routes/excel' },
  { path: '/historialcambios', file: './src/routes/historialCambios' },
  { path: '/uploads', file: './src/routes/uploads' },
  { path: '/renaper', file: './src/routes/renaper' },
  { path: '/messages', file: './src/routes/messages' },
 {path: '/empresas', file: './src/routes/empresas' },
 { path: '/auth', file: './src/routes/auth' },

];

routes.forEach(route => {
  try {
    app.use(route.path, require(route.file));
    console.log(`✅ Ruta cargada: ${route.path}`);
  } catch (error) {
    console.error(`❌ Error al cargar la ruta ${route.path}:`, error.message);
  }
});

// ✅ Inicialización de la Base de Datos y Servidor
(async () => {
  try {
    console.log('📡 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Base de datos conectada correctamente.');

    console.log('🔄 Sincronizando modelos...');
    await Usuario.sync({ alter: true });
    await Bien.sync({ alter: true });
    await Stock.sync({ alter: true });
    await Transaccion.sync({ alter: true });
    await DetallesBien.sync({ alter: true });
    await HistorialCambios.sync({ alter: true });
    await PasswordResetToken.sync({ alter: true });
    await Message.sync({ alter: true });
    await Empresa.sync({ alter: true });
    await TransaccionDetalle.sync({ alter: true });
  

    console.log('✅ Modelos sincronizados correctamente.');

    // ✅ Iniciar el servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor en línea en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error en la inicialización del servidor:', error.message);
    process.exit(1);
  }
})();

// ✅ Middleware de Manejo Global de Errores
app.use((err, req, res, next) => {
  console.error('🔥 Error en la aplicación:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Contacte al soporte',
  });
});
