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
// Crear un nuevo bien
const crearBien = async (req, res) => {
  try {
    const { descripcion, precio, tipo, marca, modelo, stock, vendedorId, compradorId, fecha, fotos } = req.body;

    // Verifica si se proporcionaron todos los campos necesarios
    if (!descripcion || !precio || !tipo || !marca || !modelo || !stock || !vendedorId || !fecha) {
      return res.status(400).json({ mensaje: 'Faltan datos necesarios para crear el bien' });
    }

    // Crea el nuevo bien
    const nuevoBien = await Bien.create({
      descripcion,
      precio,
      tipo,
      marca,
      modelo,
      stock,
      vendedorId,
      compradorId,  // Si es necesario, podrías omitir esto al crear el bien
      fecha,
      fotos
    });

    // Devuelve una respuesta exitosa con el nuevo bien
    res.status(201).json({
      mensaje: "Bien creado con éxito",
      id: nuevoBien.uuid,  // Asegúrate de devolver el UUID
      nuevoBien // Esto contiene todos los detalles del nuevo bien
    });

  } catch (error) {
    console.error('Error al crear el bien:', error);
    res.status(500).json({ mensaje: "Error al crear el bien", error: error.message });
  }
};


// Obtener bien por ID
const obtenerBienPorId = async (req, res) => {
  try {
    const { id } = req.params; // id es ahora un UUID
    const bien = await Bien.findOne({ where: { id } });

    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado' });
    }

    return res.json(bien);
  } catch (error) {
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
// Registrar una transacción
const registrarTransaccion = async (req, res) => {
  try {
    const { bienId, compradorId, cantidadVendida, monto, estado, metodoPago } = req.body;

    if (!bienId || !compradorId || !cantidadVendida || cantidadVendida <= 0 || !monto) {
      return res.status(400).json({ message: 'bienId, compradorId, cantidadVendida, y monto son obligatorios, y la cantidadVendida debe ser positiva' });
    }

    const bien = await Bien.findByPk(bienId);
    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado' });
    }

    if (bien.stock < cantidadVendida) {
      return res.status(400).json({ message: 'No hay suficiente stock disponible' });
    }

    bien.stock -= cantidadVendida;
    bien.compradorId = compradorId;
    bien.fecha = new Date();

    await bien.save();

    const transaccion = await Transaccion.create({
      bienId,
      compradorId,
      vendedorId: bien.vendedorId,
      cantidad: cantidadVendida,
      monto,
      estado: estado || 'pendiente',
      metodoPago: metodoPago || null,
      fecha: new Date()
    });

    res.status(200).json({ message: 'Transacción registrada exitosamente', transaccion });
  } catch (error) {
    console.error('Error al registrar la transacción:', error);
    res.status(500).json({ message: 'Error al registrar la transacción', error: error.message });
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

    const transaccionesJson = transacciones.map(transaccion => {
      const { bien, comprador, vendedor, ...transaccionData } = transaccion.toJSON();
      return {
        ...transaccionData,
        'Código Único de identificación de operación': transaccionData.uuid,
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

    console.log('Transacciones encontradas:', transaccionesJson);

    if (transaccionesJson.length === 0) {
      return res.status(200).json({ message: 'No se encontraron transacciones para este usuario.' });
    }

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



// Registrar una venta
const registrarVenta = async (req, res) => {
  const { bienId, compradorId, cantidadComprada, monto } = req.body;

  const transaction = await sequelize.transaction();

  try {
    // Buscar el bien
    const bien = await Bien.findOne({ where: { id: bienId }, transaction });
    if (!bien) {
      throw new Error('El bien no existe.');
    }

    // Verificar stock
    if (bien.stock < cantidadComprada) {
      throw new Error('Stock insuficiente para realizar la venta.');
    }

    // Actualizar stock del bien (vendedor)
    bien.stock -= cantidadComprada;
    if (bien.stock === 0) {
      await bien.destroy({ transaction });
    } else {
      await bien.save({ transaction });
    }

    // Crear o actualizar bien del comprador
    let bienComprador = await Bien.findOne({
      where: {
        imei: bien.imei,
        compradorId: compradorId
      },
      transaction
    });

    if (bienComprador) {
      // Si el bien ya existe en el stock del comprador, actualizar el stock
      bienComprador.stock += cantidadComprada;
      await bienComprador.save({ transaction });
    } else {
      // Si el bien no existe en el stock del comprador, crear un nuevo registro
      await Bien.create({
        vendedorId: bien.vendedorId, // El vendedor original del bien
        compradorId: compradorId, // El comprador actual del bien
        descripcion: bien.descripcion,
        precio: bien.precio,
        fecha: new Date(),
        tipo: bien.tipo,
        marca: bien.marca,
        modelo: bien.modelo,
        imei: bien.imei,
        stock: cantidadComprada,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { transaction });
    }

    // Registrar la transacción
    await Transaccion.create({
      bienId,
      vendedorId: bien.vendedorId,
      compradorId,
      cantidad: cantidadComprada,
      monto,
      fecha: new Date(),
      estado: 'pendiente',
      tipoTransaccion: 'Venta'
    }, { transaction });

    await transaction.commit();
    res.status(200).json({ message: 'Venta registrada con éxito' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error al registrar la venta', error: error.message });
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

  console.log('Datos recibidos en la compra:', req.body);

  // Validar que los datos necesarios estén presentes
  if (!bienId || !compradorId || !vendedorId || !precio || !cantidad || !metodoPago || !tipo || !marca || !modelo) {
      return res.status(400).json({ mensaje: "Faltan datos necesarios para registrar la compra." });
  }

  // Verificar si imei es necesario según el tipo
  if (tipo === 'Teléfono móvil' && !imei) {
      return res.status(400).json({ mensaje: "Faltan datos necesarios: imei es requerido para teléfonos móviles." });
  }

  console.log("Datos después de validaciones:", req.body);

  const transaction = await sequelize.transaction();

  try {
      // Verificar si el bien existe
      let bien = await Bien.findOne({
          where: { uuid: bienId },
          transaction, // Usar la transacción actual
      });

      console.log("Bien a crear:", bien);

      if (!bien) {
          // Crear un nuevo bien
          bien = await Bien.create({
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
              createdAt: new Date(),
              updatedAt: new Date(),
          }, { transaction });

          console.log("Bien creado:", bien); // Verifica si se creó correctamente
      } else {
          // Si el bien ya existe, actualizar el stock
          bien.stock += cantidad;
          await bien.save({ transaction });
          console.log("Stock actualizado del bien existente:", bien);
      }

      // Registrar la transacción
      const transaccion = await Transaccion.create({
          bienId: bien.uuid, // Asegúrate de que bienId sea el UUID correcto
          compradorId,
          vendedorId,
          cantidad,
          monto: precio * cantidad,
          metodoPago,
          fecha: new Date(),
          estado: 'pendiente',
          tipoTransaccion: 'Compra',
      }, { transaction });

      // Commit de la transacción
      await transaction.commit();

      res.status(201).json({
          mensaje: "Compra registrada exitosamente",
          transaccion: {
              id: transaccion.id,
              bienId: transaccion.bienId,
              compradorId: transaccion.compradorId,
              vendedorId: transaccion.vendedorId,
              cantidad: transaccion.cantidad,
              monto: transaccion.monto,
              metodoPago: transaccion.metodoPago,
              fecha: transaccion.fecha,
              estado: transaccion.estado,
              tipoTransaccion: transaccion.tipoTransaccion,
          },
          bien: {
              uuid: bien.uuid,
              vendedorId: bien.vendedorId,
              compradorId: bien.compradorId,
              descripcion: bien.descripcion,
              precio: bien.precio,
              fecha: bien.fecha,
              tipo: bien.tipo,
              marca: bien.marca,
              modelo: bien.modelo,
              imei: bien.imei,
              stock: bien.stock,
          },
      });
  } catch (error) {
      // Rollback de la transacción en caso de error
      await transaction.rollback();
      console.error("Error al registrar la compra:", error);
      res.status(500).json({
          mensaje: "Error al registrar la transacción",
          error: error.message,
          stack: error.stack // Incluye stack para depuración
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
  actualizarBien,
  eliminarBien,
  registrarTransaccion,
  subirStockExcel,
  obtenerTransaccionesPorBien,
  obtenerBienesDisponibles,
  obtenerTransaccionesPorUsuario,
  registrarVenta,
  registrarCompra,
  actualizarStockBienes,
  registrarBien,
  obtenerTrazabilidadPorBien,
};
