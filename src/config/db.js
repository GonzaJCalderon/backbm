const { Sequelize } = require('sequelize');
require('dotenv').config(); // Asegurar que dotenv se carga

const isLocal = process.env.DB_BM === 'bienes_muebles';

console.log('Usando base de datos:', isLocal ? 'Local' : 'Remota');
console.log('Host:', isLocal ? process.env.DB_HOST_LOCAL : process.env.DB_HOST_REMOTE);
console.log('Base de datos:', isLocal ? process.env.DB_NAME_LOCAL : process.env.DB_NAME_REMOTE);
console.log('Usuario:', isLocal ? process.env.DB_USER_LOCAL : process.env.DB_USER_REMOTE);
console.log('Puerto:', isLocal ? process.env.DB_PORT_LOCAL : process.env.DB_PORT_REMOTE);

const sequelize = new Sequelize(
  isLocal ? process.env.DB_BM : process.env.DB_NAME_LOCAL,
  isLocal ? process.env.DB_USER : process.env.DB_USER_LOCAL,
  isLocal ? process.env.DB_PASS : process.env.DB_PASSWORD_LOCAL,
  {
    host: isLocal ? process.env.DB_HOSTNAME : process.env.DB_HOST_LOCAL,
    port: isLocal ? process.env.PSQLPORT : process.env.DB_PORT_LOCAL,
    dialect: 'postgres',
    logging: false, // Cambia a 'true' si necesitas ver las consultas SQL
  }
);

module.exports = sequelize;
