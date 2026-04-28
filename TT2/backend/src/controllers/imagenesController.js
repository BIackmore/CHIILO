const path   = require('path');
const fs     = require('fs');
const sharp  = require('sharp');
const { query }       = require('../config/db');
const { audit }       = require('../services/auditService');
const { analyzeImage} = require('../services/iaService');
const { UPLOAD_DIR }  = require('../middleware/upload');

/** POST /api/imagenes/upload  – sube imagen y lanza análisis IA */
const uploadAndAnalyze = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No se recibió ninguna imagen' });

    const file = req.file;
    const userId = req.user.id_usuario;

    // Leer metadatos con sharp
    let width = null, height = null;
    try {
      const meta = await sharp(file.path).metadata();
      width  = meta.width;
      height = meta.height;
    } catch (_) { /* sharp no pudo leer – seguimos igual */ }

    const ext = path.extname(file.originalname).toLowerCase().slice(1);

    // Guardar registro de imagen
    const { rows: imgRows } = await query(
      `INSERT INTO imagenes
         (nombre_archivo, ruta_archivo, formato, id_usuario, resolucion_width, resolucion_height, tamano_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [file.originalname, file.path, ext, userId, width, height, file.size]
    );
    const imagen = imgRows[0];

    await audit({ tabla: 'imagenes', operacion: 'INSERT', registroId: imagen.id_imagen, cambiadoPor: req.user.correo, descripcion: 'Subió imagen para análisis' });

    // Correr análisis IA
    const iaResult = await analyzeImage(file.path);

    // Obtener id del nivel de riesgo
    const { rows: nivelRows } = await query(
      'SELECT id_riesgo FROM niveles_riesgo WHERE clave=$1', [iaResult.nivel]
    );
    const id_riesgo = nivelRows[0]?.id_riesgo;

    // Guardar análisis
    const { rows: analRows } = await query(
      `INSERT INTO analisis
         (id_imagen, id_riesgo, porcentaje_afectacion, resultado_json, zonas_detectadas, umbral_confianza, modelo_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        imagen.id_imagen, id_riesgo, iaResult.porcentaje_afectacion,
        JSON.stringify(iaResult.resultado_json),
        iaResult.areas.join(', '),
        iaResult.confianza,
        iaResult.modelo_version,
      ]
    );

    await audit({ tabla: 'analisis', operacion: 'INSERT', registroId: analRows[0].id_analisis, cambiadoPor: req.user.correo, descripcion: 'Análisis IA completado' });

    res.status(201).json({
      ok: true,
      imagen: {
        id_imagen:    imagen.id_imagen,
        uuid:         imagen.uuid,
        nombre:       imagen.nombre_archivo,
        resolucion:   width && height ? `${width}x${height}` : null,
        tamano:       `${(file.size / 1048576).toFixed(1)} MB`,
        fecha:        imagen.fecha_carga,
      },
      analisis: {
        id_analisis:  analRows[0].id_analisis,
        nivel:        iaResult.nivel,
        confianza:    Math.round(iaResult.confianza * 100),
        zona:         iaResult.resultado_json.zona,
        temp:         iaResult.resultado_json.temp,
        humedad:      iaResult.resultado_json.humedad,
        viento:       iaResult.resultado_json.viento,
        areas:        iaResult.areas,
        porcentaje_afectacion: iaResult.porcentaje_afectacion,
      },
    });
  } catch (err) { next(err); }
};

