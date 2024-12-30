const express = require('express');
const router = express.Router();
const { actualizarStock } = require('../services/stockService');
const { verifyToken, verificarPermisos } = require('../middlewares/authMiddleware');

// Ruta para actualizar el stock de un bien
router.put('/actualizar-stock', verifyToken, verificarPermisos(['administrador', 'usuario']), async (req, res) => {
  const { bienId, cantidad, tipoOperacion } = req.body;

  // Validación de entrada
  if (!bienId || cantidad === undefined || !tipoOperacion) {
    return res.status(400).json({ message: 'Faltan parámetros obligatorios: bienId, cantidad, tipoOperacion' });
  }

  try {
    // Llamar al servicio para actualizar el stock
    const bienActualizado = await actualizarStock({ bienId, cantidad, tipoOperacion });

    res.status(200).json({
      message: 'Stock actualizado correctamente',
      bienActualizado,
    });
  } catch (error) {
    console.error('Error al actualizar el stock:', error.message);
    res.status(500).json({
      message: 'Error al actualizar el stock',
      detalles: error.message,
    });
  }
});


module.exports = router;
