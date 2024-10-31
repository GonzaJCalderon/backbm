const axios = require('axios');
const { Sequelize } = require('sequelize');
const Bien = require('../models/Bien');
const Usuario = require('../models/Usuario');
const Transaccion = require('../models/Transaccion');
const { Op } = require('sequelize');
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const sequelize = require('../config/db');
const { v4: isUUID } = require('uuid');
const { validate: validateUUID } = require('uuid');


const isValidUUID = (id) => {
  return validateUUID(id);
};

// Obtener todos los bienes
// Obtener todos los bienes
const obtenerBienes = async (req, res) => {
  try {
    const bienes = await Bien.findAll({
      include: [
        { model: Usuario, as: 'vendedor' },
        { model: Usuario, as: 'comprador' }
      ]
    });

    // Verificar si hay bienes
    if (!bienes || bienes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron bienes.' });
    }

    // Responder con los bienes
    res.status(200).json(bienes);
  } catch (error) {
    console.error('Error obteniendo bienes:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};




// Obtener bienes en stock
const obtenerBienesStock = async (req, res) => {
  try {
    const { search = '', userId } = req.query;

    const whereClause = {
      stock: { [Op.gt]: 0 } // Solo bienes con stock positivo
    };

    if (userId) {
      whereClause[Op.or] = [
        { vendedorId: userId },
        { compradorId: userId }
      ];
    }

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
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'vendedor',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Usuario,
          as: 'comprador',
          attributes: ['id', 'nombre', 'apellido']
        }
      ]
    });

    res.json({
      bienes,
      totalItems: count
    });
  } catch (error) {
    console.error('Error buscando bienes en stock:', error);
    res.status(500).json({ message: 'Error al buscar los bienes en stock', error: error.message });
  }
};

// Crear un nuevo bien
const crearBien = async (req, res) => {
  try {
    console.log('Datos del cuerpo:', req.body);
    console.log('Archivos recibidos:', req.files);

    const { descripcion, precio, tipo, marca, modelo, cantidad, vendedorId, fecha } = req.body;

    // Verificar que las fotos existan
    const fotos = req.files['fotos'];
    if (!fotos || fotos.length === 0) {
      return res.status(400).json({ mensaje: 'No se han cargado fotos' });
    }

    // Validar campos obligatorios
    if (!descripcion || !precio || !tipo || !marca || !modelo || cantidad === undefined || !vendedorId || !fecha) {
      return res.status(400).json({ mensaje: 'Faltan datos necesarios para crear el bien' });
    }

    // Convertir a números
    const precioNum = parseFloat(precio);
    const cantidadNum = parseInt(cantidad, 10);
    
    if (isNaN(precioNum) || isNaN(cantidadNum)) {
      return res.status(400).json({ mensaje: 'El precio o la cantidad no son válidos' });
    }

    // Guardar nombres de las fotos en una cadena separada por comas
    const fotosNombres = fotos.map(f => f.filename).join(',');

    // Crear el nuevo bien
    try {
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

      res.status(201).json(nuevoBien); // Responder con el nuevo bien creado
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al crear el bien: ' + error.message });
    }
  } catch (error) {
    res.status(500).send({ error: 'Error en el controlador: ' + error.message });
  }
};




// Obtener bien por ID
// Obtener bien por ID
const obtenerBienPorId = async (req, res) => {
  try {
    const { id } = req.params; // id es ahora un UUID
    // Cambia 'id' a 'uuid' para hacer la consulta correcta
    const bien = await Bien.findOne({ where: { uuid: id } });

    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado' });
    }

    return res.json(bien);
  } catch (error) {
    console.error('Error al obtener el bien:', error); // Para depuración
    return res.status(500).json({ error: 'Error al obtener el bien' });
  }
};


const registrarBien = async (req, res) => {
  try {
    const nuevoBien = await Bien.create({
      descripcion: req.body.descripcion,
      precio: req.body.precio,
      fecha: req.body.fecha,
      foto: req.body.foto,
      tipo: req.body.tipo,
      marca: req.body.marca,
      modelo: req.body.modelo,
      imei: req.body.imei,
      stock: req.body.stock,
      vendedorId: req.body.vendedorId,
      compradorId: req.body.compradorId,
      // Otros datos
    });

    return res.status(201).json(nuevoBien);
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar el bien' });
  }
};


