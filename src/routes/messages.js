const express = require('express');
const router = express.Router();
const { verifyToken, authMiddleware } = require("../middlewares/authMiddleware");

// Importar el controlador de mensajes
const messagesController = require('../controllers/messageController'); 

// Nueva ruta para obtener mensajes de un usuario específico
router.get("/user/:userUuid", verifyToken, messagesController.getMessagesByUser);

// Ruta para que un usuario envíe un mensaje
router.post('/send', messagesController.sendMessage);

// Ruta para que el administrador obtenga la lista de mensajes
router.get('/', messagesController.getMessages);

// Ruta para obtener mensajes no leídos
router.get('/unread/:userUuid', messagesController.getUnreadMessages);

// Ruta para marcar mensajes como leídos
router.put('/mark-as-read/:userUuid', verifyToken, messagesController.markMessagesAsRead);

// Ruta para eliminar la conversación entre el administrador y un usuario específico
router.delete('/conversation/:userUuid', messagesController.deleteConversation);

// 🔥 Rutas para los mensajes no asignados a un admin
// 🔥 Ahora requiere `adminUuid`
router.get('/unassigned', verifyToken, messagesController.getMessagesForAdmins);



router.put('/assign', authMiddleware, messagesController.assignMessageToAdmin);

module.exports = router;
