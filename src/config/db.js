const { Sequelize } = require('sequelize');
require('dotenv').config();

const isLocal = process.env.DB_BM === 'bienes_muebles';

const sequelize = new Sequelize(
  isLocal ? process.env.DB_BM : process.env.DB_NAME_LOCAL,
  isLocal ? process.env.DB_USER : process.env.DB_USER_LOCAL,
  isLocal ? process.env.DB_PASS : process.env.DB_PASSWORD_LOCAL,
  {
    host: isLocal ? process.env.DB_HOSTNAME : process.env.DB_HOST_LOCAL,
    port: isLocal ? process.env.PSQLPORT : process.env.DB_PORT_LOCAL,
    dialect: 'postgres',
    logging: false, // Activa si necesitas ver las consultas SQL
  }
);

module.exports = sequelize;