// Actualizar bien
const actualizarBien = async (req, res) => {
  const { id } = req.params;
  const { vendedorId, compradorId, stock } = req.body;

  try {
    // Encuentra el bien por ID
    const bien = await Bien.findByPk(id);

    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado' });
    }

    // Actualiza los campos necesarios
    bien.vendedorId = vendedorId || bien.vendedorId;
    bien.compradorId = compradorId || bien.compradorId;
    bien.stock = stock !== undefined ? stock : bien.stock;
    bien.updatedAt = new Date();  // Actualiza el timestamp de la última modificación

    // Guarda los cambios
    await bien.save();

    res.status(200).json(bien);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el bien', error: error.message });
  }
};

// Eliminar bien
const eliminarBien = async (req, res) => {
  const { id } = req.params;
  try {
    const bien = await Bien.findByPk(id);
    if (!bien) {
      res.status(404).json({ message: 'Bien no encontrado' });
    } else {
      await bien.destroy();
      res.json({ message: 'Bien eliminado correctamente' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Registrar una transacción
const registrarTransaccion = async (req, res) => {
  const {
    bienId,
    compradorId,
    vendedorId,
    precio,
    cantidad,
    metodoPago,
    descripcion,
    tipo,
    marca,
    modelo,
    imei,
  } = req.body;

  console.log(`Datos recibidos para la transacción:`, req.body);

  // Validaciones
  if (!bienId || !compradorId || !vendedorId || !precio || !cantidad || !metodoPago || !tipo || !marca || !modelo) {
    return res.status(400).json({ mensaje: "Faltan datos necesarios para registrar la transacción." });
  }

  if (tipo === 'Teléfono móvil' && !imei) {
    return res.status(400).json({ mensaje: "Faltan datos necesarios: imei es requerido para teléfonos móviles." });
  }

  const transaction = await sequelize.transaction();

  try {
    // Buscar el bien
    let bien = await Bien.findOne({ where: { uuid: bienId }, transaction });

    if (!bien) {
      // Crear el bien si no existe
      bien = await Bien.create({
        uuid: bienId, // Asegúrate de que este UUID sea único y generado correctamente
        vendedorId,
        compradorId,
        descripcion,
        precio,
        tipo,
        marca,
        modelo,
        imei,
        stock: cantidad, // Inicializar stock
      }, { transaction });
    } else {
      // Actualizar stock existente
      if (req.body.tipoTransaccion === 'Venta') {
        if (bien.stock < cantidad) {
          return res.status(400).json({ mensaje: "Stock insuficiente para realizar la venta." });
        }
        bien.stock -= cantidad; // Decrementar stock
      } else {
        bien.stock += cantidad; // Incrementar stock en la compra
      }
      await bien.save({ transaction });
    }

    // Registrar la transacción
    const transaccion = await Transaccion.create({
      bienId: bien.uuid,
      compradorId,
      vendedorId,
      cantidad,
      monto: precio * cantidad,
      metodoPago,
      fecha: new Date(),
    

      tipoTransaccion: req.body.tipoTransaccion || 'Venta', // Usa 'Venta' por defecto
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      mensaje: `Transacción registrada exitosamente`,
      transaccion,
      bien,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`Error al registrar la transacción:`, error);
    res.status(500).json({ mensaje: "Error al registrar la transacción", error: error.message });
  }
};





// Subir stock desde un archivo Excel
const subirStockExcel = async (req, res) => {
  try {
    const filePath = req.file.path;
    const result = excelToJson({
      sourceFile: filePath,
      header: {
        rows: 1
      },
      columnToKey: {
        A: 'descripcion',
        B: 'precio',
        C: 'vendedorId', // Usa vendedorId en lugar de usuarioId
        D: 'fecha',
        E: 'tipo',
        F: 'marca',
        G: 'modelo',
        H: 'imei',
        I: 'stock'
      }
    });
    fs.unlinkSync(filePath);

    const bienes = result.Stock;

    for (const bienData of bienes) {
      try {
        await Bien.upsert({
          descripcion: bienData.descripcion,
          precio: bienData.precio,
          vendedorId: bienData.vendedorId,
          fecha: new Date(bienData.fecha),
          tipo: bienData.tipo,
          marca: bienData.marca,
          modelo: bienData.modelo,
          imei: bienData.imei || null,
          stock: bienData.stock || 0
        });
      } catch (error) {
        console.error('Error al procesar el bien:', bienData, error);
      }
    }

    res.status(200).json({ message: 'Stock actualizado desde Excel' });
  } catch (error) {
    console.error('Error al subir stock desde Excel:', error);
    res.status(500).json({ message: 'Error al subir stock desde Excel', error: error.message });
  }
};


// Obtener transacciones por bien
const obtenerTransaccionesPorBien = async (req, res) => {
  const { id } = req.params;  // Asegúrate de que 'id' esté bien definido
  const bienId = parseInt(id, 10);  // Convierte el valor a un entero

  if (!bienId) {
    return res.status(400).json({ message: 'ID del bien es requerido' });
  }

  try {
    const transacciones = await Transaccion.findAll({
      where: { bienId },
      include: [
        { model: Usuario, as: 'comprador', attributes: ['id', 'nombre', 'apellido', 'email'] },
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'apellido', 'email'] },
        { model: Bien, as: 'bien', attributes: ['id', 'descripcion', 'marca', 'modelo'] }
      ]
    });

    if (transacciones.length === 0) {
      return res.status(404).json({ message: 'No se encontraron transacciones para este bien.' });
    }

    res.json(transacciones);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo transacciones', error: error.message });
  }
};


// Obtener bienes por usuario
const obtenerBienesDisponibles = async (req, res) => {
  try {
    const bienes = await Bien.findAll({
      where: { stock: { [Sequelize.Op.gt]: 0 } }, // Bienes con stock mayor a 0
      include: [
        { model: Usuario, as: 'vendedor' },
        { model: Usuario, as: 'comprador' }
      ]
    });

    if (!bienes || bienes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron bienes.' });
    }

    res.status(200).json(bienes);
  } catch (error) {
    console.error('Error obteniendo bienes:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};
const obtenerTransaccionesPorUsuario = async (req, res) => {
  const { userId } = req.params;

  console.log(`Buscando transacciones para el usuario ID: ${userId}`);

  try {
    const transacciones = await Transaccion.findAll({
      where: {
        [Op.or]: [
          { compradorId: userId },
          { vendedorId: userId },
        ],
      },
      include: [
        {
          model: Usuario,
          as: 'comprador',
          attributes: ['id', 'nombre', 'apellido', 'dni', 'cuit', 'email', 'direccion'],
        },
        {
          model: Usuario,
          as: 'vendedor',
          attributes: ['id', 'nombre', 'apellido', 'dni', 'cuit', 'email', 'direccion'],
        },
        {
          model: Bien,
          as: 'bien',
          attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'tipo', 'stock'],
        },
      ],
    });

    // Imprime las transacciones encontradas para depuración
    console.log('Transacciones encontradas:', transacciones);

    if (!transacciones || transacciones.length === 0) {
      return res.status(200).json({ message: 'No se encontraron transacciones para este usuario.' });
    }

    const transaccionesJson = transacciones.map(transaccion => {
      const { bien, comprador, vendedor, ...transaccionData } = transaccion.toJSON();
      return {
        ...transaccionData,
        bien: {
          uuid: bien.uuid,
          descripcion: bien.descripcion,
          marca: bien.marca,
          modelo: bien.modelo,
          tipo: bien.tipo,
          stock: bien.stock,
        },
        comprador: {
          id: comprador.id,
          nombre: comprador.nombre,
          apellido: comprador.apellido,
          dni: comprador.dni || 'Sin DNI/CUIT',
          cuit: comprador.cuit || 'Sin DNI/CUIT',
          email: comprador.email || 'Sin email',
          direccion: comprador.direccion || 'Sin dirección',
        },
        vendedor: {
          id: vendedor.id,
          nombre: vendedor.nombre,
          apellido: vendedor.apellido,
          dni: vendedor.dni || 'Sin DNI/CUIT',
          cuit: vendedor.cuit || 'Sin DNI/CUIT',
          email: vendedor.email || 'Sin email',
          direccion: vendedor.direccion || 'Sin dirección',
        },
      };
    });

    res.json(transaccionesJson);
  } catch (error) {
    console.error('Error al obtener las transacciones:', error);
    res.status(500).json({ message: 'Error al obtener las transacciones.' });
  }
};





// Controlador para obtener la trazabilidad de un bien
// Controlador para obtener la trazabilidad de un bien
const obtenerTrazabilidadPorBien = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid || typeof uuid !== 'string') {
    return res.status(400).json({ message: 'El ID del bien debe ser un UUID válido.' });
  }

  try {
    console.log('ID del bien recibido:', uuid);

    const transacciones = await Transaccion.findAll({
      where: { bienId: uuid }, // Asegúrate de que bienId esté definido correctamente
      include: [
        { model: Usuario, as: 'compradorTransaccion', attributes: ['nombre', 'apellido'] },
        { model: Usuario, as: 'vendedorTransaccion', attributes: ['nombre', 'apellido'] },
        { model: Bien, as: 'bienTransaccion', attributes: ['descripcion', 'precio', 'tipo', 'marca', 'modelo'] }
      ],
      order: [['fecha', 'DESC']]
    });

    if (!transacciones.length) {
      return res.status(404).json({ message: 'No se encontraron transacciones para este bien.' });
    }

    res.json(transacciones);
  } catch (error) {
    console.error('Error al obtener trazabilidad:', error);
    res.status(500).json({ message: 'Error al obtener trazabilidad.', error: error.message });
  }
};


const registrarVenta = async (req, res) => {
  const {
    bienId,
    compradorId,
    vendedorId,
    precio,
    cantidad,
    metodoPago,
  } = req.body;

  // Validación del UUID
  if (!isValidUUID(bienId)) {
    return res.status(400).json({ mensaje: "El bienId proporcionado no es un UUID válido." });
  }
  
  // Validación del precio y cantidad
  if (precio <= 0 || cantidad <= 0) {
    return res.status(400).json({ mensaje: "El precio y la cantidad deben ser mayores a cero." });
  }

  const transaction = await sequelize.transaction();

  try {
    // Buscar el bien en la base de datos
    let bien = await Bien.findOne({
      where: { uuid: bienId },
      transaction,
    });

    // Verificar si el bien existe
    if (!bien) {
      return res.status(404).json({ mensaje: "El bien no existe." });
    }

    // Verificar si hay suficiente stock
    if (bien.stock < cantidad) {
      return res.status(400).json({ mensaje: "Stock insuficiente para realizar la venta." });
    }

    // Actualizar el stock
    bien.stock -= cantidad;
    await bien.save({ transaction });

    // Registrar la transacción
    const transaccion = await Transaccion.create({
      bienId: bien.uuid,
      compradorId,
      vendedorId,
      cantidad,
      monto: precio * cantidad,
      metodoPago,
      fecha: new Date(),
      tipoTransaccion: 'Venta',
    }, { transaction });

    // Confirmar la transacción
    await transaction.commit();

    // Responder al cliente
    res.status(201).json({
      mensaje: "Venta registrada exitosamente",
      transaccion,
      bien: { ...bien.get(), stock: bien.stock }, // Usa get para convertir a JSON
    });
  } catch (error) {
    await transaction.rollback(); // Hacer rollback en caso de error
    console.error("Error al registrar la venta:", error);
    res.status(500).json({
      mensaje: "Error al registrar la transacción",
      error: error.message,
    });
  }
};



const registrarCompra = async (req, res) => {
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
};



// Actualizar stock de bienes
const actualizarStockBienes = async (compra) => {
  const { vendedorId, compradorId, bienId, cantidad } = compra;

  try {
    // Encuentra el bien del vendedor
    const bienVendedor = await Bien.findOne({ where: { id: bienId, vendedorId } });

    if (!bienVendedor) {
      throw new Error('Bien del vendedor no encontrado');
    }

    // Actualiza el stock del bien del vendedor
    bienVendedor.stock -= cantidad;

    // Si el stock llega a cero o menor, eliminamos el bien del vendedor
    if (bienVendedor.stock <= 0) {
      bienVendedor.stock = 0;
      await bienVendedor.destroy();
    } else {
      await bienVendedor.save();
    }

    // Busca si el bien ya existe en el inventario del comprador
    let bienComprador = await Bien.findOne({
      where: {
        marca: bienVendedor.marca,
        modelo: bienVendedor.modelo,
        tipo: bienVendedor.tipo,
        compradorId: compradorId
      }
    });

    if (bienComprador) {
      // Si el bien ya existe en el inventario del comprador, solo actualizamos el stock
      bienComprador.stock += cantidad;
      await bienComprador.save();
    } else {
      // Si el bien no existe en el inventario del comprador, creamos uno nuevo
      await Bien.create({
        vendedorId: vendedorId,
        compradorId: compradorId,
        descripcion: bienVendedor.descripcion,
        precio: bienVendedor.precio,
        fecha: new Date(),
        tipo: bienVendedor.tipo,
        marca: bienVendedor.marca,
        modelo: bienVendedor.modelo,
        imei: bienVendedor.imei,
        stock: cantidad,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error al actualizar el stock de bienes:', error);
  }
};

module.exports = {
  obtenerBienes,
  obtenerBienesStock,
  crearBien,
  obtenerBienPorId,
  registrarBien,
  actualizarBien,
  eliminarBien,
  registrarTransaccion,
  subirStockExcel,
  obtenerTransaccionesPorBien,
  obtenerBienesDisponibles,
  obtenerTransaccionesPorUsuario,
  obtenerTrazabilidadPorBien,
  registrarVenta,
  registrarCompra,
  actualizarStockBienes
};

