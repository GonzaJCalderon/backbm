// src/controllers/transaccionesController.js
const { sequelize, Bien, Stock, Usuario, Transaccion, DetallesBien } = require('../models');
const { crearBien } = require('../controllers/bienesController'); // Asegúrate de usar la ruta correcta
const { Op } = require('sequelize');

const { actualizarStock, verificarStock, existeBien,verificarYActualizarStockVendedor  } = require('../services/stockService');
const { uploadFileToCloudinary } = require('../middlewares/uploadFotos');
const { v4: uuidv4 } = require('uuid');




const cloudinary = require('cloudinary').v2;



// Configura Cloudinary (asegúrate de reemplazar con tus credenciales reales)
cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: '154721198775314',
  api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk',
});

const registrarCompra = async (req, res) => {
  try {
    console.log("📌 Token decodificado:", req.user);
    console.log("📌 req.body antes de procesar:", req.body);

    // Extraer el vendedorId (en nivel raíz)
    const { vendedorId } = req.body;
    if (!vendedorId) {
      return res.status(400).json({ message: "Faltan datos del vendedor." });
    }

    // Normalizar bienes: si no es un array, parsear el JSON
    const bienesArray = Array.isArray(req.body.bienes)
      ? req.body.bienes
      : JSON.parse(req.body.bienes || '[]');

    console.log("📌 Bienes normalizados:", bienesArray);

    // Obtener las fotos subidas (organizadas por índice) del middleware
    const uploadedPhotos = req.uploadedPhotos || {};
    console.log("📌 Fotos procesadas:", uploadedPhotos);

    if (!bienesArray.length) {
      return res.status(400).json({ message: "No se enviaron bienes en la compra." });
    }

    const transaction = await sequelize.transaction();

    try {
      const bienesRegistrados = [];

      for (let i = 0; i < bienesArray.length; i++) {
        // Extraer los campos generales del bien
        const {
          tipo,
          marca,
          modelo,
          descripcion,
          precio,
          cantidad,
          metodoPago,
          imei  // Solo para teléfonos móviles
        } = bienesArray[i];

        // Extraer la información de fotos para este bien desde uploadedPhotos
        // Si no existe, se usa un objeto vacío.
        const photosData = uploadedPhotos[i] || {};
        // Las fotos generales deben ser un arreglo (si se subieron)
        const fotos = Array.isArray(photosData.fotos) ? photosData.fotos : [];
        // La foto del IMEI (si se subió) se espera en "imeiFoto"
        const imeiFoto = photosData.imeiFoto || null;

        console.log(`📌 Procesando bien ${i}:`, {
          tipo,
          marca,
          modelo,
          descripcion,
          precio,
          cantidad,
          metodoPago,
          fotos,
          imei,
          imeiFoto
        });

        // Crear el registro del bien
        let bien;
        try {
          bien = await Bien.create(
            {
              uuid: uuidv4(),
              tipo,
              marca,
              modelo,
              descripcion: descripcion || "Sin descripción",
              precio: parseFloat(precio) || 0,
              fotos,  // Se espera que fotos sea un arreglo (incluso si está vacío)
              propietario_uuid: req.user.uuid,
            },
            { transaction }
          );
        } catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError') {
            bien = await Bien.findOne({ where: { tipo, marca, modelo }, transaction });
          } else {
            throw error;
          }
        }

        // Actualizar o insertar el stock
        await Stock.upsert(
          {
            uuid: uuidv4(),
            bien_uuid: bien.uuid,
            cantidad: cantidad || 1,
            usuario_uuid: req.user.uuid,
          },
          { transaction }
        );

        // Registrar la transacción de compra
        await Transaccion.create(
          {
            cantidad,
            metodoPago: metodoPago || "efectivo",
            comprador_uuid: req.user.uuid,
            vendedor_uuid: vendedorId,
            bien_uuid: bien.uuid,
            fotos,  // Fotos generales (si existen)
            precio: parseFloat(precio) || 0,
          },
          { transaction }
        );

        // Para teléfonos móviles, se requiere que se envíe un IMEI.
        // Si el bien es "teléfono movil" y se envió un IMEI, crear DetallesBien.
        if (tipo === "teléfono movil") {
          if (!imei) {
            throw new Error(`Falta el IMEI para el bien en el índice ${i} (marca: ${marca}, modelo: ${modelo}).`);
          }
          await DetallesBien.create(
            {
              uuid: uuidv4(),
              bien_uuid: bien.uuid,
              identificador_unico: imei,
              foto: imeiFoto, // Puede ser null si no se subió foto del IMEI
              estado: 'disponible',
            },
            { transaction }
          );
        }

        bienesRegistrados.push(bien);
      }

      await transaction.commit();
      return res.status(201).json({ message: "Compra registrada con éxito.", bienes: bienesRegistrados });
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error en la compra:", error);
      return res.status(500).json({ message: error.message || "Error interno." });
    }
  } catch (error) {
    console.error("❌ Error general en la compra:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};


const crearBienYStock = async ({ tipo, marca, modelo, cantidad, precio, vendedorId, transaction }) => {
  let bien = await Bien.findOne({
      where: { tipo, marca, modelo },
      transaction,
  });

  if (!bien) {
      bien = await Bien.create(
          {
              uuid: require('uuid').v4(),
              tipo,
              marca,
              modelo,
              precio: precio || 0,
          },
          { transaction }
      );

      await Stock.create(
          {
              bienId: bien.uuid,
              usuarioId: vendedorId,
              cantidad, // Inicializa con la cantidad solicitada
          },
          { transaction }
      );
  }

  return bien;

};



// Registrar una venta
const registrarVenta = async (req, res) => {
  console.log('Datos recibidos en el backend:', req.body);

  let transaction;
  try {
    const { bienUuid, vendedorUuid, cantidad, metodoPago, imeis = [], compradorId, precio, monto } = req.body;

    // Validar campos obligatorios
    if (!bienUuid || !cantidad || !metodoPago || !compradorId || !vendedorUuid || !precio) {
      console.error('Error: Datos faltantes en la solicitud.', {
        bienUuid,
        cantidad,
        metodoPago,
        compradorId,
        vendedorUuid,
        precio,
      });
      return res.status(400).json({
        message: 'Faltan datos obligatorios para registrar la venta.',
        detalles: { bienUuid, vendedorUuid, cantidad, metodoPago, compradorId, precio },
      });
    }

    // Calcular monto final si no se proporciona
    const montoFinal = monto ? parseFloat(monto) : parseFloat(precio) * parseInt(cantidad, 10);
    console.log('Monto final calculado:', montoFinal);

    // Iniciar transacción
    transaction = await sequelize.transaction();

    // Verificar si el bien pertenece al vendedor
    const bien = await Bien.findOne({
      where: { uuid: bienUuid, propietario_uuid: vendedorUuid },
      include: [
        {
          model: Stock,
          as: 'stock',
          where: { usuario_uuid: vendedorUuid },
        },
      ],
      transaction,
    });

    if (!bien || !bien.stock) {
      console.error('Error: El bien no existe o no pertenece al vendedor.');
      await transaction.rollback();
      return res.status(404).json({ message: 'El bien no existe o no pertenece al vendedor.' });
    }

    // Verificar si hay stock suficiente
    if (bien.stock.cantidad < cantidad) {
      console.error(`Error: Stock insuficiente. Stock disponible: ${bien.stock.cantidad}`);
      await transaction.rollback();
      return res.status(400).json({
        message: `Stock insuficiente. Stock disponible: ${bien.stock.cantidad}.`,
      });
    }

    // Procesar IMEIs si se proporcionan
    if (imeis.length > 0) {
      const detalles = await DetallesBien.findAll({
        where: {
          bien_uuid: bienUuid,
          identificador_unico: { [Op.in]: imeis },
          estado: 'disponible',
        },
        transaction,
      });

      console.log('Detalles encontrados para los IMEIs:', detalles.map((d) => d.identificador_unico));

      if (detalles.length !== imeis.length) {
        const identificadoresFaltantes = imeis.filter(
          (id) => !detalles.some((d) => d.identificador_unico === id),
        );
        console.error('Error: Algunos IMEIs no existen o ya fueron vendidos.', identificadoresFaltantes);
        await transaction.rollback();
        return res.status(400).json({
          message: 'Algunos identificadores no existen o ya fueron vendidos.',
          identificadoresFaltantes,
        });
      }

      // Actualizar estado de los IMEIs vendidos
      await DetallesBien.update(
        { estado: 'vendido' },
        {
          where: { bien_uuid: bienUuid, identificador_unico: { [Op.in]: imeis } },
          transaction,
        }
      );
      console.log('IMEIs marcados como vendidos:', imeis);
    } else {
      // Asignar automáticamente identificadores si no son teléfonos móviles
      const detallesDisponibles = await DetallesBien.findAll({
        where: { bien_uuid: bienUuid, estado: 'disponible' },
        limit: cantidad,
        transaction,
      });

      if (detallesDisponibles.length < cantidad) {
        console.error('Error: No hay suficientes identificadores disponibles para el bien.');
        await transaction.rollback();
        return res.status(400).json({
          message: 'No hay suficientes identificadores disponibles para completar la venta.',
        });
      }

      imeis.push(...detallesDisponibles.map((detalle) => detalle.identificador_unico));
      await DetallesBien.update(
        { estado: 'vendido' },
        {
          where: { identificador_unico: { [Op.in]: imeis } },
          transaction,
        }
      );
      console.log('Identificadores asignados automáticamente y marcados como vendidos:', imeis);
    }

    // Actualizar stock del vendedor
    bien.stock.cantidad -= cantidad;
    await bien.stock.save({ transaction });

    // Registrar la venta en Transaccion
    const transaccion = await Transaccion.create(
      {
        bien_uuid: bienUuid,
        vendedor_uuid: vendedorUuid,
        comprador_uuid: compradorId,
        cantidad,
        metodoPago,
        fecha: new Date(),
        precio: parseFloat(precio),
        monto: montoFinal,
        imeis, // Almacena los IMEIs vendidos
      },
      { transaction },
    );

    console.log('Transacción creada con éxito:', transaccion);

    // Confirmar transacción
    await transaction.commit();
    return res.status(201).json({
      message: 'Venta registrada con éxito.',
      transaccion,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error en registrarVenta:', error.message, error.stack);
    return res.status(500).json({
      message: 'Error interno al registrar la venta.',
      detalles: error.message,
    });
  }
};


const registrarTransaccion = async (req, res) => {
  
    const { bienId, compradorId, vendedorId, cantidad, metodoPago, monto } = req.body;
    console.log('Datos recibidos en registrarCompra:', req.body);
    console.log('Fotos procesadas:', req.uploadedPhotos);
    
    try {
      if (!bienId || !compradorId || !vendedorId || !cantidad || !metodoPago || !monto) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
      }
  
      // Verificar que el bien existe y tiene stock suficiente
      await verificarStock(bienId, cantidad);
  
      // Registrar la transacción
      const transaccion = await Transaccion.create({
        bienId,
        compradorId,
        vendedorId,
        cantidad,
        metodoPago,
        monto,
        fecha: new Date(),
      });
  
      // Actualizar el stock del bien
      await actualizarStock({ bienId, cantidad, tipoOperacion: 'restar' });
  
      res.status(201).json({ success: true, message: 'Transacción registrada exitosamente.', transaccion });
    } catch (error) {
      console.error('Error al registrar la transacción:', error);
      res.status(500).json({ error: 'Error al procesar la transacción.', detalles: error.message });
    }
  };
  



/**
 * Obtener transacciones por usuario (como comprador o vendedor).
 */
const obtenerTransaccionesPorUsuario = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ message: 'El UUID del usuario es obligatorio.' });
  }

  console.log('UUID recibido:', uuid);

  try {
    const transacciones = await Transaccion.findAll({
      where: {
        [Op.or]: [{ comprador_uuid: uuid }, { vendedor_uuid: uuid }],
      },
      include: [
        {
          model: Bien,
          as: 'bienTransaccion',
          attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'precio', 'fotos', 'tipo'],
          include: [
            {
              model: DetallesBien,
              as: 'detalles',
              attributes: ['identificador_unico', 'estado', 'foto'], // ✅ Incluir la foto de los IMEIs
            },
          ],
        },
        {
          model: Usuario,
          as: 'compradorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'dni', 'cuit', 'email', 'direccion', 'tipo'],
        },
        {
          model: Usuario,
          as: 'vendedorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'dni', 'cuit', 'email', 'direccion', 'tipo'],
        },
      ],
    });

    if (transacciones.length === 0) {
      return res.json({ message: 'No se encontraron transacciones para este usuario.', transacciones: [] });
    }

    console.log('✅ Transacciones encontradas:', JSON.stringify(transacciones, null, 2)); 

    res.json(transacciones);
  } catch (error) {
    console.error('❌ Error al obtener transacciones:', error.message);
    res.status(500).json({
      message: 'Error al obtener transacciones.',
      detalles: error.message,
    });
  }
};



