const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Usuario, Bien, Stock, Transaccion, DetallesBien, HistorialCambios, Message, Empresa, PasswordResetToken, TransaccionDetalle } = require('./src/models');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5005;

// ✅ Seguridad: Helmet ayuda a proteger la app configurando varios headers HTTP
app.use(helmet());

// ✅ Seguridad: Limitador de peticiones para evitar ataques de fuerza bruta o DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Limita cada IP a 1000 peticiones por ventana
  message: {
    message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ Verificar que las variables de entorno están bien cargadas
console.log('🔹 Modo:', process.env.NODE_ENV);
console.log('🔹 Puerto configurado:', PORT);
console.log('🔹 Base de datos:', process.env.DB_NAME || 'No configurado');

// Configuración de CORS
const corsOptions = {
  origin: [
    'https://regbim.minsegmza.gob.ar',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://10.100.1.64:3000',
    'http://10.100.1.80:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
 { path: '/empresas', file: './src/routes/empresas' },

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
    // 🚀 SINCRONIZACIÓN DESACTIVADA PARA PROTEGER DATOS REALES
    console.log('⏳ Saltando sincronización de tablas para usar datos existentes...');
    
    /*
    // 1. Primero las que no dependen de nadie
    await Empresa.sync({ alter: true });
    
    // 2. Luego las que dependen de Empresa (como Usuario)
    await Usuario.sync({ alter: true });
    await Bien.sync({ alter: true });
    
    // 3. El resto de tablas
    await Stock.sync({ alter: true });
    await Transaccion.sync({ alter: true });
    await DetallesBien.sync({ alter: true });
    await HistorialCambios.sync({ alter: true });
    await PasswordResetToken.sync({ alter: true });
    await Message.sync({ alter: true });
    await TransaccionDetalle.sync({ alter: true });
    */

    console.log('✅ Servidor configurado para usar la estructura de tablas actual.');
  

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
