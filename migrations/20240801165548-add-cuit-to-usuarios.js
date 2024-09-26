// migración para cambiar la columna cuit a NOT NULL
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('usuarios', 'cuit', {
      type: Sequelize.STRING,
      allowNull: false, // Ahora debe ser NOT NULL
      unique: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('usuarios', 'cuit', {
      type: Sequelize.STRING,
      allowNull: true, // Cambiar a nullable para revertir
      unique: true,
    });
  }
};
