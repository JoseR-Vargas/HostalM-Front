/**
 * Shell shared by the legacy modals (image viewer, photo viewer, result dialog):
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
    <div id={id} className={open ? 'modal show' : 'modal'} onClick={handleClick}>
      <div className={`modal-content ${contentClassName}`.trim()}>{children}</div>
    </div>
  );
}
