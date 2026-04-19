import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api.js';
import { DENOMINATIONS, GLOBAL_SUPPLY, formatCurrency } from '../../lib/supabase.js';
import { NoteChip, SupplyBar } from '../shared/NoteComponents.jsx';

export default function SetupPanel({ players, onGameStarted }) {
  const [bankInventory, setBankInventory] = useState({});
  const [distributions, setDistributions] = useState({}); // { playerId: { denom: qty } }
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  // Init bank with full global supply
  useEffect(() => {
    const inv = {};
    DENOMINATIONS.forEach(d => { inv[d] = GLOBAL_SUPPLY[d]; });
    setBankInventory(inv);
  }, []);

  // Init distributions for each player
  useEffect(() => {
    const dist = {};
    players.forEach(p => {
      if (p.player_type !== 'bank') {
        dist[p.id] = {};
        DENOMINATIONS.forEach(d => { dist[p.id][d] = 0; });
      }
    });
    setDistributions(dist);
  }, [players]);

  // Compute how many of each denom have been allocated to players
  const allocatedByDenom = useCallback(() => {
    const totals = {};
    DENOMINATIONS.forEach(d => { totals[d] = 0; });
    Object.values(distributions).forEach(playerDist => {
      DENOMINATIONS.forEach(d => { totals[d] += (playerDist[d] || 0); });
    });
    return totals;
  }, [distributions]);

  const setDist = (playerId, denom, qty) => {
    const allocated = allocatedByDenom();
    const currentForPlayer = distributions[playerId]?.[denom] || 0;
    const otherPlayersTotal = allocated[denom] - currentForPlayer;
    const maxAllowed = GLOBAL_SUPPLY[denom] - otherPlayersTotal;

    if (qty > maxAllowed) {
      toast.error(`Only ${maxAllowed} notes of ₹${denom} available`);
      return;
    }

    setDistributions(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [denom]: qty }
    }));
  };

  const setEqualDistribution = () => {
    const numPlayers = players.filter(p => p.player_type !== 'bank').length;
    if (numPlayers === 0) return;
    const dist = {};
    players.filter(p => p.player_type !== 'bank').forEach(p => {
      dist[p.id] = {};
      DENOMINATIONS.forEach(d => {
        dist[p.id][d] = Math.floor(GLOBAL_SUPPLY[d] / (numPlayers + 1)); // +1 for bank reserve
      });
    });
    setDistributions(dist);
    toast.success('Equal distribution applied');
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const distArray = Object.entries(distributions).map(([playerId, notes]) => ({
        playerId, notes
      }));
      await api.setupDistribution(distArray);
      setApplied(true);
      toast.success('Distribution applied! Ready to start game.');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await api.startGame();
      toast.success('Game started! 🎲');
      onGameStarted?.();
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const allocated = allocatedByDenom();
  const activePlayers = players.filter(p => p.player_type !== 'bank');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="card card-gold">
        <div className="section-title">
          <span className="icon">⚙️</span>Setup Phase
        </div>
        <p className="text-secondary text-sm">
          Distribute starting notes to each player. The remaining notes stay with the Bank.
          Click <strong style={{ color: 'var(--gold)' }}>Apply Distribution</strong> to confirm, then <strong style={{ color: 'var(--gold)' }}>Start Game</strong>.
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={setEqualDistribution}>⚖️ Equal Split</button>
          {!applied ? (
            <button className="btn btn-primary" onClick={handleApply} disabled={loading || activePlayers.length === 0}>
              {loading ? <><span className="spinner" />Applying...</> : '✅ Apply Distribution'}
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleStart} disabled={loading}>
              {loading ? <><span className="spinner" />Starting...</> : '🎲 Start Game'}
            </button>
          )}
        </div>
        {activePlayers.length === 0 && (
          <div className="alert alert-warning" style={{ marginTop: 12 }}>
            No players have joined yet. Share the room code and player password.
          </div>
        )}
      </div>

      {/* Global Supply Overview */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 12 }}>
          <span className="icon">📊</span>Global Supply
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {DENOMINATIONS.map(d => (
            <SupplyBar key={d} denomination={d} used={allocated[d]} max={GLOBAL_SUPPLY[d]} />
          ))}
        </div>
      </div>

      {/* Per-player distribution */}
      {activePlayers.map(player => {
        const playerDist = distributions[player.id] || {};
        const playerTotal = DENOMINATIONS.reduce((s, d) => s + (playerDist[d] || 0) * d, 0);
        return (
          <div key={player.id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="player-avatar">{player.name[0].toUpperCase()}</div>
                <div>
                  <div className="player-name">{player.name}</div>
                  <div className="player-balance">{formatCurrency(playerTotal)}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DENOMINATIONS.map(d => {
                const currentAlloc = allocatedByDenom();
                const currentForPlayer = playerDist[d] || 0;
                const othersAlloc = currentAlloc[d] - currentForPlayer;
                const maxForPlayer = GLOBAL_SUPPLY[d] - othersAlloc;
                return (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <NoteChip denomination={d} quantity={currentForPlayer} />
                    <div className="stepper">
                      <button className="stepper-btn" onClick={() => setDist(player.id, d, Math.max(0, currentForPlayer - 1))} disabled={currentForPlayer <= 0}>−</button>
                      <span className="stepper-val">{currentForPlayer}</span>
                      <button className="stepper-btn" onClick={() => setDist(player.id, d, currentForPlayer + 1)} disabled={currentForPlayer >= maxForPlayer}>+</button>
                    </div>
                    <span className="text-xs text-muted font-mono">max {maxForPlayer}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
