const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Usuario = require('./Usuario'); // Asegúrate de que la ruta sea correcta

const Bien = sequelize.define('Bien', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vendedorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Usuario,
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  compradorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Usuario,
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  precio: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  foto: {
    type: DataTypes.STRING,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  marca: {
    type: DataTypes.STRING,
  },
  modelo: {
    type: DataTypes.STRING,
  },
  imei: {
    type: DataTypes.STRING,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'bienes',
  timestamps: true,
});

// Relaciones
Bien.belongsTo(Usuario, { as: 'vendedor', foreignKey: 'vendedorId' });
Bien.belongsTo(Usuario, { as: 'comprador', foreignKey: 'compradorId' });

module.exports = Bien;
