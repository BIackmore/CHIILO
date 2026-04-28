const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');
const { audit } = require('../services/auditService');

const signToken = (user) =>
  jwt.sign(
    { id_usuario: user.id_usuario, correo: user.correo, rol: user.rol_nombre, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

/** POST /api/auth/login */
const login = async (req, res, next) => {
  try {
    const { correo, password } = req.body;

    const { rows } = await query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.contrasena, u.activo,
              u.perfil, u.telefono, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE LOWER(u.correo) = LOWER($1)`,
      [correo]
    );

    if (!rows.length) {
      return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos' });
    }

    const user = rows[0];

    if (!user.activo) {
      return res.status(403).json({ ok: false, error: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    const match = await bcrypt.compare(password, user.contrasena);
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos' });
    }

    const token = signToken(user);

    await audit({
      tabla: 'usuarios', operacion: 'SELECT',
      registroId: user.id_usuario, cambiadoPor: user.correo,
      descripcion: 'Inició sesión',
      datosDespues: { accion: 'login', ip: req.ip },
    });

    res.json({
      ok: true,
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre:     user.nombre,
        correo:     user.correo,
        rol:        user.rol_nombre,
        activo:     user.activo,
        telefono:   user.telefono,
        perfil:     user.perfil,
      },
    });
  } catch (err) { next(err); }
};

/** POST /api/auth/register  (usuario común = rol 'user') */
const register = async (req, res, next) => {
  try {
    const { nombre, correo, password } = req.body;

    const exists = await query('SELECT 1 FROM usuarios WHERE LOWER(correo)=LOWER($1)', [correo]);
    if (exists.rows.length) {
      return res.status(409).json({ ok: false, error: 'Ya existe una cuenta con ese correo' });
    }

    const hash = await bcrypt.hash(password, 12);
    const hoy  = new Date().toLocaleDateString('es-MX');

    const { rows } = await query(
      `INSERT INTO usuarios (nombre, correo, contrasena, id_rol, perfil)
       VALUES ($1, $2, $3, (SELECT id_rol FROM roles WHERE nombre='user'), $4)
       RETURNING id_usuario, nombre, correo`,
      [nombre, correo.toLowerCase(), hash, JSON.stringify({ estado: 'activo', fechaCreacion: hoy })]
    );

    const user = rows[0];
    const full = { ...user, rol_nombre: 'user' };
    const token = signToken({ ...full, rol_nombre: 'user' });

    await audit({ tabla: 'usuarios', operacion: 'INSERT', registroId: user.id_usuario, cambiadoPor: correo, descripcion: 'Registro de usuario común' });

    res.status(201).json({ ok: true, token, user: { ...user, rol: 'user' } });
  } catch (err) { next(err); }
};

/** POST /api/auth/register-gov  (usuario gubernamental – solo admin puede crear) */
const registerGov = async (req, res, next) => {
  try {
    const { nombre, correo, password, organizacion, numTrabajador, dependencia, cargo, telefono } = req.body;

    // Verificar correo
    const existCorreo = await query('SELECT 1 FROM usuarios WHERE LOWER(correo)=LOWER($1)', [correo]);
    if (existCorreo.rows.length) {
      return res.status(409).json({ ok: false, error: 'Ya existe una cuenta con ese correo' });
    }

    // Verificar numTrabajador (guardado en perfil JSONB)
    const existNum = await query(
      `SELECT 1 FROM usuarios WHERE perfil->>'numTrabajador' = $1`, [numTrabajador]
    );
    if (existNum.rows.length) {
      return res.status(409).json({ ok: false, error: 'El número de trabajador ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 12);
    const hoy  = new Date().toLocaleDateString('es-MX');
    const perfil = { organizacion, numTrabajador, dependencia, cargo, estado: 'activo', fechaCreacion: hoy };

    const { rows } = await query(
      `INSERT INTO usuarios (nombre, correo, contrasena, id_rol, telefono, perfil)
       VALUES ($1,$2,$3,(SELECT id_rol FROM roles WHERE nombre='gov'),$4,$5)
       RETURNING id_usuario, nombre, correo`,
      [nombre, correo.toLowerCase(), hash, telefono || null, JSON.stringify(perfil)]
    );

    await audit({ tabla: 'usuarios', operacion: 'INSERT', registroId: rows[0].id_usuario, cambiadoPor: req.user.correo, descripcion: 'Admin registró usuario gubernamental' });

    res.status(201).json({ ok: true, user: { ...rows[0], rol: 'gov' } });
  } catch (err) { next(err); }
};

/** GET /api/auth/me */
const me = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.activo, u.telefono,
              u.perfil, u.fecha_registro, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [req.user.id_usuario]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, user: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { login, register, registerGov, me };
