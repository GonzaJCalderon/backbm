const { Usuario, HistorialCambios } = require('../models');

const getHistorialCambios = async (req, res) => {
  const { uuid } = req.params;

  try {
    const usuarioConHistorial = await Usuario.findOne({
      where: { uuid },
      include: {
        model: HistorialCambios,
        as: 'historial',
        order: [['createdAt', 'DESC']],
      },
    });

    if (!usuarioConHistorial || usuarioConHistorial.historial.length === 0) {
      return res.status(200).json([]); // Devuelve un array vacío si no hay historial
    }

    // Normaliza los datos y asegura que el campo tenga un valor predeterminado
    const historialNormalizado = usuarioConHistorial.historial.map((registro) => ({
      id: registro.id,
      campo: registro.campo || 'Sin especificar', // Proporciona un valor predeterminado
      valor_anterior: registro.valor_anterior,
      valor_nuevo: registro.valor_nuevo,
      createdAt: registro.createdAt ? new Date(registro.createdAt).toISOString() : null,
    }));

    res.json(historialNormalizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial de cambios', detalles: error.message });
  }
};


module.exports = { getHistorialCambios };
