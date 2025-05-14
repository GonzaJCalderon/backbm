const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { Bien } = require('../models');
const bienesController = require('../controllers/bienesController');
const transaccionesController = require('../controllers/transaccionesController');
const { verificarPermisos } = require('../middlewares/authMiddleware');
const { uploadFotosMiddleware, uploadFileToCloudinary } = require('../middlewares/uploadFotos');
const { v4: uuidv4 } = require('uuid');


const { verifyToken } = require('../middlewares/authJwt');



// Obtener todos los bienes
router.get('/', bienesController.obtenerBienes);

// Crear un nuevo bien con fotos y stock inicial
router.post('/crear', verifyToken, uploadFotosMiddleware, bienesController.crearBien)


router.get('/empresa/:uuid', bienesController.obtenerBienesPorEmpresa);

// Obtener bienes filtrados por marca, tipo y modelo
router.get('/filtrados', bienesController.getBienesPorMarcaTipoModelo);

// Actualizar el stock de bienes por parámetros (tipo, marca, modelo)
router.put(
  '/actualizar-por-parametros',
  verifyToken,
  verificarPermisos(['administrador', 'usuario']),
  bienesController.actualizarStockPorParametros
);

router.get('/bienes/:uuid/fotos', bienesController.getFotosDeBien);


// Inicializar stock
router.post('/inicializarStock', bienesController.inicializarStock);

// Obtener un bien por su ID
router.get('/:uuid', bienesController.obtenerBienPorUuid);


// Actualizar un bien por su ID
// Ruta para actualizar un bien
router.put(
  '/:uuid',
  verifyToken,
  verificarPermisos(['admin', 'usuario']),
  uploadFotosMiddleware, // Middleware para procesar las fotos
  bienesController.actualizarBien // Controlador que maneja la lógica de actualización
);

// Eliminar un bien por su ID
router.delete('/:uuid', verifyToken, verificarPermisos(['admin']), bienesController.eliminarBien);



// Obtener bienes en stock
router.get('/stock', bienesController.obtenerBienesStock);


// Registrar una compra de bienes
router.post(
  '/comprar',
  verifyToken,
  uploadFotosMiddleware,
  transaccionesController.registrarCompra
);

// Obtener bienes relacionados con un usuario
router.get('/usuario/:userUuid', verifyToken, bienesController.obtenerBienesPorUsuario);

router.get('/propietario/:propietarioUuid', bienesController.obtenerBienesPorPropietario);


// Actualizar stock por parámetros
router.post('/bienes/actualizarStock', bienesController.actualizarStockPorParametros);

// Registrar un modelo
router.post('/bienes/modelos', bienesController.registrarModelo);

// Registrar una marca
router.post('/bienes/marcas', bienesController.registrarMarca);

router.get('/bienes/marcas', verifyToken, bienesController.obtenerMarcas);


// Obtener modelos por tipo y marca
router.get('/bienes/modelos', verifyToken, bienesController.obtenerModelos);

router.get('/buscar', bienesController.buscarBienes);

// Verificar si un IMEI ya existe
router.get('/imei-exists/:imei', bienesController.verificarIMEI);

// Obtener la trazabilidad de un bien
router.get('/trazabilidad/:uuid', verifyToken, bienesController.obtenerTrazabilidadPorBien);

router.get('/trazabilidad-identificador/:identificador', bienesController.obtenerTrazabilidadPorIdentificador);
// Buscar bien por UUID con identificadores incluidos (para verificar IMEIs creados)
router.get('/buscar/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;

    const bien = await Bien.findOne({
      where: { uuid },
      include: [
        {
          association: 'identificadores',
        },
      ],
    });

    if (!bien) {
      return res.status(404).json({ success: false, message: "Bien no encontrado" });
    }

    return res.status(200).json({ success: true, bien });
  } catch (error) {
    console.error('❌ Error al buscar bien por UUID:', error);
    return res.status(500).json({ success: false, message: 'Error interno al buscar el bien' });
  }
});



module.exports = router;
