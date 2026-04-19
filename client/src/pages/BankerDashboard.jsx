import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { api } from '../lib/api.js';
import { formatCurrency, DENOMINATIONS } from '../lib/supabase.js';
import Topbar from '../components/shared/Topbar.jsx';
import SetupPanel from '../components/banker/SetupPanel.jsx';
import InventoryOverview from '../components/banker/InventoryOverview.jsx';
import ForceCorrectionModal from '../components/banker/ForceCorrectionModal.jsx';
import PropertiesPanel from '../components/banker/PropertiesPanel.jsx';
import AuditLog from '../components/banker/AuditLog.jsx';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Properties', 'Audit Log'];

export default function BankerDashboard() {
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [tab, setTab] = useState('Overview');
  const [showCorrection, setShowCorrection] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);

  const bump = () => setRefresh(p => p + 1);

  const loadRoom = useCallback(async () => {
    try {
      const data = await api.getRoom();
      setRoom(data.room);
      setPlayers(data.players || []);
    } catch (err) {
      toast.error('Failed to load room');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  // Realtime
  useRealtime(user?.roomId, {
    onInventoryChange: bump,
    onPlayersChange: () => loadRoom(),
    onRoomChange: (p) => {
      if (p.new) setRoom(p.new);
    },
    onTransactionChange: bump,
    onAuditLog: bump,
    onPropertiesChange: bump,
  });

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p>Loading room...</p>
    </div>
  );

  const isSetup = room?.status === 'setup';
  const activePlayers = players.filter(p => p.player_type !== 'bank');
  const bankPlayer = players.find(p => p.player_type === 'bank');

  return (
    <div className="app-shell">
      <Topbar roomStatus={room?.status} />

      <div className="main-content">
        {isSetup ? (
          // Setup phase: full-width setup panel
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <SetupPanel players={players} onGameStarted={loadRoom} />
          </div>
        ) : (
          // Active game: banker layout
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {/* Stats row */}
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="card card-sm">
                <div className="text-xs text-muted text-uppercase" style={{ letterSpacing: '0.08em', marginBottom: 4 }}>Players</div>
                <div className="font-display text-gold" style={{ fontSize: '1.6rem' }}>{activePlayers.length}</div>
              </div>
              <div className="card card-sm">
                <div className="text-xs text-muted" style={{ letterSpacing: '0.08em', marginBottom: 4 }}>Room</div>
                <div className="font-mono text-gold" style={{ fontSize: '1.3rem', letterSpacing: '0.1em' }}>{room?.room_code}</div>
              </div>
              <div className="card card-sm flex items-center justify-between" style={{ cursor: 'pointer' }}
                onClick={() => setShowCorrection(true)}>
                <div>
                  <div className="text-xs text-muted" style={{ letterSpacing: '0.08em', marginBottom: 4 }}>Force Correction</div>
                  <div className="text-sm text-secondary">Adjust any player</div>
                </div>
                <span style={{ fontSize: '1.4rem' }}>🔧</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
              {/* Sidebar: all player inventories */}
              <div className="card" style={{ position: 'sticky', top: 0 }}>
                <div className="section-title" style={{ marginBottom: 14 }}>
                  <span className="icon">💼</span>All Inventories
                </div>
                <InventoryOverview players={players} refresh={refresh} />
              </div>

              {/* Main content tabs */}
              <div className="card">
                <div className="tabs">
                  {TABS.map(t => (
                    <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                      {t === 'Overview' && '📊 '}
                      {t === 'Properties' && '🏠 '}
                      {t === 'Audit Log' && '📋 '}
                      {t}
                    </button>
                  ))}
                </div>

                {tab === 'Overview' && (
                  <div>
                    <p className="text-secondary text-sm" style={{ marginBottom: 16 }}>
                      All players' note inventories. Click any player in the sidebar to expand their breakdown.
                    </p>
                    {/* Transaction alerts for banker */}
                    <TransactionAlerts roomId={user?.roomId} refresh={refresh} />
                  </div>
                )}
                {tab === 'Properties' && <PropertiesPanel players={players} refresh={refresh} />}
                {tab === 'Audit Log' && <AuditLog refresh={refresh} />}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCorrection && (
        <ForceCorrectionModal players={players} onClose={() => setShowCorrection(false)} onDone={bump} />
      )}
    </div>
  );
}

// Mini component: show change_failed alerts to banker
function TransactionAlerts({ roomId, refresh }) {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    api.getTransactions().then(d => {
      setAlerts((d.transactions || []).filter(t => t.status === 'change_failed'));
    }).catch(() => {});
  }, [refresh]);

  if (!alerts.length) return (
    <div className="empty-state" style={{ padding: 32 }}>
      <div className="icon">✅</div>
      <p>No alerts. Game running smoothly.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.map(txn => (
        <div key={txn.id} className="alert alert-danger">
          ⚠️ <strong>Change Failed</strong> — {txn.sender?.name} → {txn.receiver?.name}:
          sent {formatCurrency(txn.amount_sent)}, receiver couldn't make change. Banker intervention needed.
        </div>
      ))}
    </div>
  );
}
