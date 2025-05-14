'use strict';

const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('usuarios', [
      {
        uuid: SYSTEM_UUID,
        nombre: 'Sistema',
        apellido: 'Automático',
        email: 'sistema@interno.com',
        password: '$2a$10$seGuro.YEncripTado.gEDhash', // bcrypt hash fake (puede actualizarse)
        estado: 'activo',
        tipo: 'juridica',
        dni: null,
        cuit: '20304050607',
        direccion: JSON.stringify({
          calle: 'Interna',
          altura: '0000',
          departamento: '0'
        }),
        razonSocial: 'Sistema Interno',
        rolDefinitivo: 'admin',
        aprobadoPor: null,
        fechaAprobacion: new Date(),
        motivoRechazo: null,
        rechazadoPor: null,
        fechaRechazo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('usuarios', {
      uuid: SYSTEM_UUID
    });
  }
};
