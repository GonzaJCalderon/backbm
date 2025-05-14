// models/TransaccionDetalle.js

module.exports = (sequelize, DataTypes) => {
    const TransaccionDetalle = sequelize.define('TransaccionDetalle', {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      transaccion_uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'transacciones',
          key: 'uuid',
        },
        onDelete: 'CASCADE',
      },
      detalle_uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'detalles_bien',
          key: 'uuid',
        },
        onDelete: 'CASCADE',
      },
    }, {
      tableName: 'transaccion_detalles',
      timestamps: false,
    });
  
    TransaccionDetalle.associate = (models) => {
      TransaccionDetalle.belongsTo(models.Transaccion, {
        foreignKey: 'transaccion_uuid',
        as: 'transaccion',
      });
  
      TransaccionDetalle.belongsTo(models.DetallesBien, {
        foreignKey: 'detalle_uuid',
        as: 'detalle',
      });
    };
  
    return TransaccionDetalle;
  };
  