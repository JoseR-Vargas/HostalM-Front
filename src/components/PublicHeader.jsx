import { Link } from 'react-router-dom';

/**
 * Public site header.
 * - default: logo + nav links (`links` = [{ to, label }])
 * - `logoOnly`: centered logo that links home (meter calculator page)
 */
export default function PublicHeader({ links = [], logoOnly = false }) {
  if (logoOnly) {
    return (
      <header className="header">
        <nav className="nav nav-centered container">
          <Link to="/" className="logo">
            Hostal Mayelewoo
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="container">
        <div className="nav">
          <h1 className="logo">Hostal Mayelewoo</h1>
          <nav className="nav-menu">
            {links.map(({ to, label }) => (
              <Link key={to} to={to} className="nav-link">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
