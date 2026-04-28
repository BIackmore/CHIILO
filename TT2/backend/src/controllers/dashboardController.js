const { query } = require('../config/db');

/** GET /api/dashboard  – métricas generales para el dashboard público/usuario */
const getDashboard = async (req, res, next) => {
  try {
    const [analisis, imagenes, zonas] = await Promise.all([
      query(
        `SELECT
           COUNT(*)                                      AS total_analisis,
           COUNT(*) FILTER (WHERE nr.clave='alto')      AS incendios_activos,
           COUNT(*) FILTER (WHERE nr.clave='medio')     AS alertas_criticas,
           COUNT(*) FILTER (WHERE nr.clave='bajo')      AS zonas_controladas,
           ROUND(AVG(a.umbral_confianza)*100,1)         AS precision_promedio,
           ROUND(AVG(a.porcentaje_afectacion)::numeric,1) AS area_prom
         FROM analisis a
         JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo`
      ),
      query(`SELECT COUNT(*) AS total_imagenes FROM imagenes`),
      query(
        `SELECT DISTINCT a.resultado_json->>'zona' AS zona, nr.clave AS nivel, nr.color_hex
         FROM analisis a
         JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
         WHERE a.resultado_json->>'zona' IS NOT NULL
         ORDER BY zona`
      ),
    ]);

    const stats = analisis.rows[0];

    res.json({
      ok: true,
      data: {
        incendios_activos:  parseInt(stats.incendios_activos)  || 0,
        alertas_criticas:   parseInt(stats.alertas_criticas)   || 0,
        zonas_controladas:  parseInt(stats.zonas_controladas)  || 0,
        area_afectada:      `${stats.area_prom || 0} ha`,
        total_imagenes:     parseInt(imagenes.rows[0].total_imagenes),
        total_analisis:     parseInt(stats.total_analisis),
        precision_promedio: `${stats.precision_promedio || 0}%`,
        zonas:              zonas.rows,
      },
    });
  } catch (err) { next(err); }
};

/** GET /api/dashboard/niveles  – lista de niveles de riesgo */
const getNiveles = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM niveles_riesgo ORDER BY prioridad');
    res.json({ ok: true, data: rows });
  } catch (err) { next(err); }
};

module.exports = { getDashboard, getNiveles };
