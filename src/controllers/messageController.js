// controllers/messagesController.js
const { Op } = require("sequelize");
const { Message, Usuario } = require("../models");

exports.sendMessage = async (req, res) => {
  try {
    const { senderUuid, recipientUuid, content } = req.body;

    if (!senderUuid || !recipientUuid || !content) {
      return res.status(400).json({ message: 'Faltan datos: senderUuid, recipientUuid y content son obligatorios.' });
    }

    // Guarda el mensaje con el remitente y destinatario correctos
    const newMessage = await Message.create({
      senderUuid,
      recipientUuid,
      content,
    });

    res.status(201).json({ message: 'Mensaje enviado correctamente', newMessage });
  } catch (error) {
    console.error(error);
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
          { recipientUuid: userUuid }
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
    const { userUuid } = req.params;
    if (!userUuid) {
      return res.status(400).json({ message: "UUID del usuario es requerido." });
    }

    // Asegurarse de actualizar todos los mensajes correctamente
    await Message.update(
      { isRead: true },
      {
        where: {
          senderUuid: userUuid,
          recipientUuid: req.user.uuid, // Admin actual
          isRead: false,
        },
      }
    );

    res.status(200).json({ message: "Mensajes marcados como leídos correctamente." });
  } catch (error) {
    console.error("Error al marcar mensajes como leídos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
