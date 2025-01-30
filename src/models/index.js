const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Instancia de Sequelize

// Importar modelos
const UsuarioModel = require('./Usuario');
const BienModel = require('./Bien');
const StockModel = require('./Stock');
const TransaccionModel = require('./Transaccion');
const DetallesBienModel = require('./DetallesBien');
const HistorialCambiosModel = require('./HistorialCambios');
const PasswordResetTokenModel = require('./PasswordResetToken');

// Inicializar modelos
const Usuario = UsuarioModel(sequelize, DataTypes);
const Bien = BienModel(sequelize, DataTypes);
const Stock = StockModel(sequelize, DataTypes);
const Transaccion = TransaccionModel(sequelize, DataTypes);
const DetallesBien = DetallesBienModel(sequelize, DataTypes);
const HistorialCambios = HistorialCambiosModel(sequelize, DataTypes);
const PasswordResetToken = PasswordResetTokenModel(sequelize, DataTypes);

// Configurar relaciones
// Asociaciones entre Usuario y Transaccion
Usuario.hasMany(Transaccion, { as: 'ventas', foreignKey: 'vendedor_uuid' });
Usuario.hasMany(Transaccion, { as: 'compras', foreignKey: 'comprador_uuid' });
Transaccion.belongsTo(Usuario, { as: 'compradorTransaccion', foreignKey: 'comprador_uuid' });
Transaccion.belongsTo(Usuario, { as: 'vendedorTransaccion', foreignKey: 'vendedor_uuid' });

Bien.hasMany(Transaccion, { as: 'transacciones', foreignKey: 'bien_uuid' });
Transaccion.belongsTo(Bien, { as: 'bienTransaccion', foreignKey: 'bien_uuid' });

// Asociaciones entre Bien y Stock
Bien.hasOne(Stock, { foreignKey: 'bien_uuid', as: 'stock', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Stock.belongsTo(Bien, { foreignKey: 'bien_uuid', as: 'bienStock' });

// Asociaciones entre Bien y DetallesBien
Bien.hasMany(DetallesBien, {
  foreignKey: 'bien_uuid',
  as: 'detalles',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
DetallesBien.belongsTo(Bien, {
  foreignKey: 'bien_uuid',
  as: 'detalleBien',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});


// Relación entre Usuario y HistorialCambios
Usuario.hasMany(HistorialCambios, {
  foreignKey: 'usuario_id', // Clave foránea en la tabla historial_cambios
  sourceKey: 'uuid',        // Clave primaria en Usuario
  as: 'historial',          // Alias para acceder al historial
});

HistorialCambios.belongsTo(Usuario, {
  foreignKey: 'usuario_id', // Clave foránea en historial_cambios
  targetKey: 'uuid',        // Clave primaria en Usuario
  as: 'usuario',            // Alias para acceder al usuario desde el historial
});

// Un Usuario puede ser propietario de muchos Bienes
Usuario.hasMany(Bien, { as: 'bienes', foreignKey: 'propietario_uuid' });

// Un Bien pertenece a un Usuario como propietario
Bien.belongsTo(Usuario, { as: 'propietario', foreignKey: 'propietario_uuid' });

// Relación entre Usuario y PasswordResetToken
Usuario.hasMany(PasswordResetToken, {
  foreignKey: 'userId', // Clave foránea en la tabla de tokens
  sourceKey: 'uuid',    // Clave primaria en Usuario
  as: 'passwordTokens', // Alias para acceder a los tokens desde Usuario
});

PasswordResetToken.belongsTo(Usuario, {
  foreignKey: 'userId', // Clave foránea en PasswordResetToken
  targetKey: 'uuid',    // Clave primaria en Usuario
  as: 'usuario',        // Alias para acceder al usuario desde PasswordResetToken
});

// Exportar modelos y conexión
module.exports = {
  sequelize,
  Usuario,
  Bien,
  Stock,
  Transaccion,
  DetallesBien,
  HistorialCambios,
  PasswordResetToken,
};
