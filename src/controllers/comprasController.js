const Bien = require('../models/Bien');
const Transaccion = require('../models/Transaccion');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');


const crearBien = async (req) => {
  console.log('req:::::', req);

  try {
    const { descripcion, precio, tipo, marca, modelo, cantidad, vendedorId, fecha } = req.body;
    const fotos = req.files;

    if (!fotos || fotos.length === 0) {
      throw new Error('No se han cargado fotos');
    }

    if (!descripcion || !precio || !tipo || !marca || !modelo || cantidad === undefined || !vendedorId || !fecha) {
      throw new Error('Faltan datos necesarios para crear el bien');
    }

    const precioNum = parseFloat(precio);
    const cantidadNum = parseInt(cantidad, 10);

    if (isNaN(precioNum) || isNaN(cantidadNum)) {
      throw new Error('El precio o la cantidad no son válidos');
    }

    // Si esperas múltiples archivos y quieres manejar ambos casos (un archivo o varios):
    let fotosNombres = [];

    if (Array.isArray(req.files)) {
      fotosNombres = req.files.map(f => f.filename);
    } else if (req.files) {
      // Si solo es un archivo único, no es un array, entonces accedemos a `filename` directamente
      fotosNombres.push(req.files.filename);
    }

    const nuevoBien = await Bien.create({
      descripcion,
      precio: precioNum,
      tipo,
      marca,
      modelo,
      stock: cantidadNum,
      vendedorId,
      fecha,
      foto: fotosNombres
    });

    return nuevoBien;

  } catch (error) {
    console.error('Error en crearBien:', error);
    return null; // Devuelve null en caso de error
  }
};

const registrarCompra = async (req) => {
  const {
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

  // Inicializar `bienId` como una variable mutable
  let { bienId } = req.body;

  if (!bienId) {
    const nuevoBien = await crearBien(req);
    console.log('NEW BIEN:::::::', nuevoBien);
    if (!nuevoBien) {
      throw new Error("Error al crear el bien");
    }
    bienId = nuevoBien.uuid;
  }

  const requiredFields = [bienId, compradorId, vendedorId, precio, cantidad, metodoPago, tipo, marca, modelo];
  if (requiredFields.some(field => !field)) {
    throw new Error("Faltan datos necesarios para registrar la compra.");
  }

  if (tipo === 'Teléfono móvil' && !imei) {
    throw new Error("IMEI es requerido para teléfonos móviles.");
  }

  const fotos = req.files ? req.files['fotos'] : null;
  const fotosNombres = fotos ? fotos.map(file => file.filename) : [];

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
        foto: fotosNombres // Guardar como array en el campo JSON
      }, { transaction });
    } else {
      bienExistente.stock += cantidad;
      const fotosExistentes = bienExistente.foto || []; // Trabajar con el array directamente
      bienExistente.foto = Array.from(new Set([...fotosExistentes, ...fotosNombres])); // Unir fotos sin duplicados
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

