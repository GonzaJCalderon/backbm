const { Transaccion, Bien, Usuario, Stock, DetallesBien } = require('../models');

const { Op } = require('sequelize');
const { uploadFileToCloudinary } = require('../middlewares/uploadFotos');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const { sequelize} = require('../models');
const { uploadFotosBien} = require('../middlewares/uploadFotosBien');


const { generateUUID } = require('uuid');
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const path = require('path');




// Obtener todos los bienes
const obtenerBienes = async (req, res) => {
  try {
    const bienes = await Bien.findAll({
      include: [
        {
          model: Usuario,
          as: 'propietario',
          attributes: ['uuid', 'nombre', 'apellido'],
        },
        {
          model: Stock,
          as: 'stock',
          attributes: ['cantidad'],
        },
        {
          model: DetallesBien,
          as: 'detalles',
          attributes: ['identificador_unico', 'estado'], // Incluye el estado del identificador
        },
        {
          model: Transaccion,
          as: 'transacciones',
          attributes: ['vendedor_uuid', 'comprador_uuid', 'cantidad', 'imeis'],
          include: [
            {
              model: Usuario,
              as: 'vendedorTransaccion',
              attributes: ['nombre', 'apellido'],
            },
            {
              model: Usuario,
              as: 'compradorTransaccion',
              attributes: ['nombre', 'apellido'],
            },
          ],
        },
      ],
    });

    res.status(200).json(bienes);
  } catch (error) {
    console.error('Error obteniendo bienes:', error);
    res.status(500).json({ error: 'Error interno al obtener bienes.' });
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
  const { tipo, marca, modelo, descripcion, precio, propietario_uuid, stock } = req.body;
  let { imei } = req.body; // Puede ser cadena o array
  const fotosSubidas = req.uploadedPhotos || [];

  console.log('Datos recibidos del cliente:', {
    tipo,
    marca,
    modelo,
    descripcion,
    precio,
    propietario_uuid,
    stock,
    imei,
    fotos: fotosSubidas,
  });

  // Validar campos obligatorios
  if (!tipo || !marca || !modelo || !descripcion || !precio || !stock) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  const transaction = await sequelize.transaction();

  try {
    // Buscar si ya existe el bien
    let bien = await Bien.findOne({
      where: { tipo, marca, modelo, propietario_uuid },
      transaction,
    });

    if (!bien) {
      bien = await Bien.create(
        {
          uuid: uuidv4(),
          tipo,
          marca,
          modelo,
          descripcion,
          precio: parseFloat(precio),
          fotos: fotosSubidas,
          propietario_uuid,
        },
        { transaction }
      );
    }

    // Manejar el stock
    const stockParsed = typeof stock === 'string' ? JSON.parse(stock) : stock;
    const stockExistente = await Stock.findOne({
      where: { bien_uuid: bien.uuid, usuario_uuid: propietario_uuid },
      transaction,
    });

    if (stockExistente) {
      stockExistente.cantidad += parseInt(stockParsed.cantidad, 10);
      await stockExistente.save({ transaction });
    } else {
      await Stock.create(
        {
          uuid: uuidv4(),
          bien_uuid: bien.uuid,
          cantidad: parseInt(stockParsed.cantidad, 10),
          usuario_uuid: propietario_uuid,
        },
        { transaction }
      );
    }

    // Manejar IMEIs
    if (tipo.toLowerCase() === 'teléfono movil' && imei) {
      if (typeof imei === 'string') {
        imei = JSON.parse(imei); // Convierte la cadena JSON en un array
      }

      if (!Array.isArray(imei)) {
        throw new Error('El campo IMEI debe ser un array.');
      }

      for (const unImei of imei) {
        // Validar formato del IMEI
        if (!isValidIMEI(unImei)) {
          throw new Error(`IMEI inválido: ${unImei}`);
        }

        // Verificar si el IMEI ya existe
        const imeiExistente = await DetallesBien.findOne({
          where: { identificador_unico: unImei },
          transaction,
        });

        if (imeiExistente) {
          throw new Error(`El IMEI ${unImei} ya está registrado.`);
        }

        // Registrar el IMEI
        await DetallesBien.create(
          {
            bien_uuid: bien.uuid,
            identificador_unico: unImei,
          },
          { transaction }
        );
        console.log('IMEI registrado:', unImei);
      }
    } else if (tipo.toLowerCase() !== 'teléfono movil') {
      // Generar Identificadores Únicos para bienes no telefónicos
      const cantidad = parseInt(stockParsed.cantidad, 10);

      for (let i = 0; i < cantidad; i++) {
        const identificadorUnico = uuidv4(); // Genera un identificador único

        await DetallesBien.create(
          {
            bien_uuid: bien.uuid,
            identificador_unico: identificadorUnico,
            estado: 'disponible', // Marca el estado como disponible
          },
          { transaction }
        );
        console.log('Identificador único registrado:', identificadorUnico);
      }
    }

    await transaction.commit();

    // Cargar el bien nuevamente con detalles para incluir los IMEIs en la respuesta
    const bienConDetalles = await Bien.findOne({
      where: { uuid: bien.uuid },
      include: [
        {
          model: Stock,
          as: 'stock',
          attributes: ['cantidad'],
        },
        {
          model: DetallesBien,
          as: 'detalles',
          attributes: ['identificador_unico'],
        },
      ],
    });

    const bienProcesado = {
      uuid: bienConDetalles.uuid,
      tipo: bienConDetalles.tipo,
      marca: bienConDetalles.marca,
      modelo: bienConDetalles.modelo,
      descripcion: bienConDetalles.descripcion,
      precio: bienConDetalles.precio,
      stock: bienConDetalles.stock?.cantidad || 0,
      fotos: bienConDetalles.fotos || [],
      identificadores: Array.isArray(bienConDetalles.detalles)
        ? bienConDetalles.detalles.map((detalle) => detalle.identificador_unico)
        : [bienConDetalles.detalles?.identificador_unico].filter(Boolean),
      createdAt: bienConDetalles.createdAt,
    };

    res.status(201).json({ message: 'Bien registrado exitosamente.', bien: bienProcesado });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al registrar el bien:', error);
    res.status(500).json({ message: 'Error al registrar el bien.', error: error.message });
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



// bienesController.js

// Obtener bienes por usuario
const obtenerBienesPorUsuario = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid || uuid.length !== 36) {
    return res.status(400).json({ message: 'UUID inválido o no proporcionado.' });
  }

  console.log('UUID recibido en el controlador:', uuid);

  try {
    const bienes = await Bien.findAll({
      where: { propietario_uuid: uuid },
      include: [
        {
          model: Stock,
          as: 'stock',
          attributes: ['cantidad'], // Solo cantidad
        },
        {
          model: DetallesBien,
          as: 'detalles',
          attributes: ['identificador_unico', 'estado'], // Incluye estado del identificador
          required: false, // Permite bienes sin detalles asociados
        },
      ],
      order: [['createdAt', 'DESC']], // Ordenar por fecha de creación
    });

    if (!bienes || bienes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron bienes para este usuario.' });
    }

    // Procesar bienes para incluir identificadores
    const bienesProcesados = bienes.map((bien) => ({
      uuid: bien.uuid,
      tipo: bien.tipo,
      marca: bien.marca,
      modelo: bien.modelo,
      descripcion: bien.descripcion,
      precio: bien.precio,
      stock: bien.stock?.cantidad || 0,
      fotos: bien.fotos || [],
      identificadores: bien.detalles.map((detalle) => ({
        identificador_unico: detalle.identificador_unico,
        estado: detalle.estado || 'Disponible',
      })),
      createdAt: bien.createdAt,
    }));

    console.log('Bienes procesados:', bienesProcesados);

    return res.status(200).json(bienesProcesados);
  } catch (error) {
    console.error('Error obteniendo bienes por usuario:', error);
    return res.status(500).json({
      message: 'Error obteniendo bienes por usuario.',
      error: error.message,
    });
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
    if (marca) filtros.marca = marca;
    if (tipo) filtros.tipo = tipo;
    if (modelo) filtros.modelo = modelo;

    const bienes = await Bien.findAll({
      where: filtros,
    });

    if (bienes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron bienes.' });
    }

    res.status(200).json(bienes);
  } catch (error) {
    console.error('Error obteniendo bienes:', error);
    res.status(500).json({ message: 'Error obteniendo bienes.', error: error.message });
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
          attributes: ['uuid', 'descripcion', 'marca', 'modelo'],
        },
      ],
    });

    if (!transacciones.length) {
      // Devuelve un 200 con un mensaje informativo
      return res.status(200).json({ message: 'Este bien aún no tiene transacciones.' });
    }

    res.status(200).json(transacciones); // Devuelve las transacciones si existen
  } catch (error) {
    console.error('Error al obtener trazabilidad:', error);
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

  // Validar datos obligatorios
  if (!tipo || !marca || !modelo) {
    return res.status(400).json({ message: 'Faltan datos para registrar el modelo.' });
  }

  try {
    // Verificar si el modelo ya existe para la combinación de tipo y marca
    const existeModelo = await Bien.findOne({
      where: { tipo, marca, modelo },
    });

    if (existeModelo) {
      return res.status(409).json({ message: 'El modelo ya existe para esta marca y tipo.' });
    }

    // Crear un nuevo registro de bien para representar el modelo
    await Bien.create({
      tipo,
      marca,
      modelo,
      precio: 0, // Precio inicial genérico
      descripcion: 'Registro ficticio para nuevo modelo',
      propietario_uuid: null, // Sin propietario por ahora
    });

    res.status(201).json({ message: 'Modelo registrado con éxito.' });
  } catch (error) {
    console.error('Error al registrar el modelo:', error);
    res.status(500).json({ message: 'Error interno al registrar el modelo.', error: error.message });
  }
};


