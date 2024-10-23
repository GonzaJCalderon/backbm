'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Biens', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tipo: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      marca: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      modelo: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      precio: {
        type: Sequelize.NUMERIC(10, 2),
        allowNull: false,
      },
      vendedor_nombre: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      vendedor_dni: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      vendedor_cuit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      comprador_nombre: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      comprador_dni: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      comprador_cuit: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      codigo_unico: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Biens');
  },
};
