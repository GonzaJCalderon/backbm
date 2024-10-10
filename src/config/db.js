const { Sequelize } = require('sequelize');

// Carga las variables de entorno
require('dotenv').config();

// Verifica que las variables de entorno están cargadas
console.log('Database config:', {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT
});

// Configuración correcta de Sequelize
const sequelize = new Sequelize(
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  {
    logging: false, // Cambia a true si necesitas ver las consultas SQL
    native: false,
  }
);

// Verifica la conexión
sequelize.authenticate()
  .then(() => {
    console.log('Conexión a la base de datos exitosa');
  })
  .catch(err => {
    console.error('No se pudo conectar a la base de datos:', err);
  });

module.exports = sequelize;
