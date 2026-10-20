import { useEffect, useRef, useState } from 'react';

const REVEAL_DELAY_MS = 100;
// Distance (px) from the bottom of the viewport at which an element fades in.
const VISIBLE_OFFSET = 150;

/**
 * Element that starts transparent (shifted down 20px) and fades in once it
 * scrolls into view. It never hides again. Renders `as` (default `div`).
 */
export default function Reveal({ as: Tag = 'div', children, ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return undefined;

    const check = () => {
      if (ref.current && ref.current.getBoundingClientRect().top < window.innerHeight - VISIBLE_OFFSET) {
        setVisible(true);
      }
    };
    const timer = setTimeout(check, REVEAL_DELAY_MS);
    window.addEventListener('scroll', check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', check);
    };
  }, [visible]);

  const style = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 0.6s ease, transform 0.6s ease',
  };

  return (
    <Tag ref={ref} style={style} {...props}>
      {children}
    </Tag>
  );
}
