const router = require('express').Router();
const ctrl   = require('../controllers/usuariosController');
const { authenticate, requireRole } = require('../middleware/auth');

// Todas requieren autenticación
router.use(authenticate);

// GET /api/usuarios/stats
router.get('/stats', requireRole('admin'), ctrl.getStats);

// GET /api/usuarios
router.get('/', requireRole('admin'), ctrl.getAll);

// GET /api/usuarios/:id
router.get('/:id', ctrl.getOne);

// PATCH /api/usuarios/:id/estado  – activar/desactivar
router.patch('/:id/estado', requireRole('admin'), ctrl.toggleEstado);

// PATCH /api/usuarios/:id/perfil  – editar perfil
router.patch('/:id/perfil', ctrl.updatePerfil);

// DELETE /api/usuarios/:id
router.delete('/:id', requireRole('admin'), ctrl.deleteUser);

module.exports = router;
