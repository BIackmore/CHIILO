import { query } from "@/db";
import { BitacorasGetAllQuery } from "@/types";
import { Request, Response, NextFunction } from "express";

/** GET /api/bitacoras  – solo admin */
const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tabla,
      page = "1",
      limit = "30"
    } = req.query as BitacorasGetAllQuery;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = "";

    if (tabla) {
      where = "WHERE tabla_nombre=$1";
      params.push(tabla);
    }

    const { rows } = await query(
      `SELECT id_log, tabla_nombre, operacion, registro_id, cambiado_por,
              TO_CHAR(fecha,'DD/MM/YYYY HH24:MI') AS fecha,
              descripcion, datos_antes, datos_despues
       FROM bitacoras ${where}
       ORDER BY fecha DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export default { getAll };
