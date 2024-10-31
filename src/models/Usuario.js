<<<<<<< HEAD
const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');
=======
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
>>>>>>> develop

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
<<<<<<< HEAD
    type: DataTypes.JSON, 
=======
    type: DataTypes.JSON,
>>>>>>> develop
    allowNull: false,
    defaultValue: {}
  },
  rolTemporal: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rolDefinitivo: {
<<<<<<< HEAD
    type: DataTypes.STRING,
=======
    type: DataTypes.ENUM('usuario', 'administrador'),
>>>>>>> develop
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
  },
<<<<<<< HEAD
  motivoRechazo: { 
=======
  motivoRechazo: {
>>>>>>> develop
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Nuevo campo para registrar quién rechazó
  rechazadoPor: {
    type: DataTypes.INTEGER, // Asumiendo que el ID del admin que rechaza es un entero
    allowNull: true,
  },
  // Nuevo campo para la fecha y hora del rechazo
  fechaRechazo: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'usuarios',
  timestamps: false,
});

module.exports = Usuario;
