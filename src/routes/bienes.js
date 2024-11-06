const express = require('express');
const router = express.Router();
const { Bien, Transaccion, Usuario } = require('../models');  // Importa los modelos
const bienesController = require('../controllers/bienesController');
const comprasController = require('../controllers/comprasController');
const { verifyToken, verificarPermisos } = require('../middlewares/authMiddleware'); // Asegúrate de que estén importados correctamente
const upload = require('../config/multerConfig');  // Configuración para multer

// Ruta para obtener todos los bienes
router.get('/', bienesController.obtenerBienes);

// Ruta para crear un nuevo bien
router.post('/add/',
  upload.fields([{ name: 'fotos', maxCount: 3 }]),
  verifyToken, // Verifica que el usuario esté autenticado
  verificarPermisos(['admin']), // Verifica que el rol sea admin
  async (req, res) => {
    try {
      await bienesController.crearBien(req, res);
    } catch (error) {
      res.status(500).send({ error: 'Error en el controlador: ' + error.message });
    }
  });

// Ruta para obtener un bien por su ID
router.get('/:id', bienesController.obtenerBienPorId);

// Ruta para registrar una transacción (compra/venta)
router.post('/transaccion', verifyToken, bienesController.registrarTransaccion);

// Ruta para actualizar un bien por su ID
router.put('/:id', verifyToken, verificarPermisos(['administrador']), bienesController.actualizarBien);

// Ruta para eliminar un bien por su ID
router.delete('/:id', verifyToken, verificarPermisos(['administrador']), bienesController.eliminarBien);

// Ruta para subir y procesar el archivo Excel
router.post('/subir-stock', upload.single('archivoExcel'), verificarPermisos(['administrador']), bienesController.subirStockExcel);

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
