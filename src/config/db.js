const { Sequelize } = require('sequelize');
require('dotenv').config();

const isRemote = process.env.DB_ENV === 'remote';

console.log('📡 Conectando a la base de datos:', isRemote ? 'Remota' : 'Local');

const sequelize = new Sequelize(
  isRemote ? process.env.DB_NAME_REMOTE : process.env.DB_NAME_LOCAL,
  isRemote ? process.env.DB_USER_REMOTE : process.env.DB_USER_LOCAL,
  isRemote ? process.env.DB_PASS_REMOTE : process.env.DB_PASSWORD_LOCAL,
  {
    host: isRemote ? process.env.DB_HOST_REMOTE : process.env.DB_HOST_LOCAL,
    port: isRemote ? process.env.DB_PORT_REMOTE : process.env.DB_PORT_LOCAL,
    dialect: 'postgres',
    logging: false,
  }
);

sequelize.authenticate()
  .then(() => console.log('✅ Conexión a la base de datos exitosa'))
  .catch(err => console.error('❌ Error en la conexión:', err.message));

module.exports = sequelize;
