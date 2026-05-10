-- 1) Extensiones
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- para UUID si se desea

-- 2) Esquema
CREATE SCHEMA IF NOT EXISTS tepozteco;
SET search_path = tepozteco, public;

-- 3) Tablas de catálogo / seguridad

-- Roles
CREATE TABLE IF NOT EXISTS tepozteco.roles (
  id_rol SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT
);

-- Usuarios
CREATE TABLE IF NOT EXISTS tepozteco.usuarios (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL, -- almacenar hash (bcrypt/argon2) desde la app
  id_rol INT NOT NULL REFERENCES tepozteco.roles(id_rol) ON DELETE RESTRICT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  telefono VARCHAR(30),
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  perfil JSONB -- campo flexible para metadatos del usuario
);

-- 4) Tablas principales

-- Tabla de imágenes (puntos georreferenciados opcionales)
CREATE TABLE IF NOT EXISTS tepozteco.imagenes (
  id_imagen SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() NOT NULL,
  nombre_archivo VARCHAR(200),
  ruta_archivo TEXT NOT NULL,       -- ruta local o URL en S3/gcs
  formato VARCHAR(10),
  id_usuario INT REFERENCES tepozteco.usuarios(id_usuario) ON DELETE SET NULL,
  fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolucion_width INT,
  resolucion_height INT,
  tamano_bytes BIGINT,
  descripcion TEXT,
  geom geometry(Point, 4326),       -- ubicación (lat,lon) opcional
  metadata JSONB                     -- EXIF u otros metadatos
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'tepozteco'
      AND table_name = 'imagenes'
      AND column_name = 'tamaño_bytes'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'tepozteco'
      AND table_name = 'imagenes'
      AND column_name = 'tamano_bytes'
  ) THEN
    ALTER TABLE tepozteco.imagenes RENAME COLUMN "tamaño_bytes" TO tamano_bytes;
  END IF;
END;
$$;

-- Catálogo de niveles de riesgo
CREATE TABLE IF NOT EXISTS tepozteco.niveles_riesgo (
  id_riesgo SERIAL PRIMARY KEY,
  clave VARCHAR(30) NOT NULL UNIQUE, -- ej: BAJO, MEDIO, ALTO, CRITICO
  descripcion VARCHAR(80) NOT NULL,
  prioridad SMALLINT NOT NULL,       -- 1 = más crítico
  color_hex VARCHAR(10)              -- para visualización #RRGGBB
);

-- Tabla de análisis (resultado de procesar una imagen)
CREATE TABLE IF NOT EXISTS tepozteco.analisis (
  id_analisis SERIAL PRIMARY KEY,
  id_imagen INT REFERENCES tepozteco.imagenes(id_imagen) ON DELETE CASCADE,
  id_riesgo INT REFERENCES tepozteco.niveles_riesgo(id_riesgo),
  porcentaje_afectacion NUMERIC(5,2),   -- ej 12.34 (% de la imagen)
  resultado_json JSONB,                 -- salida cruda del modelo (detalles por zona)
  zonas_detectadas geometry(MultiPolygon, 4326), -- polígonos de zonas detectadas (opcional)
  umbral_confianza NUMERIC(4,2),
  modelo_version VARCHAR(100),
  fecha_analisis TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de reportes generados
CREATE TABLE IF NOT EXISTS tepozteco.reportes (
  id_reporte SERIAL PRIMARY KEY,
  id_analisis INT REFERENCES tepozteco.analisis(id_analisis) ON DELETE SET NULL,
  id_usuario INT REFERENCES tepozteco.usuarios(id_usuario) ON DELETE SET NULL,
  tipo VARCHAR(60),
  ruta_reporte TEXT,        -- ruta al PDF/JSON/ZIP generado
  contenido_summary TEXT,  -- descripción breve
  parametros JSONB,        -- parámetros usados para generar el reporte
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5) Tabla de bitácora / logs (auditoría)
CREATE TABLE IF NOT EXISTS tepozteco.bitacoras (
  id_log BIGSERIAL PRIMARY KEY,
  tabla_nombre VARCHAR(150) NOT NULL,
  operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE','SELECT')),
  registro_id TEXT,              -- id del registro afectado (texto para flexibilidad)
  cambiado_por VARCHAR(50),      -- id_usuario (se intenta obtener de app.current_user_id)
  cambiado_por_rol VARCHAR(50),  -- CAMPO AGREGADO PARA CORREGIR EL ERROR DEL INSERT
  fecha TIMESTAMP WITH TIME ZONE DEFAULT now(),
  datos_antes JSONB,
  datos_despues JSONB,
  descripcion TEXT,
  id_reporte INT REFERENCES tepozteco.reportes(id_reporte) ON DELETE SET NULL
);

ALTER TABLE tepozteco.bitacoras DROP CONSTRAINT IF EXISTS bitacoras_operacion_check;
ALTER TABLE tepozteco.bitacoras
  ADD CONSTRAINT bitacoras_operacion_check
  CHECK (operacion IN ('INSERT','UPDATE','DELETE','SELECT'));

-- 6) Índices espaciales y de búsqueda
-- Índices para acelerar consultas
CREATE INDEX IF NOT EXISTS idx_imagenes_geom ON tepozteco.imagenes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_analisis_zonas_gist ON tepozteco.analisis USING GIST (zonas_detectadas);
CREATE INDEX IF NOT EXISTS idx_analisis_fecha ON tepozteco.analisis (fecha_analisis);
CREATE INDEX IF NOT EXISTS idx_imagenes_uuid ON tepozteco.imagenes (uuid);
CREATE INDEX IF NOT EXISTS idx_imagenes_usuario ON tepozteco.imagenes (id_usuario);
CREATE INDEX IF NOT EXISTS idx_analisis_imagen ON tepozteco.analisis (id_imagen);
CREATE INDEX IF NOT EXISTS idx_analisis_riesgo ON tepozteco.analisis (id_riesgo);
CREATE INDEX IF NOT EXISTS idx_reportes_usuario ON tepozteco.reportes (id_usuario);
CREATE INDEX IF NOT EXISTS idx_reportes_analisis ON tepozteco.reportes (id_analisis);
CREATE INDEX IF NOT EXISTS idx_bitacoras_tabla_fecha ON tepozteco.bitacoras (tabla_nombre, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_niveles_riesgo_clave_lower ON tepozteco.niveles_riesgo (LOWER(clave));
CREATE INDEX IF NOT EXISTS idx_roles_nombre_lower ON tepozteco.roles (LOWER(nombre));
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_num_trabajador ON tepozteco.usuarios ((perfil->>'numTrabajador'));

-- 7) Datos iniciales útiles
INSERT INTO tepozteco.roles (nombre, descripcion)
  VALUES ('ADMIN','Administrador del sistema'),
         ('GOV','Usuario gubernamental/gestor'),
         ('USER','Usuario general'),
         ('AUTORIDAD','Rol legado de autoridad/gestor')
  ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tepozteco.niveles_riesgo (clave, descripcion, prioridad, color_hex)
  VALUES
    ('BAJO','Riesgo bajo', 4, '#00FF00'),
    ('MEDIO','Riesgo medio', 3, '#FFFF00'),
    ('ALTO','Riesgo alto', 2, '#FF8000'),
    ('CRITICO','Riesgo crítico', 1, '#FF0000')
  ON CONFLICT (clave) DO NOTHING;

