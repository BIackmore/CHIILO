const router = require('express').Router();
const ctrl   = require('../controllers/imagenesController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(authenticate);

// POST /api/imagenes/upload
router.post('/upload', upload.single('imagen'), ctrl.uploadAndAnalyze);

// GET /api/imagenes
router.get('/', ctrl.getAll);

// GET /api/imagenes/:id
router.get('/:id', ctrl.getOne);

// GET /api/imagenes/:id/file  – sirve el archivo binario
router.get('/:id/file', ctrl.serveFile);

// DELETE /api/imagenes/:id
router.delete('/:id', ctrl.deleteImage);

module.exports = router;
