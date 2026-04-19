const API_URL = import.meta.env.VITE_API_URL || '/api';

const getToken = () => localStorage.getItem('ib_token');

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  // Auth
  createRoom: (body) => request('/auth/create-room', { method: 'POST', body: JSON.stringify(body) }),
  joinBanker: (body) => request('/auth/join-banker', { method: 'POST', body: JSON.stringify(body) }),
  joinPlayer: (body) => request('/auth/join-player', { method: 'POST', body: JSON.stringify(body) }),

  // Game
  getRoom: () => request('/game/room'),
  getInventory: (playerId) => request(`/game/inventory/${playerId}`),
  getAllInventories: () => request('/game/all-inventories'),
  setupDistribution: (distributions) => request('/game/setup-distribution', { method: 'POST', body: JSON.stringify({ distributions }) }),
  startGame: () => request('/game/start', { method: 'POST' }),
  getProperties: () => request('/game/properties'),
  addProperty: (body) => request('/game/properties', { method: 'POST', body: JSON.stringify(body) }),
  assignProperty: (id, body) => request(`/game/properties/${id}/assign`, { method: 'PATCH', body: JSON.stringify(body) }),
  forceCorrection: (body) => request('/game/force-correction', { method: 'POST', body: JSON.stringify(body) }),
  getAuditLog: () => request('/game/audit-log'),

  // Transactions
  getTransactions: () => request('/transactions'),
  sendTransaction: (body) => request('/transactions/send', { method: 'POST', body: JSON.stringify(body) }),
  acceptTransaction: (id) => request(`/transactions/${id}/accept`, { method: 'POST' }),
  rejectTransaction: (id) => request(`/transactions/${id}/reject`, { method: 'POST' }),
  setOwedAmount: (id, owedAmount) => request(`/transactions/${id}/set-owed`, { method: 'POST', body: JSON.stringify({ owedAmount }) }),
};
