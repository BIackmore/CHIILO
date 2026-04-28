const { query } = require('../config/db');
const { audit } = require('../services/auditService');

/** GET /api/reportes */
const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // gov solo ve sus propios reportes; admin los ve todos
    const restriccion = req.user.rol === 'gov'
      ? `AND r.id_usuario = ${req.user.id_usuario}` : '';

    const { rows } = await query(
      `SELECT
         r.id_reporte,
         r.tipo,
         r.contenido_summary,
         r.parametros->>'zona'       AS ubicacion,
         r.parametros->>'severidad'  AS severidad,
         r.parametros->>'estado'     AS estado,
         u.nombre                    AS usuario,
         nr.clave                    AS nivel_riesgo,
         nr.color_hex,
         TO_CHAR(r.fecha_generacion,'DD/MM/YYYY HH24:MI') AS fecha
       FROM reportes r
       JOIN usuarios u         ON u.id_usuario = r.id_usuario
       JOIN analisis a         ON a.id_analisis = r.id_analisis
       JOIN niveles_riesgo nr  ON nr.id_riesgo  = a.id_riesgo
       WHERE 1=1 ${restriccion}
       ORDER BY r.fecha_generacion DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    res.json({ ok: true, data: rows });
  } catch (err) { next(err); }
};

/** POST /api/reportes */
const create = async (req, res, next) => {
  try {
    const { id_analisis, tipo, contenido_summary, parametros } = req.body;

    // Verificar que el análisis existe
    const { rows: anal } = await query('SELECT id_analisis FROM analisis WHERE id_analisis=$1', [id_analisis]);
    if (!anal.length) return res.status(404).json({ ok: false, error: 'Análisis no encontrado' });

    const { rows } = await query(
      `INSERT INTO reportes (id_analisis, id_usuario, tipo, contenido_summary, parametros)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [id_analisis, req.user.id_usuario, tipo, contenido_summary || null, JSON.stringify(parametros || {})]
    );

    await audit({ tabla: 'reportes', operacion: 'INSERT', registroId: rows[0].id_reporte, cambiadoPor: req.user.correo, descripcion: `Generó reporte tipo: ${tipo}` });

    res.status(201).json({ ok: true, data: rows[0] });
  } catch (err) { next(err); }
};

/** GET /api/reportes/:id */
const getOne = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.*, u.nombre AS usuario, u.correo,
              nr.clave AS nivel_riesgo, nr.color_hex,
              a.umbral_confianza, a.resultado_json
       FROM reportes r
       JOIN usuarios u        ON u.id_usuario = r.id_usuario
       JOIN analisis a        ON a.id_analisis = r.id_analisis
       JOIN niveles_riesgo nr ON nr.id_riesgo  = a.id_riesgo
       WHERE r.id_reporte = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Reporte no encontrado' });

    const rep = rows[0];
    if (req.user.rol === 'gov' && rep.id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ ok: false, error: 'Sin acceso a este reporte' });
    }

    res.json({ ok: true, data: rep });
  } catch (err) { next(err); }
};

/** GET /api/reportes/stats */
const getStats = async (req, res, next) => {
  try {
    const restriccion = req.user.rol === 'gov' ? `AND r.id_usuario=${req.user.id_usuario}` : '';

    const { rows } = await query(
      `SELECT
         COUNT(*)                                                     AS total,
         COUNT(*) FILTER (WHERE nr.clave='alto')                     AS alta,
         COUNT(*) FILTER (WHERE nr.clave='medio')                    AS media,
         COUNT(*) FILTER (WHERE nr.clave='bajo')                     AS baja,
         COUNT(*) FILTER (WHERE r.parametros->>'estado'='En Proceso') AS en_proceso
       FROM reportes r
       JOIN analisis a        ON a.id_analisis = r.id_analisis
       JOIN niveles_riesgo nr ON nr.id_riesgo  = a.id_riesgo
       WHERE 1=1 ${restriccion}`
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, getOne, getStats };
