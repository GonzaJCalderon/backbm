const Bien = require('../models/Bien');
const Transaccion = require('../models/Transaccion');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');


/*const registrarCompra = async (req, res) => {
  const {
    bienId,
    compradorId,
    vendedorId,
    precio,
    descripcion,
    tipo,
    marca,
    modelo,
    imei,
    cantidad,
    metodoPago,
  } = req.body;

  // Validar los campos obligatorios
  const requiredFields = [bienId, compradorId, vendedorId, precio, cantidad, metodoPago, tipo, marca, modelo];
  if (requiredFields.some(field => !field)) {
    return res.status(400).json({ mensaje: "Faltan datos necesarios para registrar la compra." });
  }

  // Validar IMEI para teléfonos móviles
  if (tipo === 'Teléfono móvil' && !imei) {
    return res.status(400).json({ mensaje: "IMEI es requerido para teléfonos móviles." });
  }

  // Iniciar una transacción
  const transaction = await sequelize.transaction();

  try {
    // Buscar si el bien ya existe
    let bienExistente = await Bien.findOne({ where: { uuid: bienId } });

    // Si el bien no existe, crear uno nuevo
    let fotosNombres = [];
    if (!bienExistente) {
      const fotos = req.files ? req.files['fotos'] : null;
      if (!fotos || fotos.length === 0) {
        return res.status(400).json({ mensaje: 'No se han cargado fotos para el bien nuevo' });
      }
      fotosNombres = fotos.map(file => file.filename);

      bienExistente = await Bien.create({
        uuid: bienId,
        vendedorId,
        compradorId,
        descripcion,
        precio,
        fecha: new Date(),
        tipo,
        marca,
        modelo,
        imei,
        stock: cantidad,
        fotos: fotosNombres.join(','), // Guardar nombres de las fotos
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { transaction });
    } else {
      // Si el bien existe, actualizar stock y fotos
      bienExistente.stock += cantidad;
      bienExistente.fotos = bienExistente.fotos
        ? Array.from(new Set([...bienExistente.fotos.split(','), ...fotosNombres])).join(',')
        : fotosNombres.join(',');
      await bienExistente.save({ transaction });
    }

    // Registrar la transacción
    const transaccion = await Transaccion.create({
      bienId: bienExistente.uuid,
      compradorId,
      vendedorId,
      cantidad,
      monto: precio * cantidad,
      metodoPago,
      fecha: new Date(),
      estado: 'pendiente',
      tipoTransaccion: 'Compra',
    }, { transaction });

    // Confirmar la transacción
    await transaction.commit();

    res.status(201).json({
      mensaje: "Compra registrada exitosamente",
      transaccion,
      bien: bienExistente,
      bienId: bienExistente.uuid,
    });
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    console.error("Error al registrar la compra:", error);
    res.status(500).json({
      mensaje: "Error al registrar la transacción",
      error: error.message,
    });
  }
};*/
const registrarCompra = async (req) => {
  const {
    bienId,
    compradorId,
    vendedorId,
    precio,
    descripcion,
    tipo,
    marca,
    modelo,
    imei,
    cantidad,
    metodoPago,
  } = req.body;

  const requiredFields = [bienId, compradorId, vendedorId, precio, cantidad, metodoPago, tipo, marca, modelo];
  if (requiredFields.some(field => !field)) {
    throw new Error("Faltan datos necesarios para registrar la compra.");
  }

  if (tipo === 'Teléfono móvil' && !imei) {
    throw new Error("IMEI es requerido para teléfonos móviles.");
  }

  const fotos = req.files ? req.files['fotos'] : null;
  let fotosNombres = fotos ? fotos.map(file => file.filename) : [];

  const transaction = await sequelize.transaction();

  try {
    let bienExistente = await Bien.findOne({ where: { uuid: bienId } });

    if (!bienExistente) {
      if (!fotos || fotos.length === 0) {
        await transaction.rollback();
        throw new Error('No se han cargado fotos para el bien nuevo');
      }

      bienExistente = await Bien.create({
        uuid: bienId,
        vendedorId,
        compradorId,
        descripcion,
        precio,
        fecha: new Date(),
        tipo,
        marca,
        modelo,
        imei,
        stock: cantidad,
        fotos: fotosNombres.join(',')
      }, { transaction });
    } else {
      bienExistente.stock += cantidad;
      const fotosExistentes = bienExistente.fotos ? bienExistente.fotos.split(',') : [];
      bienExistente.fotos = Array.from(new Set([...fotosExistentes, ...fotosNombres])).join(',');
      await bienExistente.save({ transaction });
    }

    const transaccion = await Transaccion.create({
      bienId: bienExistente.uuid,
      compradorId,
      vendedorId,
      cantidad,
      monto: precio * cantidad,
      metodoPago,
      fecha: new Date(),
      estado: 'pendiente',
      tipoTransaccion: 'Compra',
    }, { transaction });

    await transaction.commit();

    return {
      mensaje: "Compra registrada exitosamente",
      transaccion,
      bien: bienExistente,
      bienId: bienExistente.uuid
    };

  } catch (error) {
    await transaction.rollback();
    console.error("Error al registrar la compra:", error);
    throw error;
  }
};





module.exports = { registrarCompra };

