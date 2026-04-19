import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { formatCurrency, NOTE_COLORS } from '../../lib/supabase.js';

const ACTION_ICONS = {
  ROOM_CREATED: '🏗️',
  GAME_STARTED: '🎲',
  SETUP_DISTRIBUTION: '💰',
  TRANSACTION_SENT: '📤',
  TRANSACTION_ACCEPTED: '✅',
  TRANSACTION_REJECTED: '❌',
  CHANGE_FAILED: '⚠️',
  FORCE_CORRECTION: '🔧',
  PROPERTY_ASSIGNED: '🏠',
};

const ACTION_COLORS = {
  TRANSACTION_ACCEPTED: 'var(--green)',
  TRANSACTION_REJECTED: 'var(--red)',
  CHANGE_FAILED: 'var(--red)',
  FORCE_CORRECTION: '#f5a623',
  GAME_STARTED: 'var(--gold)',
};

function renderDetails(action, details) {
  switch (action) {
    case 'TRANSACTION_SENT':
      return `Sent ${formatCurrency(details.amount)} → ${JSON.stringify(details.notes_sent)}`;
    case 'TRANSACTION_ACCEPTED':
      return `Net: ${formatCurrency(details.net_received)} | Change back: ${formatCurrency(details.amount_change || 0)}`;
    case 'TRANSACTION_REJECTED':
      return 'Notes returned to sender';
    case 'CHANGE_FAILED':
      return `Needed ₹${details.change_needed?.toLocaleString('en-IN')} change — insufficient notes`;
    case 'FORCE_CORRECTION':
      return `₹${details.denomination} → ${details.old_qty} to ${details.new_qty} (${details.delta > 0 ? '+' : ''}${details.delta}) ${details.reason ? `| "${details.reason}"` : ''}`;
    case 'SETUP_DISTRIBUTION':
      return `${details.distributions?.length || 0} player(s) received starting notes`;
    case 'PROPERTY_ASSIGNED':
      return `Property assigned ${details.sold_price ? `for ${formatCurrency(details.sold_price)}` : ''}`;
    default:
      return JSON.stringify(details).slice(0, 80);
  }
}

export default function AuditLog({ refresh }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      const data = await api.getAuditLog();
      setLogs(data.logs || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [refresh]);

  const filtered = filter === 'all' ? logs :
    logs.filter(l => {
      if (filter === 'transactions') return l.action_type.startsWith('TRANSACTION') || l.action_type === 'CHANGE_FAILED';
      if (filter === 'corrections') return l.action_type === 'FORCE_CORRECTION';
      return true;
    });

  if (loading) return <div className="flex items-center gap-2 text-muted"><span className="spinner" />Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Filter bar */}
      <div className="tabs" style={{ marginBottom: 12 }}>
        {['all', 'transactions', 'corrections'].map(f => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>No log entries yet</p></div>
      ) : (
        filtered.map(log => (
          <div key={log.id} className="log-item">
            <span className="log-time">
              {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="log-action" style={{ color: ACTION_COLORS[log.action_type] || 'var(--gold)' }}>
                {ACTION_ICONS[log.action_type] || '•'} {log.action_type.replace(/_/g, ' ')}
              </span>
              {log.players && <span className="text-xs" style={{ color: 'var(--blue)' }}>[{log.players.name}] </span>}
              <span className="log-detail">{renderDetails(log.action_type, log.details)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
