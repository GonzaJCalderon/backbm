// controllers/salesController.js
const Bien = require('../models/Bien');
const { v4: uuidv4 } = require('uuid');

// Registrar una venta
exports.registerSale = async (req, res) => {
  const { bienId, compradorId, vendedorId, fecha } = req.body;
  try {
    const bien = await Bien.findByPk(bienId);
    if (!bien) return res.status(404).json({ error: 'Bien no encontrado' });

    bien.compradorId = compradorId;
    bien.fecha = fecha;
    bien.codigoVenta = uuidv4(); // Generar código único para la venta
    await bien.save();

    res.status(201).json(bien);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener todas las ventas
exports.getAllSales = async (req, res) => {
  try {
    const bienes = await Bien.findAll({ where: { compradorId: { [Op.ne]: null } } });
    res.json(bienes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener una venta por ID
exports.getSaleById = async (req, res) => {
  const { id } = req.params;
  try {
    const bien = await Bien.findByPk(id);
    if (!bien || !bien.compradorId) return res.status(404).json({ error: 'Venta no encontrada' });
    
    res.json(bien);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
