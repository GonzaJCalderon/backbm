
const { Sequelize } = require('sequelize');
require('dotenv').config();

const isRemote = process.env.DB_ENV === 'remote';

const dbConfig = {
  database: isRemote ? process.env.DB_NAME_REMOTE : process.env.DB_NAME_LOCAL,
  username: isRemote ? process.env.DB_USER_REMOTE : process.env.DB_USER_LOCAL,
  password: isRemote ? process.env.DB_PASS_REMOTE || process.env.DB_PASSWORD_REMOTE : process.env.DB_PASS_LOCAL || process.env.DB_PASSWORD_LOCAL,
  host: isRemote ? process.env.DB_HOST_REMOTE : process.env.DB_HOST_LOCAL,
  port: isRemote ? process.env.DB_PORT_REMOTE : process.env.DB_PORT_LOCAL,
};

console.log('📡 Conectando a la base de datos:', isRemote ? 'Remota' : 'Local');
console.log('📡 Host:', dbConfig.host);
console.log('📡 Base de datos:', dbConfig.database);

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

sequelize.authenticate()
  .then(() => console.log('✅ Conexión a la base de datos exitosa'))
  .catch(err => console.error('❌ Error en la conexión:', err.message));

module.exports = sequelize;
