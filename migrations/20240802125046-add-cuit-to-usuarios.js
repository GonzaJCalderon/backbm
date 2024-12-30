// migration file: add-cuit-to-usuarios.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuarios', 'cuit', {
      type: Sequelize.STRING,
      allowNull: true, // Cambia a true para permitir valores nulos
      unique: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('usuarios', 'cuit');
  }
};
