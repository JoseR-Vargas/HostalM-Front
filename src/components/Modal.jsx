import { useEffect } from 'react';
import { cls } from './ui';

// Preline modal recipes (preline-ui), static: the open/closed state comes from React, there is no Preline JS.
// These strings are the contract: do not reword them.
const OVERLAY = 'size-full fixed top-0 inset-s-0 z-80 overflow-x-hidden overflow-y-auto transition-all';
const DIALOG = 'sm:max-w-lg sm:w-full m-3 sm:mx-auto';
const CARD = 'flex flex-col bg-overlay border border-overlay-line shadow-2xs rounded-xl pointer-events-auto';
const HEADER = 'flex justify-between items-center py-3 px-4 border-b border-overlay-header';
const BODY = 'p-4 overflow-y-auto';
const FOOTER = 'flex justify-end items-center gap-x-2 py-3 px-4 border-t border-overlay-footer';
const CLOSE_BUTTON =
  'size-8 inline-flex justify-center items-center gap-x-2 rounded-full bg-surface border border-surface-line text-surface-foreground hover:bg-surface-hover focus:outline-hidden focus:bg-surface-focus disabled:opacity-50 disabled:pointer-events-none';

// Added on top of the recipes: the dim backdrop on the overlay itself, a wider dialog for the image modals,
// vertical centring (the dialog is a pointer-events-none box as tall as the viewport, so a click beside the
// card still reaches the overlay), and a cursor for the close button (no Preflight: buttons keep the default).
const BACKDROP = 'bg-black/50';
const DIALOG_SIZES = { default: DIALOG, wide: DIALOG.replace('sm:max-w-lg', 'sm:max-w-3xl') };
const DIALOG_EXTRAS = 'pointer-events-none min-h-[calc(100%-1.5rem)] flex items-center';
const CARD_EXTRAS = 'w-full max-h-[calc(100vh-1.5rem)]';

export function ModalTitle({ as: Tag = 'div', className, ...props }) {
  // `text-base`: the base layer gives every `h3` the large page-title size.
  return <Tag className={cls('font-semibold text-foreground text-base', className)} {...props} />;
}

/** The X of the modal header; `className` is a hook for tests/specs. */
function CloseButton({ className, onClick }) {
  return (
    <button type="button" className={cls(className, CLOSE_BUTTON, 'cursor-pointer')} aria-label="Close" onClick={onClick}>
      <svg
        className="shrink-0 size-4"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  );
}

/**
 * Shell shared by the modals (image viewer, photo viewer, result dialog): a `.modal` overlay (+ `.show`
 * while open) around a `.modal-content` card with header, body and optional footer.
 * - `title`: usually a `ModalTitle`; `titleId` is its id (the dialog is labelled by it)
 * - `onClose`: shows the X in the header and closes with Escape while open; `closeClassName` is the X hook class
 * - `onBackdropClick`: fires only when the overlay itself is clicked
 * - `footer`: action buttons (`Button size="sm"`); `size`: `default` or `wide` (images)
 * - `bodyClassName`: extra classes of the body (e.g. `text-center`)
 */
export default function Modal({
  id,
  open,
  title,
  titleId,
  onClose,
  closeClassName,
  onBackdropClick,
  footer,
  size = 'default',
  bodyClassName,
  children,
}) {
  // Escape closes the modal only while it is open.
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleClick = (event) => {
    if (event.target === event.currentTarget && onBackdropClick) {
      onBackdropClick();
    }
  };

  return (
    <div
      id={id}
      className={cls('modal', OVERLAY, BACKDROP, open ? 'show block animate-fade-in' : 'hidden')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleClick}
    >
      <div className={cls(DIALOG_SIZES[size], DIALOG_EXTRAS)}>
        <div className={cls('modal-content', CARD, CARD_EXTRAS)}>
          <div className={HEADER}>
            {title}
            {onClose && <CloseButton className={closeClassName} onClick={onClose} />}
          </div>
          <div className={cls(BODY, 'text-foreground', bodyClassName)}>{children}</div>
          {footer && <div className={FOOTER}>{footer}</div>}
        </div>
      </div>
    </div>
  );
}
