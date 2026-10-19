import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

/**
 * Admin header. Each page passes its own `links` (see `ADMIN_NAV`).
 * The logout button clears the session and goes back to the login page.
 */
export default function AdminHeader({ links }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="header">
      <div className="container">
        <div className="nav nav-centered">
          <h1 className="logo">Hostal Mayelewoo</h1>
          <nav className="nav-menu">
            {links.map(({ to, label }) => (
              <Link key={to} to={to} className="nav-link">
                {label}
              </Link>
            ))}
            <button type="button" onClick={handleLogout} className="logout-btn">
              Cerrar Sesión
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
