-- 1. Eliminar vistas
DROP VIEW IF EXISTS tepozteco.v_bitacoras;
DROP VIEW IF EXISTS tepozteco.v_reportes_detalle;
DROP VIEW IF EXISTS tepozteco.v_imagenes_analisis;

-- 2. Eliminar vista materializada
DROP MATERIALIZED VIEW IF EXISTS tepozteco.mv_dashboard_stats;

-- 3. Eliminar funciones (con CASCADE por si algún objeto depende de ellas)
DROP FUNCTION IF EXISTS tepozteco.area_hectareas(GEOGRAPHY);
DROP FUNCTION IF EXISTS tepozteco.set_updated_at() CASCADE;

-- 4. Eliminar tablas en orden inverso a su creación
DROP TABLE IF EXISTS tepozteco.sesiones;
DROP TABLE IF EXISTS tepozteco.bitacoras;
DROP TABLE IF EXISTS tepozteco.reportes;
DROP TABLE IF EXISTS tepozteco.analisis;
DROP TABLE IF EXISTS tepozteco.imagenes;
DROP TABLE IF EXISTS tepozteco.usuarios CASCADE;
DROP TABLE IF EXISTS tepozteco.niveles_riesgo;
DROP TABLE IF EXISTS tepozteco.roles;

DROP SCHEMA IF EXISTS tepozteco CASCADE;

