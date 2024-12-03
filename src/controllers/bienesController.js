const axios = require('axios');
const { Sequelize } = require('sequelize');
const Bien = require('../models/Bien');
const Usuario = require('../models/Usuario');
const Transaccion = require('../models/Transaccion');
const { Op } = require('sequelize');
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const sequelize = require('../config/db');
const { v4: generateUUID } = require('uuid');
const { validate: validateUUID } = require('uuid');
const { uploadFotosMiddleware, uploadFileToCloudinary } = require('../middlewares/uploadFotos');


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
const crearBien = async (req) => {
  console.log('req.body:', req.body);
  console.log('req.files:', req.files);

  try {
    // Asegúrate de manejar correctamente req.files
    const fotos = req.files;

    if (!fotos || fotos.length === 0) {
      throw new Error('No se han cargado fotos');
    }



    const nuevoBien = await Bien.create({
      tipo: req.body.tipo,
      marca: req.body.marca,
      modelo: req.body.modelo,
      descripcion: req.body.descripcion,
      precio: parseFloat(req.body.precio),
      cantidad: parseInt(req.body.cantidad, 10),
      metodoPago: req.body.metodoPago,
      uuid: req.body.uuid,
      fotos: urls,
      fecha: new Date().toISOString(), // Generar la fecha actual
    });
    

    return nuevoBien;
  } catch (error) {
    console.error('Error en crearBien:', error);
    throw error;
  }
};





// Obtener bien por ID
// Obtener bien por ID
const obtenerBienPorId = async (req, res) => {
  try {
    const { id } = req.params; // id es el UUID del bien

    // Busca el bien por su UUID e incluye las transacciones asociadas
    const bien = await Bien.findOne({
      where: { uuid: id },
      include: [
        {
          model: Transaccion,
          as: 'transaccionesDeBien',  // Asegúrate de que este alias sea el mismo que definiste en el modelo
          include: [
            { model: Usuario, as: 'compradorTransaccion', attributes: ['id', 'nombre', 'apellido', 'email'] },
            { model: Usuario, as: 'vendedorTransaccion', attributes: ['id', 'nombre', 'apellido', 'email'] }
          ],
          attributes: ['uuid', 'fecha', 'monto', 'cantidad', 'metodoPago'] // Incluir atributos relevantes de la transacción
        }
      ]
    });

    if (!bien) {
      return res.status(404).json({ message: 'Bien no encontrado' });
    }

    return res.json(bien);
  } catch (error) {
    console.error('Error al obtener el bien:', error);
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
// Subir stock desde un archivo Excel
async function subirStockExcel(data) {
  for (const item of data.Sheet1) {
    const { descripcion, precio, vendedorId, fecha, tipo, marca, modelo, imei, stock, imagen } = item;

    // Verifica si la imagen existe y copia el archivo al servidor
    if (imagen) {
      const sourcePath = path.join(__dirname, 'uploads', imagen); // ruta donde están las imágenes originales
      const destPath = path.join(__dirname, 'public', 'images', imagen); // ruta donde quieres almacenar las imágenes

      // Copiar la imagen al destino
      fs.copyFile(sourcePath, destPath, (err) => {
        if (err) throw err;
      });
    }

    // Almacenar en la base de datos, asegurándote de incluir la ruta de la imagen
    try {
      await Bien.upsert({
        descripcion,
        precio,
        vendedorId,
        fecha,
        tipo,
        marca,
        modelo,
        imei,
        stock,
        imagen: `images/${imagen}` // almacena la ruta de la imagen
      });
    } catch (error) {
      console.error('Error al procesar el bien:', error);
    }
  }
}


// Obtener transacciones por bien
// Obtener transacciones por bien
const obtenerTransaccionesPorBien = async (req, res) => {
  const { id } = req.params;  // Asegúrate de que 'id' esté bien definido
  const bienId = id;  // El UUID del bien es un string, no lo conviertas a entero

  if (!bienId) {
    return res.status(400).json({ message: 'ID del bien es requerido' });
  }

  try {
    const transacciones = await Transaccion.findAll({
      where: { bienId },  // Utiliza bienId como UUID
      include: [
        { model: Usuario, as: 'comprador', attributes: ['id', 'nombre', 'apellido', 'email'] },
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'apellido', 'email'] },
        { model: Bien, as: 'bien', attributes: ['uuid', 'descripcion', 'marca', 'modelo'] }
      ]
    });

    // Verifica si hay transacciones, incluso si el comprador es null
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
    // Obtener los bienes disponibles con las fotos
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

    // Mapear los bienes para incluir las fotos
    const bienesConFotos = bienes.map(bien => {
      // Suponiendo que las fotos están en un campo llamado `fotos`
      return {
        ...bien.toJSON(),
        fotos: bien.fotos ? bien.fotos.split(',') : [] // Si las fotos están almacenadas como una cadena separada por comas
      };
    });

    res.status(200).json(bienesConFotos);
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
          attributes: ['id', 'nombre', 'apellido', 'dni', 'cuit', 'email', 'direccion' ],
        },
        {
          model: Usuario,
          as: 'vendedor',
          attributes: ['id', 'nombre', 'apellido', 'dni', 'cuit', 'email', 'direccion'],
        },
        {
          model: Bien,
          as: 'bien',
          attributes: ['uuid', 'descripcion', 'marca', 'modelo', 'tipo', 'stock', 'foto'],
        },
      ],
    });

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
          foto: bien.foto,
        },
        comprador: {
          id: comprador.id,
          nombre: comprador.nombre,
          apellido: comprador.apellido,
          dni: comprador.dni,
          cuit: comprador.cuit,
          email: comprador.email,
          direccion: comprador.direccion,
        },
        vendedor: {
          id: vendedor.id,
          nombre: vendedor.nombre,
          apellido: vendedor.apellido,
          dni: vendedor.dni,
          cuit: vendedor.cuit,
          email: vendedor.email,
          direccion: vendedor.direccion,
        },
      };
    });

    res.json(transaccionesJson);
  } catch (error) {
    console.error('Error al obtener las transacciones:', error);
    res.status(500).json({ message: 'Error al obtener las transacciones.' });
  }
};


