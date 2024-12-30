const { Sequelize } = require('sequelize');
require('dotenv').config();

const isLocal = process.env.DB_USE === 'local';

const sequelize = new Sequelize(
  isLocal ? process.env.DB_NAME_LOCAL : process.env.DB_NAME_REMOTE,
  isLocal ? process.env.DB_USER_LOCAL : process.env.DB_USER_REMOTE,
  isLocal ? process.env.DB_PASSWORD_LOCAL : process.env.DB_PASSWORD_REMOTE,
  {
    host: isLocal ? process.env.DB_HOST_LOCAL : process.env.DB_HOST_REMOTE,
    port: isLocal ? process.env.DB_PORT_LOCAL : process.env.DB_PORT_REMOTE,
    dialect: 'postgres',
    logging: false, // Activa si necesitas ver las consultas SQL
  }
);

module.exports = sequelize;
