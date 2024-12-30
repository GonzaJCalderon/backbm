const { Bien, Stock } = require('../models');
const { Op } = require('sequelize');



const handleServiceError = (error, customMessage) => {
  const message = customMessage ? `${customMessage}: ${error.message}` : error.message;
  console.error(message);
  throw new Error(message);
};


/**
 * Actualiza el stock de un bien.
 * @param {Object} params - Parámetros necesarios.
 * @param {string} params.bienId - ID del bien.
 * @param {number} params.cantidad - Cantidad a actualizar.
 * @param {string} params.tipoOperacion - Operación: 'sumar' o 'restar'.
 * @param {Object} transaction - Transacción opcional.
 * @returns {Object} El bien actualizado.
 */
const actualizarStock = async ({ bienId, cantidad, tipoOperacion }, transaction = null) => {
  try {
    const stock = await Stock.findOne({ where: { bienId }, transaction });

    if (!stock) {
      throw new Error(`El stock para el bien con ID ${bienId} no existe.`);
    }

    if (tipoOperacion === 'sumar') {
      stock.cantidad += cantidad;
    } else if (tipoOperacion === 'restar') {
      if (stock.cantidad < cantidad) {
        throw new Error(`Stock insuficiente. Intentas restar ${cantidad}, pero el stock disponible es ${stock.cantidad}.`);
      }
      stock.cantidad -= cantidad;
    } else {
      throw new Error('Tipo de operación no válido.');
    }

    await stock.save({ transaction });
    return stock;
  } catch (error) {
    handleServiceError(error, 'Error al actualizar el stock');
  }
};



/**
 * Verifica si un bien tiene suficiente stock.
 * @param {string} bienId - ID del bien.
 * @param {number} cantidad - Cantidad requerida.
 * @param {Object} transaction - Transacción opcional.
 * @throws Error si el bien no tiene suficiente stock.
 */
const verificarStock = async (bienId, cantidad, transaction = null) => {
  const stock = await Stock.findOne({ where: { bienId }, transaction });

  if (!stock) {
    throw new Error(`No se encontró stock para el bien con ID ${bienId}.`);
  }

  if (stock.cantidad < cantidad) {
    throw new Error(
      `Stock insuficiente para el bien con ID ${bienId}. Disponible: ${stock.cantidad}, requerido: ${cantidad}.`
    );
  }

  return stock;
};


/**
 * Verifica y ajusta el stock del vendedor si es necesario.
 * @param {string} bienId - ID del bien.
 * @param {string} vendedorId - ID del vendedor.
 * @param {number} cantidad - Cantidad requerida.
 * @param {Object} transaction - Transacción opcional.
 * @returns {Object} Stock actualizado del vendedor.
 */
const verificarYActualizarStockVendedor = async (bienId, vendedorId, cantidad, transaction) => {
  try {
    let stock = await Stock.findOne({ where: { bienId, usuarioId: vendedorId }, transaction });

    if (!stock) {
      // Si no existe, crear el stock inicial con la cantidad proporcionada
      stock = await Stock.create(
        {
          bienId,
          usuarioId: vendedorId,
          cantidad,
        },
        { transaction }
      );
    } else if (stock.cantidad < cantidad) {
      // Ajustar el stock existente
      stock.cantidad = cantidad; // Puedes decidir si incrementar o establecer la cantidad
      await stock.save({ transaction });
    }

    return stock;
  } catch (error) {
    throw new Error(`Error al verificar y actualizar el stock del vendedor: ${error.message}`);
  }
};


/**
 * Restablece el stock de un bien.
 * @param {string} bienId - ID del bien.
 * @param {number} cantidad - Cantidad a restablecer (debe ser positiva).
 * @param {Object} transaction - Transacción opcional.
 * @returns {Object} El bien actualizado.
 */
const restablecerStock = async (bienId, cantidad, transaction = null) => {
  try {
    const stock = await Stock.findOne({ where: { bienId }, transaction });

    if (!stock) {
      throw new Error(`No se encontró stock para el bien con ID ${bienId}.`);
    }

    if (cantidad <= 0) {
      throw new Error('La cantidad a restablecer debe ser mayor que 0.');
    }

    stock.cantidad = cantidad;
    await stock.save({ transaction });
    return stock;
  } catch (error) {
    throw new Error(`Error al restablecer el stock: ${error.message}`);
  }
};

/**
 * Verifica si existe un bien con los parámetros especificados.
 * @param {Object} params - Parámetros de búsqueda.
 * @param {string} params.tipo - Tipo del bien.
 * @param {string} params.marca - Marca del bien.
 * @param {string} params.modelo - Modelo del bien.
 * @param {Object} transaction - Transacción opcional.
 * @returns {Object|null} Retorna el bien si existe, null en caso contrario.
 */
const existeBien = async ({ tipo, marca, modelo }, transaction = null) => {
  try {
    return await Bien.findOne({
      where: {
        tipo,
        marca,
        modelo,
      },
      include: [
        { model: Stock, as: 'stock' },
        { model: DetallesBien, as: 'detalles' },
      ],
      transaction,
    });
  } catch (error) {
    throw new Error(`Error al verificar la existencia del bien: ${error.message}`);
  }
};


module.exports = {
  actualizarStock,
  verificarStock,
  verificarYActualizarStockVendedor,
  restablecerStock,
  existeBien,
};
