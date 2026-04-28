const { validationResult } = require('express-validator');

/** Manejo centralizado de errores */
const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.code === '23505') {
    return res.status(409).json({ ok: false, error: 'Ya existe un registro con ese valor único' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ ok: false, error: 'Referencia a registro inexistente' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'Archivo demasiado grande' });
  }

  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || 'Error interno del servidor' });
};

/** Valida los campos con express-validator y responde 422 si hay errores */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ ok: false, errors: errors.array() });
  }
  next();
};

module.exports = { errorHandler, validate };
