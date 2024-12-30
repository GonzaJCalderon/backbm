'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Cambiar la columna a NOT NULL
    await queryInterface.changeColumn('bienes', 'vendedor_nombre', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
  },
  down: async (queryInterface, Sequelize) => {
    // Permitir valores NULL en la columna
    await queryInterface.changeColumn('bienes', 'vendedor_nombre', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  }
};
