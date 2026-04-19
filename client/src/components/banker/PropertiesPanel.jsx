import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api.js';
import { formatCurrency } from '../../lib/supabase.js';

export default function PropertiesPanel({ players, refresh }) {
  const [properties, setProperties] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', country: '', basePrice: '' });
  const [assignModal, setAssignModal] = useState(null); // property to assign
  const [assignTo, setAssignTo] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const data = await api.getProperties();
      setProperties(data.properties || []);
    } catch {}
  };
  useEffect(() => { load(); }, [refresh]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.addProperty({ name: addForm.name, country: addForm.country, basePrice: parseInt(addForm.basePrice) });
      toast.success('Property added');
      setAddForm({ name: '', country: '', basePrice: '' });
      setShowAdd(false);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleAssign = async () => {
    setLoading(true);
    try {
      await api.assignProperty(assignModal.id, { ownerId: assignTo || null, soldPrice: soldPrice ? parseInt(soldPrice) : null });
      toast.success(assignTo ? 'Property assigned' : 'Property returned to available');
      setAssignModal(null); setAssignTo(''); setSoldPrice('');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const activePlayers = players.filter(p => p.player_type !== 'bank');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center justify-between">
        <span className="text-secondary text-sm">{properties.length} properties</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(p => !p)}>+ Add Property</button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card card-elevated card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input" placeholder="Property name (e.g. Tokyo Tower)" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} required />
          <input className="input" placeholder="Country (e.g. Japan)" value={addForm.country} onChange={e => setAddForm(p => ({ ...p, country: e.target.value }))} />
          <input className="input input-mono" type="number" placeholder="Base price" value={addForm.basePrice} onChange={e => setAddForm(p => ({ ...p, basePrice: e.target.value }))} required />
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>Add</button>
          </div>
        </form>
      )}

      {properties.length === 0 ? (
        <div className="empty-state"><p>No properties added yet</p></div>
      ) : (
        properties.map(prop => (
          <div key={prop.id} className="card card-elevated card-sm" style={{ cursor: 'pointer' }} onClick={() => { setAssignModal(prop); setAssignTo(prop.owner_id || ''); setSoldPrice(prop.sold_price || ''); }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold" style={{ fontSize: '0.9rem' }}>{prop.name}</div>
                {prop.country && <div className="text-xs text-muted">{prop.country}</div>}
              </div>
              <div className="text-right">
                <div className={`status-pill ${prop.auction_status}`}><span className="dot" />{prop.auction_status}</div>
                {prop.sold_price && <div className="text-xs text-muted font-mono mt-1">{formatCurrency(prop.sold_price)}</div>}
              </div>
            </div>
            {prop.players && (
              <div className="text-xs text-secondary mt-2">Owner: <strong>{prop.players.name}</strong></div>
            )}
          </div>
        ))
      )}

      {/* Assign modal */}
      {assignModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setAssignModal(null)}>
          <div className="modal">
            <div className="modal-title">🏠 Assign Property</div>
            <p className="text-secondary text-sm mb-4"><strong style={{ color: 'var(--text-primary)' }}>{assignModal.name}</strong> · Base: {formatCurrency(assignModal.base_price)}</p>
            <div className="input-group">
              <label className="input-label">Assign to Player</label>
              <select className="input" value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                <option value="">Unowned / Available</option>
                {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {assignTo && (
              <div className="input-group">
                <label className="input-label">Sale Price</label>
                <input className="input input-mono" type="number" placeholder={assignModal.base_price} value={soldPrice} onChange={e => setSoldPrice(e.target.value)} />
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button className="btn btn-ghost w-full" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary w-full" onClick={handleAssign} disabled={loading}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
