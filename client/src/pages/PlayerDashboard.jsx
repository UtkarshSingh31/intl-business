import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { api } from '../lib/api.js';
import { DENOMINATIONS, formatCurrency } from '../lib/supabase.js';
import Topbar from '../components/shared/Topbar.jsx';
import { NoteCard } from '../components/shared/NoteComponents.jsx';
import SendTransactionModal from '../components/player/SendTransactionModal.jsx';
import PendingTransaction from '../components/player/PendingTransaction.jsx';
import TransactionHistory from '../components/player/TransactionHistory.jsx';
import toast from 'react-hot-toast';

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [inventory, setInventory] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [properties, setProperties] = useState([]);
  const [showSend, setShowSend] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const bump = () => setRefresh(p => p + 1);

  const loadAll = useCallback(async () => {
    try {
      const [roomData, invData, txnData, propData] = await Promise.all([
        api.getRoom(),
        api.getInventory(user.playerId),
        api.getTransactions(),
        api.getProperties(),
      ]);
      setRoom(roomData.room);
      setPlayers(roomData.players || []);
      const inv = {};
      (invData.inventory || []).forEach(i => { inv[i.denomination] = i.quantity; });
      setInventory(inv);
      setTransactions(txnData.transactions || []);
      setProperties(propData.properties || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  }, [user.playerId]);

  useEffect(() => { loadAll(); }, [loadAll, refresh]);

  useRealtime(user?.roomId, {
    onInventoryChange: bump,
    onTransactionChange: bump,
    onRoomChange: (p) => { if (p.new) setRoom(p.new); },
    onPropertiesChange: bump,
  });

  const totalBalance = DENOMINATIONS.reduce((s, d) => s + (inventory[d] || 0) * d, 0);

  // Pending incoming transactions for this player
  const pendingIncoming = transactions.filter(
    t => t.receiver_id === user.playerId && t.status === 'pending'
  );
  // My outgoing pending
  const pendingOutgoing = transactions.filter(
    t => t.sender_id === user.playerId && t.status === 'pending'
  );
  // My owned properties
  const myProperties = properties.filter(p => p.owner_id === user.playerId);

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p>Loading your wallet...</p>
    </div>
  );

  if (room?.status === 'setup') return (
    <div className="app-shell">
      <Topbar roomStatus="setup" />
      <div className="page-center" style={{ height: 'calc(100vh - 56px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏳</div>
          <h2 className="font-display" style={{ color: 'var(--gold)', marginBottom: 8 }}>Waiting for Banker</h2>
          <p className="text-secondary">The Banker is setting up the game. You'll be notified when it starts.</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="online-dot" />
            <span className="text-sm text-muted">Connected to room <span className="text-gold font-mono">{user.roomCode}</span></span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <Topbar roomStatus={room?.status} />
      <div className="main-content">
        <div className="player-layout">

          {/* Pending incoming alerts — always on top */}
          {pendingIncoming.map(txn => (
            <PendingTransaction
              key={txn.id} txn={txn}
              myInventory={inventory}
              onResolved={bump}
            />
          ))}

          {/* Outgoing pending notification */}
          {pendingOutgoing.map(txn => (
            <div key={txn.id} className="card card-sm" style={{ borderColor: 'var(--gold-dim)', background: 'var(--gold-glow)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm">📤 Waiting for <strong>{txn.receiver?.name}</strong> to accept {formatCurrency(txn.amount_sent)}</span>
                <span className="status-pill pending"><span className="dot" />Pending</span>
              </div>
            </div>
          ))}

          {/* Balance Hero */}
          <div className="balance-hero">
            <div className="balance-label">Total Balance</div>
            <div className="balance-amount">{formatCurrency(totalBalance)}</div>
            <div style={{ marginTop: 16 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setShowSend(true)}
                disabled={totalBalance === 0 || pendingOutgoing.length > 0}
              >
                💸 Send Payment
              </button>
              {pendingOutgoing.length > 0 && (
                <p className="text-xs text-muted" style={{ marginTop: 6 }}>Resolve pending transaction first</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>
              💼 Wallet
            </button>
            <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              📋 History
              {transactions.filter(t => t.status !== 'pending').length > 0 && (
                <span className="status-pill accepted" style={{ padding: '1px 6px', fontSize: '0.7rem', marginLeft: 4 }}>
                  {transactions.filter(t => t.status !== 'pending').length}
                </span>
              )}
            </button>
            <button className={`tab-btn ${activeTab === 'properties' ? 'active' : ''}`} onClick={() => setActiveTab('properties')}>
              🏠 Properties
              {myProperties.length > 0 && (
                <span className="status-pill accepted" style={{ padding: '1px 6px', fontSize: '0.7rem', marginLeft: 4 }}>
                  {myProperties.length}
                </span>
              )}
            </button>
          </div>

          {/* Wallet tab */}
          {activeTab === 'wallet' && (
            <div className="card">
              <div className="section-title"><span className="icon">💵</span>Your Notes</div>
              <div className="grid-notes">
                {DENOMINATIONS.map(d => (
                  <NoteCard key={d} denomination={d} quantity={inventory[d] || 0} />
                ))}
              </div>
            </div>
          )}

          {/* History tab */}
          {activeTab === 'history' && (
            <div className="card">
              <div className="section-title"><span className="icon">📋</span>Transaction History</div>
              <TransactionHistory
                transactions={transactions.filter(t => t.status !== 'pending')}
                myPlayerId={user.playerId}
              />
            </div>
          )}

          {/* Properties tab */}
          {activeTab === 'properties' && (
            <div className="card">
              <div className="section-title"><span className="icon">🏠</span>Your Properties</div>
              {myProperties.length === 0 ? (
                <div className="empty-state"><div className="icon">🏚️</div><p>No properties owned yet</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myProperties.map(prop => (
                    <div key={prop.id} className="card card-elevated card-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{prop.name}</div>
                          {prop.country && <div className="text-xs text-muted">{prop.country}</div>}
                        </div>
                        {prop.sold_price && (
                          <div className="font-mono text-green">{formatCurrency(prop.sold_price)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {showSend && (
        <SendTransactionModal
          players={players}
          myInventory={inventory}
          myName={user.name}
          onClose={() => setShowSend(false)}
          onSent={bump}
        />
      )}
    </div>
  );
}
