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



const registrarVenta = async (req, res) => {
  try {
    console.log("📌 Datos recibidos en el backend:", req.body);
    console.log("📌 Fotos subidas en `req.uploadedPhotosVenta`:", req.uploadedPhotosVenta);

    let { vendedorUuid, compradorId, ventaData } = req.body;

    if (!vendedorUuid || !compradorId) {
      return res.status(400).json({ message: "Faltan datos obligatorios: vendedorUuid o compradorId." });
    }

    // ✅ Convertir ventaData a array
    let bienesArray;
    try {
      bienesArray = typeof ventaData === "string" ? JSON.parse(ventaData.trim()) : ventaData;
      if (!Array.isArray(bienesArray)) throw new Error("El formato de ventaData es incorrecto.");
    } catch (error) {
      console.error("❌ Error al convertir ventaData:", error);
      return res.status(400).json({ message: "Error al procesar ventaData. Asegúrate de enviar un JSON válido." });
    }

    if (bienesArray.length === 0) {
      return res.status(400).json({ message: "No se recibieron bienes válidos para la venta." });
    }

    const transaction = await sequelize.transaction();

    try {
      let transaccionesGuardadas = [];

      for (let i = 0; i < bienesArray.length; i++) {
        const { uuid, tipo, marca, modelo, descripcion, precio, cantidad, metodoPago, imeis } = bienesArray[i];

        // Extraer imágenes de req.uploadedPhotosVenta
        const photosData = req.uploadedPhotosVenta[i] || {};
        const fotosSubidas = Array.isArray(photosData.fotos) ? photosData.fotos : [];
        const imeiFotos = photosData.imeis || {};

        console.log(`📌 Procesando bien ${i}:`, { uuid, tipo, marca, modelo, descripcion, precio, cantidad, metodoPago, fotosSubidas, imeis, imeiFotos });

        let bien;
        if (uuid) {
          // Bien registrado: recuperar el registro existente para obtener, por ejemplo, la foto
          bien = await Bien.findOne({ where: { uuid }, transaction });
          if (!bien) {
            throw new Error(`No se encontró el bien registrado con uuid ${uuid}`);
          }
          // Para bienes registrados, usaremos las fotos que ya están en la base de datos.
          // Si por alguna razón necesitas combinar o actualizar fotos, puedes hacerlo aquí.
        } else {
          // Bien nuevo: se crea un registro
          bien = await Bien.create({
            uuid: uuidv4(),
            tipo,
            marca,
            modelo,
            descripcion: descripcion || "Sin descripción",
            precio: parseFloat(precio) || 0,
            // En bienes nuevos usamos las fotos subidas desde el front (puede ser un arreglo vacío si no se enviaron)
            fotos: fotosSubidas,
            propietario_uuid: vendedorUuid,
          }, { transaction });
        }

        // Registrar la transacción utilizando el bien (ya sea existente o nuevo)
        const nuevaTransaccion = await Transaccion.create({
          uuid: uuidv4(),
          cantidad,
          metodoPago: metodoPago || "efectivo",
          comprador_uuid: compradorId,
          vendedor_uuid: vendedorUuid,
          bien_uuid: bien.uuid,
          precio: parseFloat(precio) || 0,
          // Para el campo imeis, si es un teléfono móvil y se enviaron IMEIs,
          // se guarda la información en formato JSON (o el que se requiera).
          imeis: imeis ? JSON.stringify(imeis) : null,
          // Para las fotos de la transacción:
          // - Si el bien es nuevo, se usan las fotos subidas.
          // - Si el bien es registrado, podrías optar por usar bien.fotos (ya almacenadas) o alguna lógica adicional.
          fotos: uuid ? bien.fotos : fotosSubidas,
        }, { transaction });

        // Si es un teléfono móvil, procesar los IMEIs
        if (tipo === "teléfono movil" && imeis) {
          for (let j = 0; j < imeis.length; j++) {
            const imei = imeis[j];

            let detalleImei = await DetallesBien.findOne({
              where: { identificador_unico: imei },
              transaction,
            });

            if (!detalleImei) {
              detalleImei = await DetallesBien.create({
                uuid: uuidv4(),
                bien_uuid: bien.uuid,
                identificador_unico: imei,
                foto: imeiFotos[j]?.foto || null,
                estado: "vendido",  // IMEI se guarda como vendido
              }, { transaction });

              console.log(`✅ IMEI ${imei} registrado y marcado como "vendido"`);
            }
          }
        }

        transaccionesGuardadas.push(nuevaTransaccion);
      }

      await transaction.commit();

      return res.status(201).json({
        message: "Venta registrada correctamente.",
        transacciones: transaccionesGuardadas
      });

    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error al registrar venta:", error);
      return res.status(500).json({ message: "Error interno al registrar la venta." });
    }
  } catch (error) {
    console.error("❌ Error general en la venta:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
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
