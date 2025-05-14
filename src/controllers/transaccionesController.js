// src/controllers/transaccionesController.js
const { validate: isUuid } = require('uuid');

const { sequelize, Bien, Stock, Usuario, Transaccion, DetallesBien, Message, Empresa, TransaccionDetalle } = require('../models');

const { crearUsuarioPorTercero } = require('../services/usuarioService'); // 👈 Importar helper
const { crearBien } = require('../controllers/bienesController'); // Asegúrate de usar la ruta correcta
const { Op } = require('sequelize');

const { actualizarStock, verificarStock, existeBien,verificarYActualizarStockVendedor  } = require('../services/stockService');
const { notificarAdministradorInternamente } = require('../services/notficacionesService');

const { uploadFileToCloudinary } = require('../middlewares/uploadFotos');
const { v4: uuidv4 } = require('uuid');
const { validarExistenciaYPropiedadDeImei, validarYOcrearImeiSiNoExiste} = require('../services/imeiService');








const cloudinary = require('cloudinary').v2;



const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';


// Configura Cloudinary (asegúrate de reemplazar con tus credenciales reales)
cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: '154721198775314',
  api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk',
});
// 🔧 Para limpiar objetos anidados con [Object: null prototype]
function cleanObjectDeep(input) {
  if (Array.isArray(input)) {
    return input.map(cleanObjectDeep);
  } else if (input && typeof input === 'object') {
    const clean = {};
    for (const key in input) {
      clean[key] = cleanObjectDeep(input[key]);
    }
    return clean;
  }
  return input;
}



// 🔧 Utilidad interna
const notificarAdminSistema = async (contenido, transaction = null) => {
  try {
    await Message.create({
      senderUuid: SYSTEM_UUID,
      recipientUuid: null,
      assignedAdminUuid: null,
      isForAdmins: true,
      content: contenido,
      isRead: false,
    }, { transaction });
  } catch (error) {
    console.error('⚠️ No se pudo enviar mensaje automático al administrador:', error.message);
  }
};



const obtenerComprasPorUsuario = async (req, res) => {
  const { uuid } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!uuid || !isUuid(uuid)) {
    return res.status(400).json({ message: 'UUID inválido o no proporcionado.' });
  }

  try {
    const usuario = await Usuario.findOne({
      where: { uuid },
      include: [{ model: Empresa, as: 'empresa' }]
    });

    const empresaUuid = usuario?.empresaUuid || usuario?.empresa?.uuid;

    const { count, rows } = await Transaccion.findAndCountAll({
      where: {
        [Op.or]: [
          { comprador_uuid: uuid },
          ...(empresaUuid ? [{ comprador_representado_empresa_uuid: empresaUuid }] : [])
        ]
      },
      limit,
      offset,
      order: [['fecha', 'DESC']],
      include: [
        {
          model: Bien,
          as: 'bienTransaccion',
          attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'precio', 'fotos', 'tipo'],
        },
        {
          model: DetallesBien,
          as: 'detallesVendidos',
          through: { attributes: [] },
          attributes: ['identificador_unico', 'estado', 'foto'],
        },
        {
          model: Usuario,
          as: 'vendedorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'email'],
        },
        {
          model: Empresa,
          as: 'empresaVendedora',
          attributes: ['uuid', 'razonSocial'],
        }
      ],
    });

    res.status(200).json({
      success: true,
      data: rows,
      total: count,
      page,
      limit
    });

  } catch (error) {
    console.error('❌ Error en obtenerComprasPorUsuario:', error);
    res.status(500).json({ message: 'Error al obtener compras.', detalles: error.message });
  }
};




