// index.js
// Tiny REST API in front of MySQL. Run with `npm run server`.
//
//   GET    /api/holdings          -> list all holdings (with computed fields)
//   POST   /api/holdings          -> add a new holding
//   PUT    /api/holdings/:symbol  -> update an existing holding
//   DELETE /api/holdings/:symbol  -> remove a holding

import express from "express";
import cors from "cors";
import { pool, initDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// invested / currentValue / pnl / netChgPct are derived from qty, avgCost,
// ltp — we don't store them, so they can never go stale or get out of sync.
// MySQL returns DECIMAL columns as strings, so cast to Number first.
function withDerived(row) {
  const qty = Number(row.qty);
  const avgCost = Number(row.avgCost);
  const ltp = Number(row.ltp);
  const dayChgPct = Number(row.dayChgPct);
  const invested = qty * avgCost;
  const currentValue = qty * ltp;
  const pnl = currentValue - invested;
  const netChgPct = invested === 0 ? 0 : (pnl / invested) * 100;
  return { ...row, qty, avgCost, ltp, dayChgPct, invested, currentValue, pnl, netChgPct };
}

app.get("/api/holdings", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM holdings ORDER BY symbol");
  res.json(rows.map(withDerived));
});

app.post("/api/holdings", async (req, res) => {
  const { symbol, name, qty, avgCost, ltp, dayChgPct = 0 } = req.body ?? {};

  if (!symbol || !name || qty == null || avgCost == null || ltp == null) {
    return res
      .status(400)
      .json({ error: "symbol, name, qty, avgCost, and ltp are required" });
  }

  const cleanSymbol = String(symbol).trim().toUpperCase();

  try {
    await pool.query(
      `INSERT INTO holdings (symbol, name, qty, avgCost, ltp, dayChgPct)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanSymbol, String(name).trim(), Number(qty), Number(avgCost), Number(ltp), Number(dayChgPct)]
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: `A holding for ${cleanSymbol} already exists` });
    }
    return res.status(500).json({ error: "Could not save holding" });
  }

  const [rows] = await pool.query("SELECT * FROM holdings WHERE symbol = ?", [cleanSymbol]);
  res.status(201).json(withDerived(rows[0]));
});

app.put("/api/holdings/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const [existingRows] = await pool.query("SELECT * FROM holdings WHERE symbol = ?", [symbol]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: "Holding not found" });

  const { name, qty, avgCost, ltp, dayChgPct } = req.body ?? {};

  await pool.query(
    `UPDATE holdings SET name = ?, qty = ?, avgCost = ?, ltp = ?, dayChgPct = ? WHERE symbol = ?`,
    [
      name ?? existing.name,
      qty ?? existing.qty,
      avgCost ?? existing.avgCost,
      ltp ?? existing.ltp,
      dayChgPct ?? existing.dayChgPct,
      symbol,
    ]
  );

  const [rows] = await pool.query("SELECT * FROM holdings WHERE symbol = ?", [symbol]);
  res.json(withDerived(rows[0]));
});

app.delete("/api/holdings/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const [result] = await pool.query("DELETE FROM holdings WHERE symbol = ?", [symbol]);
  if (result.affectedRows === 0) return res.status(404).json({ error: "Holding not found" });
  res.status(204).end();
});

const PORT = process.env.PORT || 5174;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[api] StockSage API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[db] Failed to initialize database:", err.message);
    process.exit(1);
  });
