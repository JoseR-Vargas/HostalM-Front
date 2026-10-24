import { Link } from 'react-router-dom';
import { cls } from './ui';

const HEADER =
  'header fixed inset-x-0 top-0 z-50 border-b border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(248,249,250,0.95)_50%,rgba(240,244,248,0.95)_100%)] py-6 text-ink shadow-card backdrop-blur-[15px] phone:py-[0.8rem]';
const NAV =
  'nav flex flex-wrap items-center tablet:flex-col tablet:gap-4 tablet:px-[15px] tablet:text-center phone:gap-[0.4rem] phone:px-2.5';
const LOGO =
  'logo bg-brand bg-clip-text text-[1.8rem] font-extrabold tracking-[-0.02em] text-transparent phone:text-[1.3rem]';
const NAV_MENU =
  'nav-menu flex flex-wrap gap-10 tablet:w-full tablet:justify-center phone:gap-x-[0.9rem] phone:gap-y-[0.1rem]';
const NAV_LINK =
  'nav-link py-2 font-medium text-muted after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-bar after:transition-all after:duration-300 hover:text-primary hover:after:w-full phone:py-[0.3rem] phone:text-[0.9rem]';

/**
 * Fixed site header. `links` = [{ to, label }]; `children` (e.g. the logout button) go after the links.
 * - `centered`: logo centered instead of next to the menu (admin pages)
 * - `logoOnly`: centered logo that links home and no menu (meter calculator page)
 */
export default function Header({ links = [], centered = false, logoOnly = false, children }) {
  const logoClass = cls(LOGO, (centered || logoOnly) && 'mx-auto text-center');
  const navClass = cls(NAV, centered || logoOnly ? 'nav-centered justify-center' : 'justify-between');

  if (logoOnly) {
    return (
      <header className={HEADER}>
        <nav className={cls(navClass, 'container')}>
          <Link to="/" className={logoClass}>
            Hostal Mayelewoo
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className={HEADER}>
      <div className="container">
        <div className={navClass}>
          <h1 className={logoClass}>Hostal Mayelewoo</h1>
          <nav className={NAV_MENU}>
            {links.map(({ to, label }) => (
              <Link key={to} to={to} className={NAV_LINK}>
                {label}
              </Link>
            ))}
            {children}
          </nav>
        </div>
      </div>
    </header>
  );
}
