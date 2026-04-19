import { NOTE_COLORS, GLOBAL_SUPPLY, formatCurrency } from '../../lib/supabase.js';

export function NoteCard({ denomination, quantity, showTotal = true, compact = false }) {
  const cfg = NOTE_COLORS[denomination];
  const total = denomination * quantity;

  return (
    <div className="note-card" style={{
      background: `linear-gradient(135deg, ${cfg.bg}22, ${cfg.bg}11)`,
      borderColor: `${cfg.bg}55`,
      padding: compact ? '10px 14px' : undefined,
    }}>
      <div>
        <div className="denom" style={{ color: cfg.text, fontSize: compact ? '1.1rem' : undefined }}>
          ₹{denomination.toLocaleString('en-IN')}
        </div>
        <div className="label" style={{ color: cfg.text }}>{cfg.label}</div>
        {showTotal && quantity > 0 && (
          <div className="total" style={{ color: cfg.text }}>
            = {formatCurrency(total)}
          </div>
        )}
      </div>
      <div className="count" style={{ color: cfg.text, fontSize: compact ? '1.3rem' : undefined }}>
        {quantity}
      </div>
    </div>
  );
}

export function NoteChip({ denomination, quantity }) {
  const cfg = NOTE_COLORS[denomination];
  return (
    <span className="note-chip" style={{
      background: `${cfg.bg}22`, color: cfg.text, border: `1px solid ${cfg.bg}55`
    }}>
      <span className="qty">{quantity}×</span>₹{denomination.toLocaleString('en-IN')}
    </span>
  );
}

export function NoteStepper({ denomination, value, max, onChange }) {
  const cfg = NOTE_COLORS[denomination];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 12, height: 12, borderRadius: '50%',
          background: cfg.bg, border: `1px solid ${cfg.bg}`, flexShrink: 0
        }} />
        <span className="font-mono text-sm" style={{ color: cfg.text }}>
          ₹{denomination.toLocaleString('en-IN')}
        </span>
        <span className="text-xs text-muted">({value > 0 ? `×${value}` : 'none'})</span>
      </div>
      <div className="stepper">
        <button className="stepper-btn" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>−</button>
        <span className="stepper-val">{value}</span>
        <button className="stepper-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

export function SupplyBar({ denomination, used, max }) {
  const cfg = NOTE_COLORS[denomination];
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div className="supply-bar">
      <div className="flex justify-between text-xs" style={{ marginBottom: 4 }}>
        <span style={{ color: cfg.text }}>₹{denomination.toLocaleString('en-IN')}</span>
        <span className="text-muted font-mono">{used}/{max}</span>
      </div>
      <div className="supply-bar-track">
        <div className="supply-bar-fill" style={{ width: `${pct}%`, background: cfg.bg }} />
      </div>
    </div>
  );
}
