import { cls } from './ui';

/**
 * Shell shared by the modals (image viewer, photo viewer, result dialog):
 * `.modal` overlay (+ `.show` when open) wrapping a `.modal-content` box.
 * `onBackdropClick` fires only when the overlay itself is clicked.
 */
export default function Modal({ id, open, onBackdropClick, contentClassName = '', children }) {
  const handleClick = (event) => {
    if (event.target === event.currentTarget && onBackdropClick) {
      onBackdropClick();
    }
  };

  return (
    <div
      id={id}
      className={cls(
        'modal fixed top-0 left-0 z-10000 size-full bg-[rgba(0,0,0,0.8)] backdrop-blur-[5px]',
        open ? 'show flex animate-fade-in items-center justify-center' : 'hidden',
      )}
      onClick={handleClick}
    >
      <div
        className={cls(
          'modal-content w-[90%] max-w-[400px] rounded-xl border border-border bg-card p-8 text-center shadow-hover tablet:m-4 tablet:p-6',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
