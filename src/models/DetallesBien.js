// models/DetallesBien.js

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
      type: DataTypes.STRING, // "disponible", "vendido", etc.
      allowNull: false,
      defaultValue: 'disponible',
    },
    // NUEVO CAMPO para almacenar la foto de este IMEI
    foto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'detalles_bien',
    timestamps: true,
  });

  return DetallesBien;
};
