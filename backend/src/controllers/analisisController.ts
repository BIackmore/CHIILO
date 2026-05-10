import { query } from "@/db";
import { AnalisisGetAllQuery } from "@/types";
import { Request, Response, NextFunction } from "express";

/** GET /api/analisis  – listado con filtros de rol */
const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nivel,
      page = "1",
      limit = "20"
    } = req.query as AnalisisGetAllQuery;
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const filtros: string[] = [];
    const params: Array<string | number> = [];
    let pi = 1;

    if (req.user.rol === "user") {
      filtros.push(`i.id_usuario = $${pi++}`);
      params.push(req.user.id_usuario);
    }

    if (nivel) {
      filtros.push(`LOWER(nr.clave) = LOWER($${pi++})`);
      params.push(nivel);
    }

    const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT
         a.id_analisis,
         i.nombre_archivo    AS imagen,
         u.nombre            AS usuario,
         LOWER(nr.clave)     AS nivel_riesgo,
         nr.color_hex,
         ROUND((a.umbral_confianza*100)::numeric) AS confianza,
         a.porcentaje_afectacion,
         a.zonas_detectadas,
         a.modelo_version,
         TO_CHAR(a.fecha_analisis,'DD/MM/YYYY HH24:MI') AS fecha
        FROM analisis a
        JOIN imagenes i ON i.id_imagen = a.id_imagen
        JOIN usuarios u ON u.id_usuario = i.id_usuario
        JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
        ${where}
        ORDER BY a.fecha_analisis DESC
        LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, limitNumber, offset]
    );

    res.json({ ok: true, data: rows, page: pageNumber });
  } catch (err) {
    next(err);
  }
};

/** GET /api/analisis/:id */
const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT a.*, i.nombre_archivo, i.ruta_archivo,
              u.nombre AS usuario, LOWER(nr.clave) AS nivel_riesgo, nr.color_hex
       FROM analisis a
       JOIN imagenes i ON i.id_imagen = a.id_imagen
       JOIN usuarios u ON u.id_usuario = i.id_usuario
       JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
       WHERE a.id_analisis = $1`,
      [req.params.id]
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ ok: false, error: "Análisis no encontrado" });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/** GET /api/analisis/stats  – métricas para panel admin/gov */
const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros: string[] = [];
    const params: number[] = [];

    if (req.user.rol === "user") {
      filtros.push(`i.id_usuario = $1`);
      params.push(req.user.id_usuario);
    }

    const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT
         COUNT(*)                                              AS total_analisis,
         COUNT(*) FILTER (WHERE LOWER(nr.clave)='alto')       AS total_alto,
         COUNT(*) FILTER (WHERE LOWER(nr.clave)='medio')      AS total_medio,
         COUNT(*) FILTER (WHERE LOWER(nr.clave)='bajo')       AS total_bajo,
         ROUND(AVG(a.umbral_confianza)*100, 1)                AS precision_promedio,
         MAX(a.fecha_analisis)                                 AS ultima_actualizacion
        FROM analisis a
        JOIN imagenes i ON i.id_imagen = a.id_imagen
        JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
        ${where}`,
      params
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

export default { getAll, getOne, getStats };
