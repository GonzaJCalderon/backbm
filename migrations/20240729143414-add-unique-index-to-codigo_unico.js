'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agrega el índice único si no existe
    await queryInterface.addConstraint('bienes', {
      fields: ['codigo_unico'],
      type: 'unique',
      name: 'bienes_codigo_unico_key'
    });
  },
  down: async (queryInterface, Sequelize) => {
    // Elimina el índice único si existe
    await queryInterface.removeConstraint('bienes', 'bienes_codigo_unico_key');
  }
};
