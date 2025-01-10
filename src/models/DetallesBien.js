module.exports = (sequelize, DataTypes) => {
  const DetallesBien = sequelize.define(
    'DetallesBien',
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      bien_uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'bienes', // Debe coincidir con el tableName de Bien
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
      
    },
    {
      tableName: 'detalles_bien', // Nombre explícito para evitar conflictos
      timestamps: true,
    }
  );

  return DetallesBien;
};
