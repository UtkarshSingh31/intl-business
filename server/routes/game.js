const express = require('express');
const router = express.Router();
const { supabase, GLOBAL_SUPPLY, DENOMINATIONS } = require('../config/supabase');
const { authMiddleware, bankerOnly } = require('../middleware/auth');

// GET /api/game/room — get full room state
router.get('/room', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('joined_at');
    const { data: supply } = await supabase.from('global_supply').select('*').eq('room_id', roomId);
    res.json({ room, players, globalSupply: supply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/game/inventory/:playerId — get inventory (banker sees all, player sees own only)
router.get('/inventory/:playerId', authMiddleware, async (req, res) => {
  try {
    const { roomId, role, playerId: tokenPlayerId } = req.user;
    const { playerId } = req.params;

    if (role !== 'banker' && tokenPlayerId !== playerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: inventory } = await supabase
      .from('inventories').select('*').eq('player_id', playerId).eq('room_id', roomId)
      .order('denomination');

    res.json({ inventory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/game/all-inventories — banker only: all player inventories
router.get('/all-inventories', authMiddleware, bankerOnly, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { data: inventories } = await supabase
      .from('inventories').select('*, players(name, player_type)')
      .eq('room_id', roomId).order('denomination');
    res.json({ inventories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/setup-distribution — banker sets initial note distribution
router.post('/setup-distribution', authMiddleware, bankerOnly, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { distributions } = req.body;
    // distributions: [{ playerId, notes: { 50: 2, 100: 3, ... } }]

    const { data: room } = await supabase.from('rooms').select('status').eq('id', roomId).single();
    if (room.status !== 'setup') return res.status(400).json({ error: 'Game already started' });

    // Get bank player
    const { data: bank } = await supabase.from('players').select('id').eq('room_id', roomId).eq('player_type', 'bank').single();

    // Get current bank inventory
    const { data: bankInv } = await supabase.from('inventories').select('*').eq('player_id', bank.id);
    const bankNotes = {};
    bankInv.forEach(i => { bankNotes[i.denomination] = i.quantity; });

    // Validate totals won't exceed global supply
    const totalsByDenom = {};
    DENOMINATIONS.forEach(d => { totalsByDenom[d] = 0; });

    for (const dist of distributions) {
      for (const [dStr, qty] of Object.entries(dist.notes)) {
        const d = parseInt(dStr);
        totalsByDenom[d] = (totalsByDenom[d] || 0) + qty;
      }
    }

    for (const d of DENOMINATIONS) {
      if (totalsByDenom[d] > GLOBAL_SUPPLY[d]) {
        return res.status(400).json({ error: `Cannot distribute ${totalsByDenom[d]} notes of ₹${d} — global supply is only ${GLOBAL_SUPPLY[d]}` });
      }
    }

    // Apply distributions in a transaction-like manner
    for (const dist of distributions) {
      const { playerId, notes } = dist;
      for (const [dStr, qty] of Object.entries(notes)) {
        const d = parseInt(dStr);
        if (qty === 0) continue;

        // Deduct from bank
        await supabase.from('inventories')
          .update({ quantity: bankNotes[d] - qty })
          .eq('player_id', bank.id).eq('denomination', d);
        bankNotes[d] -= qty;

        // Add to player
        const { data: existing } = await supabase.from('inventories')
          .select('quantity').eq('player_id', playerId).eq('denomination', d).single();

        await supabase.from('inventories')
          .update({ quantity: (existing?.quantity || 0) + qty })
          .eq('player_id', playerId).eq('denomination', d);
      }
    }

    // Audit
    await supabase.from('audit_log').insert({
      room_id: roomId,
      action_type: 'SETUP_DISTRIBUTION',
      details: { distributions }
    });

    res.json({ success: true, message: 'Distribution applied' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/start — banker starts the game
router.post('/start', authMiddleware, bankerOnly, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { data: room } = await supabase.from('rooms').select('status').eq('id', roomId).single();
    if (room.status !== 'setup') return res.status(400).json({ error: 'Game already started' });

    await supabase.from('rooms').update({ status: 'active' }).eq('id', roomId);

    await supabase.from('audit_log').insert({
      room_id: roomId,
      action_type: 'GAME_STARTED',
      details: { started_at: new Date().toISOString() }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/game/properties — get all properties
router.get('/properties', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { data: properties } = await supabase
      .from('properties').select('*, players(name)').eq('room_id', roomId).order('name');
    res.json({ properties });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/properties — banker adds a property
router.post('/properties', authMiddleware, bankerOnly, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { name, country, basePrice } = req.body;
    const { data: prop } = await supabase
      .from('properties').insert({ room_id: roomId, name, country, base_price: basePrice }).select().single();
    res.json({ property: prop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/game/properties/:id/assign — banker assigns property to player
router.patch('/properties/:id/assign', authMiddleware, bankerOnly, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { ownerId, soldPrice } = req.body;
    const { data: prop } = await supabase
      .from('properties')
      .update({ owner_id: ownerId || null, auction_status: ownerId ? 'sold' : 'available', sold_price: soldPrice || null })
      .eq('id', req.params.id).eq('room_id', roomId).select('*, players(name)').single();

    await supabase.from('audit_log').insert({
      room_id: roomId,
      action_type: 'PROPERTY_ASSIGNED',
      details: { property_id: req.params.id, owner_id: ownerId, sold_price: soldPrice }
    });

    res.json({ property: prop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game/force-correction — banker adjusts any player's notes
router.post('/force-correction', authMiddleware, bankerOnly, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { playerId, denomination, newQuantity, reason } = req.body;

    const d = parseInt(denomination);
    const newQty = parseInt(newQuantity);

    // Get old qty
    const { data: inv } = await supabase
      .from('inventories').select('quantity').eq('player_id', playerId).eq('denomination', d).single();
    const oldQty = inv?.quantity || 0;
    const delta = newQty - oldQty;

    if (delta === 0) return res.json({ success: true, message: 'No change' });

    // Validate global supply
    if (delta > 0) {
      // Adding notes — check against bank
      const { data: bank } = await supabase.from('players').select('id').eq('room_id', roomId).eq('player_type', 'bank').single();
      const { data: bankInv } = await supabase.from('inventories').select('quantity').eq('player_id', bank.id).eq('denomination', d).single();
      if ((bankInv?.quantity || 0) < delta) {
        return res.status(400).json({ error: `Bank only has ${bankInv?.quantity || 0} notes of ₹${d}` });
      }
      await supabase.from('inventories').update({ quantity: bankInv.quantity - delta }).eq('player_id', bank.id).eq('denomination', d);
    } else {
      // Removing notes — return to bank
      const { data: bank } = await supabase.from('players').select('id').eq('room_id', roomId).eq('player_type', 'bank').single();
      const { data: bankInv } = await supabase.from('inventories').select('quantity').eq('player_id', bank.id).eq('denomination', d).single();
      await supabase.from('inventories').update({ quantity: (bankInv?.quantity || 0) + Math.abs(delta) }).eq('player_id', bank.id).eq('denomination', d);
    }

    await supabase.from('inventories').update({ quantity: newQty }).eq('player_id', playerId).eq('denomination', d);

    await supabase.from('audit_log').insert({
      room_id: roomId,
      action_type: 'FORCE_CORRECTION',
      details: { player_id: playerId, denomination: d, old_qty: oldQty, new_qty: newQty, delta, reason }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/game/audit-log — banker only
router.get('/audit-log', authMiddleware, bankerOnly, async (req, res) => {
  try {
    const { roomId } = req.user;
    const { data: logs } = await supabase
      .from('audit_log').select('*, players(name)').eq('room_id', roomId)
      .order('created_at', { ascending: false }).limit(200);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
