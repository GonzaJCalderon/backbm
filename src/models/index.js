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
const MessageModel = require('./Message');

// Inicializar modelos
const Usuario = UsuarioModel(sequelize, DataTypes);
const Bien = BienModel(sequelize, DataTypes);
const Stock = StockModel(sequelize, DataTypes);
const Transaccion = TransaccionModel(sequelize, DataTypes);
const DetallesBien = DetallesBienModel(sequelize, DataTypes);
const HistorialCambios = HistorialCambiosModel(sequelize, DataTypes);
const PasswordResetToken = PasswordResetTokenModel(sequelize, DataTypes);
const Message = MessageModel(sequelize, DataTypes);

// 📌 Configurar relaciones de mensajes
Usuario.hasMany(Message, { as: 'mensajesEnviados', foreignKey: 'senderUuid' });
Usuario.hasMany(Message, { as: 'mensajesRecibidos', foreignKey: 'recipientUuid' });
Message.belongsTo(Usuario, { as: 'sender', foreignKey: 'senderUuid' });
Message.belongsTo(Usuario, { as: 'recipient', foreignKey: 'recipientUuid' });

// 📌 Asociaciones entre Usuario y Transaccion
Usuario.hasMany(Transaccion, { as: 'ventas', foreignKey: 'vendedor_uuid' });
Usuario.hasMany(Transaccion, { as: 'compras', foreignKey: 'comprador_uuid' });
Transaccion.belongsTo(Usuario, { as: 'compradorTransaccion', foreignKey: 'comprador_uuid' });
Transaccion.belongsTo(Usuario, { as: 'vendedorTransaccion', foreignKey: 'vendedor_uuid' });

Bien.hasMany(Transaccion, { as: 'transacciones', foreignKey: 'bien_uuid' });
Transaccion.belongsTo(Bien, { as: 'bienTransaccion', foreignKey: 'bien_uuid' });

// 📌 Asociaciones entre Bien y Stock
Bien.hasOne(Stock, { foreignKey: 'bien_uuid', as: 'stock', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Stock.belongsTo(Bien, { foreignKey: 'bien_uuid', as: 'bienStock' });

// 📌 Asociaciones entre Bien y DetallesBien
Bien.hasMany(DetallesBien, { foreignKey: 'bien_uuid', as: 'detalles', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
DetallesBien.belongsTo(Bien, { foreignKey: 'bien_uuid', as: 'detalleBien', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// 📌 Relación entre Usuario y HistorialCambios
Usuario.hasMany(HistorialCambios, { foreignKey: 'usuario_id', sourceKey: 'uuid', as: 'historial' });
HistorialCambios.belongsTo(Usuario, { foreignKey: 'usuario_id', targetKey: 'uuid', as: 'usuario' });

// 📌 Relación entre Usuario y Bien
Usuario.hasMany(Bien, { as: 'bienes', foreignKey: 'propietario_uuid' });
Bien.belongsTo(Usuario, { as: 'propietario', foreignKey: 'propietario_uuid' });

// 📌 Relación entre Usuario y PasswordResetToken
Usuario.hasMany(PasswordResetToken, { foreignKey: 'userId', sourceKey: 'uuid', as: 'passwordTokens' });
PasswordResetToken.belongsTo(Usuario, { foreignKey: 'userId', targetKey: 'uuid', as: 'usuario' });

// 📌 Exportar modelos y conexión
module.exports = {
  sequelize,
  Usuario,
  Bien,
  Stock,
  Transaccion,
  DetallesBien,
  HistorialCambios,
  PasswordResetToken,
  Message,
};
