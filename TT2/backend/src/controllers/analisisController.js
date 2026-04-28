const { query } = require('../config/db');

/** GET /api/analisis  – listado con filtros de rol */
const getAll = async (req, res, next) => {
  try {
    const { nivel, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const restriccion = req.user.rol === 'user'
      ? `AND i.id_usuario = ${req.user.id_usuario}` : '';

    const filtros = [];
    const params  = [];
    let   pi      = 1;

    if (nivel) { filtros.push(`nr.clave = $${pi++}`); params.push(nivel); }

    const where = filtros.length ? 'AND ' + filtros.join(' AND ') : '';

    const { rows } = await query(
      `SELECT
         a.id_analisis,
         i.nombre_archivo    AS imagen,
         u.nombre            AS usuario,
         nr.clave            AS nivel_riesgo,
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
       WHERE 1=1 ${restriccion} ${where}
       ORDER BY a.fecha_analisis DESC
       LIMIT $${pi} OFFSET $${pi+1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ ok: true, data: rows, page: parseInt(page) });
  } catch (err) { next(err); }
};

/** GET /api/analisis/:id */
const getOne = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, i.nombre_archivo, i.ruta_archivo,
              u.nombre AS usuario, nr.clave AS nivel_riesgo, nr.color_hex
       FROM analisis a
       JOIN imagenes i ON i.id_imagen = a.id_imagen
       JOIN usuarios u ON u.id_usuario = i.id_usuario
       JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
       WHERE a.id_analisis = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Análisis no encontrado' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) { next(err); }
};

/** GET /api/analisis/stats  – métricas para panel admin/gov */
const getStats = async (req, res, next) => {
  try {
    const restriccion = req.user.rol === 'user'
      ? `AND i.id_usuario = ${req.user.id_usuario}` : '';

    const { rows } = await query(
      `SELECT
         COUNT(*)                                              AS total_analisis,
         COUNT(*) FILTER (WHERE nr.clave='alto')              AS total_alto,
         COUNT(*) FILTER (WHERE nr.clave='medio')             AS total_medio,
         COUNT(*) FILTER (WHERE nr.clave='bajo')              AS total_bajo,
         ROUND(AVG(a.umbral_confianza)*100, 1)                AS precision_promedio,
         MAX(a.fecha_analisis)                                 AS ultima_actualizacion
       FROM analisis a
       JOIN imagenes i ON i.id_imagen = a.id_imagen
       JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
       WHERE 1=1 ${restriccion}`
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, getStats };
