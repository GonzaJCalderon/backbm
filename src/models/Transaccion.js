const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Usuario = require('./Usuario');
const Bien = require('./Bien');

const Transaccion = sequelize.define('Transaccion', {
  fecha: {
    type: DataTypes.DATE,
    allowNull: false
  },
  monto: {
    type: DataTypes.FLOAT,
    allowNull: true, // Permitir null temporalmente
  },
  
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  compradorId: {
    type: DataTypes.UUID, // Cambio a UUID
    allowNull: false,
    references: {
      model: Usuario,
      key: 'uuid', // Asegúrate de que se refiere al campo UUID de Usuario
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  vendedorId: {
    type: DataTypes.UUID, // Cambio a UUID
    allowNull: false,
    references: {
      model: Usuario,
      key: 'uuid', // Asegúrate de que se refiere al campo UUID de Usuario
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  bienId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Bien,
      key: 'uuid', // Referencia explícita al UUID del modelo Bien
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true
  },
  metodoPago: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'transacciones',
  timestamps: true,
});



// Relaciones
Transaccion.belongsTo(Usuario, { as: 'comprador', foreignKey: 'compradorId' });
Transaccion.belongsTo(Usuario, { as: 'vendedor', foreignKey: 'vendedorId' });
Transaccion.belongsTo(Bien, { as: 'bien', foreignKey: 'bienId' });

module.exports = Transaccion;
