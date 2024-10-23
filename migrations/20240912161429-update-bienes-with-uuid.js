'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Añadir columna UUID sin eliminar el ID existente
    await queryInterface.addColumn('bienes', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      unique: true,
      allowNull: false
    });

    // Actualizar las claves foráneas para hacer referencia a 'uuid' en lugar de 'id'
    await queryInterface.changeColumn('bienes', 'vendedorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Usuarios', // Asegúrate de que el nombre del modelo sea correcto
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.changeColumn('bienes', 'compradorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Usuarios', // Asegúrate de que el nombre del modelo sea correcto
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    // Si deseas que 'uuid' sea la clave primaria en el futuro, puedes agregar otra migración para eso
  },

  down: async (queryInterface, Sequelize) => {
    // En el rollback, eliminar la columna UUID
    await queryInterface.removeColumn('bienes', 'uuid');

    // Restaurar las claves foráneas si fuera necesario
    await queryInterface.changeColumn('bienes', 'vendedorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Usuarios',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.changeColumn('bienes', 'compradorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Usuarios',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }
};
