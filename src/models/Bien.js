module.exports = (sequelize, DataTypes) => {
  const Bien = sequelize.define('Bien', {
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
      type: DataTypes.JSONB,
      allowNull: true,
    },
    propietario_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    registrado_por_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    representante_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'uuid',
      },
    },
    representante_empresa_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'empresas',
        key: 'uuid',
      },
    },
    

    // 🔧 AGREGADOS
    compradorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    vendedorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: 'bienes',
    timestamps: true,
  });

  return Bien;
};
