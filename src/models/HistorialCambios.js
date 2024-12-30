module.exports = (sequelize, DataTypes) => {
  const HistorialCambios = sequelize.define('HistorialCambios', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  }, {
    tableName: 'historial_cambios',
    timestamps: true, // Sequelize gestionará createdAt y updatedAt automáticamente
  });

  return HistorialCambios;
};
