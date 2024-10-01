const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const sequelize = require('./src/config/db');
const path = require('path');  // Importar el módulo 'path'

// Importar modelos
const { Usuario, Bien, Transaccion } = require('./src/models'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS
const corsOptions = {
  origin: [
    'https://bienesmueblesfront.vercel.app', 
    'http://localhost:3000'  
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

// Configuración de bodyParser
app.use(bodyParser.json());

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

// Importar rutas
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

// Sincronizar la base de datos
sequelize.sync({ alter: true }) // Usa alter para ajustar la base de datos a los modelos actuales
  .then(() => {
    console.log('Base de datos sincronizada');
    // Puedes poner aquí cualquier lógica adicional después de sincronizar, si es necesario
  })
  .catch(error => {
    console.error('Error al sincronizar la base de datos:', error);
  });

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
