module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Usuario', {
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
  set(value) {
    this.setDataValue('email', value.toLowerCase());
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
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
          if (!value) return true; // ✅ Permitimos que sea null o undefined
          if (typeof value !== 'object') {
            throw new Error('La dirección debe ser un objeto JSON válido.');
          }
          if (!value.calle || !value.altura || !value.departamento) {
            throw new Error('La dirección debe incluir calle, altura y departamento.');
          }
        },
      },
    },

    // 🔥 Campos del responsable para jurídicas
    dniResponsable: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nombreResponsable: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    apellidoResponsable: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cuitResponsable: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isCuitValido(value) {
          if (this.tipo === 'juridica' && !value) {
            throw new Error('El CUIT del responsable es obligatorio para personas jurídicas.');
          }
        },
      },
    },
    domicilioResponsable: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isJsonValidResponsable(value) {
          if (!value) return true; // ✅ Permitimos que no venga
          if (typeof value !== 'object') {
            throw new Error('El domicilio del responsable debe ser un objeto JSON válido.');
          }
          if (!value.calle || !value.altura || !value.departamento) {
            throw new Error('El domicilio del responsable debe incluir calle, altura y departamento.');
          }
        },
      },
    },

    empresa_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'empresas',
        key: 'uuid',
      },
    },

    rolEmpresa: {
      type: DataTypes.ENUM('responsable', 'delegado'),
      allowNull: true,
      validate: {
        isIn: [['responsable', 'delegado']],
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

    delegadoDeUsuario: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'uuid',
      },
    },
    delegadoDeEmpresa: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'empresas',
        key: 'uuid',
      },
    },

    mensajeBienvenidaEnviada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    aprobadoPor: {
      type: DataTypes.UUID,
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
      type: DataTypes.UUID,
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
};
