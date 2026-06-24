// Portfolio.jsx
// Modern light redesign. Styles are scoped under .ss-* classes in the
// <style> block below — safe to drop into any existing app shell.

import { useState } from "react";
import { holdings } from "../data/holdings";

const inr = (n, opts = {}) =>
  "₹" +
  Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  });

const signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "");
const pct = (n) => `${signed(n)}${Math.abs(n).toFixed(2)}%`;

// Teal → indigo → violet → amber sweep, assigned by allocation size so the
// biggest holdings read as "brand" colors and smaller ones fan out.
const PALETTE = [
  "#1F9E72", "#2EB67D", "#4FC1A6", "#3AAED8", "#4C8BF5",
  "#7C6CF0", "#A56EE0", "#E07BC2", "#F2994A",
];

function summarize(rows) {
  const invested = rows.reduce((s, r) => s + r.invested, 0);
  const currentValue = rows.reduce((s, r) => s + r.currentValue, 0);
  const pnl = currentValue - invested;
  const pnlPct = (pnl / invested) * 100;
  const dayPnl = rows.reduce((s, r) => {
    const factor = r.dayChgPct / 100 / (1 + r.dayChgPct / 100);
    return s + r.currentValue * factor;
  }, 0);
  const dayPct = (dayPnl / currentValue) * 100;
  return { invested, currentValue, pnl, pnlPct, dayPnl, dayPct };
}

function buildDonut(rows, total) {
  const r = 72;
  const c = 2 * Math.PI * r;
  const gap = c * 0.008;
  let cum = 0;
  return rows.map((row, i) => {
    const fraction = row.currentValue / total;
    const segLen = Math.max(fraction * c - gap, 0);
    const dasharray = `${segLen} ${c - segLen}`;
    const dashoffset = -(cum * c);
    cum += fraction;
    return { ...row, color: PALETTE[i % PALETTE.length], fraction, dasharray, dashoffset, r, c };
  });
}

