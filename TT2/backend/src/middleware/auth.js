const jwt = require('jsonwebtoken');

/**
 * Verifica el token JWT en el header Authorization: Bearer <token>
 */
const authenticate = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token requerido' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id_usuario, correo, rol, nombre }
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
};

/**
 * Restringe acceso a roles específicos.
 * Uso: requireRole('admin') o requireRole('admin', 'gov')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ ok: false, error: 'No autenticado' });
  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({ ok: false, error: 'Acceso denegado para tu rol' });
  }
  next();
};

module.exports = { authenticate, requireRole };
