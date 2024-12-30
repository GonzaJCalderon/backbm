module.exports = (sequelize, DataTypes) => {
  const Bien = sequelize.define(
    'Bien',
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tipo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      descripcion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      precio: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      marca: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      modelo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fotos: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      propietario_uuid: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'bienes', // Especifica manualmente el nombre de la tabla
      timestamps: true, // Si deseas incluir createdAt y updatedAt
    }
  );

  return Bien;
};

