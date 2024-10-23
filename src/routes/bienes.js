const express = require('express');
const router = express.Router();
const { Bien } = require('../models');  // Importa el modelo Bien
const { Transaccion } = require('../models');
const { Usuario } = require('../models');
const bienesController = require('../controllers/bienesController');
const verifyToken = require('../middlewares/authMiddleware');
const upload = require('../config/multerConfig');  // Asegúrate de que config esté bien


// Ruta para obtener todos los bienes
router.get('/', bienesController.obtenerBienes);

// Ruta para crear un nuevo bien
router.post('/add/', upload.fields([
  { name: 'fotos', maxCount: 3 }
]), (err, req, res, next) => {
  if (err) {
    return res.status(400).send({ error: err.message });
  }
  next();
}, async (req, res) => {
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
router.put('/:id', verifyToken, bienesController.actualizarBien);

// Ruta para eliminar un bien por su ID
router.delete('/:id', verifyToken, bienesController.eliminarBien);

// Ruta para subir y procesar el archivo Excel
router.post('/subir-stock', upload.single('archivoExcel'), bienesController.subirStockExcel);

// Ruta para obtener transacciones por ID de bien
router.get('/transacciones/bien/:id', bienesController.obtenerTransaccionesPorBien);

// Ruta para obtener la trazabilidad de un bien por su UUID
router.get('/trazabilidad/:uuid', bienesController.obtenerTrazabilidadPorBien);

// Ruta para obtener transacciones por ID de usuario
router.get('/transacciones/usuario/:userId', bienesController.obtenerTransaccionesPorUsuario);

// Ruta para obtener el stock de bienes de un usuario
router.get('/usuario/:userId/stock', verifyToken, bienesController.obtenerBienesDisponibles);

router.post('/comprar', verifyToken, async (req, res, next) => {
  const { bienId } = req.body;

  try {
    const bienExistente = await Bien.findOne({ where: { uuid: bienId } });

    if (!bienExistente) {
      return res.status(404).send({ error: 'El bien no existe' });
    }

    // Si el bien existe, puedes manejar la lógica de compra aquí
    next(); // Si no hay errores, sigue con el siguiente middleware
  } catch (error) {
    res.status(500).send({ error: 'Error al verificar el bien: ' + error.message });
  }
}, bienesController.registrarCompra);



// Ruta para obtener bienes en stock
router.get('/stock', bienesController.obtenerBienesStock);

// Ruta para registrar una venta
router.post('/vender', verifyToken, bienesController.registrarVenta);

module.exports = router;
