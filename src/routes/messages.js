// routes/messages.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");

const {
  sendMessage,
  getMessages,
  getMessagesByUser,
  deleteConversation,
  getUnreadMessages,
  markMessagesAsRead, 
} = require('../controllers/messageController');

// Nueva ruta para obtener mensajes de un usuario específico
router.get("/:userUuid", verifyToken, getMessagesByUser);


// Ruta para que un usuario envíe un mensaje
router.post('/send', sendMessage);

// Ruta para que el administrador obtenga la lista de mensajes
router.get('/', getMessages);

router.get('/unread/:userUuid', getUnreadMessages);


router.put('/mark-as-read/:userUuid', verifyToken, markMessagesAsRead);


// Nueva ruta para eliminar la conversación entre el administrador y un usuario específico
router.delete('/conversation/:userUuid', deleteConversation);





module.exports = router;
