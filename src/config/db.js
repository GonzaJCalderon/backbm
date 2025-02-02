const { Sequelize } = require('sequelize');
require('dotenv').config(); // Asegurar que dotenv se carga

const isLocal = process.env.DB_USE === 'local';

console.log('Usando base de datos:', isLocal ? 'Local' : 'Remota');
console.log('Host:', isLocal ? process.env.DB_HOST_LOCAL : process.env.DB_HOST_REMOTE);
console.log('Base de datos:', isLocal ? process.env.DB_NAME_LOCAL : process.env.DB_NAME_REMOTE);
console.log('Usuario:', isLocal ? process.env.DB_USER_LOCAL : process.env.DB_USER_REMOTE);
console.log('Puerto:', isLocal ? process.env.DB_PORT_LOCAL : process.env.DB_PORT_REMOTE);

const sequelize = new Sequelize(
  isLocal ? process.env.DB_NAME_LOCAL : process.env.DB_NAME_REMOTE,
  isLocal ? process.env.DB_USER_LOCAL : process.env.DB_USER_REMOTE,
  isLocal ? process.env.DB_PASSWORD_LOCAL : process.env.DB_PASSWORD_REMOTE,
  {
    host: isLocal ? process.env.DB_HOST_LOCAL : process.env.DB_HOST_REMOTE,
    port: isLocal ? process.env.DB_PORT_LOCAL : process.env.DB_PORT_REMOTE,
    dialect: 'postgres',
    logging: false, // Cambia a 'true' si necesitas ver las consultas SQL
  }
);

module.exports = sequelize;
