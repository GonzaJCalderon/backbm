module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define('Usuario', {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pendiente',
    },
    tipo: {
      type: DataTypes.ENUM('fisica', 'juridica'),
      allowNull: false,
    },
    dni: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isDniRequired(value) {
          if (this.tipo === 'fisica' && !value) {
            throw new Error('El DNI es obligatorio para personas físicas.');
          }
        },
      },
    },
    cuit: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isCuitRequired(value) {
          if (this.tipo === 'juridica' && !value) {
            throw new Error('El CUIT es obligatorio para personas jurídicas.');
          }
        },
      },
    },
    direccion: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isJsonValid(value) {
          if (value && typeof value !== 'object') {
            throw new Error('La dirección debe ser un objeto JSON válido.');
          }
          if (!value.calle || !value.altura || !value.departamento) {
            throw new Error('La dirección debe incluir calle, altura y departamento.');
          }
        },
      },
    },
    
    
    razonSocial: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isRazonSocialRequired(value) {
          if (this.tipo === 'juridica' && !value) {
            throw new Error('La razón social es obligatoria para personas jurídicas.');
          }
        },
      },
    },
    rolDefinitivo: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'usuario',
      validate: {
        isIn: [['usuario', 'admin', 'moderador']],
      },
    },
    aprobadoPor: {
      type: DataTypes.UUID, // Cambiado a UUID
      allowNull: true,
    },
    fechaAprobacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    motivoRechazo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rechazadoPor: {
      type: DataTypes.UUID, // Cambiado a UUID
      allowNull: true,
    },
    fechaRechazo: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'usuarios',
    timestamps: true,
  });

  return Usuario;
};