const obtenerTrazabilidadPorBien = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid || typeof uuid !== 'string' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
      return res.status(400).json({ message: 'El ID del bien debe ser un UUID válido.' });
  }
  
  try {
    console.log('ID del bien recibido:', uuid);

    const transacciones = await Transaccion.findAll({
      where: { bienId: uuid },
      include: [
        {
          model: Usuario, 
          as: 'compradorTransaccion', 
          attributes: ['nombre', 'apellido', 'dni', 'email', 'cuit', 'direccion']
        },
        {
          model: Usuario, 
          as: 'vendedorTransaccion', 
          attributes: ['nombre', 'apellido', 'dni', 'email', 'cuit', 'direccion']
        },
        { 
          model: Bien, 
          as: 'bienTransaccion', 
          attributes: ['descripcion', 'precio', 'tipo', 'marca', 'modelo'] 
        }
      ],
      order: [['fecha', 'DESC']]
    });

    if (!transacciones.length) {
      return res.status(200).json({ message: 'No se encontraron transacciones para este bien.' });
    }

    res.json(transacciones);
  } catch (error) {
    console.error('Error al obtener trazabilidad:', error);
    res.status(500).json({ message: 'Error al obtener trazabilidad.', error: error.message });
  }
};



const registrarVenta = async (req, res) => {
  const { bienId, compradorId, vendedorId, precio, cantidad, metodoPago } = req.body;

  // Obtener los datos del comprador y del vendedor
  const comprador = await Usuario.findByPk(compradorId);
  const vendedor = await Usuario.findByPk(vendedorId);

  // Verificar que el comprador y el vendedor no sean la misma persona comparando DNI
  if (comprador.dni === vendedor.dni) {
    return res.status(400).json({ mensaje: "No puedes vender a ti mismo." });
  }

  // Validación del UUID
  if (!isValidUUID(bienId)) {
    return res.status(400).json({ mensaje: "El bienId proporcionado no es un UUID válido." });
  }

  // Validación de precio y cantidad
  if (precio <= 0 || cantidad <= 0) {
    return res.status(400).json({ mensaje: "El precio y la cantidad deben ser mayores a cero." });
  }

  // Inicia la transacción
  const transaction = await sequelize.transaction();
  
  try {
    // Buscar el bien en la base de datos
    let bien = await Bien.findOne({
      where: { uuid: bienId },
      transaction,
    });

    // Verificar si el bien existe
    if (!bien) {
      await transaction.rollback(); // Rollback en caso de error
      return res.status(404).json({ mensaje: "El bien no existe." });
    }

    // Verificar si hay suficiente stock
    if (bien.stock < cantidad) {
      await transaction.rollback(); // Rollback en caso de error
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


/*const registrarCompra = async (req, res) => {
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
};*/


const registrarCompra = async (req, res) => {
  try {
    const {
      tipo,
      marca,
      modelo,
      descripcion,
      precio,
      cantidad,
      metodoPago,
      vendedorId,
      compradorId,
      imei
    } = req.body;

    console.log('Datos recibidos en el backend:', {
      tipo, marca, modelo, descripcion, precio, cantidad, metodoPago, vendedorId, compradorId, imei
    });

    if (!tipo || !marca || !modelo || !cantidad || !precio || !metodoPago || !vendedorId || !compradorId) {
      return res.status(400).json({ mensaje: 'Faltan datos necesarios para registrar la compra.' });
    }

    // Obtener los datos del comprador y del vendedor
    const comprador = await Usuario.findByPk(compradorId);
    const vendedor = await Usuario.findByPk(vendedorId);

    // Verificar que el comprador y el vendedor no sean la misma persona comparando DNI
    if (comprador.dni === vendedor.dni) {
      return res.status(400).json({ mensaje: "No puedes vender a ti mismo." });
    }

    // Subir fotos a Cloudinary
    let urls = [];
    if (req.files && req.files.length > 0) {
      urls = await Promise.all(req.files.map((file) => uploadFileToCloudinary(file)));
      console.log('Fotos subidas a Cloudinary:', urls);
    }

    // Verificar si el bien ya existe
    let bien = await Bien.findOne({
      where: { tipo, marca, modelo },
    });

    if (!bien) {
      // Crear el bien si no existe
      bien = await Bien.create({
        tipo,
        marca,
        modelo,
        descripcion,
        precio,
        stock: cantidad,
        vendedorId,
        imei,
        uuid: generateUUID(),
        fecha: new Date(),
        foto: urls.length > 0 ? urls : null, // URLs de las fotos
      });
    } else {
      // Si existe, actualizar el stock y las fotos
      bien.stock += cantidad;
      if (urls.length > 0) {
        bien.foto = bien.foto ? bien.foto.concat(urls) : urls;
      }
      await bien.save();
    }

    // Verificar stock para la compra
    if (bien.stock < cantidad) {
      return res.status(400).json({ mensaje: 'No hay suficiente stock disponible.' });
    }

    // Registrar la transacción
    const transaccion = await Transaccion.create({
      bienId: bien.uuid,
      compradorId,
      vendedorId,
      cantidad,
      precio,
      metodoPago,
      fecha: new Date(),
    });

    res.status(201).json({ mensaje: 'Compra registrada con éxito.', bien, transaccion });
  } catch (error) {
    console.error('Error al registrar la compra:', error);
    res.status(500).json({ mensaje: 'Error al procesar la compra.', error });
  }
};










// Actualizar stock de bienes
const actualizarStockBienes = async (compra) => {
  const { vendedorId, compradorId, bienId, cantidad } = compra;

  if (!vendedorId || !compradorId || !bienId || cantidad === undefined) {
    throw new Error('Faltan parámetros necesarios: vendedorId, compradorId, bienId, cantidad');
  }

  const transaction = await sequelize.transaction();

  try {
    // Busca el bien del vendedor
    const bienVendedor = await Bien.findOne({
      where: { uuid: bienId, vendedorId },
      transaction
    });

    if (!bienVendedor) {
      throw new Error('Bien del vendedor no encontrado');
    }

    // Actualiza el stock del vendedor
    bienVendedor.stock -= cantidad;

    if (bienVendedor.stock <= 0) {
      await bienVendedor.destroy({ transaction });
    } else {
      await bienVendedor.save({ transaction });
    }

    // Busca el bien del comprador que coincida en tipo, marca y modelo
    let bienComprador = await Bien.findOne({
      where: {
        tipo: bienVendedor.tipo,
        marca: bienVendedor.marca,
        modelo: bienVendedor.modelo,
        compradorId
      },
      transaction
    });

    if (bienComprador) {
      // Si existe, actualiza el stock
      bienComprador.stock += cantidad;
      await bienComprador.save({ transaction });
    } else {
      // Si no existe, crea uno nuevo
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
        stock: cantidad
      }, { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar el stock de bienes:', error);
    throw error; // Lanza el error para que el controlador lo maneje
  }
};


// Controlador para obtener bienes filtrados por marca, tipo y modelo
const getBienesPorMarcaTipoModelo = async (req, res) => {
  try {
    const { marca, tipo, modelo } = req.query;

    // Construir el objeto de filtros dinámicos
    const filtros = {};

    if (marca) {
      filtros.marca = marca;
    }
    if (tipo) {
      filtros.tipo = tipo;
    }
    if (modelo) {
      filtros.modelo = modelo;
    }

    // Buscar bienes según los filtros
    const bienes = await Bien.findAll({
      where: filtros
    });

    // Verificar si se encontraron bienes
    if (bienes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron bienes que coincidan con los criterios proporcionados.' });
    }

    // Devolver los bienes encontrados
    return res.status(200).json(bienes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener los bienes.' });
  }
};

const actualizarStockPorParametros = async (req, res) => {
  const { tipo, marca, modelo, cantidad } = req.body;

  // Validación de parámetros
  if (!tipo || !marca || !modelo || cantidad === undefined) {
    return res.status(400).json({ message: 'Faltan parámetros requeridos: tipo, marca, modelo, cantidad' });
  }

  try {
    const bienesAActualizar = await Bien.findAll({
      where: {
        tipo: tipo,
        marca: marca,
        modelo: modelo
      }
    });

    if (bienesAActualizar.length === 0) {
      return res.status(404).json({ message: 'No se encontraron bienes que coincidan con los parámetros.' });
    }

    for (let bien of bienesAActualizar) {
      bien.stock += cantidad;
      await bien.save();
    }

    return res.status(200).json({ message: 'Stock actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el stock:', error);
    return res.status(500).json({ message: 'Error al actualizar el stock.' });
  }
};



const obtenerBienesPorUsuario = async (req, res) => {
  try {
    const { userId } = req.params; // Usamos req.params en lugar de req.query

    if (!userId) {
      return res.status(400).json({ message: 'El parámetro userId es requerido.' });
    }

    // Lógica para obtener los bienes del usuario
    const bienes = await Bien.findAll({
      where: {
        [Op.or]: [
          { vendedorId: userId },
          { compradorId: userId }
        ],
        stock: { [Op.gt]: 0 }
      },
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

    if (!bienes.length) {
      return res.status(404).json({ message: 'No se encontraron bienes para este usuario.' });
    }

    res.json({ bienes });

  } catch (error) {
    console.error('Error obteniendo bienes por usuario:', error);
    res.status(500).json({ message: 'Error al obtener los bienes.', error: error.message });
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
  actualizarStockBienes,
  getBienesPorMarcaTipoModelo,
  actualizarStockPorParametros ,
  registrarCompra,
  obtenerBienesPorUsuario, 
  
};

