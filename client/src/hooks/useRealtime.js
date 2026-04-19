import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtime(roomId, callbacks = {}) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventories', filter: `room_id=eq.${roomId}` },
        (payload) => callbacks.onInventoryChange?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `room_id=eq.${roomId}` },
        (payload) => callbacks.onTransactionChange?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => callbacks.onPlayersChange?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => callbacks.onRoomChange?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log', filter: `room_id=eq.${roomId}` },
        (payload) => callbacks.onAuditLog?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties', filter: `room_id=eq.${roomId}` },
        (payload) => callbacks.onPropertiesChange?.(payload))
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);
}
