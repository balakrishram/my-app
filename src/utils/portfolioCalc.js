// portfolioCalc.js
// Aggregation + donut-chart geometry helpers for the holdings list.
// day-change has been removed (the field no longer exists on a holding).

// Teal → indigo → violet → amber sweep, assigned by allocation size so the
// biggest holdings read as "brand" colors and smaller ones fan out.
export const PALETTE = [
  "#1F9E72", "#2EB67D", "#4FC1A6", "#3AAED8", "#4C8BF5",
  "#7C6CF0", "#A56EE0", "#E07BC2", "#F2994A",
];

export function summarize(rows) {
  const invested = rows.reduce((s, r) => s + r.invested, 0);
  const currentValue = rows.reduce((s, r) => s + r.currentValue, 0);
  const pnl = currentValue - invested;
  const pnlPct = invested === 0 ? 0 : (pnl / invested) * 100;
  return { invested, currentValue, pnl, pnlPct };
}

export function buildDonut(rows, total) {
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
