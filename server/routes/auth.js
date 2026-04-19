const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabase, GLOBAL_SUPPLY, DENOMINATIONS } = require('../config/supabase');

// Generate a random 6-char room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// POST /api/auth/create-room
router.post('/create-room', async (req, res) => {
  try {
    const { roomName, bankerPassword, playerPassword } = req.body;
    if (!roomName || !bankerPassword || !playerPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const roomCode = generateRoomCode();
    const hashedBankerPw = await bcrypt.hash(bankerPassword, 10);
    const hashedPlayerPw = await bcrypt.hash(playerPassword, 10);

    // Create room
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert({ room_code: roomCode, room_name: roomName, banker_password: hashedBankerPw, player_password: hashedPlayerPw, status: 'setup' })
      .select().single();

    if (roomErr) throw roomErr;

    // Create the Bank as player_type='bank'
    const { data: bank, error: bankErr } = await supabase
      .from('players')
      .insert({ room_id: room.id, name: 'Bank', player_type: 'bank' })
      .select().single();

    if (bankErr) throw bankErr;

    // Initialize global supply for this room
    const supplyRows = DENOMINATIONS.map(d => ({
      room_id: room.id,
      denomination: d,
      max_quantity: GLOBAL_SUPPLY[d]
    }));
    await supabase.from('global_supply').insert(supplyRows);

    // Initialize Bank inventory with FULL global supply
    const bankInventory = DENOMINATIONS.map(d => ({
      player_id: bank.id,
      room_id: room.id,
      denomination: d,
      quantity: GLOBAL_SUPPLY[d]
    }));
    await supabase.from('inventories').insert(bankInventory);

    // Audit log
    await supabase.from('audit_log').insert({
      room_id: room.id,
      action_type: 'ROOM_CREATED',
      details: { room_name: roomName, room_code: roomCode, global_supply: GLOBAL_SUPPLY }
    });

    const token = jwt.sign(
      { roomId: room.id, roomCode, role: 'banker', playerId: bank.id, name: 'Banker' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, room: { id: room.id, code: roomCode, name: roomName }, bankId: bank.id });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: err.message || 'Failed to create room' });
  }
});

// POST /api/auth/join-banker
router.post('/join-banker', async (req, res) => {
  try {
    const { roomCode, password } = req.body;
    const { data: room, error } = await supabase
      .from('rooms').select('*').eq('room_code', roomCode.toUpperCase()).single();

    if (error || !room) return res.status(404).json({ error: 'Room not found' });

    const valid = await bcrypt.compare(password, room.banker_password);
    if (!valid) return res.status(401).json({ error: 'Invalid banker password' });

    const { data: bank } = await supabase
      .from('players').select('id').eq('room_id', room.id).eq('player_type', 'bank').single();

    const token = jwt.sign(
      { roomId: room.id, roomCode: room.room_code, role: 'banker', playerId: bank.id, name: 'Banker' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, room: { id: room.id, code: room.room_code, name: room.room_name, status: room.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/join-player
router.post('/join-player', async (req, res) => {
  try {
    const { roomCode, password, playerName } = req.body;
    if (!roomCode || !password || !playerName?.trim()) {
      return res.status(400).json({ error: 'Room code, password, and player name required' });
    }

    const { data: room, error } = await supabase
      .from('rooms').select('*').eq('room_code', roomCode.toUpperCase()).single();

    if (error || !room) return res.status(404).json({ error: 'Room not found' });

    const valid = await bcrypt.compare(password, room.player_password);
    if (!valid) return res.status(401).json({ error: 'Invalid player password' });

    // Upsert player
    const { data: existing } = await supabase
      .from('players').select('*').eq('room_id', room.id).eq('name', playerName.trim()).single();

    let player;
    if (existing) {
      player = existing;
      await supabase.from('players').update({ is_online: true }).eq('id', existing.id);
    } else {
      if (room.status !== 'setup') {
        return res.status(400).json({ error: 'Game already started, cannot join as new player' });
      }
      const { data: np, error: npErr } = await supabase
        .from('players')
        .insert({ room_id: room.id, name: playerName.trim(), player_type: 'player', is_online: true })
        .select().single();
      if (npErr) throw npErr;
      player = np;

      // Initialize zero inventory for new player
      const inv = DENOMINATIONS.map(d => ({
        player_id: player.id, room_id: room.id, denomination: d, quantity: 0
      }));
      await supabase.from('inventories').insert(inv);
    }

    const token = jwt.sign(
      { roomId: room.id, roomCode: room.room_code, role: 'player', playerId: player.id, name: player.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, room: { id: room.id, code: room.room_code, name: room.room_name, status: room.status }, player: { id: player.id, name: player.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
