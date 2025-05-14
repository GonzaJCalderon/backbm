'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuarios', 'direccionEmpresa', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn('usuarios', 'dniResponsable', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('usuarios', 'nombreResponsable', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('usuarios', 'apellidoResponsable', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('usuarios', 'domicilioResponsable', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn('usuarios', 'delegadoDe', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('usuarios', 'direccionEmpresa');
    await queryInterface.removeColumn('usuarios', 'dniResponsable');
    await queryInterface.removeColumn('usuarios', 'nombreResponsable');
    await queryInterface.removeColumn('usuarios', 'apellidoResponsable');
    await queryInterface.removeColumn('usuarios', 'domicilioResponsable');
    await queryInterface.removeColumn('usuarios', 'delegadoDe');
  },
};
