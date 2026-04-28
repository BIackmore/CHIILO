const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

// POST /api/auth/login
router.post('/login',
  body('correo').isEmail().withMessage('Correo inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  validate,
  ctrl.login
);

// POST /api/auth/register  (usuario común)
router.post('/register',
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('correo').isEmail().withMessage('Correo inválido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  validate,
  ctrl.register
);

// POST /api/auth/register-gov  (solo admin)
router.post('/register-gov',
  authenticate,
  requireRole('admin'),
  body('nombre').notEmpty(),
  body('correo').isEmail(),
  body('password').isLength({ min: 6 }),
  body('organizacion').notEmpty(),
  body('numTrabajador').notEmpty(),
  body('dependencia').notEmpty(),
  body('cargo').notEmpty(),
  validate,
  ctrl.registerGov
);

// GET /api/auth/me
router.get('/me', authenticate, ctrl.me);

module.exports = router;
