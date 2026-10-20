import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from '../auth/ProtectedRoute';
import CalcularPago from '../pages/CalcularPago';
import CalculatorMedidor from '../pages/CalculatorMedidor';
import ComprobantePago from '../pages/ComprobantePago';
import ComprobanteServicios from '../pages/ComprobanteServicios';
import Dashboard from '../pages/Dashboard';
import DashboardCalculator from '../pages/DashboardCalculator';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Vouchers from '../pages/Vouchers';

const PUBLIC_ROUTES = [
  { path: '/login', element: <Login /> },
  { path: '/vouchers', element: <Vouchers /> },
  { path: '/calculator-medidor', element: <CalculatorMedidor /> },
];

const ADMIN_ROUTES = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/dashboard-calculator', element: <DashboardCalculator /> },
  { path: '/calcular-pago', element: <CalcularPago /> },
  { path: '/comprobante-pago', element: <ComprobantePago /> },
  { path: '/comprobante-servicios', element: <ComprobanteServicios /> },
];

// `/xxx.html` URLs of the static app keep working.
const LEGACY_PAGE_REDIRECTS = [...PUBLIC_ROUTES, ...ADMIN_ROUTES].map(({ path }) => ({
  from: `${path}.html`,
  to: path,
}));

// Pages that were removed: send visitors home.
const REMOVED_PAGES = ['/contadores-luz', '/contadores-luz.html', '/dashboard-luz', '/dashboard-luz.html'];

/** Redirect that keeps the query string (e.g. `?backend=local`) and hash. */
function Redirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {PUBLIC_ROUTES.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}

      <Route element={<ProtectedRoute />}>
        {ADMIN_ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Route>

      <Route path="/index.html" element={<Redirect to="/" />} />
      {LEGACY_PAGE_REDIRECTS.map(({ from, to }) => (
        <Route key={from} path={from} element={<Redirect to={to} />} />
      ))}
      {REMOVED_PAGES.map((path) => (
        <Route key={path} path={path} element={<Redirect to="/" />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
