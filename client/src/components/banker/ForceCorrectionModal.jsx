import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api.js';
import { DENOMINATIONS, formatCurrency } from '../../lib/supabase.js';
import { NoteChip } from '../shared/NoteComponents.jsx';

export default function ForceCorrectionModal({ players, onClose, onDone }) {
  const [playerId, setPlayerId] = useState('');
  const [denomination, setDenomination] = useState('');
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const activePlayers = players.filter(p => p.player_type !== 'bank');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerId || !denomination || newQty === '') return;
    setLoading(true);
    try {
      await api.forceCorrection({ playerId, denomination: parseInt(denomination), newQuantity: parseInt(newQty), reason });
      toast.success('Correction applied');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          <span>🔧</span> Force Correction
        </div>
        <div className="alert alert-warning">
          Use sparingly. This bypasses normal transaction flow and is logged permanently.
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Player</label>
            <select className="input" value={playerId} onChange={e => setPlayerId(e.target.value)} required>
              <option value="">Select player...</option>
              {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Denomination</label>
            <select className="input" value={denomination} onChange={e => setDenomination(e.target.value)} required>
              <option value="">Select denomination...</option>
              {DENOMINATIONS.map(d => <option key={d} value={d}>₹{d.toLocaleString('en-IN')}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">New Quantity</label>
            <input className="input input-mono" type="number" min="0" max="32" value={newQty}
              onChange={e => setNewQty(e.target.value)} placeholder="0" required />
          </div>
          <div className="input-group">
            <label className="input-label">Reason (optional)</label>
            <input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Board error correction" />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" className="btn btn-ghost w-full" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger w-full" disabled={loading}>
              {loading ? <><span className="spinner" />Applying...</> : 'Apply Correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
