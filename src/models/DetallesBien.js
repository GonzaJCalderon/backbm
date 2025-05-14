module.exports = (sequelize, DataTypes) => {
  const DetallesBien = sequelize.define('DetallesBien', {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    identificador_unico: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'disponible',
    },
    propietario_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    foto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaccion_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'transacciones',
        key: 'uuid',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'UUID de la transacción que vendió esta unidad',
    },
  }, {
    tableName: 'detalles_bien',
    timestamps: true,
  });

  return DetallesBien;
};
