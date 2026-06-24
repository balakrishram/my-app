// db.js
// MySQL connection pool + schema setup.
//
// Before running the server, make sure the database itself exists —
// mysql2 will create the TABLE for you, but not the DATABASE:
//   mysql -u root -p -e "CREATE DATABASE stocksage"
//
// Connection settings come from a .env file in the project root (see
// .env.example). Copy it to .env and fill in your real credentials —
// .env is gitignored so it never gets committed or shared.

import "dotenv/config";
import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "stocksage",
  waitForConnections: true,
  connectionLimit: 10,
});

// Creates the table if it's missing. (No longer seeds sample data — your
// database already has your real holdings in it.)
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS holdings (
      symbol     VARCHAR(20) PRIMARY KEY,
      name       VARCHAR(120) NOT NULL,
      qty        DECIMAL(14,4) NOT NULL,
      avgCost    DECIMAL(14,4) NOT NULL,
      ltp        DECIMAL(14,4) NOT NULL,
      dayChgPct  DECIMAL(8,4) NOT NULL DEFAULT 0
    )
  `);
}
