-- Traductor de Algoritmos Educativos — esquema para Neon
-- Pegar completo en el SQL Editor de Neon y ejecutar.

-- Para hashear contraseñas desde el propio Postgres (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Usuarios (reemplaza el login hardcodeado)
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  usuario       VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  nombre        VARCHAR(100),
  rol           VARCHAR(20) NOT NULL DEFAULT 'alumno',
  activo        BOOLEAN     NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Programas (reemplaza guardar/cargar el .alg)
CREATE TABLE IF NOT EXISTS programas (
  id            SERIAL PRIMARY KEY,
  usuario_id    INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo        VARCHAR(150) NOT NULL,
  codigo        TEXT         NOT NULL,   -- el pseudocódigo
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  modificado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. Traducciones (historial de "Analizar y Traducir")
CREATE TABLE IF NOT EXISTS traducciones (
  id           SERIAL PRIMARY KEY,
  programa_id  INT NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
  codigo_js    TEXT,
  exitosa      BOOLEAN     NOT NULL DEFAULT TRUE,
  ejecutada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Errores por fase del compilador
CREATE TABLE IF NOT EXISTS errores (
  id          SERIAL PRIMARY KEY,
  programa_id INT NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
  fase        VARCHAR(20) NOT NULL
              CHECK (fase IN ('lexico','sintactico','semantico','ejecucion')),
  mensaje     TEXT NOT NULL,
  linea       INT,
  token       VARCHAR(100),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Sesiones (bitácora de accesos con IP)
CREATE TABLE IF NOT EXISTS sesiones (
  id         SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  ip_origen  INET,
  exitoso    BOOLEAN     NOT NULL,
  fecha      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_programas_usuario   ON programas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_traducciones_prog   ON traducciones(programa_id);
CREATE INDEX IF NOT EXISTS idx_errores_programa    ON errores(programa_id);
CREATE INDEX IF NOT EXISTS idx_errores_fase        ON errores(fase);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario    ON sesiones(usuario_id);

-- Datos de prueba
-- Mismo usuario/contraseña que el login actual (admin / 1234),
-- pero ya hasheado con bcrypt en lugar de estar en el JavaScript.
INSERT INTO usuarios (usuario, password_hash, nombre, rol)
VALUES ('admin', crypt('1234', gen_salt('bf')), 'Administrador', 'admin')
ON CONFLICT (usuario) DO NOTHING;

INSERT INTO usuarios (usuario, password_hash, nombre, rol)
VALUES ('alumno', crypt('alumno123', gen_salt('bf')), 'Alumno de prueba', 'alumno')
ON CONFLICT (usuario) DO NOTHING;

-- Comprobación
SELECT id, usuario, nombre, rol, creado_en FROM usuarios;