export default function Portfolio() {
  const [openSymbol, setOpenSymbol] = useState(null);
  const { invested, currentValue, pnl, pnlPct, dayPnl, dayPct } = summarize(holdings);
  const gain = pnl >= 0;
  const dayGain = dayPnl >= 0;

  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  const donutSegments = buildDonut(sorted, currentValue);
  const colorOf = (symbol) => donutSegments.find((s) => s.symbol === symbol)?.color;

  const best = [...holdings].sort((a, b) => b.netChgPct - a.netChgPct)[0];
  const worst = [...holdings].sort((a, b) => a.netChgPct - b.netChgPct)[0];

  return (
    <div className="ss-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .ss-app {
          --bg: #fafafa;
          --surface: #ffffff;
          --border: #ececea;
          --ink: #16181c;
          --mist: #7a7e85;
          --mist-soft: #aeb1b6;
          --gain: #1c9a5b;
          --gain-soft: rgba(28,154,91,0.10);
          --loss: #e0405a;
          --loss-soft: rgba(224,64,90,0.10);
          --brand: #1c9a5b;
          --shadow-sm: 0 1px 2px rgba(20,20,20,0.04);
          --shadow-md: 0 12px 28px -12px rgba(20,20,20,0.14);
          font-family: 'Inter', -apple-system, sans-serif;
          background: var(--bg);
          color: var(--ink);
          min-height: 100%;
          padding: 40px 24px 80px;
          box-sizing: border-box;
        }
        .ss-app * { box-sizing: border-box; }
        .ss-shell { max-width: 980px; margin: 0 auto; }

        .ss-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        .ss-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          font-size: 19px;
          letter-spacing: -0.01em;
        }
        .ss-brand-dot {
          width: 11px; height: 11px;
          border-radius: 4px;
          background: var(--brand);
          transform: rotate(45deg);
        }
        .ss-sync {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--mist);
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 7px 14px;
          border-radius: 100px;
        }
        .ss-sync-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--gain);
          box-shadow: 0 0 0 3px var(--gain-soft);
        }

        .ss-hero { margin-bottom: 32px; }
        .ss-hero-eyebrow {
          font-size: 13px; font-weight: 600; color: var(--mist);
          margin-bottom: 6px;
        }
        .ss-hero-value {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          font-size: 56px;
          letter-spacing: -0.02em;
          line-height: 1;
          margin: 0 0 16px;
        }
        .ss-hero-meta {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
          font-size: 14px;
        }
        .ss-chip {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 500;
          font-size: 13px;
          padding: 6px 12px;
          border-radius: 100px;
        }
        .ss-chip.gain { background: var(--gain-soft); color: var(--gain); }
        .ss-chip.loss { background: var(--loss-soft); color: var(--loss); }
        .ss-hero-sub { color: var(--mist); }
        .ss-hero-sub b { color: var(--ink); font-weight: 600; }

        .ss-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .ss-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }
        .ss-card-title {
          font-size: 13px; font-weight: 600; color: var(--mist);
          margin-bottom: 18px;
        }

        .ss-donut-row { display: flex; align-items: center; gap: 24px; }
        .ss-donut-wrap { position: relative; width: 164px; height: 164px; flex-shrink: 0; }
        .ss-donut-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .ss-donut-value {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700; font-size: 17px;
        }
        .ss-donut-label { font-size: 10.5px; color: var(--mist); margin-top: 2px; }

        .ss-legend { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 0; }
        .ss-legend li {
          display: flex; align-items: center; gap: 9px;
          font-size: 13px; padding: 6px 0;
        }
        .ss-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .ss-legend-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ss-legend-pct {
          font-family: 'IBM Plex Mono', monospace;
          color: var(--mist);
          font-size: 12px;
        }

        .ss-stat-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 11px 0;
          border-bottom: 1px solid var(--border);
          font-size: 14px;
        }
        .ss-stat-row:last-child { border-bottom: none; }
        .ss-stat-row span { color: var(--mist); }
        .ss-stat-row strong {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 500; font-size: 13px;
        }
        .ss-stat-row strong.gain { color: var(--gain); }
        .ss-stat-row strong.loss { color: var(--loss); }

        .ss-section-head {
          display: flex; align-items: baseline; justify-content: space-between;
          margin: 36px 0 14px 2px;
        }
        .ss-section-head h2 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 18px; font-weight: 700; margin: 0;
        }
        .ss-section-head span { font-size: 13px; color: var(--mist); }

        .ss-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .ss-hold-card {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 18px 18px 16px;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: box-shadow 0.18s ease, transform 0.18s ease;
        }
        .ss-hold-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .ss-hold-accent {
          position: absolute; top: 0; left: 18px; right: 18px; height: 3px;
          border-radius: 0 0 3px 3px;
        }
        .ss-hold-top {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 14px;
        }
        .ss-hold-name { font-weight: 600; font-size: 14.5px; }
        .ss-hold-meta { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--mist); margin-top: 3px; }
        .ss-hold-bottom { display: flex; align-items: baseline; justify-content: space-between; }
        .ss-hold-value { font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 500; }
        .ss-hold-pnl { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; font-weight: 500; }
        .ss-hold-pnl.gain { color: var(--gain); }
        .ss-hold-pnl.loss { color: var(--loss); }
        .ss-hold-detail {
          margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);
          display: flex; gap: 18px; flex-wrap: wrap;
          font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--mist);
        }

        @media (max-width: 680px) {
          .ss-grid { grid-template-columns: 1fr; }
          .ss-cards { grid-template-columns: 1fr; }
          .ss-hero-value { font-size: 40px; }
          .ss-donut-row { flex-direction: column; align-items: stretch; }
        }
      `}</style>

      <div className="ss-shell">
        <div className="ss-nav">
          <div className="ss-brand"><span className="ss-brand-dot" />StockSage</div>
          <div className="ss-sync"><span className="ss-sync-dot" />Synced just now</div>
        </div>

        <div className="ss-hero">
          <div className="ss-hero-eyebrow">Current value</div>
          <h1 className="ss-hero-value">{inr(currentValue)}</h1>
          <div className="ss-hero-meta">
            <span className={`ss-chip ${gain ? "gain" : "loss"}`}>
              {signed(pnl)}{inr(pnl)} ({pct(pnlPct)})
            </span>
            <span className="ss-hero-sub">Invested <b>{inr(invested)}</b></span>
            <span className="ss-hero-sub">
              Today <b style={{ color: dayGain ? "var(--gain)" : "var(--loss)" }}>{signed(dayPnl)}{inr(dayPnl)} ({pct(dayPct)})</b>
            </span>
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
                        key={s.symbol}
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
                  <li key={s.symbol}>
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
            <div className="ss-stat-row"><span>Today's move</span><strong className={dayGain ? "gain" : "loss"}>{signed(dayPnl)}{inr(dayPnl)}</strong></div>
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
            const open = openSymbol === r.symbol;
            return (
              <div
                key={r.symbol}
                className="ss-hold-card"
                onClick={() => setOpenSymbol(open ? null : r.symbol)}
              >
                <div className="ss-hold-accent" style={{ background: colorOf(r.symbol) }} />
                <div className="ss-hold-top">
                  <div>
                    <div className="ss-hold-name">{r.name}</div>
                    <div className="ss-hold-meta">{r.symbol} · {r.qty} sh @ {inr(r.avgCost)}</div>
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
                    <span>LTP {inr(r.ltp)}</span>
                    <span>Invested {inr(r.invested)}</span>
                    <span>Today {pct(r.dayChgPct)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
