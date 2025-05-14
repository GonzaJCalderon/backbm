// controllers/messagesController.js
const { Op } = require("sequelize");
const { Message, Usuario } = require("../models");
const jwt = require('jsonwebtoken');
const SYSTEM_UUID = "00000000-0000-0000-0000-000000000000";
const welcomeCache = new Set(); // Reinicia con el server, es por token activo
const config = require('../config/auth.config'); // ✅ Asegurate de usar la ruta correcta


exports.sendMessage = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    let decoded;
    try {
      decoded = jwt.verify(token, config.secret);
    } catch (err) {
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }

    const senderUuid = decoded.uuid;
    const { content, recipientUuid, isForAdmins = false } = req.body;

    if (!senderUuid || !content) {
      return res.status(400).json({ message: '❌ senderUuid y content son obligatorios.' });
    }

    const usuario = await Usuario.findOne({ where: { uuid: senderUuid } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Crear el mensaje principal
    const newMessage = await Message.create({
      senderUuid,
      recipientUuid,
      assignedAdminUuid: null,
      isForAdmins,
      content,
      isRead: false,
    });

    // 👇 Solo enviar mensaje automático si NO se envió ya
    if (!usuario.mensajeBienvenidaEnviada) {
      const autoContent =
        "👋 ¡Hola! Gracias por contactarnos. Te podemos ayudar con:\n\n" +
        "🔧 *Editar un bien*\n" +
        "🗑️ *Eliminar un bien*\n" +
        "📊 *Consultar el estado de un bien*\n\n" +
        "🕘 *Horario de atención:* 9:00 a 18:00 hs\n\n" +
        "¿En qué puedo asistirte?";

      await Message.create({
        senderUuid: SYSTEM_UUID,
        recipientUuid: senderUuid,
        isForAdmins: false,
        content: autoContent,
        isRead: false,
      });

      usuario.mensajeBienvenidaEnviada = true;
      await usuario.save();
    }

    res.status(201).json({ message: '✅ Mensaje enviado correctamente', newMessage });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    res.status(500).json({ error: error.message });
  }
};


exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      include: [
        {
          model: Usuario,
          as: "sender", // ✅ Usuario que envió el mensaje
          attributes: ["uuid", "nombre", "apellido"],
        },
        {
          model: Usuario,
          as: "recipient", // ✅ Usuario destinatario del mensaje (si aplica)
          attributes: ["uuid", "nombre", "apellido"],
        },
        {
          model: Usuario,
          as: "assignedAdmin", // ✅ Admin que recibió el mensaje
          attributes: ["uuid", "nombre", "apellido"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json(messages);
  } catch (error) {
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
    return res.status(500).json({ error: "Error al eliminar conversación." });
  }
};
exports.getUnreadMessages = async (req, res) => {
  try {
    const { userUuid } = req.params;
    if (!userUuid) {
      return res.status(400).json({ message: "UUID del usuario es requerido." });
    }

    const unreadMessages = await Message.findAll({
      where: {
        recipientUuid: userUuid,
        isRead: false,
      }
    });


    return res.status(200).json({ unreadMessages });

  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

// ✅ Marcar como leídos los mensajes recibidos por el usuario
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userUuid } = req.params;

    if (!userUuid) {
      return res.status(400).json({ message: "❌ userUuid requerido." });
    }

    const [affectedRows] = await Message.update(
      { isRead: true },
      {
        where: {
          recipientUuid: userUuid,
          isRead: false,
        },
      }
    );

    console.log(`🔔 Mensajes marcados como leídos: ${affectedRows}`);

    res.status(200).json({
      message: "✅ Mensajes marcados como leídos correctamente.",
      updated: affectedRows,
    });

  } catch (error) {
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
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
};


exports.assignMessageToAdmin = async (req, res) => {
  try {
    const { messageUuid, adminUuid } = req.body;

    if (!messageUuid || !adminUuid) {
      return res.status(400).json({ message: "❌ messageUuid y adminUuid son obligatorios." });
    }

    const message = await Message.findOne({ where: { uuid: messageUuid } });

    if (!message) {
      return res.status(404).json({ message: "❌ Mensaje no encontrado." });
    }

    if (message.assignedAdminUuid) {
      return res.status(400).json({ message: "❌ Mensaje ya ha sido asignado a otro admin." });
    }

    message.assignedAdminUuid = adminUuid;
    message.recipientUuid = adminUuid;
    await message.save();

    res.status(200).json({ message: "✅ Mensaje asignado correctamente", message });

  } catch (error) {
    res.status(500).json({ error: error.message || "Error en el servidor." });
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
    res.status(500).json({ error: "Error al obtener mensajes." });
  }
};


exports.markUserMessagesAsRead = async (req, res) => {
  try {
    const { userUuid } = req.params; // UUID del usuario que recibe el mensaje
    const { adminUuid } = req.body;  // UUID del admin que envió el mensaje

    if (!userUuid || !adminUuid) {
      return res.status(400).json({ message: "Faltan userUuid o adminUuid." });
    }

    // Actualiza los mensajes donde el admin es el remitente y el usuario es el destinatario
    const updated = await Message.update(
      { isRead: true },
      {
        where: {
          senderUuid: adminUuid,
          recipientUuid: userUuid,
          isRead: false,
        },
      }
    );

    res.status(200).json({ message: "Mensajes marcados como leídos correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

exports.replyToUser = async (req, res) => {
  try {
    // 🔐 Verificamos token JWT
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    let decoded;
    try {
      decoded = jwt.verify(token, config.secret);
    } catch (err) {
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }

    const adminUuid = decoded.uuid;
    const { recipientUuid, content } = req.body;

    // ✅ Validaciones básicas
    if (!adminUuid || !recipientUuid || !content) {
      return res.status(400).json({ message: "Faltan datos obligatorios (adminUuid, recipientUuid, content)." });
    }

    // 🔄 Crear respuesta del admin
    const newMessage = await Message.create({
      senderUuid: adminUuid,
      recipientUuid,                 // 👉 Usuario destino
      assignedAdminUuid: adminUuid, // 👉 Admin que se hace responsable
      isForAdmins: false,           // 👉 Ya no es mensaje general
      content,
      isRead: false,
    });

    return res.status(201).json({
      message: "✅ Respuesta enviada correctamente al usuario.",
      newMessage,
    });

  } catch (error) {
    console.error("❌ Error al responder mensaje:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};
