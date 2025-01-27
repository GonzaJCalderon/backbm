'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar si la columna 'uuid' ya existe
    const tableDefinition = await queryInterface.describeTable('usuarios');
    if (!tableDefinition.uuid) {
      // Agregar la columna 'uuid' si no existe
      await queryInterface.addColumn('usuarios', 'uuid', {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      });
    }

    // Si necesitas actualizar dependencias, realiza esos cambios aquí
    // Ejemplo: Cambiar claves foráneas para referenciar 'uuid'

    // Establecer 'uuid' como clave primaria (opcional, si aún no está hecho)
    if (tableDefinition.id) {
      // Migrar datos a uuid si es necesario, luego eliminar 'id'
      // await queryInterface.removeColumn('usuarios', 'id');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir cambios si es necesario
    const tableDefinition = await queryInterface.describeTable('usuarios');
    if (tableDefinition.uuid) {
      await queryInterface.removeColumn('usuarios', 'uuid');
    }
  },
};

