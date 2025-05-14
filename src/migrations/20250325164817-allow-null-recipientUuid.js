'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Messages', 'recipientUuid', {
      type: Sequelize.UUID,
      allowNull: true,  // ✅ permitir NULL en la base de datos
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Messages', 'recipientUuid', {
      type: Sequelize.UUID,
      allowNull: false, // 🔄 para revertir, poner NOT NULL
    });
  }
};
