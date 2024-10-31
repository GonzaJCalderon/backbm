const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuariosController');
<<<<<<< HEAD
const { verifyToken, verificarPermisos } = require('../middlewares/authMiddleware');
=======
const verifyToken = require('../middlewares/authMiddleware');
>>>>>>> develop

// Ruta para registrar un usuario
router.post('/register', usuarioController.crearUsuario);

// Ruta para login
router.post('/login', usuarioController.loginUsuario);

<<<<<<< HEAD
// Ruta para obtener todos los usuarios (protegida y solo accesible para administrador o moderador)
router.get('/', verifyToken, verificarPermisos(['administrador', 'moderador', ]), usuarioController.obtenerUsuarios);

// Ruta para obtener un usuario por DNI (protegida y accesible solo para administrador)
router.get('/dni', verifyToken, verificarPermisos(['administrador', 'moderador']), usuarioController.obtenerUsuarioPorDni);
=======
// Ruta para obtener todos los usuarios (protegida)
router.get('/', verifyToken, usuarioController.obtenerUsuarios);

// Ruta para obtener un usuario por DNI (protegida)
router.get('/dni', verifyToken, usuarioController.obtenerUsuarioPorDni);
>>>>>>> develop

// Ruta para registrar usuario por tercero
router.post('/register-usuario-por-tercero', usuarioController.registerUsuarioPorTercero);

<<<<<<< HEAD
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

module.exports = router;
 
=======
// Ruta para obtener los detalles del usuario autenticado (requiere autenticación)
router.get('/usuario/detalles', verifyToken, usuarioController.obtenerUsuarioDetalles);

// Ruta para obtener todos los compradores (protegida)
router.get('/compradores', verifyToken, usuarioController.obtenerCompradores);

// Ruta para obtener usuarios pendientes (protegida)

router.get('/usuarios/pendientes', verifyToken, usuarioController.obtenerUsuariosPendientes);


// Ruta para obtener un usuario por su ID (protegida)
router.get('/:id', verifyToken, usuarioController.obtenerUsuarioPorId);

// Ruta para actualizar un usuario por su ID (protegida)
router.put('/:id', verifyToken, usuarioController.actualizarUsuario);

// Ruta para obtener detalles del usuario por su ID (protegida)
router.get('/:id/detalles', verifyToken, usuarioController.obtenerUsuarioDetalles);

// Ruta para eliminar un usuario por su ID (protegida)
router.delete('/:id', verifyToken, usuarioController.eliminarUsuario);

// Ruta para asignar un rol temporal (protegida)
router.put('/:id/rolTemporal', verifyToken, usuarioController.asignarRolTemporal);

// Ruta para obtener el rol temporal de un usuario (protegida)
router.get('/:id/rolTemporal', verifyToken, usuarioController.obtenerRolTemporal);

// Ruta para remover el rol temporal de un usuario (protegida)
router.delete('/:id/rolTemporal', verifyToken, usuarioController.removerRolTemporal);

// Ruta para obtener compras y ventas asociadas a un usuario (protegida)
router.get('/:id/compras-ventas', verifyToken, usuarioController.obtenerComprasVentasPorUsuario);

// Ruta para obtener todas las compras y ventas (protegida)
router.get('/compras-ventas', verifyToken, usuarioController.obtenerComprasVentas);

// Ruta para aprobar un usuario (protegida)
router.put('/:id/aprobar', verifyToken, usuarioController.aprobarUsuario);

// Ruta para rechazar un usuario (protegida)
router.put('/:id/rechazar', verifyToken, usuarioController.rechazarUsuario);


// Ruta para obtener todos los usuarios aprobados (protegida)
router.get('/usuarios/aprobados', verifyToken, usuarioController.obtenerUsuariosAprobados);

// Ruta para obtener todos los usuarios aprobados (protegida)
router.get('/usuarios/rechazados', verifyToken, usuarioController.obtenerUsuariosRechazados);

// Ruta para cambiar el rol del usuario a 'administrador'
router.put('/:id/cambiar-rol', verifyToken, usuarioController.cambiarRol);

module.exports = router;
>>>>>>> develop
