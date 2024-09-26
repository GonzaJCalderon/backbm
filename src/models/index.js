const Usuario = require('./Usuario');
const Bien = require('./Bien');
const Transaccion = require('./Transaccion');

// Definir asociaciones

// Usuario tiene muchos bienes vendidos y comprados
Usuario.hasMany(Bien, { as: 'bienesVendidos', foreignKey: 'vendedorId' });
Usuario.hasMany(Bien, { as: 'bienesComprados', foreignKey: 'compradorId' });

// Un Bien pertenece a un vendedor y un comprador
Bien.belongsTo(Usuario, { as: 'vendedorBien', foreignKey: 'vendedorId' });
Bien.belongsTo(Usuario, { as: 'compradorBien', foreignKey: 'compradorId' });

// Usuario tiene muchas transacciones como vendedor y comprador
Usuario.hasMany(Transaccion, { as: 'transaccionesVendidas', foreignKey: 'vendedorId' });
Usuario.hasMany(Transaccion, { as: 'transaccionesCompradas', foreignKey: 'compradorId' });

// Bien tiene muchas transacciones asociadas
Bien.hasMany(Transaccion, { as: 'transaccionesDeBien', foreignKey: 'bienId' });

// Cada Transaccion pertenece a un comprador, un vendedor y un bien
Transaccion.belongsTo(Usuario, { as: 'compradorTransaccion', foreignKey: 'compradorId' });
Transaccion.belongsTo(Usuario, { as: 'vendedorTransaccion', foreignKey: 'vendedorId' });
Transaccion.belongsTo(Bien, { as: 'bienTransaccion', foreignKey: 'bienId' });

// Exportar los modelos
module.exports = {
  Usuario,
  Bien,
  Transaccion,
};