-- 8) Trigger genérico de auditoría (bitácora) CORREGIDO
CREATE OR REPLACE FUNCTION tepozteco.fn_auditar() RETURNS trigger AS $$
DECLARE
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_regid TEXT;
  v_user_id INT;
  v_user_role TEXT;
  v_id_reporte INT := NULL;
BEGIN
  -- Intentar obtener id de usuario desde variable de sesión (app.current_user_id)
  BEGIN
    v_user_id := (current_setting('app.current_user_id', true))::INT;
  EXCEPTION WHEN others THEN
    v_user_id := NULL;
  END;

  -- Opcional: obtener rol del usuario si existe
  IF v_user_id IS NOT NULL THEN
    SELECT r.nombre INTO v_user_role
    FROM tepozteco.usuarios u
    LEFT JOIN tepozteco.roles r ON u.id_rol = r.id_rol
    WHERE u.id_usuario = v_user_id;
  END IF;

  -- Convertir los records a JSONB dependiendo de la operación
  IF TG_OP = 'DELETE' THEN
    v_old := row_to_json(OLD.*)::jsonb;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := row_to_json(NEW.*)::jsonb;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := row_to_json(OLD.*)::jsonb;
    v_new := row_to_json(NEW.*)::jsonb;
  END IF;

  -- Extraer dinámicamente el ID desde el JSONB basándonos en el nombre de la tabla.
  IF TG_TABLE_NAME = 'imagenes' THEN
    v_regid := COALESCE(v_new->>'id_imagen', v_old->>'id_imagen');
  ELSIF TG_TABLE_NAME = 'usuarios' THEN
    v_regid := COALESCE(v_new->>'id_usuario', v_old->>'id_usuario');
  ELSIF TG_TABLE_NAME = 'analisis' THEN
    v_regid := COALESCE(v_new->>'id_analisis', v_old->>'id_analisis');
  ELSIF TG_TABLE_NAME = 'reportes' THEN
    v_regid := COALESCE(v_new->>'id_reporte', v_old->>'id_reporte');
    v_id_reporte := v_regid::INT; -- Si es reporte, guardamos su id para la FK
  END IF;

  -- Insertar en la bitácora
  INSERT INTO tepozteco.bitacoras (
    tabla_nombre, operacion, registro_id, cambiado_por, cambiado_por_rol, 
    datos_antes, datos_despues, id_reporte
  ) VALUES (
    TG_TABLE_NAME, TG_OP, v_regid, v_user_id::varchar, v_user_role, v_old, v_new, v_id_reporte
  );

  -- Retornar el record correspondiente para que continúe la operación
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9) Asociar trigger a tablas críticas
DO $$
BEGIN
  -- Imagenes
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'tg_auditar_imagenes' AND c.relname = 'imagenes'
  ) THEN
    CREATE TRIGGER tg_auditar_imagenes
      AFTER INSERT OR UPDATE OR DELETE ON tepozteco.imagenes
      FOR EACH ROW EXECUTE FUNCTION tepozteco.fn_auditar();
  END IF;

  -- Analisis
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'tg_auditar_analisis' AND c.relname = 'analisis'
  ) THEN
    CREATE TRIGGER tg_auditar_analisis
      AFTER INSERT OR UPDATE OR DELETE ON tepozteco.analisis
      FOR EACH ROW EXECUTE FUNCTION tepozteco.fn_auditar();
  END IF;

  -- Reportes
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'tg_auditar_reportes' AND c.relname = 'reportes'
  ) THEN
    CREATE TRIGGER tg_auditar_reportes
      AFTER INSERT OR UPDATE OR DELETE ON tepozteco.reportes
      FOR EACH ROW EXECUTE FUNCTION tepozteco.fn_auditar();
  END IF;

  -- Usuarios (auditar cambios en usuarios)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'tg_auditar_usuarios' AND c.relname = 'usuarios'
  ) THEN
    CREATE TRIGGER tg_auditar_usuarios
      AFTER INSERT OR UPDATE OR DELETE ON tepozteco.usuarios
      FOR EACH ROW EXECUTE FUNCTION tepozteco.fn_auditar();
  END IF;
