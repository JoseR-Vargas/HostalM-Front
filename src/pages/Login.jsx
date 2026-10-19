import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import PublicHeader from '../components/PublicHeader';
import { LOGIN_LINKS } from '../components/navLinks';
import { validateLoginCredentials } from '../lib/validators';

function getButtonLabel(loading, slow) {
  if (!loading) return 'Iniciar Sesión';
  return slow ? 'Esperando respuesta del servidor...' : 'Iniciando sesión...';
}

export default function Login() {
  const { isAuthenticated, login, prewarm } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  // Wake up the (possibly cold) backend while the user types.
  useEffect(() => {
    if (!isAuthenticated) prewarm();
  }, [isAuthenticated, prewarm]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const credentials = { email: email.trim(), password };
    const validationError = validateLoginCredentials(credentials);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setSlow(false);
    setError('');

    const result = await login(credentials.email, credentials.password, {
      onSlow: () => setSlow(true),
    });
    // On success the session becomes authenticated and this page redirects.
    if (result.success) return;

    setError(result.message || 'Credenciales incorrectas');
    setLoading(false);
    setSlow(false);
  };

  return (
    <>
      <PublicHeader links={LOGIN_LINKS} />

      <section className="login login-page">
        <div className="container">
          <div className="login-container">
            <div className="login-card">
              <div className="login-header">
                <h2 className="login-title">Acceso Administrador</h2>
                <p className="login-subtitle">
                  Ingresa tus credenciales para acceder al panel de administración
                </p>
              </div>

              <form id="loginForm" className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email:</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="admin@admin.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Contraseña:</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div id="loginError" className="error-message" style={{ display: error ? 'block' : 'none' }}>
                  {error}
                </div>

                <button type="submit" id="loginBtn" className="cta-button" disabled={loading}>
                  <span>{getButtonLabel(loading, slow)}</span>
                  <div className="loading-spinner" style={{ display: loading ? 'inline-block' : 'none' }} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
