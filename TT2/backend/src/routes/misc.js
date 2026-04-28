// ─── analisis.js ────────────────────────────────────────────
const analisisRouter = require('express').Router();
const analCtrl = require('../controllers/analisisController');
const { authenticate } = require('../middleware/auth');

analisisRouter.use(authenticate);
analisisRouter.get('/stats', analCtrl.getStats);
analisisRouter.get('/',      analCtrl.getAll);
analisisRouter.get('/:id',   analCtrl.getOne);

module.exports.analisisRouter = analisisRouter;


// ─── reportes.js ────────────────────────────────────────────
const reportesRouter = require('express').Router();
const repCtrl  = require('../controllers/reportesController');
const { authenticate: auth2, requireRole } = require('../middleware/auth');
const { body }  = require('express-validator');
const { validate } = require('../middleware/errorHandler');

reportesRouter.use(auth2);
reportesRouter.get('/stats', repCtrl.getStats);
reportesRouter.get('/',      repCtrl.getAll);
reportesRouter.get('/:id',   repCtrl.getOne);
reportesRouter.post('/',
  requireRole('admin', 'gov'),
  body('id_analisis').isInt().withMessage('id_analisis requerido'),
  body('tipo').notEmpty().withMessage('tipo requerido'),
  validate,
  repCtrl.create
);

module.exports.reportesRouter = reportesRouter;


// ─── bitacoras.js ────────────────────────────────────────────
const bitacorasRouter = require('express').Router();
const bitCtrl  = require('../controllers/bitacorasController');
const { authenticate: auth3, requireRole: rr3 } = require('../middleware/auth');

bitacorasRouter.use(auth3);
bitacorasRouter.get('/', rr3('admin'), bitCtrl.getAll);

module.exports.bitacorasRouter = bitacorasRouter;


// ─── dashboard.js ────────────────────────────────────────────
const dashRouter = require('express').Router();
const dashCtrl = require('../controllers/dashboardController');
const { authenticate: auth4 } = require('../middleware/auth');

dashRouter.get('/',        auth4, dashCtrl.getDashboard);
dashRouter.get('/niveles', dashCtrl.getNiveles);   // público

module.exports.dashRouter = dashRouter;
