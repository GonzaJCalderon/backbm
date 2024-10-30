// Importar dependencias
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const sequelize = require('./src/config/db'); // Configuración de Sequelize
const path = require('path');
const upload = require('./src/config/multerConfig'); // Asegúrate de que esta ruta sea correcta

// Importar modelos
const { Usuario, Bien, Transaccion } = require('./src/models');

const app = express();
const PORT = 5005;

// Configuración de CORS
const corsOptions = {
  origin: [
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

// Middleware para analizar el cuerpo de las solicitudes JSON
app.use(express.json());
// Middleware para analizar el cuerpo de las solicitudes URL-encoded
app.use(express.urlencoded({ extended: true }));

// Configuración de cookie-parser
app.use(cookieParser());

// Configuración de cookies con atributos SameSite
app.use((req, res, next) => {
  res.cookie('nombreCookie', 'valorCookie', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
  });
  next();
});

// Servir la carpeta 'uploads' públicamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
const bienesRoutes = require('./src/routes/bienes');
const usuariosRoutes = require('./src/routes/usuarios');
const authRoutes = require('./src/routes/auth');
const salesRoutes = require('./src/routes/sales');
const stockRoutes = require('./src/routes/stock');

// Usar rutas
app.use('/bienes', bienesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/auth', authRoutes);
app.use('/sales', salesRoutes);
app.use('/stock', stockRoutes);

// Verificar la conexión a la base de datos
sequelize.authenticate()
  .then(() => {
    console.log('Conexión a la base de datos exitosa');
  })
  .catch(err => {
    console.error('No se pudo conectar a la base de datos:', err);
  });

// Sincronizar la base de datos
// sequelize.sync({ alter: true })
//   .then(() => {
//     console.log('Base de datos sincronizada');
//   })
//   .catch(error => {
//     console.error('Error al sincronizar la base de datos:', error);
//   });

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