const obtenerVentasPorUsuario = async (req, res) => {
  const { uuid } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  if (!uuid || !isUuid(uuid)) {
    return res.status(400).json({ message: 'UUID inválido o no proporcionado.' });
  }

  try {
    const usuario = await Usuario.findOne({
      where: { uuid },
      include: [{ model: Empresa, as: 'empresa' }]
    });

    const empresaUuid = usuario?.empresaUuid || usuario?.empresa?.uuid;

    const { count, rows } = await Transaccion.findAndCountAll({
      where: {
        [Op.or]: [
          { vendedor_uuid: uuid },
          ...(empresaUuid ? [{ vendedor_representado_empresa_uuid: empresaUuid }] : [])
        ]
      },
      limit,
      offset,
      order: [['fecha', 'DESC']],
      include: [
        {
          model: Bien,
          as: 'bienTransaccion',
          attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'precio', 'fotos', 'tipo'],
          include: [{
            model: DetallesBien,
            as: 'detalles',
            attributes: ['identificador_unico', 'estado', 'foto'],
          }],
        },
        {
          model: Usuario,
          as: 'compradorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'email'],
        },
        {
          model: Empresa,
          as: 'empresaCompradora',
          attributes: ['uuid', 'razonSocial'],
        }
      ],
    });

    res.status(200).json({
      success: true,
      data: rows.map(t => ({ ...t.toJSON(), imeis: t.imeis || [] })),
      total: count,
      page,
      limit
    });

  } catch (error) {
    console.error('❌ Error en obtenerVentasPorUsuario:', error);
    res.status(500).json({ message: 'Error al obtener ventas.', detalles: error.message });
  }
};


// 🔧 Función para adaptar req.uploadedPhotos a formato esperado por crearBien
const normalizarFotosSubidas = (input) => {
  if (Array.isArray(input)) return input;

  const normalizado = [];
  for (let i of Object.keys(input).sort()) {
    normalizado.push({
      fotos: input[i]?.fotos || [],
      imeiFotos: input[i]?.imeiFotos || {},
    });
  }
  return normalizado;
};



const registrarCompra = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { comprador, vendedorId, bienes: bienesRaw } = req.body;
    const bienesArray = typeof bienesRaw === 'string' ? JSON.parse(bienesRaw) : bienesRaw;
    const usuario = req.user;
    const compradorId = comprador.uuid;

    const uploadedPhotos = req.uploadedPhotos || {}; // ✅ aquí llegan las fotos parseadas
    const transaccionesRegistradas = [];

    for (let index = 0; index < bienesArray.length; index++) {
      const bien = bienesArray[index];
      const cantidad = parseInt(bien.cantidad);
      const precio = parseFloat(bien.precio);
      const tipo = bien.tipo?.toLowerCase();
      const esTelefono = tipo.includes('teléfono');

      // Buscar bien original
      const bienExistente = await Bien.findOne({
        where: { uuid: bien.uuid },
        transaction,
      });

      if (!bienExistente) {
        throw new Error(`❌ No se encontró el bien con UUID: ${bien.uuid}`);
      }

      // Buscar detalles disponibles
      const detallesDisponibles = await DetallesBien.findAll({
        where: {
          bien_uuid: bienExistente.uuid,
          propietario_uuid: vendedorId,
          estado: 'disponible',
        },
        limit: cantidad,
        transaction,
      });

      if (detallesDisponibles.length < cantidad) {
        throw new Error(`❌ No hay suficientes unidades disponibles para ${bien.modelo}`);
      }

      // ✅ FOTOS: del bien general
      const fotosDelBien = uploadedPhotos[index]?.fotos || bien.fotos || [];

      // Buscar/crear bien clonado para comprador
      let bienDelComprador = await Bien.findOne({
        where: {
          tipo: bienExistente.tipo,
          marca: bienExistente.marca,
          modelo: bienExistente.modelo,
          propietario_uuid: compradorId,
        },
        transaction,
      });

      if (!bienDelComprador) {
        bienDelComprador = await Bien.create({
          uuid: uuidv4(),
          tipo: bienExistente.tipo,
          marca: bienExistente.marca,
          modelo: bienExistente.modelo,
          descripcion: bienExistente.descripcion,
          precio: bienExistente.precio,
          propietario_uuid: compradorId,
          registrado_por_uuid: usuario.uuid,
          fotos: fotosDelBien,
        }, { transaction });

        await Stock.create({
          uuid: uuidv4(),
          bien_uuid: bienDelComprador.uuid,
          propietario_uuid: compradorId,
          cantidad: 0,
        }, { transaction });
      }

      // Crear la transacción
      const transaccion = await Transaccion.create({
        uuid: uuidv4(),
        fecha: new Date(),
        monto: precio * cantidad,
        precio,
        cantidad,
        metodoPago: bien.metodoPago || 'efectivo',
        vendedor_uuid: vendedorId,
        comprador_uuid: compradorId,
        bien_uuid: bienDelComprador.uuid,
        fotos: fotosDelBien, // ✅ fotos en la transacción
        representado_por_uuid: usuario.uuid,
        comprador_representado_empresa_uuid: usuario.empresaUuid || null,
      }, { transaction });

      // Transferir detalles
      for (let i = 0; i < detallesDisponibles.length; i++) {
        const detalle = detallesDisponibles[i];
        detalle.estado = 'disponible';
        detalle.propietario_uuid = compradorId;
        detalle.bien_uuid = bienDelComprador.uuid;

        // ✅ FOTO por IMEI
        if (esTelefono) {
          const fotoImei = uploadedPhotos[index]?.imeiFotos?.[i];
          if (fotoImei) {
            detalle.foto = fotoImei;
          }
        } else {
          if (!detalle.foto && fotosDelBien.length > 0) {
            detalle.foto = fotosDelBien[0];
          }
        }

        await detalle.save({ transaction });

        await TransaccionDetalle.create({
          transaccion_uuid: transaccion.uuid,
          detalle_uuid: detalle.uuid,
        }, { transaction });
      }

      // Actualizar stock del comprador
      let stockComprador = await Stock.findOne({
        where: {
          bien_uuid: bienDelComprador.uuid,
          propietario_uuid: compradorId,
        },
        transaction,
      });

      if (!stockComprador) {
        await Stock.create({
          uuid: uuidv4(),
          bien_uuid: bienDelComprador.uuid,
          propietario_uuid: compradorId,
          cantidad: detallesDisponibles.length,
        }, { transaction });
      } else {
        stockComprador.cantidad += detallesDisponibles.length;
        await stockComprador.save({ transaction });
      }

      transaccionesRegistradas.push(transaccion);
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: '✅ Compra registrada correctamente.',
      transacciones: transaccionesRegistradas,
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en registrarCompra:', error);
    return res.status(500).json({
      success: false,
      message: '❌ Error al registrar la compra.',
      error: error.message,
    });
  }
};




