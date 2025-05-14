module.exports = (sequelize, DataTypes) => {
  const HistorialCambios = sequelize.define('HistorialCambios', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    valor_anterior: {
      type: DataTypes.STRING,
      allowNull: true, // Permitir valores nulos si no aplica
    },
    valor_nuevo: {
      type: DataTypes.STRING,
      allowNull: true, // Permitir valores nulos si no aplica
    },
    campo: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Sin especificar',
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
    timestamps: true,
  });

  return HistorialCambios;
};
