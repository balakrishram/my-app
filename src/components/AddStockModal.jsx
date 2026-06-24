// AddStockModal.jsx
// The "Add a stock" dialog box, pulled out of Portfolio.jsx so it can be
// edited on its own.
//
// Field changes from the old version:
//   Symbol      -> Ticker
//   Avg cost    -> Avg Purchase Price
//   LTP         -> Current Price
//   Day chg %   -> removed (field no longer exists)
//   Total Invested -> NEW, read-only, auto-calculated as qty * avgPurchasePrice
//
// UI fixes:
//   - Dialog can now scroll on small/short screens instead of clipping.
//   - Added a visible "×" close button in the header.
//   - Esc key closes the dialog.
//   - Cancel button now has a visible border (it used to blend into the
//     dialog background and was hard to see).

import { useEffect, useState } from "react";
import "./AddStockModal.css";

const EMPTY_FORM = { ticker: "", name: "", qty: "", avgPurchasePrice: "", currentPrice: "" };

export default function AddStockModal({ onClose, onSubmit, submitting, serverError }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [localError, setLocalError] = useState(null);

  // Close on Escape.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const qtyNum = Number(form.qty) || 0;
  const avgNum = Number(form.avgPurchasePrice) || 0;
  const totalInvested = qtyNum * avgNum;

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);

    const { ticker, name, qty, avgPurchasePrice, currentPrice } = form;
    if (!ticker.trim() || !name.trim() || !qty || !avgPurchasePrice || !currentPrice) {
      setLocalError("Ticker, name, quantity, avg purchase price, and current price are all required.");
      return;
    }

    onSubmit({
      ticker: ticker.trim().toUpperCase(),
      name: name.trim(),
      qty: Number(qty),
      avgPurchasePrice: Number(avgPurchasePrice),
      currentPrice: Number(currentPrice),
    });
  }

  const error = localError || serverError;

  return (
    <div className="ss-modal-overlay" onClick={onClose}>
      <form className="ss-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="ss-modal-head">
          <h3>Add a stock</h3>
          <button type="button" className="ss-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <label>
          Ticker
          <input value={form.ticker} onChange={update("ticker")} placeholder="e.g. INFY" autoFocus />
        </label>
        <label>
          Name
          <input value={form.name} onChange={update("name")} placeholder="e.g. Infosys" />
        </label>
        <div className="ss-modal-row">
          <label>
            Quantity
            <input type="number" step="any" value={form.qty} onChange={update("qty")} />
          </label>
          <label>
            Avg Purchase Price
            <input type="number" step="any" value={form.avgPurchasePrice} onChange={update("avgPurchasePrice")} />
          </label>
        </div>
        <label>
          Current Price
          <input type="number" step="any" value={form.currentPrice} onChange={update("currentPrice")} />
        </label>

        <div className="ss-modal-total">
          <span>Total Invested</span>
          <strong>
            ₹{totalInvested.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>

        {error && <div className="ss-modal-error">{error}</div>}

        <div className="ss-modal-actions">
          <button type="button" className="ss-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ss-btn-solid" disabled={submitting}>
            {submitting ? "Adding…" : "Add stock"}
          </button>
        </div>
      </form>
    </div>
  );
}
