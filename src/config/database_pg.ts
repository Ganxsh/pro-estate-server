import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 10,
   idleTimeoutMillis: 30_000,
   connectionTimeoutMillis: 5_000,
})

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

export const query = (text: string, params?: any[]) =>
  pool.query(text, params);
// pool.query("SELECT * FROM public.fooddetail", (err, res) => {
//   if (err) {
//     console.error("Error executing query:", err);
//   } else {
//     console.log("Query results:", res.rows);
//   }
// });

export default pool;
