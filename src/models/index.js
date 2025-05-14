const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Importar modelos
const UsuarioModel = require('./Usuario');
const BienModel = require('./Bien');
const StockModel = require('./Stock');
const TransaccionModel = require('./Transaccion');
const DetallesBienModel = require('./DetallesBien');
const HistorialCambiosModel = require('./HistorialCambios');
const PasswordResetTokenModel = require('./PasswordResetToken');
const MessageModel = require('./Message');
const EmpresaModel = require('./Empresa');
const TransaccionDetalleModel = require('./TransaccionDetalle');


// Inicializar modelos
const Usuario = UsuarioModel(sequelize, DataTypes);
const Bien = BienModel(sequelize, DataTypes);
const Stock = StockModel(sequelize, DataTypes);
const Transaccion = TransaccionModel(sequelize, DataTypes);
const DetallesBien = DetallesBienModel(sequelize, DataTypes);
const HistorialCambios = HistorialCambiosModel(sequelize, DataTypes);
const PasswordResetToken = PasswordResetTokenModel(sequelize, DataTypes);
const Message = MessageModel(sequelize, DataTypes);
const Empresa = EmpresaModel(sequelize, DataTypes);
const TransaccionDetalle = TransaccionDetalleModel(sequelize, DataTypes);


// Relaciones entre modelos

// 🔹 Relaciones de Mensajes
Usuario.hasMany(Message, { as: 'mensajesEnviados', foreignKey: 'senderUuid' });
Usuario.hasMany(Message, { as: 'mensajesRecibidos', foreignKey: 'recipientUuid' });
Usuario.hasMany(Message, { as: 'mensajesAsignados', foreignKey: 'assignedAdminUuid' });
Message.belongsTo(Usuario, { as: 'sender', foreignKey: 'senderUuid' });
Message.belongsTo(Usuario, { as: 'recipient', foreignKey: 'recipientUuid' });
Message.belongsTo(Usuario, { as: 'assignedAdmin', foreignKey: 'assignedAdminUuid' });

// 🔹 Usuario y Transacción
Usuario.hasMany(Transaccion, { as: 'ventas', foreignKey: 'vendedor_uuid' });
Usuario.hasMany(Transaccion, { as: 'compras', foreignKey: 'comprador_uuid' });
Transaccion.belongsTo(Usuario, { as: 'compradorTransaccion', foreignKey: 'comprador_uuid' });
Transaccion.belongsTo(Usuario, { as: 'vendedorTransaccion', foreignKey: 'vendedor_uuid' });

// 🔹 Empresa como comprador representado
Transaccion.belongsTo(Empresa, {
  as: 'empresaCompradora',
  foreignKey: 'comprador_representado_empresa_uuid',
});

// 🔹 Empresa como vendedor representado
Transaccion.belongsTo(Empresa, {
  as: 'empresaVendedora',
  foreignKey: 'vendedor_representado_empresa_uuid',
});




// 🔹 Bien y Transacción
Bien.hasMany(Transaccion, { as: 'transacciones', foreignKey: 'bien_uuid' });
Transaccion.belongsTo(Bien, { as: 'bienTransaccion', foreignKey: 'bien_uuid' });

