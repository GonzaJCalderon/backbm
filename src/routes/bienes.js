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
router.post(
  '/add/',
  uploadFotosMiddleware, // Middleware para subir fotos
  async (req, res) => {
    try {
      console.log('Archivos recibidos en req.files:', req.files);

      const { tipo, marca, modelo, descripcion, precio, cantidad, vendedorId, compradorId, uuid } = req.body;

      // Validar los parámetros requeridos
      if (!tipo || !marca || !modelo || !cantidad || !vendedorId) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios: tipo, marca, modelo, cantidad, vendedorId.' });
      }

      // Subir fotos a Cloudinary
      let urls = [];
      if (req.files && req.files.length > 0) {
        urls = await Promise.all(req.files.map((file) => uploadFileToCloudinary(file)));
        console.log('Fotos subidas a Cloudinary:', urls);
      }

      // Buscar si el bien ya existe para el mismo vendedor
      const bienExistente = await Bien.findOne({
        where: {
          tipo: tipo.toLowerCase(),
          marca: marca.toLowerCase(),
          modelo: modelo.toLowerCase(),
          vendedorId,
        },
      });

      if (bienExistente) {
        // Actualizar el stock si ya existe
        bienExistente.stock += parseInt(cantidad, 10);
        await bienExistente.save();

        return res.status(200).json({
          success: true,
          message: 'El stock del bien existente ha sido actualizado.',
          bien: bienExistente,
        });
      }

      // Si el bien no existe, registrar uno nuevo
      const nuevoBien = await Bien.create({
        tipo: tipo.toLowerCase(),
        marca: marca.toLowerCase(),
        modelo: modelo.toLowerCase(),
        descripcion,
        precio: parseFloat(precio),
        stock: parseInt(cantidad, 10),
        metodoPago: req.body.metodoPago,
        uuid: uuid || generateUUID(),
        foto: urls.length > 0 ? urls : null, // URLs de las fotos
        fecha: new Date().toISOString(),
        vendedorId,
        compradorId: compradorId || null, // Opcional
      });

      return res.status(201).json({
        success: true,
        message: 'Bien registrado con éxito.',
        bien: nuevoBien,
      });
    } catch (error) {
      console.error('Error al registrar o actualizar el bien:', error);
      return res.status(500).json({ error: 'Error al procesar la solicitud.' });
    }
  }
);



// const registrarBien = async (req, res) => {
//   try {
//     const nuevoBien = await Bien.create({
//       descripcion: req.body.descripcion,
//       precio: req.body.precio,
//       fecha: req.body.fecha,
//       foto: req.body.foto,
//       tipo: req.body.tipo,
//       marca: req.body.marca,
//       modelo: req.body.modelo,
//       imei: req.body.imei,
//       stock: req.body.stock,
//       vendedorId: req.body.vendedorId,
//       compradorId: req.body.compradorId,
//       // Otros datos
//     });

//     return res.status(201).json(nuevoBien);
//   } catch (error) {
//     return res.status(500).json({ error: 'Error al registrar el bien' });
//   }
// };


// Ruta para obtener los bienes filtrados por marca, tipo y modelo
router.get('/bienes', bienesController.getBienesPorMarcaTipoModelo);

// Ruta para actualizar el stock de bienes por marca, modelo y tipo
router.put('/actualizar-por-parametros', verifyToken, verificarPermisos(['administrador', 'usuario']), bienesController.actualizarStockPorParametros);

// Ruta para obtener un bien por su ID
router.get('/:id', bienesController.obtenerBienPorId);

// Ruta para registrar una transacción (compra/venta)
router.post('/transaccion', verifyToken, bienesController.registrarTransaccion);


// Ruta para actualizar un bien por su ID
router.put('/:id', verifyToken, verificarPermisos(['administrador', 'usuario']), bienesController.actualizarBien);




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
router.get('/stock', verifyToken, bienesController.obtenerBienesStock);

// Ruta para comprar un bien
// router.post('/comprar', async (req, res) => {
//   console.log('Cuerpo de la solicitud:', req.body);

//   // Imprime los keys del body
//   console.log('Keys en el body:', Object.keys(req.body));
//   const { bienId } = req.body;

//   try {
//     const bienExistente = await Bien.findOne({ where: { uuid: bienId } });

//     if (!bienExistente) {
//       return res.status(404).send({ error: 'El bien no existe' });
//     }

//     // Si el bien existe, puedes manejar la lógica de compra aquí
//     await bienesController.registrarCompra(req, res);
//   } catch (error) {
//     res.status(500).send({ error: 'Error al verificar el bien: ' + error.message });
//   }
// });


// Ruta para registrar compra con middleware de subida de fotos
router.post('/comprar', uploadFotosMiddleware, bienesController.registrarCompra);



// Ruta para obtener bienes en stock
router.get('/stock', bienesController.obtenerBienesStock);

// Ruta para obtener bienes de un usuario
router.get('/bien/usuario/:userId', verifyToken, bienesController.obtenerBienesPorUsuario);


// Ruta para registrar una venta
router.post('/vender', verifyToken, bienesController.registrarVenta);


module.exports = router;