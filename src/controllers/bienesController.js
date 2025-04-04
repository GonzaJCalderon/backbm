const { Transaccion, Bien, Usuario, Stock, DetallesBien } = require('../models');

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
          model: Usuario,
          as: "propietario", // ✅ Relación con el propietario actual
          attributes: ["uuid", "nombre", "apellido"],
        },
        {
          model: Stock,
          as: "stock",
          attributes: ["cantidad", "usuario_uuid"], // 🔥 Asegurar que se obtiene el stock del nuevo dueño
        },
        {
          model: DetallesBien,
          as: "detalles",
          attributes: ["identificador_unico", "estado", "foto"],
        },
        {
          model: Transaccion,
          as: "transacciones",
          attributes: ["createdAt"],
          include: [
            { model: Usuario, as: "compradorTransaccion", attributes: ["uuid", "nombre", "apellido"] },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]], // ✅ Ordenar por la última actualización
    });

    if (!bienes.length) {
      return res.status(404).json({ error: "No se encontraron bienes." });
    }

    // 🔥 Transformar datos asegurando el stock correcto
    const bienesTransformados = bienes.map((bien) => {
      const stockPropietario =
        bien.stock && bien.stock.usuario_uuid === bien.propietario?.uuid
          ? bien.stock.cantidad
          : 0; // 🔥 Si bien.stock es null, asignamos 0
    
      return {
        ...bien.get(),
        propietario: bien.propietario
          ? `${bien.propietario.nombre} ${bien.propietario.apellido}`
          : "Sin propietario",
        stock: stockPropietario, // ✅ Evitamos error al acceder a `cantidad`
        todasLasFotos: [
          ...(bien.fotos || []),
          ...(bien.detalles?.map((d) => d.foto).filter(Boolean) || []),
        ],
        fechaActualizacion: bien.updatedAt ? new Date(bien.updatedAt).toLocaleDateString() : "Desconocida",
      };
    });
    

    console.log("📌 Bienes actualizados enviados desde el backend:", bienesTransformados);

    res.status(200).json(bienesTransformados);
  } catch (error) {
    console.error("❌ Error obteniendo bienes:", error);
    res.status(500).json({ error: "Error interno al obtener bienes." });
  }
};



