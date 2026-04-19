import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api.js';
import { DENOMINATIONS, formatCurrency, NOTE_COLORS } from '../../lib/supabase.js';
import { NoteCard } from '../shared/NoteComponents.jsx';
import toast from 'react-hot-toast';

export default function InventoryOverview({ players, refresh }) {
  const [inventories, setInventories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.getAllInventories();
      setInventories(data.inventories || []);
    } catch (err) {
      toast.error('Failed to load inventories');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refresh]);

  // Group by player
  const byPlayer = {};
  inventories.forEach(inv => {
    const pid = inv.player_id;
    if (!byPlayer[pid]) byPlayer[pid] = { player: inv.players, notes: {} };
    byPlayer[pid].notes[inv.denomination] = inv.quantity;
  });

  const getTotal = (notes) =>
    DENOMINATIONS.reduce((s, d) => s + (notes[d] || 0) * d, 0);

  if (loading) return <div className="flex items-center gap-2 text-muted"><span className="spinner" />Loading inventories...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(byPlayer).map(([pid, { player, notes }]) => {
        const total = getTotal(notes);
        const isBank = player?.player_type === 'bank';
        const isSelected = selected === pid;
        return (
          <div key={pid}>
            <div
              className={`player-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelected(isSelected ? null : pid)}
              style={isBank ? { borderColor: 'var(--gold-dim)' } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="player-avatar" style={isBank ? { background: 'var(--gold-glow)' } : {}}>
                  {isBank ? '🏦' : player?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="player-name truncate">{isBank ? 'Bank' : player?.name}</div>
                  <div className="player-balance">{formatCurrency(total)}</div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{isSelected ? '▲' : '▼'}</span>
              </div>
              {/* Mini note summary */}
              <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                {DENOMINATIONS.map(d => notes[d] > 0 && (
                  <span key={d} className="note-chip" style={{
                    background: `${NOTE_COLORS[d].bg}22`,
                    color: NOTE_COLORS[d].text,
                    border: `1px solid ${NOTE_COLORS[d].bg}44`,
                    fontSize: '0.72rem'
                  }}>
                    {notes[d]}×₹{d >= 1000 ? `${d/1000}K` : d}
                  </span>
                ))}
              </div>
            </div>
            {/* Expanded detail */}
            {isSelected && (
              <div className="card card-elevated card-sm" style={{ marginTop: 4, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
                <div className="grid-notes">
                  {DENOMINATIONS.map(d => <NoteCard key={d} denomination={d} quantity={notes[d] || 0} compact />)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