/** GET /api/imagenes  – listado con filtros */
const getAll = async (req, res, next) => {
  try {
    const { zona, nivel, usuario, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Si el usuario no es admin/gov, solo ve sus propias imágenes
    const restriccion = req.user.rol === 'user'
      ? `AND i.id_usuario = ${req.user.id_usuario}`
      : '';

    const filtros   = [];
    const params    = [];
    let   paramIdx  = 1;

    if (zona) {
      filtros.push(`a.resultado_json->>'zona' ILIKE $${paramIdx++}`);
      params.push(`%${zona}%`);
    }
    if (nivel) {
      filtros.push(`nr.clave = $${paramIdx++}`);
      params.push(nivel);
    }
    if (usuario && req.user.rol === 'admin') {
      filtros.push(`u.nombre ILIKE $${paramIdx++}`);
      params.push(`%${usuario}%`);
    }

    const where = filtros.length ? 'AND ' + filtros.join(' AND ') : '';

    const { rows } = await query(
      `SELECT
         i.id_imagen, i.uuid,
         i.nombre_archivo                                           AS nombre,
         u.nombre                                                   AS usuario,
         a.resultado_json->>'zona'                                  AS zona,
         nr.clave                                                   AS nivel_riesgo,
         nr.color_hex,
         ROUND((a.umbral_confianza*100)::numeric)                   AS confianza,
         i.resolucion_width || 'x' || i.resolucion_height          AS resolucion,
         ROUND((i.tamano_bytes/1048576.0)::numeric,1) || ' MB'     AS tamano,
         TO_CHAR(i.fecha_carga,'DD/MM/YYYY')                       AS fecha,
         a.id_analisis
       FROM imagenes i
       JOIN usuarios u         ON u.id_usuario = i.id_usuario
       LEFT JOIN analisis a    ON a.id_imagen  = i.id_imagen
       LEFT JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
       WHERE 1=1 ${restriccion} ${where}
       ORDER BY i.fecha_carga DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM imagenes i
       JOIN usuarios u ON u.id_usuario = i.id_usuario
       LEFT JOIN analisis a ON a.id_imagen = i.id_imagen
       LEFT JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
       WHERE 1=1 ${restriccion} ${where}`,
      params
    );

    res.json({ ok: true, data: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

/** GET /api/imagenes/:id – detalle completo con análisis */
const getOne = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT i.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo,
              a.id_analisis, a.porcentaje_afectacion, a.resultado_json,
              a.zonas_detectadas, a.umbral_confianza, a.modelo_version, a.fecha_analisis,
              nr.clave AS nivel_riesgo, nr.descripcion AS nivel_desc, nr.color_hex
       FROM imagenes i
       JOIN usuarios u ON u.id_usuario = i.id_usuario
       LEFT JOIN analisis a ON a.id_imagen = i.id_imagen
       LEFT JOIN niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
       WHERE i.id_imagen = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Imagen no encontrada' });

    // Verificar acceso
    const img = rows[0];
    if (req.user.rol === 'user' && img.id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ ok: false, error: 'Sin acceso a esta imagen' });
    }

    res.json({ ok: true, data: img });
  } catch (err) { next(err); }
};

/** DELETE /api/imagenes/:id */
const deleteImage = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM imagenes WHERE id_imagen=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Imagen no encontrada' });

    const img = rows[0];
    if (req.user.rol === 'user' && img.id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ ok: false, error: 'Sin acceso' });
    }

    // Eliminar archivo físico
    try { fs.unlinkSync(img.ruta_archivo); } catch (_) {}

    await query('DELETE FROM imagenes WHERE id_imagen=$1', [req.params.id]);

    await audit({ tabla: 'imagenes', operacion: 'DELETE', registroId: img.id_imagen, cambiadoPor: req.user.correo, descripcion: 'Eliminó imagen', datosAntes: img });

    res.json({ ok: true, message: 'Imagen eliminada' });
  } catch (err) { next(err); }
};

/** GET /api/imagenes/:id/file – servir el archivo de imagen */
const serveFile = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT ruta_archivo, id_usuario FROM imagenes WHERE id_imagen=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Imagen no encontrada' });

    const img = rows[0];
    if (req.user.rol === 'user' && img.id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ ok: false, error: 'Sin acceso' });
    }

    if (!fs.existsSync(img.ruta_archivo)) {
      return res.status(404).json({ ok: false, error: 'Archivo no encontrado en disco' });
    }

    res.sendFile(path.resolve(img.ruta_archivo));
  } catch (err) { next(err); }
};

module.exports = { uploadAndAnalyze, getAll, getOne, deleteImage, serveFile };
