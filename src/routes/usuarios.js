const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuariosController');
const verifyToken = require('../middlewares/authMiddleware');



// Ruta para registrar un usuario
router.post('/register', usuarioController.crearUsuario);

// Ruta para login
router.post('/login', usuarioController.loginUsuario);

// Ruta para obtener todos los usuarios (protegida)
router.get('/', verifyToken, usuarioController.obtenerUsuarios);

// Ruta para obtener un usuario por DNI (protegida)
router.get('/dni', verifyToken, usuarioController.obtenerUsuarioPorDni);

// Ruta para registrar usuario por tercero
router.post('/register-usuario-por-tercero', usuarioController.registerUsuarioPorTercero);

// Ruta para obtener los detalles del usuario autenticado (requiere autenticación)
router.get('/usuario/detalles', verifyToken, usuarioController.obtenerUsuarioDetalles);

// Ruta para obtener todos los compradores (protegida)
router.get('/compradores', verifyToken, usuarioController.obtenerCompradores);

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

// Ruta para obtener usuarios pendientes (protegida)
router.get('/usuarios-pendientes', verifyToken, usuarioController.obtenerUsuariosPendientes);

// Ruta para cambiar el rol del usuario a 'administrador'
router.put('/:id/cambiar-rol', verifyToken, usuarioController.cambiarRol);

module.exports = router;
