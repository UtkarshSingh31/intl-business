import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

const TAB = { CREATE: 'create', BANKER: 'banker', PLAYER: 'player' };

export default function LandingPage() {
  const [tab, setTab] = useState(TAB.CREATE);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Create Room form
  const [createForm, setCreateForm] = useState({ roomName: '', bankerPassword: '', playerPassword: '' });
  // Join banker form
  const [bankerForm, setBankerForm] = useState({ roomCode: '', password: '' });
  // Join player form
  const [playerForm, setPlayerForm] = useState({ roomCode: '', password: '', playerName: '' });

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.createRoom(createForm);
      login(data.token, {
        role: 'banker', roomId: data.room.id, roomCode: data.room.code,
        roomName: data.room.name, playerId: data.bankId, name: 'Banker'
      });
      toast.success(`Room created! Code: ${data.room.code}`);
      navigate('/banker');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const handleJoinBanker = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.joinBanker(bankerForm);
      login(data.token, {
        role: 'banker', roomId: data.room.id, roomCode: data.room.code,
        roomName: data.room.name, playerId: null, name: 'Banker'
      });
      navigate('/banker');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const handleJoinPlayer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.joinPlayer(playerForm);
      login(data.token, {
        role: 'player', roomId: data.room.id, roomCode: data.room.code,
        roomName: data.room.name, playerId: data.player.id, name: data.player.name
      });
      navigate('/play');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="page-center" style={{ background: 'var(--bg-deep)' }}>
      <div className="landing-hero">
        {/* Logo */}
        <div style={{ marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--gold-glow)', border: '1px solid var(--gold-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '1.5rem'
          }}>🌍</div>
        </div>
        <h1 className="landing-logo">International<br />Business</h1>
        <p className="landing-sub">Private Digital Ledger · Real-time · Anti-cheat</p>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab-btn ${tab === TAB.CREATE ? 'active' : ''}`} onClick={() => setTab(TAB.CREATE)}>Create Room</button>
          <button className={`tab-btn ${tab === TAB.BANKER ? 'active' : ''}`} onClick={() => setTab(TAB.BANKER)}>Join as Banker</button>
          <button className={`tab-btn ${tab === TAB.PLAYER ? 'active' : ''}`} onClick={() => setTab(TAB.PLAYER)}>Join as Player</button>
        </div>

        <div className="card card-gold">
          {/* CREATE ROOM */}
          {tab === TAB.CREATE && (
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label className="input-label">Room Name</label>
                <input className="input" placeholder="e.g. Friday Night Game" value={createForm.roomName}
                  onChange={e => setCreateForm(p => ({ ...p, roomName: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label className="input-label">Banker Password</label>
                <input className="input" type="password" placeholder="Secret password for banker access"
                  value={createForm.bankerPassword}
                  onChange={e => setCreateForm(p => ({ ...p, bankerPassword: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label className="input-label">Player Password</label>
                <input className="input" type="password" placeholder="Shared password for all players"
                  value={createForm.playerPassword}
                  onChange={e => setCreateForm(p => ({ ...p, playerPassword: e.target.value }))} required />
              </div>
              <button className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><span className="spinner" />Creating...</> : '🎲 Create Game Room'}
              </button>
            </form>
          )}

          {/* JOIN BANKER */}
          {tab === TAB.BANKER && (
            <form onSubmit={handleJoinBanker}>
              <div className="input-group">
                <label className="input-label">Room Code</label>
                <input className="input input-mono" placeholder="ABC123" value={bankerForm.roomCode}
                  onChange={e => setBankerForm(p => ({ ...p, roomCode: e.target.value.toUpperCase() }))} required />
              </div>
              <div className="input-group">
                <label className="input-label">Banker Password</label>
                <input className="input" type="password" placeholder="Banker password"
                  value={bankerForm.password}
                  onChange={e => setBankerForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              <button className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><span className="spinner" />Joining...</> : '🏦 Enter as Banker'}
              </button>
            </form>
          )}

          {/* JOIN PLAYER */}
          {tab === TAB.PLAYER && (
            <form onSubmit={handleJoinPlayer}>
              <div className="input-group">
                <label className="input-label">Room Code</label>
                <input className="input input-mono" placeholder="ABC123" value={playerForm.roomCode}
                  onChange={e => setPlayerForm(p => ({ ...p, roomCode: e.target.value.toUpperCase() }))} required />
              </div>
              <div className="input-group">
                <label className="input-label">Player Password</label>
                <input className="input" type="password" placeholder="Room password"
                  value={playerForm.password}
                  onChange={e => setPlayerForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label className="input-label">Your Name</label>
                <input className="input" placeholder="e.g. Priya, Rahul..." value={playerForm.playerName}
                  onChange={e => setPlayerForm(p => ({ ...p, playerName: e.target.value }))} required />
              </div>
              <button className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><span className="spinner" />Joining...</> : '🎮 Join Game'}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-muted" style={{ marginTop: 20 }}>
          Fixed global supply · Escrow transactions · Real-time sync
        </p>
      </div>
    </div>
  );
}
