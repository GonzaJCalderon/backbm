'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bienes', 'uuid', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: true // Permitir valores nulos temporalmente
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('bienes', 'uuid');
  }
};
