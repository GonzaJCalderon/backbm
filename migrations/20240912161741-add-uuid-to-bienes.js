'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Añadir la columna UUID
    await queryInterface.addColumn('bienes', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      unique: true,
      allowNull: false
    });

    // Actualizar las filas existentes con UUIDs si no se han asignado ya
    await queryInterface.sequelize.query(
      'UPDATE bienes SET uuid = uuid_generate_v4() WHERE uuid IS NULL'
    );

    // Modificar la columna UUID para que sea clave primaria si es necesario
    await queryInterface.changeColumn('bienes', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      unique: true,
      allowNull: false,
      primaryKey: true // Solo si decides usar UUID como PK
    });

    // Cambiar las claves foráneas si fuera necesario
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
        model: 'Usuarios',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
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
