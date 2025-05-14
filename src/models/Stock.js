module.exports = (sequelize, DataTypes) => {
  const Stock = sequelize.define('Stock', {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bien_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'bienes',
        key: 'uuid',
      },
    },
    propietario_uuid: { // 💥 VOLVÉ A USAR EL NOMBRE QUE EXISTE EN LA TABLA
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'stock',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['bien_uuid', 'propietario_uuid'], // 👈 este campo tiene que EXISTIR en el modelo
      },
    ],
  });

  return Stock;
};