const registrarMarca = async (req, res) => {
  const { tipo, marca } = req.body;

  if (!tipo || !marca) {
    return res.status(400).json({ message: 'Faltan datos obligatorios.' });
  }

  try {
    // Verificar si la marca ya existe
    const marcaExistente = await Bien.findOne({
      where: { tipo, marca },
      attributes: ['tipo', 'marca'], // Solo devuelve los campos necesarios
    });

    if (marcaExistente) {
      // Si ya existe, devuelve la información de la marca
      return res.status(200).json({
        message: 'La marca ya existe para este tipo.',
        marca: marcaExistente,
      });
    }

    // Crear un registro ficticio para representar la nueva marca
    const nuevaMarca = await Bien.create({
      tipo,
      marca,
      precio: 0, // Valor predeterminado
    });

    res.status(201).json({ message: 'Marca registrada con éxito.', marca: nuevaMarca });
  } catch (error) {
    console.error('Error al registrar la marca:', error);
    res.status(500).json({ message: 'Error interno del servidor.', detalles: error.message });
  }
};


const obtenerMarcas = async (req, res) => {
  const { tipo } = req.query;

  if (!tipo) {
    return res.status(400).json({ message: 'El tipo de bien es obligatorio.' });
  }

  try {
    const marcas = await Bien.findAll({
      where: { tipo },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('marca')), 'marca']],
    });

    if (!marcas.length) {
      return res.status(404).json({ message: 'No se encontraron marcas para este tipo de bien.' });
    }

    res.status(200).json({ marcas: marcas.map((m) => m.marca) });
  } catch (error) {
    console.error('Error al obtener marcas:', error);
    res.status(500).json({ message: 'Error interno al obtener las marcas.' });
  }
};

const obtenerModelos = async (req, res) => {
  const { tipo, marca } = req.query;

  if (!tipo || !marca) {
    return res.status(400).json({ message: 'El tipo y la marca son obligatorios.' });
  }

  try {
    // Buscar los modelos asociados al tipo y marca
    const modelos = await Bien.findAll({
      where: { tipo, marca },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('modelo')), 'modelo']],
    });

    if (!modelos.length) {
      return res.status(404).json({ message: 'No se encontraron modelos para esta combinación de tipo y marca.' });
    }

    // Retornar los modelos como un array
    res.status(200).json({ modelos: modelos.map((m) => m.modelo) });
  } catch (error) {
    console.error('Error al obtener modelos:', error.message);
    res.status(500).json({ message: 'Error interno al obtener los modelos.', error: error.message });
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
