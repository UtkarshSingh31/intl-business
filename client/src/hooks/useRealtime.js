import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtime(roomId, callbacks = {}) {
  const channelRef = useRef(null);
  const pollRef = useRef(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!roomId) return;

    // Supabase Realtime channel (instant updates when it works)
    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventories', filter: `room_id=eq.${roomId}` },
        (payload) => callbacksRef.current.onInventoryChange?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `room_id=eq.${roomId}` },
        (payload) => callbacksRef.current.onTransactionChange?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => callbacksRef.current.onPlayersChange?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => callbacksRef.current.onRoomChange?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log', filter: `room_id=eq.${roomId}` },
        (payload) => callbacksRef.current.onAuditLog?.(payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties', filter: `room_id=eq.${roomId}` },
        (payload) => callbacksRef.current.onPropertiesChange?.(payload))
      .subscribe();

    channelRef.current = channel;

    // Polling fallback — ensures data refreshes even if Realtime silently fails
    pollRef.current = setInterval(() => {
      callbacksRef.current.onPoll?.();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId]);
}
