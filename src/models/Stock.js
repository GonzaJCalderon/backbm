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
        model: 'bienes', // Nombre de la tabla de bienes
        key: 'uuid',
      },
    },
    usuario_uuid: { // Nueva columna para referenciar al usuario
      type: DataTypes.UUID,
      allowNull: true, // Cambiar a false si es obligatorio
      references: {
        model: 'usuarios', // Nombre de la tabla de usuarios
        key: 'uuid',
      },
    },
  }, {
    tableName: 'stock', // Nombre explícito de la tabla
    timestamps: true, // Incluye `createdAt` y `updatedAt`
  });

  return Stock;
};
