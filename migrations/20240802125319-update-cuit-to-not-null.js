// migration file: update-cuit-to-not-null.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('usuarios', 'cuit', {
      type: Sequelize.STRING,
      allowNull: false, // Cambia a false para no permitir valores nulos
      unique: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('usuarios', 'cuit', {
      type: Sequelize.STRING,
      allowNull: true, // Cambia a true para permitir valores nulos
      unique: true,
    });
  }
};
