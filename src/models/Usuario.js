const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Usuario = sequelize.define('Usuario', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dni: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  cuit: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rolTemporal: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rolDefinitivo: {
    type: DataTypes.ENUM('usuario', 'administrador'),
    allowNull: true,
    defaultValue: 'usuario',
  },
  tipo: {
    type: DataTypes.ENUM('persona', 'juridica'),
    allowNull: false,
    defaultValue: 'persona',
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
    defaultValue: 'pendiente',
  }
}, {
  tableName: 'usuarios',
  timestamps: false,
});

module.exports = Usuario;