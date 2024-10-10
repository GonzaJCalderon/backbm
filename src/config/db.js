require('dotenv').config(); // Asegúrate de que esto esté al principio

const { Sequelize } = require('sequelize');
const { DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT } = process.env; 

// Verifica que las variables de entorno están cargadas
console.log('Database config:', {
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT
});

const sequelize = new Sequelize(
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
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
