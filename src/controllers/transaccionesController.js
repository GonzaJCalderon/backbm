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
    const { vendedorUuid, compradorId, ventaData } = req.body;
    const bienesArray = JSON.parse(ventaData);
    const fotosCargadas = req.uploadedPhotosVenta || {};

    console.log("📌 Datos de la venta recibidos:", bienesArray);
    console.log("📸 Fotos subidas asociadas:", JSON.stringify(fotosCargadas, null, 2));

    const transaction = await sequelize.transaction();

    try {
      for (let i = 0; i < bienesArray.length; i++) {
        const bien = bienesArray[i];
        const fotosBien = fotosCargadas[i]?.fotos || [];
        const imeisCargados = fotosCargadas[i]?.imeis || {};

        console.log(`📌 Procesando bien #${i + 1}:`, bien);
        console.log(`📸 Fotos asociadas al bien:`, fotosBien);

        let bienExistente;

        // 1️⃣ Verificar si el bien ya existe en la BD
        if (bien.uuid) {
          bienExistente = await Bien.findOne({ where: { uuid: bien.uuid }, transaction });

          if (!bienExistente) {
            throw new Error(`❌ Bien con UUID ${bien.uuid} no encontrado.`);
          }

          // 2️⃣ Verificar stock disponible
          const stockExistente = await Stock.findOne({ where: { bien_uuid: bien.uuid }, transaction });

          if (!stockExistente || stockExistente.cantidad < bien.cantidad) {
            throw new Error(`❌ Stock insuficiente para el bien: ${bienExistente.modelo}`);
          }

          // 3️⃣ Restar stock y actualizar bien
          stockExistente.cantidad -= bien.cantidad;
          await stockExistente.save({ transaction });

          if (fotosBien.length > 0) {
            bienExistente.fotos = [...(bienExistente.fotos || []), ...fotosBien];
            await bienExistente.save({ transaction });
            console.log(`✅ Fotos añadidas al bien existente (${bienExistente.uuid}):`, bienExistente.fotos);
          }
        } else {
          // 4️⃣ Crear un nuevo bien si no existe
          const nuevoUuid = uuidv4();

          bienExistente = await Bien.create(
            {
              uuid: nuevoUuid,
              tipo: bien.tipo,
              marca: bien.marca,
              modelo: bien.modelo,
              descripcion: bien.descripcion,
              precio: parseFloat(bien.precio),
              propietario_uuid: vendedorUuid,
              fotos: fotosBien,
            },
            { transaction }
          );

          console.log(`✅ Nuevo bien creado (${nuevoUuid}):`, bienExistente);

          await Stock.create(
            {
              bien_uuid: nuevoUuid,
              cantidad: 0,
              usuario_uuid: vendedorUuid,
            },
            { transaction }
          );
        }

        // 5️⃣ Procesar IMEIs (si el bien tiene identificadores únicos)
        const imeisVendidos = [];

        if (bien.imeis && bien.imeis.length > 0) {
          for (let j = 0; j < bien.imeis.length; j++) {
            const imeiObj = bien.imeis[j];
            const imeiFotoUrl = imeisCargados[j] || imeiObj.foto || null;

            let detalleImei = await DetallesBien.findOne({
              where: {
                identificador_unico: imeiObj.imei,
                bien_uuid: bienExistente.uuid,
              },
              transaction,
            });

            if (!detalleImei) {
              detalleImei = await DetallesBien.create(
                {
                  bien_uuid: bienExistente.uuid,
                  identificador_unico: imeiObj.imei,
                  estado: "vendido",
                  foto: imeiFotoUrl,
                },
                { transaction }
              );
            } else {
              detalleImei.estado = "vendido";
              detalleImei.foto = imeiFotoUrl || detalleImei.foto;
              await detalleImei.save({ transaction });
            }

            imeisVendidos.push({
              imei: imeiObj.imei,
              foto: detalleImei.foto,
              precio: imeiObj.precio,
            });

            console.log(`✅ IMEI procesado [${j}]:`, imeiObj.imei, "Foto:", imeiFotoUrl);
          }
        }

        // 6️⃣ Crear la transacción de venta
        await Transaccion.create(
          {
            uuid: uuidv4(),
            fecha: new Date(),
            monto: parseFloat(bien.precio) * bien.cantidad,
            precio: parseFloat(bien.precio),
            cantidad: bien.cantidad,
            metodoPago: bien.metodoPago || "efectivo",
            vendedor_uuid: vendedorUuid,
            comprador_uuid: compradorId,
            bien_uuid: bienExistente.uuid,
            fotos: fotosBien,
            imeis: imeisVendidos,
          },
          { transaction }
        );

        console.log(`✅ Transacción registrada para el bien ${bienExistente.uuid}`);
      }

      await transaction.commit();

      return res.status(201).json({ success: true, message: "✅ Venta registrada correctamente." });
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error en la transacción:", error);
      return res.status(500).json({ message: "❌ Error en la venta.", error: error.message });
    }
  } catch (error) {
    console.error("❌ Error general:", error);
    return res.status(500).json({ message: "❌ Error interno del servidor." });
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
