const Bien = require('../models/Bien');
const Usuario = require('../models/Usuario');
const { Op } = require('sequelize');

const obtenerBienesStock = async (req, res) => {
    try {
        const { search = '' } = req.query;

        console.log('Buscando bienes en stock...');

        const whereClause = {
            stock: { [Op.gt]: 0 } // Solo bienes con stock positivo
        };

        if (search) {
            whereClause[Op.and] = [
                {
                    [Op.or]: [
                        { descripcion: { [Op.iLike]: `%${search}%` } },
                        { tipo: { [Op.iLike]: `%${search}%` } },
                        { marca: { [Op.iLike]: `%${search}%` } },
                        { modelo: { [Op.iLike]: `%${search}%` } }
                    ]
                }
            ];
        }

        const { count, rows: bienes } = await Bien.findAndCountAll({
            where: whereClause
        });

        console.log('Bienes en stock obtenidos:', JSON.stringify(bienes, null, 2));
        res.json({
            bienes,
            totalItems: count
        });
    } catch (error) {
        console.error('Error buscando bienes en stock:', error);
        res.status(500).json({ message: 'Error al buscar los bienes en stock', error: error.message });
    }
};

const crearBien = async (req, res) => {
    // Lógica para crear un bien
    res.status(501).send('Método no implementado');
};

const registrarTransaccion = async (req, res) => {
    try {
      const { bienId, compradorId, cantidadVendida } = req.body;
  
      if (!bienId || !compradorId || !cantidadVendida) {
        return res.status(400).json({ message: 'bienId, compradorId y cantidadVendida son obligatorios' });
      }
  
      const bien = await Bien.findByPk(bienId);
      if (!bien) {
        return res.status(404).json({ message: 'Bien no encontrado' });
      }
  
      if (bien.stock < cantidadVendida) {
        return res.status(400).json({ message: 'No hay suficiente stock disponible' });
      }
  
      bien.stock -= cantidadVendida;
  
      if (bien.stock === 0) {
        bien.compradorId = compradorId;
        bien.fecha = new Date();
      }
  
      await bien.save();
  
      res.status(200).json({ message: 'Transacción registrada exitosamente', bien });
    } catch (error) {
      res.status(500).json({ message: 'Error al registrar la transacción', error: error.message });
    }
  };
  

const obtenerBienPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const bien = await Bien.findByPk(id);

        if (!bien) {
            return res.status(404).json({ message: 'Bien no encontrado' });
        }

        res.json(bien);
    } catch (error) {
        console.error('Error obteniendo el bien por ID:', error);
        res.status(500).json({ message: 'Error al obtener el bien', error: error.message });
    }
};

const actualizarBien = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion, precio, stock } = req.body;

        const bien = await Bien.findByPk(id);

        if (!bien) {
            return res.status(404).json({ message: 'Bien no encontrado' });
        }

        bien.descripcion = descripcion || bien.descripcion;
        bien.precio = precio || bien.precio;
        bien.stock = stock || bien.stock;

        await bien.save();
        res.json(bien);
    } catch (error) {
        console.error('Error actualizando el bien:', error);
        res.status(500).json({ message: 'Error al actualizar el bien', error: error.message });
    }
};

const eliminarBien = async (req, res) => {
    try {
        const { id } = req.params;
        const bien = await Bien.findByPk(id);

        if (!bien) {
            return res.status(404).json({ message: 'Bien no encontrado' });
        }

        await bien.destroy();
        res.json({ message: 'Bien eliminado' });
    } catch (error) {
        console.error('Error eliminando el bien:', error);
        res.status(500).json({ message: 'Error al eliminar el bien', error: error.message });
    }
};

// controllers/stockController.js
const obtenerBienesPorVendedor = async (req, res) => {
    const { vendedorId } = req.params;
    
    try {
      const bienes = await Bien.findAll({
        where: {
          vendedorId,
          stock: {
            [Sequelize.Op.gt]: 0 // Solo mostrar bienes con stock mayor a 0
          }
        }
      });
      
      res.json(bienes);
    } catch (error) {
      console.error('Error al obtener bienes por vendedor:', error);
      res.status(500).json({ message: 'Error al obtener bienes' });
    }
  };
  

module.exports = {
    obtenerBienesStock,
    crearBien,
    registrarTransaccion,
    obtenerBienPorId,
    actualizarBien,
    eliminarBien,
    obtenerBienesPorVendedor,
};
