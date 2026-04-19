const express = require('express');
const router = express.Router();
const { supabase, DENOMINATIONS } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

// Greedy change algorithm: returns optimal combination of notes for a given amount
// from the available inventory, using largest denominations first
const calculateChange = (amount, inventory) => {
  if (amount <= 0) return { possible: true, notes: {} };
  const sortedDenoms = [...DENOMINATIONS].sort((a, b) => b - a);
  const notes = {};
  let remaining = amount;

  for (const d of sortedDenoms) {
    if (remaining <= 0) break;
    const available = inventory[d] || 0;
    if (available === 0 || d > remaining) continue;
    const needed = Math.min(Math.floor(remaining / d), available);
    if (needed > 0) {
      notes[d] = needed;
      remaining -= needed * d;
    }
  }

  return { possible: remaining === 0, notes, remaining };
};

// GET /api/transactions — get pending transactions for the current player
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { roomId, playerId, role } = req.user;

    let query = supabase.from('transactions')
      .select('*, sender:players!sender_id(name), receiver:players!receiver_id(name)')
      .eq('room_id', roomId).order('created_at', { ascending: false });

    if (role !== 'banker') {
      query = query.or(`sender_id.eq.${playerId},receiver_id.eq.${playerId}`);
    }

    const { data: txns } = await query.limit(50);
    res.json({ transactions: txns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/send — player initiates a transaction (escrow)
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { roomId, playerId } = req.user;
    const { receiverId, notes, message } = req.body;
    // notes: { "50": 2, "100": 1, ... }

    if (!receiverId || !notes || Object.keys(notes).length === 0) {
      return res.status(400).json({ error: 'Receiver and notes are required' });
    }

    // Validate sender has the notes
    const { data: senderInv } = await supabase
      .from('inventories').select('*').eq('player_id', playerId).eq('room_id', roomId);

    const senderNotes = {};
    senderInv.forEach(i => { senderNotes[i.denomination] = i.quantity; });

    let amountSent = 0;
    for (const [dStr, qty] of Object.entries(notes)) {
      const d = parseInt(dStr);
      const q = parseInt(qty);
      if (q <= 0) continue;
      if (!DENOMINATIONS.includes(d)) return res.status(400).json({ error: `Invalid denomination: ${d}` });
      if ((senderNotes[d] || 0) < q) {
        return res.status(400).json({ error: `Insufficient ₹${d} notes. You have ${senderNotes[d] || 0}, need ${q}` });
      }
      amountSent += d * q;
    }

    if (amountSent === 0) return res.status(400).json({ error: 'Must send at least one note' });

    // Check no pending transactions from this sender (one at a time)
    const { data: pending } = await supabase
      .from('transactions').select('id').eq('sender_id', playerId).eq('status', 'pending');
    if (pending?.length > 0) {
      return res.status(400).json({ error: 'You already have a pending transaction. Wait for it to be resolved.' });
    }

    // Deduct from sender (escrow)
    for (const [dStr, qty] of Object.entries(notes)) {
      const d = parseInt(dStr);
      const q = parseInt(qty);
      if (q <= 0) continue;
      await supabase.from('inventories')
        .update({ quantity: senderNotes[d] - q })
        .eq('player_id', playerId).eq('denomination', d);
    }

    // Create transaction in 'pending' state
    const cleanNotes = {};
    for (const [d, q] of Object.entries(notes)) {
      if (parseInt(q) > 0) cleanNotes[d] = parseInt(q);
    }

    const { data: txn } = await supabase.from('transactions').insert({
      room_id: roomId,
      sender_id: playerId,
      receiver_id: receiverId,
      notes_sent: cleanNotes,
      amount_sent: amountSent,
      net_amount: amountSent,
      status: 'pending',
      message: message || null
    }).select('*, sender:players!sender_id(name), receiver:players!receiver_id(name)').single();

    await supabase.from('audit_log').insert({
      room_id: roomId,
      transaction_id: txn.id,
      action_type: 'TRANSACTION_SENT',
      actor_id: playerId,
      details: { receiver_id: receiverId, notes_sent: cleanNotes, amount: amountSent }
    });

    res.json({ transaction: txn });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/:id/accept — receiver accepts
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { roomId, playerId } = req.user;
    const { data: txn } = await supabase
      .from('transactions').select('*').eq('id', req.params.id).eq('room_id', roomId).single();

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.status !== 'pending') return res.status(400).json({ error: 'Transaction is not pending' });
    if (txn.receiver_id !== playerId) return res.status(403).json({ error: 'You are not the receiver' });

    // Get receiver's current inventory
    const { data: receiverInv } = await supabase
      .from('inventories').select('*').eq('player_id', playerId).eq('room_id', roomId);
    const receiverNotes = {};
    receiverInv.forEach(i => { receiverNotes[i.denomination] = i.quantity; });

    // Get sender's current inventory (for change return)
    const { data: senderInv } = await supabase
      .from('inventories').select('*').eq('player_id', txn.sender_id).eq('room_id', roomId);
    const senderNotes = {};
    senderInv.forEach(i => { senderNotes[i.denomination] = i.quantity; });

    // Calculate total received — if overpayment, calculate change
    const totalSent = txn.amount_sent;
    // For now, net_amount = amount_sent (no "owed amount" concept; full amount is paid)
    // Change logic: if receiver wants to pay back change
    // The change = totalSent - net_amount (net_amount is what was actually owed)
    // If there's no specific owed amount, full amount is accepted
    const changeAmount = txn.amount_sent - txn.net_amount;

    let changeNotes = {};
    if (changeAmount > 0) {
      const changeCalc = calculateChange(changeAmount, receiverNotes);
      if (!changeCalc.possible) {
        // Block transaction — mark as change_failed
        await supabase.from('transactions').update({ status: 'change_failed' }).eq('id', txn.id);

        // Return notes to sender
        for (const [dStr, qty] of Object.entries(txn.notes_sent)) {
          const d = parseInt(dStr);
          await supabase.from('inventories')
            .update({ quantity: (senderNotes[d] || 0) + qty })
            .eq('player_id', txn.sender_id).eq('denomination', d);
        }

        // Notify banker
        await supabase.from('audit_log').insert({
          room_id: roomId,
          transaction_id: txn.id,
          action_type: 'CHANGE_FAILED',
          actor_id: playerId,
          details: { change_needed: changeAmount, available: receiverNotes }
        });

        return res.status(400).json({ error: `Insufficient notes for change. Need ₹${changeAmount} change but receiver cannot make it.` });
      }
      changeNotes = changeCalc.notes;
    }

    // Apply: add sent notes to receiver
    for (const [dStr, qty] of Object.entries(txn.notes_sent)) {
      const d = parseInt(dStr);
      const q = parseInt(qty);
      await supabase.from('inventories')
        .update({ quantity: (receiverNotes[d] || 0) + q })
        .eq('player_id', playerId).eq('denomination', d);
      receiverNotes[d] = (receiverNotes[d] || 0) + q;
    }

    // Apply change: deduct from receiver, add to sender
    if (changeAmount > 0) {
      for (const [dStr, qty] of Object.entries(changeNotes)) {
        const d = parseInt(dStr);
        const q = parseInt(qty);
        receiverNotes[d] = (receiverNotes[d] || 0) - q;
        await supabase.from('inventories')
          .update({ quantity: receiverNotes[d] })
          .eq('player_id', playerId).eq('denomination', d);

        await supabase.from('inventories')
          .update({ quantity: (senderNotes[d] || 0) + q })
          .eq('player_id', txn.sender_id).eq('denomination', d);
      }
    }

    // Update transaction
    await supabase.from('transactions').update({
      status: 'accepted',
      notes_change: changeNotes,
      amount_change: changeAmount,
      accepted_at: new Date().toISOString()
    }).eq('id', txn.id);

    await supabase.from('audit_log').insert({
      room_id: roomId,
      transaction_id: txn.id,
      action_type: 'TRANSACTION_ACCEPTED',
      actor_id: playerId,
      details: {
        sender_id: txn.sender_id,
        notes_sent: txn.notes_sent,
        amount_sent: txn.amount_sent,
        notes_change: changeNotes,
        amount_change: changeAmount,
        net_received: txn.amount_sent - changeAmount
      }
    });

    res.json({ success: true, changeNotes, changeAmount });
  } catch (err) {
    console.error('Accept error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/:id/reject — receiver rejects
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { roomId, playerId } = req.user;
    const { data: txn } = await supabase
      .from('transactions').select('*').eq('id', req.params.id).eq('room_id', roomId).single();

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.status !== 'pending') return res.status(400).json({ error: 'Transaction is not pending' });
    if (txn.receiver_id !== playerId) return res.status(403).json({ error: 'You are not the receiver' });

    // Return notes to sender
    const { data: senderInv } = await supabase
      .from('inventories').select('*').eq('player_id', txn.sender_id).eq('room_id', roomId);
    const senderNotes = {};
    senderInv.forEach(i => { senderNotes[i.denomination] = i.quantity; });

    for (const [dStr, qty] of Object.entries(txn.notes_sent)) {
      const d = parseInt(dStr);
      await supabase.from('inventories')
        .update({ quantity: (senderNotes[d] || 0) + parseInt(qty) })
        .eq('player_id', txn.sender_id).eq('denomination', d);
    }

    await supabase.from('transactions').update({
      status: 'rejected',
      rejected_at: new Date().toISOString()
    }).eq('id', txn.id);

    await supabase.from('audit_log').insert({
      room_id: roomId,
      transaction_id: txn.id,
      action_type: 'TRANSACTION_REJECTED',
      actor_id: playerId,
      details: { sender_id: txn.sender_id, notes_returned: txn.notes_sent }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions/:id/set-owed — set the actual owed amount (for change calc)
router.post('/:id/set-owed', authMiddleware, async (req, res) => {
  try {
    const { roomId, playerId } = req.user;
    const { owedAmount } = req.body;
    const { data: txn } = await supabase.from('transactions').select('*').eq('id', req.params.id).single();
    if (!txn || txn.receiver_id !== playerId) return res.status(403).json({ error: 'Not allowed' });
    if (owedAmount > txn.amount_sent) return res.status(400).json({ error: 'Owed amount cannot exceed amount sent' });

    await supabase.from('transactions').update({ net_amount: owedAmount }).eq('id', txn.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
