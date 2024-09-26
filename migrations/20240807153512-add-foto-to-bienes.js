// migrations/xxxxxx-add-nombre-to-bienes.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bienes', 'nombre', {
      type: Sequelize.STRING,
      allowNull: true // O false si quieres evitar nulos
    });

    // Opcional: Actualizar datos existentes si es necesario
    await queryInterface.sequelize.query('UPDATE bienes SET nombre = \'valor por defecto\' WHERE nombre IS NULL;');
    
    await queryInterface.changeColumn('bienes', 'nombre', {
      type: Sequelize.STRING,
      allowNull: false // O true si permites nulos
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('bienes', 'nombre');
  }
};
