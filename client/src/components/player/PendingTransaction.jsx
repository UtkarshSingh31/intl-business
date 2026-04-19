import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api.js';
import { DENOMINATIONS, formatCurrency, NOTE_COLORS } from '../../lib/supabase.js';
import { NoteChip } from '../shared/NoteComponents.jsx';

export default function PendingTransaction({ txn, myInventory, onResolved }) {
  const [owedAmount, setOwedAmount] = useState(txn.amount_sent);
  const [showOwed, setShowOwed] = useState(false);
  const [loading, setLoading] = useState(false);

  const sentNotes = txn.notes_sent || {};
  const total = txn.amount_sent;
  const change = total - owedAmount;

  // Check if we can make change from our inventory
  const canMakeChange = () => {
    if (change <= 0) return true;
    const sortedDenoms = [...DENOMINATIONS].sort((a, b) => b - a);
    let remaining = change;
    const tempInv = { ...myInventory };
    for (const d of sortedDenoms) {
      if (remaining <= 0) break;
      const avail = tempInv[d] || 0;
      if (avail === 0 || d > remaining) continue;
      const needed = Math.min(Math.floor(remaining / d), avail);
      if (needed > 0) { remaining -= needed * d; }
    }
    return remaining === 0;
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      // If custom owed amount set, update it first
      if (owedAmount !== txn.amount_sent) {
        await api.setOwedAmount(txn.id, owedAmount);
      }
      const result = await api.acceptTransaction(txn.id);
      if (result.changeAmount > 0) {
        toast.success(`Accepted! Gave back ${formatCurrency(result.changeAmount)} change.`);
      } else {
        toast.success('Payment accepted!');
      }
      onResolved?.();
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.rejectTransaction(txn.id);
      toast('Payment rejected. Notes returned.', { icon: '↩️' });
      onResolved?.();
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const changeWarning = change > 0 && !canMakeChange();

  return (
    <div className="pending-banner" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold" style={{ color: 'var(--gold)' }}>💸 Incoming Payment</span>
          <span className="text-xs text-secondary" style={{ marginLeft: 8 }}>from {txn.sender?.name}</span>
        </div>
        <span className="status-pill pending"><span className="dot" />Pending</span>
      </div>

      {/* Notes being sent */}
      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
        {Object.entries(sentNotes).map(([d, q]) => q > 0 && (
          <NoteChip key={d} denomination={parseInt(d)} quantity={q} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-secondary text-sm">Total received:</span>
        <span className="font-display text-gold font-bold" style={{ fontSize: '1.2rem' }}>{formatCurrency(total)}</span>
      </div>

      {txn.message && (
        <div className="text-xs text-secondary" style={{ fontStyle: 'italic' }}>"{txn.message}"</div>
      )}

      {/* Owed amount (overpayment handling) */}
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowOwed(p => !p)} style={{ fontSize: '0.75rem' }}>
          {showOwed ? '▲' : '▼'} Set actual amount owed (for change)
        </button>
        {showOwed && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Actual amount owed</label>
              <input className="input input-mono" type="number" min="0" max={total}
                value={owedAmount} onChange={e => setOwedAmount(Math.min(total, parseInt(e.target.value) || 0))} />
            </div>
            {change > 0 && (
              <div className={`alert ${changeWarning ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom: 0 }}>
                {changeWarning
                  ? `⚠️ You can't make ${formatCurrency(change)} change — transaction will fail`
                  : `✅ You'll give back ${formatCurrency(change)} change automatically`
                }
              </div>
            )}
          </div>
        )}
      </div>

      {changeWarning && (
        <div className="alert alert-danger">
          ⚠️ Insufficient notes for change. Ask sender to adjust their payment or the Banker for help.
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn btn-danger w-full" onClick={handleReject} disabled={loading}>
          ❌ Reject
        </button>
        <button className="btn btn-success w-full" onClick={handleAccept} disabled={loading || changeWarning}>
          {loading ? <><span className="spinner" />Processing...</> : '✅ Accept'}
        </button>
      </div>
    </div>
  );
}
