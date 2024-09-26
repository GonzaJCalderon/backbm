'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Transacciones', 'tipoTransaccion', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'venta' // O el valor por defecto que desees
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Transacciones', 'tipoTransaccion');
  }
};
