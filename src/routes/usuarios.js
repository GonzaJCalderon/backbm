const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuariosController');
const { verifyToken, verificarPermisos } = require('../middlewares/authMiddleware');

// Ruta para registrar un usuario
router.post('/register', usuarioController.crearUsuario);

// Ruta para login
router.post('/login', usuarioController.loginUsuario);

// Ruta para obtener todos los usuarios (protegida y solo accesible para administrador o moderador)
router.get('/', verifyToken, verificarPermisos(['administrador', 'moderador', ]), usuarioController.obtenerUsuarios);

// Ruta para obtener un usuario por DNI (protegida y accesible solo para administrador)
router.get('/dni', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerUsuarioPorDni);

// Ruta para registrar usuario por tercero
router.post('/register-usuario-por-tercero', usuarioController.registerUsuarioPorTercero);

// Ruta para obtener los detalles del usuario autenticado (protegida, accesible para administrador y moderador)
router.get('/usuario/detalles', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerUsuarioDetalles);

// Ruta para obtener todos los compradores (protegida y accesible solo para administrador)
router.get('/compradores', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerCompradores);

// Ruta para obtener usuarios pendientes (protegida y accesible solo para administrador)
router.get('/usuarios/pendientes', verifyToken, verificarPermisos(['administrador']), usuarioController.obtenerUsuariosPendientes);

// Ruta para obtener un usuario por su ID (protegida, accesible para administrador y moderador)
router.get('/:id', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerUsuarioPorId);

// Ruta para actualizar un usuario por su ID (protegida y accesible solo para administrador)
router.put('/:id', verifyToken, verificarPermisos(['administrador']), usuarioController.actualizarUsuario);

// Ruta para obtener detalles del usuario por su ID (protegida, accesible para administrador y moderador)
router.get('/:id/detalles', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerUsuarioDetalles);

// Ruta para eliminar un usuario por su ID (protegida y accesible solo para administrador)
router.delete('/:id', verifyToken, verificarPermisos(['administrador']), usuarioController.eliminarUsuario);

// Ruta para asignar un rol temporal (protegida y accesible solo para administrador)
router.put('/:id/rolTemporal', verifyToken, verificarPermisos(['administrador']), usuarioController.asignarRolTemporal);

// Ruta para obtener el rol temporal de un usuario (protegida y accesible solo para administrador y moderador)
router.get('/:id/rolTemporal', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerRolTemporal);

// Ruta para remover el rol temporal de un usuario (protegida y accesible solo para administrador)
router.delete('/:id/rolTemporal', verifyToken, verificarPermisos(['administrador']), usuarioController.removerRolTemporal);

// Ruta para obtener compras y ventas asociadas a un usuario (protegida y accesible para administrador y moderador)
router.get('/:id/compras-ventas', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerComprasVentasPorUsuario);

// Ruta para obtener todas las compras y ventas (protegida y accesible para administrador y moderador)
router.get('/compras-ventas', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerComprasVentas);

// Ruta para aprobar un usuario (protegida y accesible solo para administrador)
router.put('/:id/aprobar', verifyToken, verificarPermisos(['administrador']), usuarioController.aprobarUsuario);

// Ruta para rechazar un usuario (protegida y accesible solo para administrador)
router.put('/:id/rechazar', verifyToken, verificarPermisos(['administrador']), usuarioController.rechazarUsuario);

// Ruta para obtener todos los usuarios aprobados (protegida y accesible solo para administrador)
router.get('/usuarios/aprobados', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerUsuariosAprobados);

// Ruta para obtener todos los usuarios rechazados (protegida y accesible solo para administrador)
router.get('/usuarios/rechazados', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerUsuariosRechazados);

// Ruta para cambiar el rol del usuario a 'administrador' (protegida y accesible solo para administrador)
router.put('/:id/cambiar-rol', verifyToken, verificarPermisos(['administrador']), usuarioController.cambiarRol);

// Ruta para verificar si el usuario existe
router.post('/check', usuarioController.verificarUsuarioExistente);

module.exports = router;
 