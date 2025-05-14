const express = require('express');
const router = express.Router();
const { verifyToken, authMiddleware } = require("../middlewares/authMiddleware");
const { Usuario } = require('../models'); // Ajusta la ruta según tu estructura de archivos

// Importar el controlador de mensajes
const messagesController = require('../controllers/messageController'); 

// ✅ RUTA: Obtener mensajes de un usuario específico
router.get("/user/:userUuid", verifyToken, messagesController.getMessagesByUser);

// ✅ RUTA: Enviar un mensaje
router.post('/send', verifyToken, messagesController.sendMessage);

router.post('/reply', verifyToken, messagesController.replyToUser);


// ✅ RUTA: Obtener todos los mensajes (solo admins)
router.get('/', verifyToken, messagesController.getMessages);

// ✅ RUTA: Obtener mensajes no leídos de un usuario
router.get('/unread/:userUuid', verifyToken, messagesController.getUnreadMessages);

// ✅ RUTA: Marcar mensajes como leídos
router.put('/mark-as-read/:userUuid', verifyToken, messagesController.markMessagesAsRead);
// RUTA: Marcar mensajes de admin como leídos para el usuario
router.put('/mark-as-read-user/:userUuid', verifyToken, messagesController.markUserMessagesAsRead);


// ✅ RUTA: Eliminar la conversación de un usuario
router.delete('/conversation/:userUuid', verifyToken, messagesController.deleteConversation);

// ✅ RUTA: Obtener mensajes no asignados (solo admins)
router.get('/unassigned', verifyToken, messagesController.getMessagesForAdmins);

// ✅ RUTA: Asignar un mensaje a un admin
router.put('/assign', verifyToken, authMiddleware, messagesController.assignMessageToAdmin);

module.exports = router;
