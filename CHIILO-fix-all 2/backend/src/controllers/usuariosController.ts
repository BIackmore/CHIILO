import { query } from "@/db";
import { audit } from "@/services";
import { Request, Response, NextFunction } from "express";

/** GET /api/usuarios  – lista todos los usuarios (sin admin) */
const getAll = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.activo, u.telefono,
              u.fecha_registro, u.perfil, LOWER(r.nombre) AS rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE LOWER(r.nombre) <> 'admin'
       ORDER BY u.fecha_registro DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/** GET /api/usuarios/:id */
const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.activo, u.telefono,
              u.fecha_registro, u.perfil, LOWER(r.nombre) AS rol
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [req.params.id]
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ ok: false, error: "Usuario no encontrado" });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/usuarios/:id/estado  – activar/desactivar */
const toggleEstado = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const { rows: before } = await query(
      "SELECT activo, correo, nombre FROM usuarios WHERE id_usuario=$1",
      [id]
    );
    if (!before.length)
      return res
        .status(404)
        .json({ ok: false, error: "Usuario no encontrado" });

    const nuevo = !before[0].activo;
    await query("UPDATE usuarios SET activo=$1 WHERE id_usuario=$2", [
      nuevo,
      id
    ]);

    await audit({
      tabla: "usuarios",
      operacion: "UPDATE",
      registroId: id as string,
      cambiadoPor: req.user.correo,
      descripcion: `${nuevo ? "Activó" : "Desactivó"} usuario ${before[0].correo}`,
      datosAntes: { activo: before[0].activo },
      datosDespues: { activo: nuevo }
    });

    res.json({ ok: true, activo: nuevo });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/usuarios/:id */
const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      "SELECT correo, nombre FROM usuarios WHERE id_usuario=$1",
      [id]
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ ok: false, error: "Usuario no encontrado" });

    await query("DELETE FROM usuarios WHERE id_usuario=$1", [id]);

    await audit({
      tabla: "usuarios",
      operacion: "DELETE",
      registroId: id as string,
      cambiadoPor: req.user.correo,
      descripcion: `Eliminó usuario ${rows[0].correo}`,
      datosAntes: rows[0]
    });

    res.json({ ok: true, message: "Usuario eliminado" });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/usuarios/:id/perfil  – actualizar datos de perfil propio */
const updatePerfil = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Solo el propio usuario o admin puede editar
    if (
      req.user.id_usuario !== parseInt(id as string) &&
      req.user.rol !== "admin"
    ) {
      return res
        .status(403)
        .json({ ok: false, error: "Sin permisos para editar este perfil" });
    }

    const { nombre, telefono, perfil } = req.body;
    const { rows } = await query(
      `UPDATE usuarios
       SET nombre=$1, telefono=$2, perfil=COALESCE($3::jsonb, perfil)
       WHERE id_usuario=$4
       RETURNING id_usuario, nombre, correo, telefono, perfil`,
      [nombre, telefono || null, perfil ? JSON.stringify(perfil) : null, id]
    );

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/** GET /api/usuarios/stats  – contadores para panel admin */
const getStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE LOWER(r.nombre)='gov')      AS total_gov,
         COUNT(*) FILTER (WHERE LOWER(r.nombre)='user')     AS total_users,
         COUNT(*) FILTER (WHERE u.activo = TRUE)            AS activos,
         COUNT(*) FILTER (WHERE u.activo = FALSE)           AS inactivos
        FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
        WHERE LOWER(r.nombre) <> 'admin'`
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

export default {
  getAll,
  getOne,
  toggleEstado,
  deleteUser,
  updatePerfil,
  getStats
};
