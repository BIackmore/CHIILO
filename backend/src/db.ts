import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "incendios_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  options: "-c search_path=tepozteco,public",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err);
});

// Helper para queries con manejo de errores
const query = async (text: string, params?: any[]) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error("Error en query:", { text, params, error: err });
    throw err;
  }
};

export { pool, query };
