// src/services/notificacionesService.js
const { Message, Usuario } = require('../models');
const SYSTEM_UUID = "00000000-0000-0000-0000-000000000000";

const notificarAdministradorInternamente = async ({ adminUuid, descripcion, uuidSospechoso, tipo = 'imei' }) => {
  try {
    const contenido = 
      `⚠️ Se detectó un intento de registrar un ${tipo === 'imei' ? 'IMEI' : 'identificador único'} ya existente en el sistema.\n\n` +
      `🔍 *Código sospechoso:* ${uuidSospechoso}\n` +
      `📝 *Contexto:* ${descripcion}\n\n` +
      `🕵️ Este evento requiere revisión manual por parte de Investigaciones.`;

    await Message.create({
      senderUuid: SYSTEM_UUID,
      recipientUuid: adminUuid,
      assignedAdminUuid: null,
      isForAdmins: true,
      content: contenido,
      isRead: false,
    });

    console.log(`📩 Notificación enviada al admin ${adminUuid}`);
  } catch (error) {
    console.error("❌ Error al enviar notificación automática:", error);
  }
};

module.exports = { notificarAdministradorInternamente };
