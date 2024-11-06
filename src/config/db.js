const { Sequelize } = require('sequelize');

// Carga las variables de entorno
require('dotenv').config();

// Verifica que las variables de entorno están cargadas
console.log('Database config:', {
  DB_NAME: process.env.DB_BM,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT
});

// Configuración de Sequelize
// Configuración de Sequelize
const sequelize = new Sequelize('bienes_muebles', 'cchiera', 'Chiera+3', {
  host: '10.100.1.80',
  port: '5432',
  dialect: 'postgres',
  logging: false, // Cambia a true si necesitas ver las consultas SQL
});

// Verifica la conexión
sequelize.authenticate()
  .then(() => {
    console.log('Conexión a la base de datos exitosa');
  })
  .catch(err => {
    console.error('No se pudo conectar a la base de datos:', err);
  });

module.exports = sequelize;
