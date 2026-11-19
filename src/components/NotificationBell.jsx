import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { NOTIFICATION_KINDS, formatNotificationTime } from '../lib/notifications';
import { useAdminNotifications } from '../lib/useAdminNotifications';
import { cls } from './ui';

const BUTTON =
  'relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-layer-line bg-layer p-0 text-primary transition-all duration-300 hover:bg-layer-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-focus phone:size-9';
const BADGE =
  'notification-badge absolute -top-1 -right-1 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-ink px-1 text-[0.7rem] leading-none font-bold text-white';
const PANEL =
  'absolute top-full right-0 z-10 mt-3 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-overlay-line bg-overlay text-left shadow-hover tablet:inset-x-3 tablet:w-auto tablet:max-w-none';
const ITEM =
  'flex flex-col gap-1 border-b border-table-line px-4 py-3 no-underline hover:bg-layer-hover hover:text-shadow-none focus:outline-hidden focus-visible:bg-layer-hover';

const MAX_BADGE = 9;

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/**
 * Bell of the admin header: a badge with the number of unread notifications and a panel that lists what was
 * uploaded (voucher or meter reading) with a short description. Each item opens its dashboard.
 */
export default function NotificationBell() {
  const { token } = useAuth();
  const { notifications, unreadCount, ready, markRead, markAllRead } = useAdminNotifications({ token });
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const label = unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones';

  const handleOpenItem = (id) => {
    markRead(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="notification-bell relative tablet:static" data-ready={ready ? 'true' : undefined}>
      <button
        type="button"
        id="notificationBell"
        className={BUTTON}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="notificationPanel"
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={BADGE} aria-hidden="true">
            {unreadCount > MAX_BADGE ? `${MAX_BADGE}+` : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div id="notificationPanel" role="region" aria-label="Notificaciones" className={PANEL}>
          <div className="flex items-center justify-between gap-3 border-b border-overlay-header px-4 py-3">
            <h2 className="text-[1rem] leading-none font-bold text-primary tracking-normal">Notificaciones</h2>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[0.85rem] font-semibold text-primary hover:underline disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline"
            >
              Marcar todo como leído
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-[0.95rem] text-muted">No hay notificaciones</p>
          ) : (
            <ul className="max-h-[60vh] list-none overflow-y-auto">
              {notifications.map(({ id, kind, title, description, createdAt, read }) => (
                <li key={id}>
                  <Link
                    to={NOTIFICATION_KINDS[kind].path}
                    onClick={() => handleOpenItem(id)}
                    className={cls(ITEM, !read && 'bg-surface')}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2 text-[0.95rem] font-bold text-primary">
                        {!read && <span className="size-2 shrink-0 rounded-full bg-ink" role="img" aria-label="Sin leer" />}
                        {title}
                      </span>
                      <span className="shrink-0 text-[0.75rem] text-muted">{formatNotificationTime(createdAt)}</span>
                    </span>
                    <span className="text-[0.85rem] leading-[1.4] text-muted">{description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
