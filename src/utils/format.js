// format.js
// Small display-formatting helpers shared across the portfolio UI.

export const inr = (n, opts = {}) =>
  "₹" +
  Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  });

export const signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "");

export const pct = (n) => `${signed(n)}${Math.abs(n).toFixed(2)}%`;
