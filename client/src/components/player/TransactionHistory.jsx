import { NoteChip } from '../shared/NoteComponents.jsx';
import { formatCurrency } from '../../lib/supabase.js';

export default function TransactionHistory({ transactions, myPlayerId }) {
  if (!transactions.length) return (
    <div className="empty-state"><div className="icon">📋</div><p>No transactions yet</p></div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {transactions.filter(t => t.status !== 'pending').map(txn => {
        const isSender = txn.sender_id === myPlayerId;
        const other = isSender ? txn.receiver?.name : txn.sender?.name;
        const sentNotes = txn.notes_sent || {};
        const changeNotes = txn.notes_change || {};
        const netReceived = txn.amount_sent - (txn.amount_change || 0);

        return (
          <div key={txn.id} className={`txn-item ${txn.status}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1rem' }}>
                  {isSender ? '📤' : '📥'}
                </span>
                <div>
                  <span className="font-semibold text-sm">
                    {isSender ? `To ${other}` : `From ${other}`}
                  </span>
                  {txn.message && <span className="text-xs text-muted" style={{ marginLeft: 6 }}>"{txn.message}"</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold text-sm ${isSender ? 'text-red' : 'text-green'}`}>
                  {isSender ? '-' : '+'}{formatCurrency(isSender ? txn.amount_sent : netReceived)}
                </span>
                <span className={`status-pill ${txn.status}`}><span className="dot" />{txn.status}</span>
              </div>
            </div>

            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {Object.entries(sentNotes).map(([d, q]) => q > 0 && (
                <NoteChip key={d} denomination={parseInt(d)} quantity={q} />
              ))}
            </div>

            {txn.amount_change > 0 && (
              <div className="text-xs text-secondary">
                Change returned: {formatCurrency(txn.amount_change)} →&nbsp;
                {Object.entries(changeNotes).map(([d, q]) => q > 0 && (
                  <NoteChip key={d} denomination={parseInt(d)} quantity={q} />
                ))}
              </div>
            )}

            <div className="text-xs text-muted">
              {txn.accepted_at
                ? new Date(txn.accepted_at).toLocaleString('en-IN')
                : new Date(txn.created_at).toLocaleString('en-IN')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
