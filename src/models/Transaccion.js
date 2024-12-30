module.exports = (sequelize, DataTypes) => {
  const Transaccion = sequelize.define('Transaccion', {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    monto: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    precio: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    metodoPago: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vendedor_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'uuid',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    comprador_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'uuid',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    bien_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'bienes',
        key: 'uuid',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    fotos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
  }, {
    tableName: 'transacciones',
    timestamps: true,
  });

  return Transaccion;
};
