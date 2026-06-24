// index.js
// Tiny REST API in front of MySQL. Run with `npm run server`.
//
//   GET    /api/holdings          -> list all holdings (with computed fields)
//   POST   /api/holdings          -> add a new holding
//   PUT    /api/holdings/:ticker  -> update an existing holding
//   DELETE /api/holdings/:ticker  -> remove a holding
//
// Columns: ticker (was symbol), avgPurchasePrice (was avgCost),
// currentPrice (was ltp). dayChgPct has been removed entirely.

import express from "express";
import cors from "cors";
import { pool, initDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// invested / currentValue / pnl / netChgPct are derived from qty,
// avgPurchasePrice, currentPrice — we don't store them, so they can never
// go stale or get out of sync. MySQL returns DECIMAL columns as strings,
// so cast to Number first.
function withDerived(row) {
  const qty = Number(row.qty);
  const avgPurchasePrice = Number(row.avgPurchasePrice);
  const currentPrice = Number(row.currentPrice);
  const invested = qty * avgPurchasePrice;
  const currentValue = qty * currentPrice;
  const pnl = currentValue - invested;
  const netChgPct = invested === 0 ? 0 : (pnl / invested) * 100;
  return { ...row, qty, avgPurchasePrice, currentPrice, invested, currentValue, pnl, netChgPct };
}

app.get("/api/holdings", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM holdings ORDER BY ticker");
  res.json(rows.map(withDerived));
});

app.post("/api/holdings", async (req, res) => {
  const { ticker, name, qty, avgPurchasePrice, currentPrice } = req.body ?? {};

  if (!ticker || !name || qty == null || avgPurchasePrice == null || currentPrice == null) {
    return res
      .status(400)
      .json({ error: "ticker, name, qty, avgPurchasePrice, and currentPrice are required" });
  }

  const cleanTicker = String(ticker).trim().toUpperCase();

  try {
    await pool.query(
      `INSERT INTO holdings (ticker, name, qty, avgPurchasePrice, currentPrice)
       VALUES (?, ?, ?, ?, ?)`,
      [cleanTicker, String(name).trim(), Number(qty), Number(avgPurchasePrice), Number(currentPrice)]
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: `A holding for ${cleanTicker} already exists` });
    }
    return res.status(500).json({ error: "Could not save holding" });
  }

  const [rows] = await pool.query("SELECT * FROM holdings WHERE ticker = ?", [cleanTicker]);
  res.status(201).json(withDerived(rows[0]));
});

app.put("/api/holdings/:ticker", async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const [existingRows] = await pool.query("SELECT * FROM holdings WHERE ticker = ?", [ticker]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: "Holding not found" });

  const { name, qty, avgPurchasePrice, currentPrice } = req.body ?? {};

  await pool.query(
    `UPDATE holdings SET name = ?, qty = ?, avgPurchasePrice = ?, currentPrice = ? WHERE ticker = ?`,
    [
      name ?? existing.name,
      qty ?? existing.qty,
      avgPurchasePrice ?? existing.avgPurchasePrice,
      currentPrice ?? existing.currentPrice,
      ticker,
    ]
  );

  const [rows] = await pool.query("SELECT * FROM holdings WHERE ticker = ?", [ticker]);
  res.json(withDerived(rows[0]));
});

app.delete("/api/holdings/:ticker", async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const [result] = await pool.query("DELETE FROM holdings WHERE ticker = ?", [ticker]);
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
