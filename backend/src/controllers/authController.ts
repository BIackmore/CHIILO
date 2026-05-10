import bcrypt from "bcryptjs";
import { query } from "@/db";
import { RefreshTokenBody, User } from "@/types";
import { audit, issueAuthTokens, verifyRefreshToken } from "@/services";
import { Request, Response, NextFunction } from "express";

type UserWithRole = User & {
  activo?: boolean;
  contrasena?: string;
  perfil?: unknown;
  telefono?: string | null;
  rol_nombre?: string;
};

const getUserForToken = (user: UserWithRole) => {
  const tokenUser: {
    id_usuario: number;
    correo: string;
    nombre: string;
    rol?: string;
    rol_nombre?: string;
  } = {
    id_usuario: user.id_usuario,
    correo: user.correo,
    nombre: user.nombre
  };

  if (user.rol) tokenUser.rol = user.rol;
  if (user.rol_nombre) tokenUser.rol_nombre = user.rol_nombre;

  return tokenUser;
};

const getResponseUser = (user: UserWithRole) => ({
  id_usuario: user.id_usuario,
  nombre: user.nombre,
  correo: user.correo,
  rol: user.rol_nombre || user.rol,
  activo: user.activo,
  telefono: user.telefono,
  perfil: user.perfil
});

const getUserById = async (id_usuario: number) => {
  const { rows } = await query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.activo, u.telefono,
            u.perfil, LOWER(r.nombre) AS rol_nombre
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = $1`,
    [id_usuario]
  );

  return rows[0] as UserWithRole | undefined;
};

/** POST /api/auth/login */
const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { correo, password } = req.body;

    const { rows } = await query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.contrasena, u.activo,
              u.perfil, u.telefono, LOWER(r.nombre) AS rol_nombre
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE LOWER(u.correo) = LOWER($1)`,
      [correo]
    );

    if (!rows.length) {
      return res
        .status(401)
        .json({ ok: false, error: "Correo o contraseña incorrectos" });
    }

    const user = rows[0];

    if (!user.activo) {
      return res.status(403).json({
        ok: false,
        error: "Tu cuenta está desactivada. Contacta al administrador."
      });
    }

    const match = await bcrypt.compare(password, user.contrasena);
    if (!match) {
      return res
        .status(401)
        .json({ ok: false, error: "Correo o contraseña incorrectos" });
    }

    const tokens = issueAuthTokens(getUserForToken(user));

    await audit({
      tabla: "usuarios",
      operacion: "SELECT",
      registroId: user.id_usuario,
      cambiadoPor: user.correo,
      descripcion: "Inició sesión",
      datosDespues: { accion: "login", ip: req.ip as string }
    });

    res.json({
      ok: true,
      token: tokens.accessToken,
      ...tokens,
      user: getResponseUser(user)
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/register  (usuario común = rol 'user') */
const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, correo, password } = req.body;

    const exists = await query(
      "SELECT 1 FROM usuarios WHERE LOWER(correo)=LOWER($1)",
      [correo]
    );
    if (exists.rows.length) {
      return res
        .status(409)
        .json({ ok: false, error: "Ya existe una cuenta con ese correo" });
    }

    const hash = await bcrypt.hash(password, 12);
    const hoy = new Date().toLocaleDateString("es-MX");

    const { rows } = await query(
      `INSERT INTO usuarios (nombre, correo, contrasena, id_rol, perfil)
       VALUES ($1, $2, $3, (SELECT id_rol FROM roles WHERE LOWER(nombre)='user'), $4)
       RETURNING id_usuario, nombre, correo`,
      [
        nombre,
        correo.toLowerCase(),
        hash,
        JSON.stringify({ estado: "activo", fechaCreacion: hoy })
      ]
    );

    const user = rows[0];
    const full = { ...user, rol_nombre: "user", rol: "user" };
    const tokens = issueAuthTokens(getUserForToken(full));

    await audit({
      tabla: "usuarios",
      operacion: "INSERT",
      registroId: user.id_usuario,
      cambiadoPor: correo,
      descripcion: "Registro de usuario común"
    });

    res.status(201).json({
      ok: true,
      token: tokens.accessToken,
      ...tokens,
      user: { ...user, rol: "user" }
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/register-gov  (usuario gubernamental – solo admin puede crear) */
const registerGov = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nombre,
      correo,
      password,
      organizacion,
      numTrabajador,
      dependencia,
      cargo,
      telefono
    } = req.body;

    // Verificar correo
    const existCorreo = await query(
      "SELECT 1 FROM usuarios WHERE LOWER(correo)=LOWER($1)",
      [correo]
    );
    if (existCorreo.rows.length) {
      return res
        .status(409)
        .json({ ok: false, error: "Ya existe una cuenta con ese correo" });
    }

    // Verificar numTrabajador (guardado en perfil JSONB)
    const existNum = await query(
      `SELECT 1 FROM usuarios WHERE perfil->>'numTrabajador' = $1`,
      [numTrabajador]
    );
    if (existNum.rows.length) {
      return res.status(409).json({
        ok: false,
        error: "El número de trabajador ya está registrado"
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const hoy = new Date().toLocaleDateString("es-MX");
    const perfil = {
      organizacion,
      numTrabajador,
      dependencia,
      cargo,
      estado: "activo",
      fechaCreacion: hoy
    };

    const { rows } = await query(
      `INSERT INTO usuarios (nombre, correo, contrasena, id_rol, telefono, perfil)
       VALUES ($1,$2,$3,(SELECT id_rol FROM roles WHERE LOWER(nombre)='gov'),$4,$5)
       RETURNING id_usuario, nombre, correo`,
      [
        nombre,
        correo.toLowerCase(),
        hash,
        telefono || null,
        JSON.stringify(perfil)
      ]
    );

    await audit({
      tabla: "usuarios",
      operacion: "INSERT",
      registroId: rows[0].id_usuario,
      cambiadoPor: req.user.correo,
      descripcion: "Admin registró usuario gubernamental"
    });

    res.status(201).json({ ok: true, user: { ...rows[0], rol: "gov" } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/auth/me */
const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserById(req.user.id_usuario);
    if (!user)
      return res
        .status(404)
        .json({ ok: false, error: "Usuario no encontrado" });
    res.json({ ok: true, user: getResponseUser(user) });
  } catch (err) {
    next(err);
  }
};

const refresh = async (
  req: Request<{}, {}, RefreshTokenBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (_err) {
      return res
        .status(401)
        .json({ ok: false, error: "Refresh token inválido o expirado" });
    }

    const user = await getUserById(payload.id_usuario);

    if (!user) {
      return res
        .status(404)
        .json({ ok: false, error: "Usuario no encontrado" });
    }

    if (user.activo === false) {
      return res.status(403).json({
        ok: false,
        error: "Tu cuenta está desactivada. Contacta al administrador."
      });
    }

    const tokens = issueAuthTokens(getUserForToken(user));

    await audit({
      tabla: "usuarios",
      operacion: "SELECT",
      registroId: user.id_usuario,
      cambiadoPor: user.correo,
      descripcion: "Renovó sesión",
      datosDespues: { accion: "refresh", ip: req.ip as string }
    });

    res.json({ ok: true, token: tokens.accessToken, ...tokens });
  } catch (err) {
    next(err);
  }
};

export default { login, register, registerGov, me, refresh };