const registrarVenta = async (req, res) => {
  const transaction = await sequelize.transaction();
  const transaccionesRegistradas = [];

  try {
    const usuario = req.user;
    const vendedorReal = usuario.empresaUuid || usuario.uuid;

    const compradorData = req.body.comprador || null;
    let compradorId = req.body.compradorId;

    // Crear usuario si se vende a un tercero nuevo
    if (!compradorId && compradorData?.dni && compradorData?.email) {
      const nuevoComprador = await crearUsuarioPorTercero(compradorData, vendedorReal);
      compradorId = nuevoComprador.uuid;
    }

    let bienesArray;
    try {
      bienesArray = typeof req.body.ventaData === 'string'
        ? JSON.parse(req.body.ventaData)
        : req.body.ventaData;
    } catch (e) {
      throw new Error('ventaData no es JSON válido');
    }

    const fotosCargadas = req.uploadedPhotos || req.uploadedPhotosVenta || {};
    console.log('\n📷 DEBUG FOTOS SUBIDAS:\n', JSON.stringify(fotosCargadas, null, 2));

    for (let i = 0; i < bienesArray.length; i++) {
      const bien = bienesArray[i];
      const fotosBien = fotosCargadas[i]?.fotos || [];

      // 📦 Si el bien NO existe aún, lo creamos
      if (!bien.uuid) {
        const nuevoBienUUID = uuidv4();

        await Bien.create({
          uuid: nuevoBienUUID,
          tipo: bien.tipo,
          marca: bien.marca,
          modelo: bien.modelo,
          descripcion: bien.descripcion,
          precio: parseFloat(bien.precio),
          propietario_uuid: vendedorReal,
          registrado_por_uuid: usuario.uuid,
          fotos: fotosBien,
        }, { transaction });

        await Stock.create({
          uuid: uuidv4(),
          bien_uuid: nuevoBienUUID,
          propietario_uuid: vendedorReal,
          cantidad: bien.cantidad,
        }, { transaction });

        // 📲 Si es teléfono, registrar IMEIs con fotos
        if (bien.tipo.toLowerCase().includes('teléfono')) {
          for (let k = 0; k < (bien.imeis || []).length; k++) {
            const imei = bien.imeis[k];
            const fotoImei = fotosCargadas[i]?.imeiFotos?.[k] || imei.foto || null;

            await DetallesBien.create({
              uuid: uuidv4(),
              bien_uuid: nuevoBienUUID,
              propietario_uuid: vendedorReal,
              identificador_unico: imei.imei,
              estado: 'disponible',
              foto: fotoImei,
              precio: parseFloat(imei.precio) || 0,
            }, { transaction });
          }
        } else {
          for (let j = 0; j < bien.cantidad; j++) {
            await DetallesBien.create({
              uuid: uuidv4(),
              bien_uuid: nuevoBienUUID,
              propietario_uuid: vendedorReal,
              identificador_unico: `ID-${uuidv4().slice(0, 8)}-${Date.now()}-${j}`,
              estado: 'disponible',
              foto: fotosBien[j] || fotosBien[0] || null,
              precio: parseFloat(bien.precio) || 0,
            }, { transaction });
          }
        }

        bien.uuid = nuevoBienUUID; // Actualizamos el bien con su nuevo UUID
      }

      const bienExistente = await Bien.findOne({
        where: { uuid: bien.uuid },
        transaction,
      });

      if (!bienExistente) throw new Error(`Bien no encontrado con UUID: ${bien.uuid}`);

      // 🖼️ Actualizar fotos del bien si vienen nuevas
      if (fotosBien.length > 0) {
        await Bien.update({ fotos: fotosBien }, {
          where: { uuid: bien.uuid },
          transaction,
        });
      }

      // 🧾 Crear transacción
      const transaccion = await Transaccion.create({
        uuid: uuidv4(),
        fecha: new Date(),
        monto: parseFloat(bien.precio) * bien.cantidad,
        precio: parseFloat(bien.precio),
        cantidad: bien.cantidad,
        metodoPago: bien.metodoPago || 'efectivo',
        vendedor_uuid: vendedorReal,
        comprador_uuid: compradorId,
        vendedor_representado_empresa_uuid: usuario.empresaUuid || null,
        representado_por_uuid: usuario.uuid || null,
        bien_uuid: bien.uuid,
        fotos: fotosBien,
      }, { transaction });

      // 🔍 Obtener detalles disponibles a vender
      const imeisRecibidos = Array.isArray(bien.imeis)
        ? bien.imeis.map(i => i.imei).filter(Boolean)
        : [];

      let detallesVendidos = [];

      if (imeisRecibidos.length > 0) {
        const detalles = await DetallesBien.findAll({
          where: {
            bien_uuid: bien.uuid,
            propietario_uuid: vendedorReal,
            estado: 'disponible',
          },
          transaction,
        });

        detallesVendidos = detalles.filter(d =>
          imeisRecibidos.includes(d.identificador_unico)
        );

        if (detallesVendidos.length < imeisRecibidos.length) {
          throw new Error(`No todos los IMEIs están disponibles para ${bien.modelo}.`);
        }

        // Actualizar fotos de los IMEIs si vienen
        for (let k = 0; k < detallesVendidos.length; k++) {
          const imeiFoto = fotosCargadas[i]?.imeiFotos?.[k];
          if (imeiFoto) {
            detallesVendidos[k].foto = imeiFoto;
          }
        }

      } else {
        detallesVendidos = await DetallesBien.findAll({
          where: {
            bien_uuid: bien.uuid,
            propietario_uuid: vendedorReal,
            estado: 'disponible',
          },
          limit: bien.cantidad,
          transaction,
        });

        if (detallesVendidos.length < bien.cantidad) {
          throw new Error(`No hay suficientes unidades disponibles para ${bien.modelo}.`);
        }

        // Agregar foto genérica si no tienen
        detallesVendidos.forEach((detalle, index) => {
          if (!detalle.foto && fotosBien.length > 0) {
            detalle.foto = fotosBien[index] || fotosBien[0];
          }
        });
      }

      // 🧱 Crear bien para el comprador si no existe
      let bienDelComprador = await Bien.findOne({
        where: {
          tipo: bien.tipo,
          marca: bien.marca,
          modelo: bien.modelo,
          propietario_uuid: compradorId,
        },
        transaction,
      });

      if (!bienDelComprador) {
        bienDelComprador = await Bien.create({
          uuid: uuidv4(),
          tipo: bien.tipo,
          marca: bien.marca,
          modelo: bien.modelo,
          descripcion: bien.descripcion,
          precio: parseFloat(bien.precio),
          propietario_uuid: compradorId,
          registrado_por_uuid: usuario.uuid,
          fotos: fotosBien,
        }, { transaction });

        await Stock.create({
          uuid: uuidv4(),
          bien_uuid: bienDelComprador.uuid,
          propietario_uuid: compradorId,
          cantidad: 0,
        }, { transaction });
      }

      // 💾 Transferir los detalles vendidos
      for (const detalle of detallesVendidos) {
        detalle.estado = 'disponible';
        detalle.propietario_uuid = compradorId;
        detalle.bien_uuid = bienDelComprador.uuid;
        await detalle.save({ transaction });

        await TransaccionDetalle.create({
          transaccion_uuid: transaccion.uuid,
          detalle_uuid: detalle.uuid,
        }, { transaction });
      }

      // 📈 Actualizar stock del comprador
      const stockComprador = await Stock.findOne({
        where: {
          bien_uuid: bienDelComprador.uuid,
          propietario_uuid: compradorId,
        },
        transaction,
      });

      if (stockComprador) {
        stockComprador.cantidad += detallesVendidos.length;
        await stockComprador.save({ transaction });
      }

      transaccionesRegistradas.push(transaccion);
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: '✅ Venta registrada correctamente.',
      transacciones: transaccionesRegistradas,
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Error en registrarVenta:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '❌ Error al registrar la venta.',
    });
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








const registrarTransaccion = async (req, res) => {
  
    const { bienId, compradorId, vendedorId, cantidad, metodoPago, monto } = req.body;
    
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
      res.status(500).json({ error: 'Error al procesar la transacción.', detalles: error.message });
    }
  };



  const obtenerTransaccionesPorUsuario = async (req, res) => {
    const { uuid } = req.params;
    const tipo = req.query.tipo;
    const page = parseInt(req.query.page || 1, 10);
    const limit = parseInt(req.query.limit || 10, 10);
    const offset = (page - 1) * limit;
  
    if (!uuid) return res.status(400).json({ message: 'El UUID del usuario es obligatorio.' });
  
    let whereCondition;
    if (tipo === 'compra') {
      whereCondition = {
        [Op.or]: [
          { comprador_uuid: uuid },
          { comprador_representado_empresa_uuid: uuid }
        ]
      };
    } else if (tipo === 'venta') {
      whereCondition = {
        [Op.or]: [
          { vendedor_uuid: uuid },
          { vendedor_representado_empresa_uuid: uuid }
        ]
      };
    } else {
      whereCondition = {
        [Op.or]: [
          { comprador_uuid: uuid },
          { vendedor_uuid: uuid },
          { representado_por_uuid: uuid },
          { comprador_representado_empresa_uuid: uuid },
          { vendedor_representado_empresa_uuid: uuid }
        ]
      };
    }
  
    try {
      const { count, rows } = await Transaccion.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Bien,
            as: 'bienTransaccion',
            attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'precio', 'fotos', 'tipo'],
          },
          {
            model: DetallesBien,
            as: 'detallesVendidos',
            through: { attributes: [] },
            attributes: ['identificador_unico', 'estado', 'foto'],
          },
          {
            model: Usuario,
            as: 'compradorTransaccion',
            attributes: ['uuid', 'nombre', 'apellido', 'email', 'direccion']
          },
          {
            model: Usuario,
            as: 'vendedorTransaccion',
            attributes: ['uuid', 'nombre', 'apellido', 'email', 'direccion']
          },
          {
            model: Empresa,
            as: 'empresaCompradora',
            attributes: ['uuid', 'razonSocial']
          },
          {
            model: Empresa,
            as: 'empresaVendedora',
            attributes: ['uuid', 'razonSocial']
          }
        ],
        limit,
        offset,
        order: [['fecha', 'DESC']],
      });
  
      return res.status(200).json({
        success: true,
        data: rows,
        page,
        total: count,
        totalPages: Math.ceil(count / limit)
      });
    } catch (err) {
      console.error('❌ Error al obtener transacciones:', err);
      return res.status(500).json({
        message: 'Error interno al obtener transacciones.',
        detalles: err.message
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
          as: 'stocks',
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
    res.status(500).json({ message: 'Error al obtener bienes.', error: error.message });
  }
};

const obtenerTransaccionesPorEmpresa = async (req, res) => {
  const { empresaUuid } = req.params;

  try {
    const transacciones = await Transaccion.findAll({
      where: {
        [Op.or]: [
          { vendedor_uuid: empresaUuid },
          { representado_por_uuid: empresaUuid },
          { comprador_representado_empresa_uuid: empresaUuid },
        ]
      },
      include: [
        {
          model: Empresa,
          as: 'empresaVendedora',
          attributes: ['uuid', 'razonSocial']
        },
        {
          model: Empresa,
          as: 'empresaCompradora',
          attributes: ['uuid', 'razonSocial']
        },
        {
          model: Bien,
          as: 'bienTransaccion',
          attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'precio', 'fotos', 'tipo'],
        },
        {
          model: DetallesBien,
          as: 'detallesVendidos',
          through: { attributes: [] },
          attributes: ['identificador_unico', 'estado', 'foto'],
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
        {
          model: Usuario,
          as: 'delegadoRepresentante',
          attributes: ['uuid', 'nombre', 'apellido', 'email'],
        }
      ],
      order: [['fecha', 'DESC']]
    });

    res.json(transacciones);
  } catch (error) {
    console.error("🔥 Error en obtenerTransaccionesPorEmpresa:", error);
    res.status(500).json({
      message: 'Error al obtener transacciones de la empresa.',
      error: error.message || error
    });
  }
};

const obtenerTodasLasTransaccionesSinPaginado = async (req, res) => {
  const { uuid } = req.params;
  const { modo } = req.query;

  if (!uuid) {
    return res.status(400).json({ message: 'El UUID del usuario es obligatorio.' });
  }

  try {
    let condiciones = [];

    if (modo === 'empresa') {
      condiciones = [
        { comprador_representado_empresa_uuid: uuid },
        { vendedor_representado_empresa_uuid: uuid },
      ];
    } else {
      condiciones = [
        { comprador_uuid: uuid },
        { vendedor_uuid: uuid },
        { representado_por_uuid: uuid },
      ];
    }

    const transacciones = await Transaccion.findAll({
      where: { [Op.or]: condiciones },
      include: [
        {
          model: Bien,
          as: 'bienTransaccion',
          attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'precio', 'fotos', 'tipo'],
        },
        {
          model: DetallesBien,
          as: 'detallesVendidos',
          through: { attributes: [] },
          attributes: ['identificador_unico', 'estado', 'foto'],
        },
        {
          model: Usuario,
          as: 'compradorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'email']
        },
        {
          model: Usuario,
          as: 'vendedorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'email']
        },
        {
          model: Empresa,
          as: 'empresaCompradora',
          attributes: ['uuid', 'razonSocial']
        },
        {
          model: Empresa,
          as: 'empresaVendedora',
          attributes: ['uuid', 'razonSocial']
        },
      ],
      order: [['fecha', 'DESC']]
    });

    return res.status(200).json({ success: true, data: transacciones });
  } catch (err) {
    console.error('❌ Error en obtenerTodasLasTransaccionesSinPaginado:', err);
    return res.status(500).json({
      message: 'Error interno al obtener transacciones.',
      detalles: err.message
    });
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
  obtenerTransaccionesPorEmpresa, 
  obtenerComprasPorUsuario,
  obtenerVentasPorUsuario,
  obtenerTodasLasTransaccionesSinPaginado,
};
