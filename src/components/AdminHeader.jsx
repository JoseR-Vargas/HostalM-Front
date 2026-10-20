import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import Header from './Header';

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
    <Header centered links={links}>
      <button
        type="button"
        onClick={handleLogout}
        className="logout-btn cursor-pointer rounded-lg border-none bg-warning px-4 py-2 text-[0.9rem] font-medium text-white hover:bg-[#b7791f] phone:px-[0.8rem] phone:py-[0.35rem] phone:text-[0.85rem]"
      >
        Cerrar Sesión
      </button>
    </Header>
  );
}
