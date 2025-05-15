const { Transaccion, Bien, Usuario, Stock, DetallesBien, Empresa, TransaccionDetalle} = require('../models');

const { Op, fn, col, Sequelize } = require('sequelize'); 

const { uploadFileToCloudinary } = require('../middlewares/uploadFotos');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const { sequelize} = require('../models');
const { uploadFotosBien} = require('../middlewares/uploadFotosBien');
const { isUUID } = require('validator');



const { generateUUID } = require('uuid');
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const path = require('path');


const obtenerBienes = async (req, res) => {
  try {
    const bienes = await Bien.findAll({
      include: [
        {
          model: Stock,
          as: "stocks",
          attributes: ["cantidad", "propietario_uuid"],
          include: [
            {
              model: Usuario,
              as: "propietario",
              attributes: ["uuid", "nombre", "apellido"],
            },
          ],
        },
        {
          model: DetallesBien,
          as: "detalles",
          attributes: ["uuid", "identificador_unico", "estado", "foto"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    if (!bienes.length) {
      return res.status(404).json({ message: "No se encontraron bienes." });
    }

    const bienesPorPropietario = [];

    bienes.forEach((bien) => {
      (bien.stocks || []).forEach((stock) => {
        const todosIdentificadores = bien.detalles || [];

        bienesPorPropietario.push({
          uuid: bien.uuid,
          tipo: bien.tipo,
          marca: bien.marca,
          modelo: bien.modelo,
          descripcion: bien.descripcion,
          precio: bien.precio,
          propietario: stock.propietario
            ? `${stock.propietario.nombre} ${stock.propietario.apellido}`
            : "Desconocido",
          propietario_uuid: stock.propietario_uuid,
          stock: stock.cantidad,
          identificadores: todosIdentificadores,
          todasLasFotos: [ // 👈 ESTA ES LA CLAVE!
            ...(Array.isArray(bien.fotos) ? bien.fotos : []),
            ...(todosIdentificadores.map((d) => d.foto).filter(Boolean)),
          ],
          fechaActualizacion: new Date(bien.updatedAt).toLocaleDateString(),
        });
        
      });
    });

    return res.status(200).json(bienesPorPropietario);
  } catch (error) {
    console.error("❌ Error en obtenerBienes:", error);
    return res.status(500).json({ message: "Error interno al obtener bienes." });
  }
};



// Obtener bien por ID

// Obtener bien por UUID, incluyendo identificadores e imeis
const obtenerBienPorUuid = async (req, res) => {
  const { uuid } = req.params;

  try {
    if (!uuid || !/^[0-9a-fA-F-]{36}$/.test(uuid)) {
      return res.status(400).json({ message: 'UUID inválido.' });
    }

    const bien = await Bien.findOne({
      where: { uuid },
      include: [
        {
          model: Stock,
          as: 'stocks',
          attributes: ['uuid', 'cantidad'],
        },
        {
          model: DetallesBien,
          as: 'identificadores', // 🟩 para bienes normales
          attributes: ['uuid', 'identificador_unico', 'estado', 'foto'],
        },
        {
          model: DetallesBien,
          as: 'imeis', // 🟩 para teléfonos móviles
          attributes: ['uuid', 'identificador_unico', 'estado', 'foto'],
        },
        {
          model: Transaccion,
          as: 'transacciones',
          include: [
            {
              model: Usuario,
              as: 'vendedorTransaccion',
              attributes: ['nombre', 'apellido', 'email'],
            },
            {
              model: Usuario,
              as: 'compradorTransaccion',
              attributes: ['nombre', 'apellido', 'email'],
            },
          ],
        },
      ],
    });

    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado.' });
    }

    return res.status(200).json(bien);
  } catch (error) {
    console.error('❌ Error al obtener bien por UUID:', error);
    return res.status(500).json({
      message: 'Error al obtener el bien.',
      detalles: error.message,
    });
  }
};






// Función para validar IMEI (ejemplo simple)
const isValidIMEI = (imei) => {
  const imeiRegex = /^[0-9]{15}$/; // IMEI debe tener 15 dígitos
  return imeiRegex.test(imei);
};




const crearBien = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const usuarioLogueado = req.user;

    const {
      tipo,
      marca,
      modelo,
      descripcion,
      precio,
      stock,
      propietario_uuid,
      registrado_por_uuid,
      imei,
      identificadores_unicos,
      overridePermiso,
    } = req.body;

    const esFisica = usuarioLogueado?.tipo === 'fisica';
    const esJuridica = usuarioLogueado?.tipo === 'juridica';

    // 🔐 Validación de permisos
    if (overridePermiso !== 'true') {
      if (
        (esFisica && propietario_uuid !== usuarioLogueado.uuid) ||
        (esJuridica && propietario_uuid !== usuarioLogueado.empresaUuid)
      ) {
        return res.status(403).json({ message: 'No tienes permiso para registrar bienes para otros.' });
      }
    }

    // 📷 Fotos generales del bien
    const fotosDelBien =
      req.uploadedPhotos?.[0]?.fotos ||
      req.uploadedPhotosVenta?.[0]?.fotos ||
      [];

    // ❌ Evitar duplicados si overridePermiso es true
    const bienExistente = await Bien.findOne({
      where: { tipo, marca, modelo, propietario_uuid },
      transaction,
    });

    if (overridePermiso === 'true' && bienExistente) {
      if (transaction && !transaction.finished) await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: '❌ Este bien ya está registrado para el vendedor.',
      });
    }

    // ✅ Crear el bien
    const bien = await Bien.create({
      uuid: uuidv4(),
      tipo,
      marca,
      modelo,
      descripcion,
      precio: parseFloat(precio) || 0,
      fotos: fotosDelBien,
      propietario_uuid,
      registrado_por_uuid,
    }, { transaction });

    // 📦 Crear Stock
    const stockParsed = typeof stock === 'string' ? JSON.parse(stock) : stock;
    const cantidadStock = parseInt(stockParsed?.cantidad || stockParsed, 10);

    await Stock.create({
      uuid: uuidv4(),
      bien_uuid: bien.uuid,
      cantidad: cantidadStock,
      propietario_uuid,
    }, { transaction });

    // 📲 Procesar IMEIs si es un teléfono
    const imeisCreados = [];

    if (tipo.toLowerCase().includes('teléfono')) {
      let imeis = [];

      try {
        imeis = typeof imei === 'string'
          ? JSON.parse(imei)
          : Array.isArray(imei)
            ? imei
            : [];
      } catch {
        imeis = [];
      }

      for (let i = 0; i < imeis.length; i++) {
        const imeiData = imeis[i];
        if (!imeiData?.imei) continue;

        const yaExiste = await DetallesBien.findOne({
          where: { identificador_unico: imeiData.imei },
          transaction,
        });

        if (!yaExiste) {
          const fotoImei =
            req.uploadedPhotos?.[0]?.imeiFotos?.[i] ||
            req.uploadedPhotosVenta?.[0]?.imeiFotos?.[i] ||
            null;

          const detalle = await DetallesBien.create({
            uuid: uuidv4(),
            bien_uuid: bien.uuid,
            propietario_uuid,
            identificador_unico: imeiData.imei,
            estado: 'disponible',
            foto: fotoImei,
            precio: parseFloat(imeiData.precio) || 0,
          }, { transaction });

          imeisCreados.push({
            imei: detalle.identificador_unico,
            uuid: detalle.uuid,
          });
        }
      }
    } else {
      // 📦 Crear identificadores para bienes sin IMEI
      const identificadores = [];

      for (let i = 0; i < cantidadStock; i++) {
        identificadores.push({
          uuid: uuidv4(),
          bien_uuid: bien.uuid,
          propietario_uuid,
          identificador_unico: `ID-${uuidv4().slice(0, 8)}-${Date.now()}-${i}`,
          estado: 'disponible',
          foto: fotosDelBien.length > 1 ? fotosDelBien[i] : fotosDelBien[0] || null,
        });
      }

      await DetallesBien.bulkCreate(identificadores, { transaction });
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: '✅ Bien registrado exitosamente',
      bien: {
        uuid: bien.uuid,
        tipo: bien.tipo,
        marca: bien.marca,
        modelo: bien.modelo,
        descripcion: bien.descripcion,
        precio: bien.precio,
        stock: cantidadStock,
        fotos: bien.fotos || [],
        imeis: imeisCreados,
      },
    });

  } catch (error) {
    console.error('❌ Error al registrar bien:', error);

    // ✅ Protección contra rollback doble
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,
      message: 'Error al registrar el bien.',
      error: error.message,
    });
  }
};

































