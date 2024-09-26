module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Paso 1: Agregar la columna permitiendo valores nulos
    await queryInterface.addColumn('transacciones', 'cantidad', {
      type: Sequelize.INTEGER,
      allowNull: true, // Permitir valores nulos inicialmente
    });

    // Paso 2: Actualizar los registros existentes para tener un valor predeterminado en la columna 'cantidad'
    await queryInterface.sequelize.query(
      'UPDATE "transacciones" SET "cantidad" = 0 WHERE "cantidad" IS NULL;'
    );

    // Paso 3: Modificar la columna para que no acepte valores nulos
    await queryInterface.changeColumn('transacciones', 'cantidad', {
      type: Sequelize.INTEGER,
      allowNull: false, // Ahora la columna no acepta valores nulos
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir el cambio (remover la columna)
    await queryInterface.removeColumn('transacciones', 'cantidad');
  }
};
