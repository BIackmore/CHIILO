CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear y usar el schema tepozteco
CREATE SCHEMA IF NOT EXISTS tepozteco;
SET search_path = tepozteco, public;

-- =============================================================
-- 1. CATÁLOGOS / TABLAS DE REFERENCIA
-- =============================================================

-- 1.1 Roles del sistema
CREATE TABLE IF NOT EXISTS tepozteco.roles (
    id_rol      SERIAL       PRIMARY KEY,
    nombre      VARCHAR(30)  NOT NULL UNIQUE,          -- 'admin' | 'gov' | 'user'
    descripcion TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tepozteco.roles IS 'Catálogo de roles del sistema';
COMMENT ON COLUMN tepozteco.roles.nombre IS 'Valores: admin, gov, user (en minúsculas)';

-- 1.2 Niveles de riesgo de incendio
CREATE TABLE IF NOT EXISTS tepozteco.niveles_riesgo (
    id_riesgo   SERIAL       PRIMARY KEY,
    clave       VARCHAR(20)  NOT NULL UNIQUE,          -- 'alto' | 'medio' | 'bajo'
    descripcion TEXT,
    prioridad   SMALLINT     NOT NULL DEFAULT 99,      -- 1 = más urgente
    color_hex   CHAR(7)      NOT NULL DEFAULT '#CCCCCC',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tepozteco.niveles_riesgo IS 'Catálogo de niveles de riesgo detectados por IA';
COMMENT ON COLUMN tepozteco.niveles_riesgo.clave IS 'Clave en minúsculas: alto, medio, bajo';

-- =============================================================
-- 2. USUARIOS
-- =============================================================

CREATE TABLE IF NOT EXISTS tepozteco.usuarios (
    id_usuario      SERIAL          PRIMARY KEY,
    uuid            UUID            NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    nombre          VARCHAR(120)    NOT NULL,
    correo          VARCHAR(255)    NOT NULL UNIQUE,
    contrasena      VARCHAR(255)    NOT NULL,           -- bcrypt hash
    id_rol          INT             NOT NULL REFERENCES tepozteco.roles(id_rol),
    telefono        VARCHAR(20),
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    perfil          JSONB,
    -- Campos de auditoría de fila
    fecha_registro  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Geolocalización: ubicación base del usuario (PostGIS)
    ubicacion       GEOGRAPHY(Point, 4326)
);

COMMENT ON TABLE  tepozteco.usuarios IS 'Usuarios registrados. Roles: admin, gov, user';
COMMENT ON COLUMN tepozteco.usuarios.perfil IS
    'JSONB libre. Gov incluye: {organizacion, numTrabajador, dependencia, cargo, estado, fechaCreacion}. '
    'User incluye: {estado, fechaCreacion}';
COMMENT ON COLUMN tepozteco.usuarios.ubicacion IS 'Punto geográfico WGS-84 (PostGIS) – opcional';

-- Índices de usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_correo    ON tepozteco.usuarios (LOWER(correo));
CREATE INDEX IF NOT EXISTS idx_usuarios_id_rol    ON tepozteco.usuarios (id_rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo    ON tepozteco.usuarios (activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_ubicacion ON tepozteco.usuarios USING GIST (ubicacion);

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION tepozteco.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON tepozteco.usuarios;
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON tepozteco.usuarios
    FOR EACH ROW EXECUTE FUNCTION tepozteco.set_updated_at();

-- =============================================================
-- 3. IMÁGENES SUBIDAS
-- =============================================================

CREATE TABLE IF NOT EXISTS tepozteco.imagenes (
    id_imagen           SERIAL          PRIMARY KEY,
    uuid                UUID            NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    id_usuario          INT             NOT NULL REFERENCES tepozteco.usuarios(id_usuario) ON DELETE CASCADE,
    nombre_archivo      VARCHAR(255)    NOT NULL,
    ruta_archivo        TEXT            NOT NULL,
    formato             VARCHAR(10),                   -- jpg | png | tiff | webp
    resolucion_width    INT,
    resolucion_height   INT,
    tamano_bytes        BIGINT,
    -- Geolocalización de la imagen (dónde fue capturada)
    ubicacion_imagen    GEOGRAPHY(Point, 4326),
    -- Área geográfica del incendio detectado (polígono PostGIS)
    area_afectada       GEOGRAPHY(Polygon, 4326),
    fecha_carga         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tepozteco.imagenes IS 'Imágenes satelitales / aéreas subidas por usuarios';
COMMENT ON COLUMN tepozteco.imagenes.ubicacion_imagen IS 'Coordenada GPS del punto de captura (PostGIS)';
COMMENT ON COLUMN tepozteco.imagenes.area_afectada    IS 'Polígono del área detectada en la imagen (PostGIS)';

-- Índices de imágenes
CREATE INDEX IF NOT EXISTS idx_imagenes_id_usuario      ON tepozteco.imagenes (id_usuario);
CREATE INDEX IF NOT EXISTS idx_imagenes_fecha_carga     ON tepozteco.imagenes (fecha_carga DESC);
CREATE INDEX IF NOT EXISTS idx_imagenes_ubicacion       ON tepozteco.imagenes USING GIST (ubicacion_imagen);
CREATE INDEX IF NOT EXISTS idx_imagenes_area_afectada   ON tepozteco.imagenes USING GIST (area_afectada);

-- =============================================================
-- 4. ANÁLISIS IA
-- =============================================================

CREATE TABLE IF NOT EXISTS tepozteco.analisis (
    id_analisis             SERIAL          PRIMARY KEY,
    id_imagen               INT             NOT NULL UNIQUE REFERENCES tepozteco.imagenes(id_imagen) ON DELETE CASCADE,
    id_riesgo               INT             NOT NULL REFERENCES tepozteco.niveles_riesgo(id_riesgo),
    porcentaje_afectacion   NUMERIC(6,2),              -- 0.00 – 100.00
    umbral_confianza        NUMERIC(5,4),              -- 0.0000 – 1.0000
    modelo_version          VARCHAR(50),
    resultado_json          JSONB,                     -- respuesta completa del modelo IA
    zonas_detectadas        JSONB,                     -- lista de zonas individuales
    -- Punto central del incendio detectado (PostGIS)
    centroide_incendio      GEOGRAPHY(Point, 4326),
    fecha_analisis          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tepozteco.analisis IS 'Resultado del modelo IA por cada imagen procesada (1:1 con imagenes)';
COMMENT ON COLUMN tepozteco.analisis.resultado_json IS
    'Estructura esperada: {nivel, confianza, zona, temp, humedad, viento, areas[], porcentaje_afectacion, modelo_version}';
COMMENT ON COLUMN tepozteco.analisis.centroide_incendio IS 'Punto geográfico central del incendio detectado (PostGIS)';

-- Índices de análisis
CREATE INDEX IF NOT EXISTS idx_analisis_id_riesgo          ON tepozteco.analisis (id_riesgo);
CREATE INDEX IF NOT EXISTS idx_analisis_fecha              ON tepozteco.analisis (fecha_analisis DESC);
CREATE INDEX IF NOT EXISTS idx_analisis_centroide          ON tepozteco.analisis USING GIST (centroide_incendio);
CREATE INDEX IF NOT EXISTS idx_analisis_resultado_zona     ON tepozteco.analisis USING GIN  (resultado_json);

-- =============================================================
-- 5. REPORTES (generados por gov / admin)
-- =============================================================

CREATE TABLE IF NOT EXISTS tepozteco.reportes (
    id_reporte          SERIAL          PRIMARY KEY,
    id_analisis         INT             NOT NULL REFERENCES tepozteco.analisis(id_analisis),
    id_usuario          INT             NOT NULL REFERENCES tepozteco.usuarios(id_usuario),
    tipo                VARCHAR(100)    NOT NULL,       -- 'Detección de Incendio', etc.
    contenido_summary   TEXT,
    parametros          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    -- parametros esperados: {zona, severidad, estado, ...}
    fecha_generacion    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tepozteco.reportes IS 'Reportes oficiales generados por usuarios gov o admin';
COMMENT ON COLUMN tepozteco.reportes.parametros IS
    'JSONB libre. Campos comunes: {zona, severidad:"Alta|Media|Baja", estado:"En Proceso|Resuelto|Cancelado"}';

-- Índices de reportes
CREATE INDEX IF NOT EXISTS idx_reportes_id_analisis     ON tepozteco.reportes (id_analisis);
CREATE INDEX IF NOT EXISTS idx_reportes_id_usuario      ON tepozteco.reportes (id_usuario);
CREATE INDEX IF NOT EXISTS idx_reportes_fecha           ON tepozteco.reportes (fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_parametros      ON tepozteco.reportes USING GIN (parametros);

-- =============================================================
-- 6. BITÁCORA DE AUDITORÍA
-- =============================================================

CREATE TABLE IF NOT EXISTS tepozteco.bitacoras (
    id_log          BIGSERIAL       PRIMARY KEY,
    tabla_nombre    VARCHAR(50)     NOT NULL,           -- 'usuarios' | 'imagenes' | 'analisis' | 'reportes'
    operacion       VARCHAR(10)     NOT NULL            -- 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'
                    CHECK (operacion IN ('INSERT','UPDATE','DELETE','SELECT')),
    registro_id     VARCHAR(50),                        -- PK del registro afectado
    cambiado_por    VARCHAR(255),                       -- correo del usuario que ejecutó la acción
    descripcion     TEXT,
    datos_antes     JSONB,
    datos_despues   JSONB,
    id_reporte      INT REFERENCES tepozteco.reportes(id_reporte) ON DELETE SET NULL,
    ip_origen       INET,                               -- IP del cliente (opcional)
    fecha           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tepozteco.bitacoras IS 'Auditoría completa de todas las operaciones del sistema';
COMMENT ON COLUMN tepozteco.bitacoras.ip_origen IS 'IP del cliente – se puede capturar desde req.ip en Express';

-- Índices de bitácoras
CREATE INDEX IF NOT EXISTS idx_bitacoras_tabla      ON tepozteco.bitacoras (tabla_nombre);
CREATE INDEX IF NOT EXISTS idx_bitacoras_fecha      ON tepozteco.bitacoras (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_bitacoras_cambiado   ON tepozteco.bitacoras (cambiado_por);
CREATE INDEX IF NOT EXISTS idx_bitacoras_id_reporte ON tepozteco.bitacoras (id_reporte);

-- =============================================================
-- 7. SESIONES / REFRESH TOKENS
--    Permite invalidar tokens específicos sin blacklist en JWT
-- =============================================================

CREATE TABLE IF NOT EXISTS tepozteco.sesiones (
    id_sesion       BIGSERIAL       PRIMARY KEY,
    id_usuario      INT             NOT NULL REFERENCES tepozteco.usuarios(id_usuario) ON DELETE CASCADE,
    refresh_token   TEXT            NOT NULL UNIQUE,
    ip_origen       INET,
    user_agent      TEXT,
    activa          BOOLEAN         NOT NULL DEFAULT TRUE,
    creada_en       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    expira_en       TIMESTAMPTZ     NOT NULL,
    revocada_en     TIMESTAMPTZ
);

COMMENT ON TABLE tepozteco.sesiones IS 'Refresh tokens activos por usuario – permite revocación selectiva';

CREATE INDEX IF NOT EXISTS idx_sesiones_id_usuario ON tepozteco.sesiones (id_usuario);
CREATE INDEX IF NOT EXISTS idx_sesiones_activa      ON tepozteco.sesiones (activa);
CREATE INDEX IF NOT EXISTS idx_sesiones_expira_en   ON tepozteco.sesiones (expira_en);

-- =============================================================
-- 8. VISTA MATERIALIZADA – Métricas para el Dashboard
-- =============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS tepozteco.mv_dashboard_stats AS
SELECT
    COUNT(a.id_analisis)                                               AS total_analisis,
    COUNT(a.id_analisis) FILTER (WHERE LOWER(nr.clave) = 'alto')      AS incendios_activos,
    COUNT(a.id_analisis) FILTER (WHERE LOWER(nr.clave) = 'medio')     AS alertas_criticas,
    COUNT(a.id_analisis) FILTER (WHERE LOWER(nr.clave) = 'bajo')      AS zonas_controladas,
    ROUND(AVG(a.umbral_confianza) * 100, 1)                           AS precision_promedio,
    ROUND(AVG(a.porcentaje_afectacion)::NUMERIC, 1)                   AS area_prom_pct,
    COUNT(i.id_imagen)                                                 AS total_imagenes,
    MAX(a.fecha_analisis)                                              AS ultima_actualizacion
FROM tepozteco.analisis a
JOIN tepozteco.imagenes i        ON i.id_imagen = a.id_imagen
JOIN tepozteco.niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_dashboard ON tepozteco.mv_dashboard_stats ((1));

COMMENT ON MATERIALIZED VIEW tepozteco.mv_dashboard_stats IS
    'Refresca con: REFRESH MATERIALIZED VIEW CONCURRENTLY tepozteco.mv_dashboard_stats';

-- =============================================================
-- 9. DATOS SEMILLA (SEED)
-- =============================================================

-- 9.1 Roles
INSERT INTO tepozteco.roles (nombre, descripcion) VALUES
    ('admin', 'Administrador del sistema con acceso total'),
    ('gov',   'Usuario gubernamental – puede generar reportes'),
    ('user',  'Usuario común – puede subir imágenes y ver su historial')
ON CONFLICT (nombre) DO NOTHING;

-- 9.2 Niveles de riesgo
INSERT INTO tepozteco.niveles_riesgo (clave, descripcion, prioridad, color_hex) VALUES
    ('alto',  'Incendio activo o inminente – respuesta inmediata requerida', 1, '#FF3B30'),
    ('medio', 'Riesgo elevado – monitoreo constante',                        2, '#FF9500'),
    ('bajo',  'Condiciones controladas – bajo riesgo',                       3, '#34C759')
ON CONFLICT (clave) DO NOTHING;

-- 9.3 Usuario administrador por defecto
--     Contraseña: Admin2025! (bcrypt hash con cost 12)
--     ⚠️  CAMBIA la contraseña en producción
INSERT INTO tepozteco.usuarios (nombre, correo, contrasena, id_rol, perfil)
SELECT
    'Administrador Sistema',
    'admin@tepozteco.mx',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsCIMxMVpNMRFknQxMDkSnqDTVBa',  -- Admin2025!
    r.id_rol,
    '{"estado":"activo","fechaCreacion":"14/05/2026"}'::jsonb
FROM tepozteco.roles r
WHERE r.nombre = 'admin'
ON CONFLICT (correo) DO NOTHING;

-- =============================================================
-- 10. VISTAS DE CONSULTA RÁPIDA
-- =============================================================

-- Vista: listado de imágenes con análisis y usuario
CREATE OR REPLACE VIEW tepozteco.v_imagenes_analisis AS
SELECT
    i.id_imagen,
    i.uuid,
    i.nombre_archivo,
    u.nombre                                                    AS usuario,
    u.correo                                                    AS correo_usuario,
    LOWER(nr.clave)                                             AS nivel_riesgo,
    nr.color_hex,
    ROUND((a.umbral_confianza * 100)::NUMERIC)                  AS confianza_pct,
    a.porcentaje_afectacion,
    a.resultado_json ->> 'zona'                                 AS zona,
    i.resolucion_width || 'x' || i.resolucion_height           AS resolucion,
    ROUND((i.tamano_bytes / 1048576.0)::NUMERIC, 1)            AS tamano_mb,
    i.fecha_carga,
    a.id_analisis,
    a.fecha_analisis,
    -- Columnas geográficas como texto WKT
    ST_AsText(i.ubicacion_imagen)                               AS ubicacion_wkt,
    ST_AsText(a.centroide_incendio)                             AS centroide_wkt
FROM tepozteco.imagenes i
JOIN tepozteco.usuarios u            ON u.id_usuario = i.id_usuario
LEFT JOIN tepozteco.analisis a       ON a.id_imagen  = i.id_imagen
LEFT JOIN tepozteco.niveles_riesgo nr ON nr.id_riesgo = a.id_riesgo;

-- Vista: reportes con contexto completo
CREATE OR REPLACE VIEW tepozteco.v_reportes_detalle AS
SELECT
    r.id_reporte,
    r.tipo,
    r.contenido_summary,
    r.parametros ->> 'zona'       AS zona,
    r.parametros ->> 'severidad'  AS severidad,
    r.parametros ->> 'estado'     AS estado,
    u.nombre                      AS usuario,
    u.correo                      AS correo_usuario,
    LOWER(nr.clave)               AS nivel_riesgo,
    nr.color_hex,
    a.umbral_confianza,
    a.resultado_json,
    r.fecha_generacion
FROM tepozteco.reportes r
JOIN tepozteco.usuarios u            ON u.id_usuario  = r.id_usuario
JOIN tepozteco.analisis a            ON a.id_analisis = r.id_analisis
JOIN tepozteco.niveles_riesgo nr     ON nr.id_riesgo  = a.id_riesgo;

-- Vista: bitácora legible
CREATE OR REPLACE VIEW tepozteco.v_bitacoras AS
SELECT
    b.id_log,
    b.tabla_nombre,
    b.operacion,
    b.registro_id,
    b.cambiado_por,
    b.descripcion,
    b.datos_antes,
    b.datos_despues,
    b.ip_origen,
    b.fecha,
    r.tipo AS reporte_tipo
FROM tepozteco.bitacoras b
LEFT JOIN tepozteco.reportes r ON r.id_reporte = b.id_reporte
ORDER BY b.fecha DESC;

-- =============================================================
-- 11. FUNCIÓN AUXILIAR PostGIS: Calcular área afectada en ha
-- =============================================================

CREATE OR REPLACE FUNCTION tepozteco.area_hectareas(geom GEOGRAPHY)
RETURNS NUMERIC LANGUAGE SQL IMMUTABLE AS $$
    SELECT ROUND((ST_Area(geom) / 10000.0)::NUMERIC, 2);
$$;

COMMENT ON FUNCTION tepozteco.area_hectareas IS
    'Convierte un polígono GEOGRAPHY a hectáreas. Uso: SELECT tepozteco.area_hectareas(area_afectada) FROM imagenes';

-- =============================================================
-- FIN DEL SCRIPT
-- =============================================================