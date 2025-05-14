// models/Empresa.js

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Empresa', {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      razonSocial: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      cuit: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: { // 👈 Esto tiene que estar
        type: DataTypes.STRING,
        allowNull: true,
      }, 
      direccion: {
        type: DataTypes.JSON, // { calle, altura, departamento }
        allowNull: false,
        validate: {
          isValidDireccion(value) {
            if (!value || typeof value !== 'object') {
              throw new Error('La dirección debe ser un objeto JSON válido.');
            }
            if (!value.calle || !value.altura || !value.departamento) {
              throw new Error('La dirección debe incluir calle, altura y departamento.');
            }
          },
        },
      },
      estado: {
        type: DataTypes.STRING,
        defaultValue: 'pendiente', // 'aprobado', 'rechazado', etc
      },
      creadoPor: {
        type: DataTypes.UUID, // UUID del usuario responsable que la creó
        allowNull: false,
      },
      aprobadoPor: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      fechaAprobacion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    }, {
      tableName: 'empresas',
      timestamps: true,
    });
  };
  