// 🔹 Bien y Stock
Bien.hasMany(Stock, { foreignKey: 'bien_uuid', as: 'stocks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Stock.belongsTo(Bien, { foreignKey: 'bien_uuid', as: 'bienStock' });

// 🔹 Usuario y Stock
Usuario.hasMany(Stock, { foreignKey: 'propietario_uuid', sourceKey: 'uuid', as: 'stocks' });
Stock.belongsTo(Usuario, { foreignKey: 'propietario_uuid', targetKey: 'uuid', as: 'propietario' });

// 🔹 Usuario y Bienes
Usuario.hasMany(Bien, { as: 'bienesComprados', foreignKey: 'compradorId' });
Usuario.hasMany(Bien, { as: 'bienesVendidos', foreignKey: 'vendedorId' });

// 🔹 ✅ Bien y Usuario como Propietario
Bien.belongsTo(Usuario, {
  foreignKey: 'propietario_uuid',
  targetKey: 'uuid',
  as: 'propietario', // Este alias es el que usás en el include del controller
});

// 🔹 Bien y Detalles
Bien.hasMany(DetallesBien, { foreignKey: 'bien_uuid', as: 'detalles', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
DetallesBien.belongsTo(Bien, { foreignKey: 'bien_uuid', as: 'detalleBien', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
DetallesBien.belongsTo(Bien, { foreignKey: 'bien_uuid', as: 'bien' });
Bien.hasMany(DetallesBien, {
  foreignKey: 'bien_uuid',
  as: 'identificadores', // ⚠️ Este alias es el que tu frontend espera
});
// Alias para teléfonos (IMEIs)
Bien.hasMany(DetallesBien, {
  foreignKey: 'bien_uuid',
  as: 'imeis', // Solo para teléfonos móviles
});



// 🔹 Usuario y HistorialCambios
Usuario.hasMany(HistorialCambios, { foreignKey: 'usuario_id', sourceKey: 'uuid', as: 'historial' });
HistorialCambios.belongsTo(Usuario, { foreignKey: 'usuario_id', targetKey: 'uuid', as: 'usuario' });

// 🔹 Usuario y PasswordResetToken
Usuario.hasMany(PasswordResetToken, { foreignKey: 'userId', sourceKey: 'uuid', as: 'passwordTokens' });
PasswordResetToken.belongsTo(Usuario, { foreignKey: 'userId', targetKey: 'uuid', as: 'usuario' });

// 🔹 Relaciones entre usuarios (delegados)
Usuario.hasMany(Usuario, { foreignKey: 'delegadoDeUsuario', as: 'delegados' });
Usuario.belongsTo(Usuario, { foreignKey: 'delegadoDeUsuario', as: 'delegadoEmpresa' });

// 🔹 Delegado representante en transacción
Transaccion.belongsTo(Usuario, { as: 'delegadoRepresentante', foreignKey: 'representado_por_uuid' });
Usuario.hasMany(Transaccion, { as: 'ventasComoDelegado', foreignKey: 'representado_por_uuid' });

// 🔹 Usuario y Empresa
Usuario.belongsTo(Empresa, { foreignKey: 'delegadoDeEmpresa', as: 'empresa' });
Empresa.hasMany(Usuario, { foreignKey: 'delegadoDeEmpresa', as: 'delegados' });

// 🔹 Transacción <-> DetallesBien mediante TransaccionDetalle (N:M)
Transaccion.belongsToMany(DetallesBien, {
  through: TransaccionDetalle,
  foreignKey: 'transaccion_uuid',
  otherKey: 'detalle_uuid',
  as: 'detallesVendidos'
});

DetallesBien.belongsToMany(Transaccion, {
  through: TransaccionDetalle,
  foreignKey: 'detalle_uuid',
  otherKey: 'transaccion_uuid',
  as: 'transacciones'
});

// También: relaciones directas si querés includes más fáciles
Transaccion.hasMany(TransaccionDetalle, {
  foreignKey: 'transaccion_uuid',
  as: 'transaccionDetalles'
});

TransaccionDetalle.belongsTo(Transaccion, {
  foreignKey: 'transaccion_uuid',
  as: 'transaccion'
});

DetallesBien.hasMany(TransaccionDetalle, {
  foreignKey: 'detalle_uuid',
  as: 'detalleTransacciones'
});

TransaccionDetalle.belongsTo(DetallesBien, {
  foreignKey: 'detalle_uuid',
  as: 'detalle'
});


// Exportar modelos
module.exports = {
  sequelize,
  Usuario,
  Bien,
  Stock,
  Transaccion,
  DetallesBien,
  TransaccionDetalle,
  HistorialCambios,
  PasswordResetToken,
  Message,
  Empresa,
};
