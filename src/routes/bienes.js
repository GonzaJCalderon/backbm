const express = require('express');
const router = express.Router();
const { Bien, Transaccion, Usuario } = require('../models');  // Importa los modelos
const bienesController = require('../controllers/bienesController');
const comprasController = require('../controllers/comprasController');
const { verifyToken, verificarPermisos } = require('../middlewares/authMiddleware');
const { uploadFotosMiddleware, uploadFileToCloudinary } = require('../middlewares/uploadFotos');  // Importar funciones de Cloudinary
const uploadExcel = require('../config/uploadExcel'); // Asegúrate de que la ruta sea correcta

// Ruta para obtener todos los bienes
router.get('/', bienesController.obtenerBienes);

// Ruta para crear un nuevo bien con fotos
router.post('/add/', verifyToken, verificarPermisos(['administrador', 'usuario']), uploadFotosMiddleware, async (req, res) => {
  try {
    // Verificar si las fotos están en req.files
    const fotos = req.files;

    if (!fotos || fotos.length === 0) {
      return res.status(400).json({ error: 'No se han cargado fotos' });
    }

    const { descripcion, precio, tipo, marca, modelo, cantidad, vendedorId, fecha } = req.body;

    // Verificar que los datos necesarios estén presentes
    if (!descripcion || !precio || !tipo || !marca || !modelo || cantidad === undefined || !vendedorId || !fecha) {
      return res.status(400).json({ error: 'Faltan datos necesarios para crear el bien' });
    }

    // Procesar las fotos y subirlas a Cloudinary
    const fotosURLs = [];
    for (const foto of fotos) {
      const fotoURL = await uploadFileToCloudinary(foto);  // Subir la foto a Cloudinary y obtener la URL
      fotosURLs.push(fotoURL);
    }

    const precioNum = parseFloat(precio);
    const cantidadNum = parseInt(cantidad, 10);

    if (isNaN(precioNum) || isNaN(cantidadNum)) {
      return res.status(400).json({ error: 'El precio o la cantidad no son válidos' });
    }

    // Crear el nuevo bien
    const nuevoBien = await Bien.create({
      descripcion,
      precio: precioNum,
      tipo,
      marca,
      modelo,
      stock: cantidadNum,
      vendedorId,
      fecha,
      foto: fotosURLs, // Guardar las URLs de las fotos
    });

    res.status(201).json(nuevoBien);
  } catch (error) {
    console.error('Error al crear el bien:', error);
    res.status(500).json({ error: 'Error al crear el bien. ' + error.message });
  }
});

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



// Ruta para obtener un bien por su ID
router.get('/:id', bienesController.obtenerBienPorId);

// Ruta para registrar una transacción (compra/venta)
router.post('/transaccion', verifyToken, bienesController.registrarTransaccion);


// Ruta para actualizar un bien por su ID
router.put('/:id', verifyToken, verificarPermisos(['administrador']), bienesController.actualizarBien);

// Ruta para eliminar un bien por su ID
router.delete('/:id', verifyToken, verificarPermisos(['administrador']), bienesController.eliminarBien);

router.post('/subir-stock', uploadExcel, bienesController.subirStockExcel);




// Ruta para obtener transacciones por ID de bien
router.get('/transacciones/bien/:id', bienesController.obtenerTransaccionesPorBien);

// Ruta para obtener la trazabilidad de un bien por su UUID
router.get('/trazabilidad/:uuid', bienesController.obtenerTrazabilidadPorBien);

// Ruta para obtener transacciones por ID de usuario
router.get('/transacciones/usuario/:userId', bienesController.obtenerTransaccionesPorUsuario);

// Ruta para obtener el stock de bienes de un usuario
router.get('/usuario/:userId/stock', verifyToken, bienesController.obtenerBienesDisponibles);

// Ruta para comprar un bien
router.post('/comprar', async (req, res) => {
  console.log('Cuerpo de la solicitud:', req.body);

  // Imprime los keys del body
  console.log('Keys en el body:', Object.keys(req.body));
  const { bienId } = req.body;

  try {
    const bienExistente = await Bien.findOne({ where: { uuid: bienId } });

    if (!bienExistente) {
      return res.status(404).send({ error: 'El bien no existe' });
    }

    // Si el bien existe, puedes manejar la lógica de compra aquí
    await bienesController.registrarCompra(req, res);
  } catch (error) {
    res.status(500).send({ error: 'Error al verificar el bien: ' + error.message });
  }
});

router.post('/comprar_bien', async (req, res) => {
  // Pasar el ID del bien a `req.body` y registrar la compra

  try {
    const compra = await comprasController.registrarCompra(req, res);
    return res.status(201).json(compra);
  } catch (error) {
    console.error('Error en /comprar_bien:', error);
    return res.status(500).send({ error: 'Error al procesar la compra' });
  }
});

// Ruta para obtener bienes en stock
router.get('/stock', bienesController.obtenerBienesStock);

// Ruta para registrar una venta
router.post('/vender', verifyToken, bienesController.registrarVenta);


module.exports = router;