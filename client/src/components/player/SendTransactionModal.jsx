import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api.js';
import { DENOMINATIONS, formatCurrency, NOTE_COLORS } from '../../lib/supabase.js';
import { NoteChip } from '../shared/NoteComponents.jsx';

export default function SendTransactionModal({ players, myInventory, myName, onClose, onSent }) {
  const [receiverId, setReceiverId] = useState('');
  const [selectedNotes, setSelectedNotes] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const otherPlayers = players.filter(p => p.name !== myName);
  const total = DENOMINATIONS.reduce((s, d) => s + (selectedNotes[d] || 0) * d, 0);

  const setNote = (denom, qty) => {
    const max = myInventory[denom] || 0;
    const val = Math.max(0, Math.min(max, qty));
    setSelectedNotes(prev => ({ ...prev, [denom]: val }));
  };

  const handleSend = async () => {
    if (!receiverId) { toast.error('Select a recipient'); return; }
    if (total === 0) { toast.error('Select at least one note'); return; }
    setLoading(true);
    try {
      const notes = {};
      DENOMINATIONS.forEach(d => { if ((selectedNotes[d] || 0) > 0) notes[d] = selectedNotes[d]; });
      await api.sendTransaction({ receiverId, notes, message });
      toast.success(`Sent ${formatCurrency(total)} — awaiting acceptance`);
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const hasNotes = DENOMINATIONS.some(d => (myInventory[d] || 0) > 0);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">📤 Send Payment</div>

        {!hasNotes && (
          <div className="alert alert-warning">You have no notes to send.</div>
        )}

        <div className="input-group">
          <label className="input-label">Recipient</label>
          <select className="input" value={receiverId} onChange={e => setReceiverId(e.target.value)}>
            <option value="">Choose recipient...</option>
            {otherPlayers.map(p => (
              <option key={p.id} value={p.id}>
                {p.player_type === 'bank' ? '🏦 Bank' : `👤 ${p.name}`}
              </option>
            ))}
          </select>
        </div>

        {/* Note selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <label className="input-label">Notes to Send</label>
          {DENOMINATIONS.map(d => {
            const available = myInventory[d] || 0;
            const selected = selectedNotes[d] || 0;
            if (available === 0) return null;
            const cfg = NOTE_COLORS[d];
            return (
              <div key={d} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `${cfg.bg}11`, border: `1px solid ${cfg.bg}33`,
                borderRadius: 8, padding: '10px 14px'
              }}>
                <div>
                  <span className="font-mono" style={{ color: cfg.text, fontWeight: 600 }}>
                    ₹{d.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-muted" style={{ marginLeft: 8 }}>have {available}</span>
                </div>
                <div className="stepper">
                  <button className="stepper-btn" onClick={() => setNote(d, selected - 1)} disabled={selected <= 0}>−</button>
                  <span className="stepper-val">{selected}</span>
                  <button className="stepper-btn" onClick={() => setNote(d, selected + 1)} disabled={selected >= available}>+</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="input-group">
          <label className="input-label">Message (optional)</label>
          <input className="input" placeholder="e.g. Rent for Tokyo" value={message} onChange={e => setMessage(e.target.value)} />
        </div>

        {/* Summary */}
        {total > 0 && (
          <div style={{
            background: 'var(--gold-glow)', border: '1px solid var(--gold-dim)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16
          }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Total sending:</span>
              <span className="font-display text-gold font-bold" style={{ fontSize: '1.1rem' }}>{formatCurrency(total)}</span>
            </div>
            <div className="flex gap-2" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              {DENOMINATIONS.map(d => (selectedNotes[d] || 0) > 0 &&
                <NoteChip key={d} denomination={d} quantity={selectedNotes[d]} />
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button className="btn btn-ghost w-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary w-full" onClick={handleSend} disabled={loading || total === 0 || !receiverId}>
            {loading ? <><span className="spinner" />Sending...</> : `Send ${formatCurrency(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
