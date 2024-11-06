<<<<<<< HEAD
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
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  compradorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  vendedorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  bienId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Bien,
      key: 'uuid',
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
=======
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
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  compradorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  vendedorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  bienId: {
    type: DataTypes.UUID, // Asegúrate de que este sea UUID
    allowNull: false,
    references: {
      model: Bien,
      key: 'uuid',
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
>>>>>>> 6cd377c09f0080a4a3ed2efde4632e6e7eb49013