// Obtener bien por ID
const obtenerBienPorUuid = async (req, res) => {
  const { uuid } = req.params;

  try {
    // Validar el formato del UUID
    if (!uuid || !/^[0-9a-fA-F-]{36}$/.test(uuid)) {
      return res.status(400).json({ message: 'El UUID proporcionado no es válido.' });
    }

    // Consultar el bien con todas las relaciones necesarias
    const bien = await Bien.findOne({
      where: { uuid }, // Usar el campo uuid
      include: [
        {
          model: Stock,
          as: 'stock',
          attributes: ['uuid', 'cantidad'], // Solo incluir los atributos necesarios
        },
        {
          model: DetallesBien,
          as: 'detalles',
          attributes: ['uuid', 'identificador_unico'], // Incluir detalles del bien
        },
        {
          model: Transaccion,
          as: 'transacciones',
          include: [
            {
              model: Usuario,
              as: 'vendedorTransaccion',
              attributes: ['nombre', 'apellido', 'email'], // Atributos del vendedor
            },
            {
              model: Usuario,
              as: 'compradorTransaccion',
              attributes: ['nombre', 'apellido', 'email'], // Atributos del comprador
            },
          ],
        },
      ],
    });

    // Verificar si el bien existe
    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado.' });
    }

    // Responder con el bien y sus relaciones
    res.status(200).json(bien);
  } catch (error) {
    console.error('Error obteniendo el bien:', error);
    res.status(500).json({ message: 'Error interno.', detalles: error.message });
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
    const { tipo, marca, modelo, descripcion, precio, propietario_uuid, stock } = req.body;
    let { imei } = req.body;
    const fotosSubidas = req.uploadedPhotos || [];

    console.log('📌 Datos recibidos del cliente:', { tipo, marca, modelo, descripcion, precio, propietario_uuid, stock, imei, fotos: fotosSubidas });

    if (!tipo || !marca || !modelo || !descripcion || !precio || stock === undefined) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    let bien = await Bien.findOne({ where: { tipo, marca, modelo, propietario_uuid }, transaction });

    if (!bien) {
      bien = await Bien.create({
        uuid: uuidv4(),
        tipo,
        marca,
        modelo,
        descripcion,
        precio: parseFloat(precio),
        fotos: fotosSubidas,
        propietario_uuid,
      }, { transaction });

      console.log(`✅ Bien creado con UUID: ${bien.uuid}`);
    }

    // 📌 Manejo del Stock
    const stockParsed = typeof stock === 'string' ? JSON.parse(stock) : stock;
    const cantidadStock = parseInt(stockParsed.cantidad, 10);

    let stockExistente = await Stock.findOne({
      where: { bien_uuid: bien.uuid, usuario_uuid: propietario_uuid },
      transaction,
    });

    if (stockExistente) {
      stockExistente.cantidad += cantidadStock;
      await stockExistente.save({ transaction });
    } else {
      await Stock.create({
        uuid: uuidv4(),
        bien_uuid: bien.uuid,
        cantidad: cantidadStock,
        usuario_uuid: propietario_uuid,
      }, { transaction });

      console.log(`✅ Stock inicial asignado: ${cantidadStock}`);
    }

    await transaction.commit();

    return res.status(201).json({
      message: 'Bien registrado exitosamente.',
      bien: {
        uuid: bien.uuid,
        tipo: bien.tipo,
        marca: bien.marca,
        modelo: bien.modelo,
        stock: cantidadStock, // ✅ Ahora aseguramos que siempre tenga stock
        fotos: bien.fotos || [],
        createdAt: bien.createdAt,
      },
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error al registrar el bien:', error);
    return res.status(500).json({ message: 'Error al registrar el bien.', error: error.message });
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
    console.error('Error al actualizar el bien:', error);
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
    console.error('Error al eliminar el bien:', error);
    res.status(500).json({
      message: 'Error interno al eliminar el bien.',
      error: error.message,
    });
  }
};



// Obtener bienes por usuario (controlador modificado)
const obtenerBienesPorUsuario = async (req, res) => {
  try {
    const { userUuid } = req.params;
    console.log('📌 Buscando bienes para el usuario:', userUuid);

    const bienes = await Bien.findAll({
      where: { propietario_uuid: userUuid },
      include: [
        { model: Stock, as: 'stock', attributes: ['cantidad'] },
        { model: DetallesBien, as: 'detalles', attributes: ['uuid', 'identificador_unico', 'estado', 'foto'] },
      ],
    });

    console.log("📌 Bienes obtenidos del backend:", JSON.stringify(bienes, null, 2));

    if (!bienes.length) {
      return res.status(404).json({ message: 'No se encontraron bienes.' });
    }

    const bienesTransformados = bienes.map(bien => ({
      uuid: bien.uuid,
      tipo: bien.tipo,
      marca: bien.marca,
      modelo: bien.modelo,
      descripcion: bien.descripcion,
      stock: bien.stock ? bien.stock.cantidad : 0,  // ✅ Si no hay stock, asigna 0
      fotos: [...(bien.fotos || []), ...(bien.detalles?.map(det => det.foto).filter(Boolean) || [])], // ✅ Fotos combinadas
      identificadores: bien.detalles || [],
    }));

    console.log("📌 Bienes transformados antes de enviar:", JSON.stringify(bienesTransformados, null, 2));

    return res.status(200).json(bienesTransformados);
  } catch (error) {
    console.error('❌ Error al obtener bienes:', error);
    return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
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
    console.error('Error al actualizar el stock:', error);
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
    console.error('Error obteniendo bienes:', error);
    return res.status(500).json({
      message: 'Error obteniendo bienes.',
      error: error.message,
    });
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
        console.warn(`Fila inválida: faltan datos.`, item);
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
    console.error('Error al procesar el archivo Excel:', error);
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

// Obtener trazabilidad de un bien
const obtenerTrazabilidadPorBien = async (req, res) => {
  const { uuid } = req.params;

  try {
    const transacciones = await Transaccion.findAll({
      where: { bien_uuid: uuid },
      include: [
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
          model: Bien,
          as: 'bienTransaccion',
          attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'precio', 'fotos', 'tipo'],
          include: [
            {
              model: DetallesBien,
              as: 'detalles',
              attributes: ['identificador_unico', 'estado', 'foto'],
            },
          ],
        },
      ],
      order: [['fecha', 'DESC']],
    });

    if (!transacciones.length) {
      return res.status(200).json({ message: 'Este bien aún no tiene transacciones.' });
    }

    // Transformar datos para extraer correctamente la dirección y evitar valores nulos
    const transaccionesTransformadas = transacciones.map(transaccion => {
      const comprador = transaccion.compradorTransaccion;
      const vendedor = transaccion.vendedorTransaccion;

      return {
        ...transaccion.toJSON(),
        compradorTransaccion: {
          nombre: comprador?.nombre || 'Sin nombre',
          apellido: comprador?.apellido || '',
          dni: comprador?.dni || 'N/A',
          email: comprador?.email || 'N/A',
          cuit: comprador?.cuit || 'N/A',
          direccion: comprador?.direccion
            ? `${comprador.direccion.calle}, ${comprador.direccion.altura}, ${comprador.direccion.barrio}, ${comprador.direccion.departamento}`
            : 'Sin dirección',
        },
        vendedorTransaccion: {
          nombre: vendedor?.nombre || 'Sin nombre',
          apellido: vendedor?.apellido || '',
          dni: vendedor?.dni || 'N/A',
          email: vendedor?.email || 'N/A',
          cuit: vendedor?.cuit || 'N/A',
          direccion: vendedor?.direccion
            ? `${vendedor.direccion.calle}, ${vendedor.direccion.altura}, ${vendedor.direccion.barrio}, ${vendedor.direccion.departamento}`
            : 'Sin dirección',
        },
      };
    });

    res.status(200).json(transaccionesTransformadas);
  } catch (error) {
    console.error('❌ Error al obtener trazabilidad:', error);
    res.status(500).json({ message: 'Error al obtener trazabilidad.', detalles: error.message });
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
      console.error('Error obteniendo bienes por estado:', error);
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
      console.error('Error cambiando estado del bien:', error);
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
    console.error('Error al inicializar stock:', error);
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
    console.error('❌ Error al registrar el modelo:', error);
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
    console.error('❌ Error al registrar la marca:', error);
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
    console.error('Error al obtener marcas:', error);
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
    console.error('Error al obtener modelos:', error);
    return res.status(500).json({
      message: 'Error interno al obtener los modelos.',
      error: error.message,
    });
  }
};

const verificarIMEI = async (req, res) => {
  const { imei } = req.params;

  try {
      // Convierte el IMEI a texto explícitamente
      const existe = await DetallesBien.findOne({ where: { identificador_unico: String(imei) } });

      return res.status(200).json({ exists: !!existe });
  } catch (error) {
      console.error('Error al verificar IMEI:', error);
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
  obtenerBienesPorUsuario,
  obtenerBienesStock,
  obtenerBienesPorEstado,
  cambiarEstadoBien,
  inicializarStock,
  registrarModelo,
  registrarMarca,
  obtenerMarcas,
  obtenerModelos,
  verificarIMEI,


};
