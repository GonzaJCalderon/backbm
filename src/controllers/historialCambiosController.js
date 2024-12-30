const { Usuario, HistorialCambios } = require('../models');

const getHistorialCambios = async (req, res) => {
  const { uuid } = req.params;

  try {
    const usuarioConHistorial = await Usuario.findOne({
      where: { uuid },
      include: {
        model: HistorialCambios,
        as: 'historial',
        order: [['fecha', 'DESC']],
      },
    });

    if (!usuarioConHistorial || usuarioConHistorial.historial.length === 0) {
      return res.status(200).json([]); // No hay historial
    }

    res.json(usuarioConHistorial.historial);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error.message);
    res.status(500).json({ message: 'Error al obtener historial de cambios', detalles: error.message });
  }
};

module.exports = { getHistorialCambios };