const actualizarBien = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { descripcion, precio, tipo, marca, modelo, existingImages } = req.body;

    // Buscar el bien
    const bien = await Bien.findOne({ where: { uuid } });
    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado.' });
    }

    // Actualizar datos básicos
    bien.descripcion = descripcion || bien.descripcion;
    bien.precio = precio || bien.precio;
    bien.tipo = tipo || bien.tipo;
    bien.marca = marca || bien.marca;
    bien.modelo = modelo || bien.modelo;

    // Manejar imágenes existentes y nuevas
    const updatedExistingImages = JSON.parse(existingImages || '[]');
    const newImages = req.uploadedPhotos || [];

    bien.fotos = [...updatedExistingImages, ...newImages];

    // Guardar cambios
    await bien.save();

    res.status(200).json(bien);
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando el bien.', error: error.message });
  }
};



// Eliminar un bien
const eliminarBien = async (req, res) => {
  try {
    const { uuid } = req.params; // Capturar el UUID del bien desde los parámetros de la solicitud

    // Validar que se haya enviado el UUID
    if (!uuid) {
      return res.status(400).json({ message: 'El UUID del bien es requerido.' });
    }

    // Buscar el bien por UUID
    const bien = await Bien.findOne({ where: { uuid } });
    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado.' });
    }

    // Eliminar el bien
    await bien.destroy();

    res.status(200).json({ message: 'Bien eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({
      message: 'Error interno al eliminar el bien.',
      error: error.message,
    });
  }
};



