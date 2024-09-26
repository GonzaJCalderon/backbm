'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuarios', 'tipo', {
      type: Sequelize.ENUM('persona', 'juridica'),
      allowNull: false,
      defaultValue: 'persona', // Valor por defecto si es necesario
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('usuarios', 'tipo');
  }
};
