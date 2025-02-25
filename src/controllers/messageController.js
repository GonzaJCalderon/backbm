// controllers/messagesController.js
const { Op } = require("sequelize");
const { Message, Usuario } = require("../models");

exports.sendMessage = async (req, res) => {
  try {
    const { senderUuid, content } = req.body;

    if (!senderUuid || !content) {
      return res.status(400).json({ message: '❌ senderUuid y content son obligatorios.' });
    }

    const newMessage = await Message.create({
      senderUuid,
      recipientUuid: null, // 🔥 NO asignamos un destinatario aún
      isForAdmins: true, // 🔥 Es un mensaje para los administradores
      content,
      isRead: false,
    });

    res.status(201).json({ message: '✅ Mensaje enviado correctamente', newMessage });

  } catch (error) {
    console.error("❌ Error al enviar mensaje:", error);
    res.status(500).json({ error: error.message });
  }
};




exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      include: [
        {
          model: Usuario,
          as: "sender",
          attributes: ["uuid", "nombre", "apellido", "rolDefinitivo"],
        },
        {
          model: Usuario,
          as: "recipient",
          attributes: ["uuid", "nombre", "apellido", "rolDefinitivo"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
};
exports.getMessagesByUser = async (req, res) => {
  try {
    const { userUuid } = req.params;
    if (!userUuid) {
      return res.status(400).json({ message: "UUID del usuario es requerido." });
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderUuid: userUuid },
          { recipientUuid: userUuid },
          { assignedAdminUuid: userUuid } // 🔥 Agregamos esto
        ]
      },
      order: [["createdAt", "ASC"]]
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error al obtener mensajes del usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


exports.deleteConversation = async (req, res) => {
  try {
    const { userUuid } = req.params; // UUID del usuario con el que se tiene la conversación
    const adminId = req.body?.adminId || req.query?.adminId;

    if (!userUuid || !adminId) {
      return res.status(400).json({ error: 'Falta el userUuid o adminId.' });
    }

    // Eliminar todos los mensajes que involucren a ambos
    const deleted = await Message.destroy({
      where: {
        [Op.or]: [
          { senderUuid: userUuid, recipientUuid: adminId },
          { senderUuid: adminId, recipientUuid: userUuid }
        ]
      }
    });

    return res.status(200).json({ message: 'Conversación eliminada', deleted, userUuid });
  } catch (error) {
    console.error("Error al eliminar conversación:", error);
    return res.status(500).json({ error: "Error al eliminar conversación." });
  }
};

exports.getUnreadMessages = async (req, res) => {
  try {
    const { userUuid } = req.params;
    if (!userUuid) {
      return res.status(400).json({ error: "UUID de usuario requerido." });
    }

    // Usamos "isRead" porque es el nombre correcto de la columna en la base de datos
    const unreadMessages = await Message.findAll({
      where: {
        recipientUuid: userUuid,
        isRead: false,
      },
    });

    res.status(200).json({ count: unreadMessages.length, unreadMessages });
  } catch (error) {
    console.error("Error al obtener mensajes no leídos:", error);
    res.status(500).json({ error: "Error al obtener mensajes no leídos." });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userUuid } = req.params; // Obteniendo desde los parámetros de la URL
    const { adminUuid } = req.body;  // Obteniendo desde el body de la solicitud

    if (!userUuid || !adminUuid) {
      return res.status(400).json({ message: "❌ Error: userUuid y adminUuid son requeridos." });
    }

    await Message.update(
      { isRead: true },
      {
        where: {
          senderUuid: userUuid,
          recipientUuid: adminUuid, 
          isRead: false,
        },
      }
    );

    res.status(200).json({ message: "✅ Mensajes marcados como leídos correctamente." });
  } catch (error) {
    console.error("❌ Error al marcar mensajes como leídos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};



exports.getMessagesForAdmins = async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: {
        isForAdmins: true,
        assignedAdminUuid: null, // Solo mensajes no asignados
      },
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error al obtener mensajes para admins:", error);
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
};

exports.assignMessageToAdmin = async (req, res) => {
  try {
    const { messageUuid, adminUuid } = req.body;

    // Buscar el mensaje
    const message = await Message.findOne({ where: { uuid: messageUuid } });

    if (!message) {
      return res.status(404).json({ message: "❌ Mensaje no encontrado." });
    }

    if (message.assignedAdminUuid) {
      return res.status(400).json({ message: "❌ Mensaje ya ha sido asignado a otro admin." });
    }

    // Asignar el mensaje al administrador y definir recipientUuid
    message.assignedAdminUuid = adminUuid;
    message.recipientUuid = adminUuid; // 🔥 Ahora el mensaje pertenece al admin
    await message.save();

    res.status(200).json({ message: "✅ Mensaje asignado correctamente", message });

  } catch (error) {
    console.error("❌ Error al asignar mensaje:", error);
    res.status(500).json({ error: "Error al asignar mensaje." });
  }
};


exports.replyToMessage = async (req, res) => {
  try {
    const { messageUuid, adminUuid, content } = req.body;

    // Buscar el mensaje original
    const originalMessage = await Message.findOne({ where: { uuid: messageUuid } });

    if (!originalMessage || originalMessage.assignedAdminUuid !== adminUuid) {
      return res.status(403).json({ message: "❌ No tienes permiso para responder este mensaje." });
    }

    // Crear la respuesta
    const replyMessage = await Message.create({
      senderUuid: adminUuid,
      recipientUuid: originalMessage.senderUuid, // Responde al usuario original
      content,
      isForAdmins: false,
    });

    res.status(201).json({ message: "✅ Respuesta enviada correctamente", replyMessage });
  } catch (error) {
    console.error("❌ Error al responder mensaje:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// Obtener solo los mensajes que no han sido asignados a un admin
exports.getUnassignedMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { assignedAdminUuid: null, isForAdmins: true },
      include: [
        {
          model: Usuario,
          as: "sender",
          attributes: ["uuid", "nombre", "apellido"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Error al obtener mensajes sin asignar:", error);
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
};

exports.getMessagesForAdmin = async (req, res) => {
  try {
    const { adminUuid } = req.params;

    const messages = await Message.findAll({
      where: { assignedAdminUuid: adminUuid },
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Error al obtener mensajes del admin:", error);
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
};