// Obtener bienes por usuario (controlador modificado)
// Obtener bienes por usuario (controlador corregido)
const obtenerBienesPorUsuario = async (req, res) => {
  try {
    const { userUuid } = req.params;
    const { incluirDelegados = 'false' } = req.query;

    const usuario = await Usuario.findOne({
      where: { uuid: userUuid },
      attributes: ['uuid', 'empresa_uuid']
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const uuidABuscar = incluirDelegados === 'true' && usuario.empresa_uuid
      ? usuario.empresa_uuid
      : usuario.uuid;

    const bienes = await Bien.findAll({
      attributes: ['uuid', 'tipo', 'marca', 'modelo', 'descripcion', 'precio', 'fotos', 'createdAt'], // 🔥 AGREGADO 'createdAt'
      include: [
        {
          model: Stock,
          as: 'stocks',
          attributes: ['cantidad', 'propietario_uuid'],
          where: { propietario_uuid: uuidABuscar },
          required: true,
        },
        {
          model: DetallesBien,
          as: 'detalles',
          attributes: ['uuid', 'identificador_unico', 'estado', 'foto'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']], // 🔥 Para traerlo más ordenado si querés
    });

    const bienesTransformados = bienes.map((bien) => {
      const stockActual = bien.stocks?.[0]?.cantidad || 0;

      const identificadoresDisponibles = bien.detalles?.filter(det => det.estado === 'disponible') || [];

      return {
        uuid: bien.uuid,
        tipo: bien.tipo,
        marca: bien.marca,
        modelo: bien.modelo,
        descripcion: bien.descripcion,
        precio: bien.precio,
        stock: stockActual,
        fotos: [
          ...(Array.isArray(bien.fotos) ? bien.fotos : []),
          ...(identificadoresDisponibles.map(det => det.foto).filter(Boolean) || []),
        ],
        identificadores: identificadoresDisponibles.map(det => ({
          uuid: det.uuid,
          identificador_unico: det.identificador_unico,
          estado: det.estado,
          foto: det.foto,
        })),
        createdAt: bien.createdAt, // 🔥 LO DEVOLVEMOS!
      };
    });

    return res.status(200).json({ data: bienesTransformados });
  } catch (error) {
    console.error("❌ Error en obtenerBienesPorUsuario:", error);
    return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

const obtenerTrazabilidadPorBien = async (req, res) => {
  const { uuid } = req.params;

  try {
    const transacciones = await Transaccion.findAll({
      where: { bien_uuid: uuid },
      include: [
        {
          model: Usuario,
          as: 'compradorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'dni', 'email', 'cuit', 'direccion', 'empresa_uuid'],
        },
        {
          model: Usuario,
          as: 'vendedorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'dni', 'email', 'cuit', 'direccion', 'empresa_uuid'],
        },
        {
          model: Empresa,
          as: 'empresaVendedora',
          attributes: ['uuid', 'razonSocial', 'direccion'],
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
          attributes: ['uuid', 'identificador_unico', 'estado', 'foto'],
          required: false,
        },
      ],
      order: [['fecha', 'ASC']],
    });

    if (!transacciones.length) {
      return res.status(200).json([]);
    }

    const formatDireccion = (direccion = {}) =>
      direccion?.calle
        ? `${direccion.calle} ${direccion.altura || ''}, ${direccion.barrio || ''}, ${direccion.departamento || ''}`
        : 'Sin dirección';

    const transaccionesTransformadas = await Promise.all(
      transacciones.map(async (tx) => {
        const comprador = tx.compradorTransaccion;
        const vendedor = tx.vendedorTransaccion;

        let empresaCompradora = null;

        if (comprador?.empresa_uuid) {
          empresaCompradora = await Empresa.findOne({
            where: { uuid: comprador.empresa_uuid },
            attributes: ['uuid', 'razonSocial', 'direccion'],
          });
        }

        return {
          uuid: tx.uuid,
          fecha: tx.fecha,
          metodoPago: tx.metodoPago,
          cantidad: tx.cantidad,
          monto: tx.monto,
          precio: tx.precio,
          fotos: tx.fotos || [],
          identificadores: (tx.detallesVendidos || []).map(i => ({
            uuid: i.uuid,
            identificador_unico: i.identificador_unico,
            estado: i.estado || 'desconocido',
            foto: i.foto || null,
          })),
          bienTransaccion: {
            uuid: tx.bienTransaccion?.uuid,
            tipo: tx.bienTransaccion?.tipo,
            marca: tx.bienTransaccion?.marca,
            modelo: tx.bienTransaccion?.modelo,
            descripcion: tx.bienTransaccion?.descripcion,
            precio: tx.bienTransaccion?.precio,
            fotos: tx.bienTransaccion?.fotos || [],
          },
          compradorTransaccion: {
            nombre: comprador?.nombre || 'Desconocido',
            apellido: comprador?.apellido || '',
            dni: comprador?.dni || 'N/A',
            email: comprador?.email || 'N/A',
            cuit: comprador?.cuit || 'N/A',
            direccion: formatDireccion(comprador?.direccion),
          },
          vendedorTransaccion: {
            nombre: vendedor?.nombre || 'Desconocido',
            apellido: vendedor?.apellido || '',
            dni: vendedor?.dni || 'N/A',
            email: vendedor?.email || 'N/A',
            cuit: vendedor?.cuit || 'N/A',
            direccion: formatDireccion(vendedor?.direccion),
          },
          empresaCompradora: empresaCompradora || null,
          empresaVendedora: tx.empresaVendedora || null,
        };
      })
    );

    return res.status(200).json(transaccionesTransformadas);
  } catch (error) {
    console.error('❌ Error al obtener trazabilidad:', error);
    return res.status(500).json({
      message: 'Error al obtener trazabilidad.',
      detalles: error.message,
    });
  }
};





const obtenerTrazabilidadPorIdentificador = async (req, res) => {
  const { identificador } = req.params;

  try {
    const detalle = await DetallesBien.findOne({ where: { identificador_unico: identificador } });

    if (!detalle) {
      return res.status(404).json({ message: 'Identificador no encontrado.' });
    }

    const transacciones = await Transaccion.findAll({
      include: [
        {
          model: DetallesBien,
          as: 'detallesVendidos',
          where: { uuid: detalle.uuid },
          required: true,
          through: { attributes: [] },
          attributes: ['uuid'], // solo para filtro
        },
        {
          model: Usuario,
          as: 'compradorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'dni', 'email', 'cuit', 'direccion'],
        },
        {
          model: Usuario,
          as: 'vendedorTransaccion',
          attributes: ['uuid', 'nombre', 'apellido', 'dni', 'email', 'cuit', 'direccion'],
        },
        {
          model: Empresa,
          as: 'empresaCompradora',
          attributes: ['uuid', 'razonSocial', 'direccion'],
        },
        {
          model: Empresa,
          as: 'empresaVendedora',
          attributes: ['uuid', 'razonSocial', 'direccion'],
        },
        {
          model: Bien,
          as: 'bienTransaccion',
          attributes: ['uuid', 'tipo', 'marca', 'modelo', 'descripcion', 'precio', 'fotos'],
        }
      ],
      order: [['fecha', 'DESC']],
    });

    // Asegurarnos de volver a incluir los detallesVendidos completos
    const transaccionesConDetalles = await Promise.all(
      transacciones.map(async (tx) => {
        const conDetalles = await Transaccion.findByPk(tx.uuid, {
          include: [
            {
              model: DetallesBien,
              as: 'detallesVendidos',
              through: { attributes: [] },
              attributes: ['identificador_unico', 'estado', 'foto'],
            }
          ]
        });

        return {
          ...tx.toJSON(),
          detallesVendidos: conDetalles?.detallesVendidos || [],
        };
      })
    );

    const formatDireccion = (direccion = {}) =>
      direccion?.calle
        ? `${direccion.calle} ${direccion.altura || ''}, ${direccion.barrio || ''}, ${direccion.departamento || ''}`
        : 'Sin dirección';

    const historial = transaccionesConDetalles.map(t => ({
      uuid: t.uuid,
      fecha: t.fecha,
      metodoPago: t.metodoPago,
      cantidad: t.cantidad,
      monto: t.monto,
      precio: t.precio,
      fotos: t.fotos || [],
      identificadores: (t.detallesVendidos || []).map(d => ({
        identificador_unico: d.identificador_unico,
        estado: d.estado,
        foto: d.foto,
      })),
      bien: {
        tipo: t.bienTransaccion?.tipo,
        marca: t.bienTransaccion?.marca,
        modelo: t.bienTransaccion?.modelo,
        descripcion: t.bienTransaccion?.descripcion,
        precio: t.bienTransaccion?.precio,
        fotos: t.bienTransaccion?.fotos || [],
      },
      comprador: {
        nombre: t.compradorTransaccion?.nombre || 'Desconocido',
        apellido: t.compradorTransaccion?.apellido || '',
        dni: t.compradorTransaccion?.dni || 'N/A',
        email: t.compradorTransaccion?.email || 'N/A',
        cuit: t.compradorTransaccion?.cuit || 'N/A',
        direccion: formatDireccion(t.compradorTransaccion?.direccion),
      },
      vendedor: {
        nombre: t.vendedorTransaccion?.nombre || 'Desconocido',
        apellido: t.vendedorTransaccion?.apellido || '',
        dni: t.vendedorTransaccion?.dni || 'N/A',
        email: t.vendedorTransaccion?.email || 'N/A',
        cuit: t.vendedorTransaccion?.cuit || 'N/A',
        direccion: formatDireccion(t.vendedorTransaccion?.direccion),
      },
      empresaCompradora: t.empresaCompradora || null,
      empresaVendedora: t.empresaVendedora || null,
    }));

    return res.status(200).json({ historial });

  } catch (error) {
    console.error('❌ Error al obtener trazabilidad por identificador:', error.message);
    return res.status(500).json({
      message: 'Error interno al obtener trazabilidad del identificador.',
      error: error.message,
    });
  }
};






const obtenerBienesPorEmpresa = async (req, res) => {
  const { uuid } = req.params;

  try {
    if (!uuid) {
      return res.status(400).json({ message: 'Falta el UUID de la empresa.' });
    }

    const bienes = await Bien.findAll({
      include: [
        {
          model: Stock,
          as: 'stocks',
          where: { propietario_uuid: uuid }, // ✅ SOLO stocks que pertenecen a la empresa
          attributes: ['cantidad', 'propietario_uuid'],
          required: true,
        },
        {
          model: DetallesBien,
          as: 'detalles',
          attributes: ['uuid', 'identificador_unico', 'estado', 'foto'],
          required: false,
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    const bienesTransformados = bienes.map((bien) => {
      const stockPropio = bien.stocks?.[0]?.cantidad || 0;

      const fotos = [
        ...(Array.isArray(bien.fotos) ? bien.fotos : []),
        ...(bien.detalles?.map(d => d.foto).filter(Boolean) || []),
      ];

      const identificadoresDisponibles = bien.detalles?.filter(d => d.estado === 'disponible') || [];

      return {
        uuid: bien.uuid,
        tipo: bien.tipo,
        marca: bien.marca,
        modelo: bien.modelo,
        descripcion: bien.descripcion,
        precio: bien.precio,
        stock: stockPropio,
        fotos,
        identificadores: identificadoresDisponibles,
        createdAt: bien.createdAt,
      };
    });

    return res.status(200).json({ data: bienesTransformados });
  } catch (error) {
    console.error('❌ Error al obtener bienes por empresa:', error.message);
    return res.status(500).json({ message: 'Error interno al obtener bienes de la empresa.' });
  }
};



// ✅ Nuevo controller: obtenerBienesPorPropietario



// ✅ Controller actualizado: obtenerBienesPorPropietario con paginación + búsqueda
const obtenerBienesPorPropietario = async (req, res) => {
  const { propietarioUuid } = req.params;
  const limit = parseInt(req.query.limit, 10) || 30;
  const offset = parseInt(req.query.offset, 10) || 0;
  const search = req.query.search || '';

  try {
    const { count, rows: bienes } = await Bien.findAndCountAll({
      where: {
        [Op.or]: [
          { tipo: { [Op.iLike]: `%${search}%` } },
          { marca: { [Op.iLike]: `%${search}%` } },
          { modelo: { [Op.iLike]: `%${search}%` } },
        ],
      },
      include: [
        {
          model: Stock,
          as: 'stocks',
          attributes: ['cantidad', 'propietario_uuid'],
          where: { propietario_uuid: propietarioUuid },
          required: true,
        },
        {
          model: DetallesBien,
          as: 'detalles',
          attributes: ['uuid', 'identificador_unico', 'estado', 'foto'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const bienesTransformados = bienes.map((bien) => {
      const stockActual = bien.stocks?.[0]?.cantidad || 0;
      const fotos = [
        ...(Array.isArray(bien.fotos) ? bien.fotos : []),
        ...(bien.detalles?.map((d) => d.foto).filter(Boolean) || []),
      ];
      const identificadoresDisponibles = bien.detalles?.filter((d) => d.estado === 'disponible') || [];

      return {
        uuid: bien.uuid,
        tipo: bien.tipo,
        marca: bien.marca,
        modelo: bien.modelo,
        descripcion: bien.descripcion,
        precio: bien.precio,
        stock: stockActual,
        fotos,
        identificadores: identificadoresDisponibles,
        createdAt: bien.createdAt,
      };
    });

    return res.status(200).json({
      data: bienesTransformados,
      total: count,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    });
  } catch (error) {
    console.error('❌ Error al obtener bienes por propietario:', error.message);
    return res.status(500).json({ message: 'Error interno al obtener bienes del propietario.' });
  }
};









const actualizarStockPorParametros = async (req, res) => {
  const { tipo, marca, modelo, cantidad, tipoOperacion } = req.body;

  if (!tipo || !marca || !modelo || cantidad === undefined || !tipoOperacion) {
    return res.status(400).json({
      message: 'Faltan parámetros requeridos: tipo, marca, modelo, cantidad, tipoOperacion',
    });
  }

  try {
    const bien = await Bien.findOne({
      where: { tipo, marca, modelo },
    });

    if (!bien) {
      return res.status(404).json({
        message: 'No se encontró ningún bien con los parámetros especificados.',
      });
    }

    if (tipoOperacion === 'sumar') {
      bien.stock += cantidad;
    } else if (tipoOperacion === 'restar') {
      if (bien.stock < cantidad) {
        return res.status(400).json({ message: 'Stock insuficiente para realizar esta operación.' });
      }
      bien.stock -= cantidad;
    } else {
      return res.status(400).json({ message: 'Tipo de operación no válido. Use "sumar" o "restar".' });
    }

    await bien.save();

    return res.status(200).json({ message: 'Stock actualizado correctamente.', bien });
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar el stock.', error: error.message });
  }
};



// Obtener bienes por parámetros (marca, tipo, modelo)
const getBienesPorMarcaTipoModelo = async (req, res) => {
  try {
    const { marca, tipo, modelo } = req.query;

    const filtros = {};
    if (tipo) filtros.tipo = tipo;
    if (marca) filtros.marca = marca;
    if (modelo) filtros.modelo = modelo;

    const bienes = await Bien.findAll({
      where: filtros,
    });

    if (!bienes.length) {
      return res.status(404).json({ message: 'No se encontraron bienes.' });
    }

    return res.status(200).json(bienes);
  } catch (error) {
    return res.status(500).json({
      message: 'Error obteniendo bienes.',
      error: error.message,
    });
  }
};

// GET /bienes/:uuid/fotos
const getFotosDeBien = async (req, res) => {
  const { uuid } = req.params;

  try {
    const bien = await Bien.findOne({
      where: { uuid },
      attributes: ['uuid'],
      include: [
        {
          model: DetallesBien,
          as: 'detalles',
          attributes: ['foto'], // Solo las fotos
          separate: true,
        }
      ]
    });

    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado.' });
    }

    const fotos = bien.detalles.map(d => d.foto).filter(Boolean);

    res.status(200).json({ success: true, fotos });
  } catch (error) {
    console.error('❌ Error al obtener fotos del bien:', error);
    res.status(500).json({ message: 'Error al obtener fotos.' });
  }
};

const subirStockExcel = async (req, res) => {
  try {
    // Verificar si se cargó un archivo
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo' });
    }

    const filePath = path.resolve(req.file.path);

    // Convertir el archivo Excel a JSON
    const excelData = excelToJson({
      sourceFile: filePath,
      sheets: [{
        name: 'Sheet1', // Asegúrate de que el nombre coincida con la hoja del Excel
        header: { rows: 1 }, // Ignorar la primera fila como encabezados
        columnToKey: {
          A: 'descripcion',
          B: 'precio',
          C: 'tipo',
          D: 'marca',
          E: 'modelo',
          F: 'stock',
          G: 'vendedorId'
        }
      }]
    });

    // Iterar sobre los datos para actualizar o crear bienes
    for (const item of excelData.Sheet1) {
      const { descripcion, precio, tipo, marca, modelo, stock, vendedorId } = item;

      // Validar que los datos necesarios estén presentes
      if (!tipo || !marca || !modelo || !vendedorId || stock === undefined) {
        continue; // Saltar filas con datos incompletos
      }

      // Buscar el bien existente o crear uno nuevo
      const [bien] = await Bien.findOrCreate({
        where: { tipo, marca, modelo },
        defaults: {
          descripcion,
          precio: parseFloat(precio),
          stock: parseInt(stock, 10),
          vendedorId,
          fecha: new Date(),
        }
      });

      // Si ya existe, actualizar el stock
      if (!bien.isNewRecord) {
        bien.stock += parseInt(stock, 10);
        await bien.save();
      }
    }

    // Eliminar el archivo temporal
    fs.unlinkSync(filePath);

    res.status(200).json({ message: 'Stock actualizado desde Excel con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar el archivo Excel', error: error.message });
  }
};

// Obtener bienes en stock
const obtenerBienesStock = async (req, res) => {
  try {
    const bienes = await Bien.findAll({ where: { stock: { [Op.gt]: 0 } } });
    res.status(200).json(bienes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener bienes en stock.', detalles: error.message });
  }
};











const obtenerBienesPorEstado = async (req, res) => {
  const { estado } = req.params;

  try {
      const bienes = await Bien.findAll({
          where: { estado },
      });

      if (!bienes || bienes.length === 0) {
          return res.status(200).json({ message: `No se encontraron bienes con el estado: ${estado}` });
      }

      res.status(200).json(bienes);
  } catch (error) {
      res.status(500).json({ message: 'Error obteniendo bienes por estado.', error: error.message });
  }
};
const cambiarEstadoBien = async (req, res) => {
  const { uuid } = req.params;
  const { nuevoEstado } = req.body;

  if (!['aprobado', 'rechazado', 'pendiente'].includes(nuevoEstado)) {
      return res.status(400).json({ message: 'Estado inválido. Los estados permitidos son: aprobado, rechazado, pendiente.' });
  }

  try {
      const bien = await Bien.findOne({ where: { uuid } });

      if (!bien) {
          return res.status(404).json({ message: 'Bien no encontrado.' });
      }

      // Cambiar el estado
      bien.estado = nuevoEstado;

      // Si el estado es rechazado, incluir razón de rechazo si se envía
      if (nuevoEstado === 'rechazado' && req.body.motivoRechazo) {
          bien.motivoRechazo = req.body.motivoRechazo;
      } else {
          bien.motivoRechazo = null; // Limpiar motivo de rechazo si se aprueba o está pendiente
      }

      await bien.save();

      res.status(200).json({ message: `Estado del bien actualizado a: ${nuevoEstado}`, bien });
  } catch (error) {
      res.status(500).json({ message: 'Error cambiando estado del bien.', error: error.message });
  }
};

const inicializarStock = async (req, res) => {
  const { bienId, vendedorId, cantidad } = req.body;

  try {
    // Validar datos
    if (!bienId || !vendedorId || isNaN(cantidad) || cantidad <= 0) {
      return res.status(400).json({ message: 'Datos inválidos para inicializar el stock.' });
    }

    // Verificar si el bien existe
    const bien = await Bien.findByPk(bienId);
    if (!bien) {
      return res.status(404).json({ message: `El bien con ID ${bienId} no existe.` });
    }

    // Crear el stock para el vendedor
    const nuevoStock = await Stock.create({
      bienId,
      usuarioId: vendedorId,
      cantidad,
    });

    res.status(201).json({
      message: 'Stock inicializado con éxito.',
      stock: nuevoStock,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno al inicializar el stock.', detalles: error.message });
  }
};

const registrarModelo = async (req, res) => {
  const { tipo, marca, modelo } = req.body;

  if (!tipo || !marca || !modelo) {
    return res.status(400).json({ message: 'Faltan datos para registrar el modelo.' });
  }

  try {
    // 🔹 Buscar si ya existe un bien con ese modelo, marca y tipo
    const existeModelo = await Bien.findOne({
      where: { tipo, marca, modelo },
      attributes: ['modelo'],
    });

    if (existeModelo) {
      return res.status(200).json({
        message: 'El modelo ya está registrado para esta marca y tipo.',
        modelo: existeModelo.modelo,
      });
    }

    return res.status(201).json({
      message: 'Modelo registrado con éxito.',
      modelo,
    });

  } catch (error) {
    res.status(500).json({ message: 'Error interno al registrar el modelo.', error: error.message });
  }
};



const registrarMarca = async (req, res) => {
  const { tipo, marca } = req.body;

  if (!tipo || !marca) {
    return res.status(400).json({ message: 'Faltan datos obligatorios.' });
  }

  try {
    // 🔹 Buscar si ya existe un bien con esa marca y tipo
    const marcaExistente = await Bien.findOne({
      where: { tipo, marca },
      attributes: ['marca'],
    });

    if (marcaExistente) {
      return res.status(200).json({
        message: 'La marca ya está registrada para este tipo.',
        marca: marcaExistente.marca,
      });
    }

    return res.status(201).json({
      message: 'Marca registrada con éxito.',
      marca, 
    });

  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor.', detalles: error.message });
  }
};



const obtenerMarcas = async (req, res) => {
  const { tipo } = req.query;

  // Verifica que venga tipo
  if (!tipo) {
    return res.status(400).json({ message: 'El tipo de bien es obligatorio.' });
  }

  try {
    // Opción: normalizar si quieres quitar tildes:
    // let tipoBuscado = tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const marcas = await Bien.findAll({
      where: { tipo }, // asume que la base guarda EXACTAMENTE "teléfono movil" si es el caso
      attributes: [
        [fn('DISTINCT', col('marca')), 'marca'] // Distintas marcas
      ],
    });

    if (!marcas.length) {
      return res.status(404).json({ message: 'No se encontraron marcas para este tipo de bien.' });
    }

    // Extraer solo la columna marca
    const listaMarcas = marcas.map((m) => m.marca);

    return res.status(200).json({ marcas: listaMarcas });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno al obtener las marcas.' });
  }
};


const obtenerModelos = async (req, res) => {
  const { tipo, marca } = req.query;

  if (!tipo || !marca) {
    return res
      .status(400)
      .json({ message: 'El tipo y la marca son obligatorios.' });
  }

  try {
    const modelos = await Bien.findAll({
      where: {
        tipo,
        marca,
      },
      attributes: [
        [fn('DISTINCT', col('modelo')), 'modelo']
      ],
    });

    if (!modelos.length) {
      return res
        .status(404)
        .json({ message: 'No se encontraron modelos para esta combinación de tipo y marca.' });
    }

    const listaModelos = modelos.map((m) => m.modelo);

    return res.status(200).json({ modelos: listaModelos });
  } catch (error) {
    return res.status(500).json({
      message: 'Error interno al obtener los modelos.',
      error: error.message,
    });
  }
};

const buscarBienes = async (req, res) => {
  const { term, page = 1, limit = 10 } = req.query;

  if (!term) {
    return res.status(400).json({ message: 'Debes proporcionar un término de búsqueda.' });
  }

  try {
    const bienes = await Bien.findAndCountAll({
      where: {
        [Op.or]: [
          { tipo: { [Op.iLike]: `%${term}%` } },
          { marca: { [Op.iLike]: `%${term}%` } },
          { modelo: { [Op.iLike]: `%${term}%` } },
          { descripcion: { [Op.iLike]: `%${term}%` } },
        ],
      },
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    res.json({
      total: bienes.count,
      results: bienes.rows,
    });
  } catch (error) {
    console.error('🔥 Error en buscarBienes:', error);
    res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

const verificarIMEI = async (req, res) => {
  const { imei } = req.params;

  try {
      // Convierte el IMEI a texto explícitamente
      const existe = await DetallesBien.findOne({ where: { identificador_unico: String(imei) } });

      return res.status(200).json({ exists: !!existe });
  } catch (error) {
      return res.status(500).json({ error: 'Error interno del servidor al verificar el IMEI.' });
  }
};









module.exports = {
  obtenerBienes,
  obtenerBienPorUuid,
  crearBien,
  actualizarBien,
  eliminarBien,
  obtenerBienesPorUsuario,
  getBienesPorMarcaTipoModelo,
  actualizarStockPorParametros,
  subirStockExcel,
  obtenerTrazabilidadPorBien,
  obtenerBienesStock,
  obtenerBienesPorEstado,
  cambiarEstadoBien,
  inicializarStock,
  registrarModelo,
  registrarMarca,
  obtenerMarcas,
  obtenerModelos,
  buscarBienes,
  verificarIMEI,
  obtenerBienesPorEmpresa,
  obtenerBienesPorPropietario,
  obtenerTrazabilidadPorIdentificador,
  getFotosDeBien,
};