END;
$$;

-- 10) Triggers/funciones para normalizar SRID y tipos geométricos
-- Aseguran que las geometrías insertadas tengan SRID=4326 y el tipo correcto.

CREATE OR REPLACE FUNCTION tepozteco.fn_enforce_geom_srid_imagenes()
RETURNS trigger AS $$
BEGIN
  IF NEW.geom IS NOT NULL THEN
    -- forzar SRID y transformar a POINT si es necesario
    NEW.geom := ST_SetSRID(ST_Force2D(ST_CollectionExtract(ST_MakeValid(NEW.geom), 1)), 4326);
    -- si por algún motivo el geometry no es Point, intentar extraer centroid
    IF GeometryType(NEW.geom) <> 'POINT' THEN
      NEW.geom := ST_SetSRID(ST_Centroid(NEW.geom), 4326);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tepozteco.fn_enforce_geom_srid_analisis()
RETURNS trigger AS $$
BEGIN
  IF NEW.zonas_detectadas IS NOT NULL THEN
    -- forzar SRID, validar y convertir a MultiPolygon (si viene Polygon o GeometryCollection)
    NEW.zonas_detectadas := ST_SetSRID(ST_Multi(ST_Buffer(ST_MakeValid(NEW.zonas_detectadas), 0)), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers que llamen esas funciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_imagenes_enforce_geom'
  ) THEN
    CREATE TRIGGER tg_imagenes_enforce_geom
      BEFORE INSERT OR UPDATE ON tepozteco.imagenes
      FOR EACH ROW EXECUTE FUNCTION tepozteco.fn_enforce_geom_srid_imagenes();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_analisis_enforce_geom'
  ) THEN
    CREATE TRIGGER tg_analisis_enforce_geom
      BEFORE INSERT OR UPDATE ON tepozteco.analisis
      FOR EACH ROW EXECUTE FUNCTION tepozteco.fn_enforce_geom_srid_analisis();
  END IF;
END;
$$;

-- 11) Permisos básicos (ajusta según tus roles/usuarios DB)
-- En entorno de desarrollo puede otorgar a PUBLIC, en producción restringir.
GRANT USAGE ON SCHEMA tepozteco TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tepozteco TO PUBLIC;
GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA tepozteco TO PUBLIC;

-- REGISTROS DE ADMINISTRADORES

-- Insertar administrador Brisa Lezama
-- Contraseña: Lukehemmo96_ (hash bcrypt cost 12)
INSERT INTO tepozteco.usuarios (nombre, correo, contrasena, id_rol, activo, perfil)
VALUES (
  'Brisa Lezama',
  'blezama421@gmail.com',
  '$2a$12$.GsCoYLI3jRhDxQRnZaiYuzd09k3JLgUWtjRJvihrKCdl2mTzC/vi',
  (SELECT id_rol FROM tepozteco.roles WHERE nombre = 'ADMIN'),
  TRUE,
  '{"organizacion": "Sistema de Prevención de Incendios", "estado": "activo", "fechaCreacion": "28/04/2026"}'
)
ON CONFLICT (correo) DO NOTHING;

SELECT 
    u.id_usuario, 
    u.nombre AS nombre_usuario, 
    u.correo, 
    r.nombre AS nombre_rol, 
    r.descripcion AS descripcion_rol
FROM tepozteco.usuarios u
JOIN tepozteco.roles r ON u.id_rol = r.id_rol;
