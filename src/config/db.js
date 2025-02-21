const { Sequelize } = require('sequelize');
require('dotenv').config(); // Cargar variables de entorno

const isRemote = process.env.DB_ENV === 'local'; // Asegurar que usa la base remota

console.log('📡 Usando base de datos:', isRemote ? 'Remota' : 'Local');
console.log('🔗 Host:', process.env.DB_HOST_REMOTE);
console.log('🗄️ Base de datos:', process.env.DB_NAME_REMOTE);
console.log('👤 Usuario:', process.env.DB_USER_REMOTE);
console.log('📌 Puerto:', process.env.DB_PORT_REMOTE);

const sequelize = new Sequelize(
  process.env.DB_NAME_REMOTE,
  process.env.DB_USER_REMOTE,
  process.env.DB_PASS_REMOTE,
  {
    host: process.env.DB_HOST_REMOTE,
    port: process.env.DB_PORT_REMOTE,
    dialect: 'postgres',
    logging: false, // Cambia a true si necesitas ver las consultas SQL
  }
);

sequelize.authenticate()
  .then(() => console.log('✅ Conexión a la base de datos exitosa'))
  .catch(err => console.error('❌ Error en la conexión:', err.message));

module.exports = sequelize;
