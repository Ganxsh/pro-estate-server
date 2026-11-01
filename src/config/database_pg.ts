
import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

if (isProduction && !databaseUrl) {
  throw new Error(
    "DATABASE_URL is required in production. Configure it in Render Environment."
  );
}

const pool = new Pool(
  databaseUrl
    ? {
        connectionString: databaseUrl,
        ...(isProduction
          ? { ssl: { rejectUnauthorized: false } }
          : {}),
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST ?? "localhost",
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT ?? 5432),
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }
);

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

export default pool;
