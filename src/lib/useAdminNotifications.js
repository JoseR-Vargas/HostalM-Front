import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCalculos } from './meterRecords';
import {
  NOTIFICATIONS_STORAGE_KEY,
  countUnread,
  loadState,
  markAllRead as markAllReadIn,
  markRead as markReadIn,
  saveState,
  syncNotifications,
} from './notifications';
import { fetchVouchers } from './voucherDashboard';

export const POLL_INTERVAL_MS = 30 * 1000;

/**
 * Notifications for the admin bell. While there is a session it reads the vouchers and the meter readings
 * on mount, every `intervalMs` and when the tab becomes visible again, and keeps what is new (see
 * `syncNotifications`). A request that fails is skipped without losing the other one. The state is persisted,
 * and a change made in another admin tab is picked up through the `storage` event.
 */
export function useAdminNotifications({ token, intervalMs = POLL_INTERVAL_MS } = {}) {
  const [state, setState] = useState(() => loadState());
  // True once the first poll has finished (also when it failed): lets tests tell the bell's own requests apart.
  const [ready, setReady] = useState(false);
  // The latest state, so a poll never works on a stale copy (and still works when storage is blocked).
  const stateRef = useRef(state);

  const commit = useCallback((next) => {
    stateRef.current = next;
    setState(next);
    saveState(next);
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== NOTIFICATIONS_STORAGE_KEY) return;
      const next = loadState();
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    let running = false;

    const poll = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        const [vouchers, calculos] = await Promise.allSettled([
          fetchVouchers({ signal: controller.signal }),
          fetchCalculos({ token, signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        commit(
          syncNotifications(stateRef.current, {
            vouchers: vouchers.status === 'fulfilled' ? vouchers.value : null,
            calculos: calculos.status === 'fulfilled' ? calculos.value : null,
          }),
        );
        setReady(true);
      } finally {
        running = false;
      }
    };

    const onVisibility = () => {
      if (!document.hidden) poll();
    };

    poll();
    const timer = setInterval(poll, intervalMs);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token, intervalMs, commit]);

  const markRead = useCallback((id) => commit(markReadIn(stateRef.current, id)), [commit]);
  const markAllRead = useCallback(() => commit(markAllReadIn(stateRef.current)), [commit]);

  return { notifications: state.notifications, unreadCount: countUnread(state), ready, markRead, markAllRead };
}
