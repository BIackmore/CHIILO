require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes     = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const imagenesRoutes = require('./routes/imagenes');
const { analisisRouter, reportesRouter, bitacorasRouter, dashRouter } = require('./routes/misc');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Static – archivos subidos ─────────────────────────────────
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'incendios-api', ts: new Date().toISOString() })
);

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/usuarios',  usuariosRoutes);
app.use('/api/imagenes',  imagenesRoutes);
app.use('/api/analisis',  analisisRouter);
app.use('/api/reportes',  reportesRouter);
app.use('/api/bitacoras', bitacorasRouter);
app.use('/api/dashboard', dashRouter);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ ok: false, error: 'Ruta no encontrada' }));

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Iniciar servidor ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔥 Incendios API corriendo en http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB:  ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}\n`);
});

module.exports = app;
