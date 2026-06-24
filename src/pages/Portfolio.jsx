// Portfolio.jsx
// Page logic only — styles live in Portfolio.css, the "Add a stock" dialog
// lives in src/components/AddStockModal.jsx, and number formatting /
// aggregation math live in src/utils.
//
// Field renames vs the old version: symbol -> ticker, avgCost ->
// avgPurchasePrice, ltp -> currentPrice. Day-change (%) has been removed
// everywhere since the underlying field no longer exists.

import { useEffect, useState } from "react";
import "./Portfolio.css";
import AddStockModal from "../components/AddStockModal.jsx";
import { inr, signed, pct } from "../utils/format.js";
import { summarize, buildDonut } from "../utils/portfolioCalc.js";

export default function Portfolio() {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openTicker, setOpenTicker] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/holdings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load holdings");
        return res.json();
      })
      .then((data) => setHoldings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddStock(payload) {
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add stock");

      setHoldings((prev) =>
        [...prev, data].sort((a, b) => a.ticker.localeCompare(b.ticker))
      );
      setShowAddForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(ticker) {
    const prev = holdings;
    setHoldings((h) => h.filter((r) => r.ticker !== ticker));
    try {
      const res = await fetch(`/api/holdings/${ticker}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("Delete failed");
    } catch {
      setHoldings(prev); // roll back on failure
    }
  }

  if (loading) {
    return (
      <div className="ss-app">
        <div className="ss-shell" style={{ paddingTop: 80, textAlign: "center", color: "#7a7e85" }}>
          Loading holdings…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ss-app">
        <div className="ss-shell" style={{ paddingTop: 80, textAlign: "center", color: "#e0405a" }}>
          Couldn't load holdings: {error}
          <div style={{ marginTop: 10, color: "#7a7e85", fontSize: 13 }}>
            Is the API server running? Try <code>npm run server</code> (or <code>npm run dev:all</code>).
          </div>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="ss-app">
        <div className="ss-shell" style={{ paddingTop: 80, textAlign: "center", color: "#7a7e85" }}>
          No holdings yet. Add your first stock to get started.
        </div>
        <button className="ss-add-btn" style={{ display: "block", margin: "16px auto" }} onClick={() => setShowAddForm(true)}>
          + Add stock
        </button>
        {showAddForm && (
          <AddStockModal
            onClose={() => setShowAddForm(false)}
            onSubmit={handleAddStock}
            submitting={submitting}
            serverError={formError}
          />
        )}
      </div>
    );
  }

  const { invested, currentValue, pnl, pnlPct } = summarize(holdings);
  const gain = pnl >= 0;

  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  const donutSegments = buildDonut(sorted, currentValue);
  const colorOf = (ticker) => donutSegments.find((s) => s.ticker === ticker)?.color;

  const best = [...holdings].sort((a, b) => b.netChgPct - a.netChgPct)[0];
  const worst = [...holdings].sort((a, b) => a.netChgPct - b.netChgPct)[0];

  return (
    <div className="ss-app">
      <div className="ss-shell">
        <div className="ss-nav">
          <div className="ss-brand"><span className="ss-brand-dot" />StockSage</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="ss-add-btn" onClick={() => setShowAddForm(true)}>+ Add stock</button>
            <div className="ss-sync"><span className="ss-sync-dot" />Synced just now</div>
          </div>
        </div>

        <div className="ss-hero">
          <div className="ss-hero-eyebrow">Current value</div>
          <h1 className="ss-hero-value">{inr(currentValue)}</h1>
          <div className="ss-hero-meta">
            <span className={`ss-chip ${gain ? "gain" : "loss"}`}>
              {signed(pnl)}{inr(pnl)} ({pct(pnlPct)})
            </span>
            <span className="ss-hero-sub">Invested <b>{inr(invested)}</b></span>
          </div>
        </div>

        <div className="ss-grid">
          <div className="ss-card">
            <div className="ss-card-title">Allocation</div>
            <div className="ss-donut-row">
              <div className="ss-donut-wrap">
                <svg viewBox="0 0 180 180" width="164" height="164">
                  <g transform="rotate(-90 90 90)">
                    {donutSegments.map((s) => (
                      <circle
                        key={s.ticker}
                        cx="90" cy="90" r={s.r}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="20"
                        strokeDasharray={s.dasharray}
                        strokeDashoffset={s.dashoffset}
                        strokeLinecap="round"
                      />
                    ))}
                  </g>
                </svg>
                <div className="ss-donut-center">
                  <div className="ss-donut-value">{inr(currentValue, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</div>
                  <div className="ss-donut-label">{holdings.length} holdings</div>
                </div>
              </div>
              <ul className="ss-legend">
                {donutSegments.map((s) => (
                  <li key={s.ticker}>
                    <span className="ss-legend-dot" style={{ background: s.color }} />
                    <span className="ss-legend-name">{s.name}</span>
                    <span className="ss-legend-pct">{(s.fraction * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ss-card">
            <div className="ss-card-title">Snapshot</div>
            <div className="ss-stat-row"><span>Best performer</span><strong className="gain">{best.name} {pct(best.netChgPct)}</strong></div>
            <div className="ss-stat-row"><span>Worst performer</span><strong className="loss">{worst.name} {pct(worst.netChgPct)}</strong></div>
            <div className="ss-stat-row"><span>Total holdings</span><strong>{holdings.length}</strong></div>
          </div>
        </div>

        <div className="ss-section-head">
          <h2>Holdings</h2>
          <span>{holdings.length} positions</span>
        </div>

        <div className="ss-cards">
          {holdings.map((r) => {
            const isGain = r.pnl >= 0;
            const open = openTicker === r.ticker;
            return (
              <div
                key={r.ticker}
                className="ss-hold-card"
                onClick={() => setOpenTicker(open ? null : r.ticker)}
              >
                <div className="ss-hold-accent" style={{ background: colorOf(r.ticker) }} />
                <button
                  className="ss-hold-remove"
                  title={`Remove ${r.ticker}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r.ticker);
                  }}
                >
                  ×
                </button>
                <div className="ss-hold-top">
                  <div>
                    <div className="ss-hold-name">{r.name}</div>
                    <div className="ss-hold-meta">{r.ticker} · {r.qty} sh @ {inr(r.avgPurchasePrice)}</div>
                  </div>
                  <span className={`ss-chip ${isGain ? "gain" : "loss"}`} style={{ fontSize: "11.5px", padding: "4px 10px" }}>
                    {pct(r.netChgPct)}
                  </span>
                </div>
                <div className="ss-hold-bottom">
                  <span className="ss-hold-value">{inr(r.currentValue)}</span>
                  <span className={`ss-hold-pnl ${isGain ? "gain" : "loss"}`}>{signed(r.pnl)}{inr(r.pnl)}</span>
                </div>
                {open && (
                  <div className="ss-hold-detail">
                    <span>Current Price {inr(r.currentPrice)}</span>
                    <span>Total Invested {inr(r.invested)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showAddForm && (
          <AddStockModal
            onClose={() => setShowAddForm(false)}
            onSubmit={handleAddStock}
            submitting={submitting}
            serverError={formError}
          />
        )}
      </div>
    </div>
  );
}