/**
 * Obtener transacciones relacionadas con un bien.
 */
const obtenerTransaccionesPorBien = async (req, res) => {
  const { bienId } = req.params;

  try {
    const transacciones = await Transaccion.findAll({
      where: { bienId },
      include: [
        { model: Usuario, as: 'comprador', attributes: ['id', 'nombre', 'apellido'] },
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'apellido'] },
      ],
    });

    if (!transacciones.length) {
      return res.status(404).json({ message: 'No se encontraron transacciones para este bien.' });
    }

    res.json(transacciones);
  } catch (error) {
    console.error('Error al obtener transacciones por bien:', error);
    res.status(500).json({ error: 'Error al obtener transacciones.', detalles: error.message });
  }
};

/**
 * Eliminar una transacción.
 */
const eliminarTransaccion = async (req, res) => {
  const { id } = req.params;

  try {
    const transaccion = await Transaccion.findByPk(id);
    if (!transaccion) {
      return res.status(404).json({ message: 'Transacción no encontrada.' });
    }

    await transaccion.destroy();
    res.json({ success: true, message: 'Transacción eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar la transacción:', error);
    res.status(500).json({ error: 'Error al eliminar la transacción.', detalles: error.message });
  }
};

const actualizarStockVendedor = async ({ bienId, vendedorId, cantidad, transaction }) => {
  let stockVendedor = await Stock.findOne({
      where: { bienId, usuarioId: vendedorId },
      transaction,
  });

  if (!stockVendedor) {
      stockVendedor = await Stock.create(
          {
              bienId,
              usuarioId: vendedorId,
              cantidad,
          },
          { transaction }
      );
  } else {
      stockVendedor.cantidad += cantidad; // Incrementar stock del vendedor
      await stockVendedor.save({ transaction });
  }

  return stockVendedor;
};


const obtenerBienesConFotos = async (req, res) => {
  try {
    const bienes = await Bien.findAll({
      include: [
        {
          model: Stock,
          as: 'stock',
          where: { usuario_uuid: uuid }, // Filtrar por el usuario propietario del stock
          required: true,
        },
      ],
    });

    const bienesConFotos = bienes.map((bien) => ({
      ...bien.toJSON(),
      fotos: bien.transacciones?.[0]?.fotos || [], // Toma las fotos de la primera transacción
    }));

    res.status(200).json(bienesConFotos);
  } catch (error) {
    console.error('Error al obtener bienes con fotos:', error);
    res.status(500).json({ message: 'Error al obtener bienes.', error: error.message });
  }
};


module.exports = {
  registrarTransaccion,
  obtenerTransaccionesPorUsuario,
  obtenerTransaccionesPorBien,
  eliminarTransaccion,
  registrarCompra,
  registrarVenta,
  actualizarStockVendedor,
  crearBienYStock,
  obtenerBienesConFotos ,
};
