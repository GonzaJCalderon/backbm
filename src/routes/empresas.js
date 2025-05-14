// routes/empresas.js
const express = require('express');
const router = express.Router();

const empresaController = require('../controllers/empresaController');
const { verifyToken, verificarPermisos } = require('../middlewares/authJwt');

// 🔹 CRUD de empresas
router.get('/', verifyToken, verificarPermisos(['admin', 'moderador']), empresaController.obtenerEmpresas);
router.get('/:uuid', verifyToken, verificarPermisos(['admin', 'moderador']), empresaController.obtenerEmpresaPorUuid);
router.post('/', verifyToken, verificarPermisos(['admin']), empresaController.crearEmpresa);
router.put('/:uuid', verifyToken, verificarPermisos(['admin']), empresaController.actualizarEmpresa);
router.delete('/:uuid', verifyToken, verificarPermisos(['admin']), empresaController.eliminarEmpresa);

router.delete('/delegado/:uuid', verifyToken, empresaController.eliminarDelegadoPorResponsable);

// 🔹 Delegados
router.get('/:uuid/delegados', verifyToken,  empresaController.getDelegadosEmpresa);

router.get('/delegado/empresa', verifyToken, empresaController.obtenerEmpresaDelDelegado);

// routes/empresa.routes.js
router.patch('/estado/:uuid', verifyToken, verificarPermisos(['admin']), empresaController.cambiarEstadoEmpresa);

router.put('/editar/:uuid', verifyToken, verificarPermisos(['admin']), empresaController.editarEmpresa);


module.exports = router;
