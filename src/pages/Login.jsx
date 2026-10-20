import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import PublicHeader from '../components/PublicHeader';
import { Banner, Field } from '../components/ui';
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

      <section className="login login-page flex min-h-[calc(100vh-120px)] items-start justify-center overflow-y-auto px-4 pt-36 pb-8 max-[1200px]:pt-34 tablet:min-h-[calc(100vh-100px)] tablet:pt-[100px] tablet:pb-4 phone:px-2 phone:pt-[90px] short:pt-26">
        <div className="container">
          <div className="mx-auto w-full max-w-[420px] tablet:max-w-full">
            <div className="login-card mt-4 w-full rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)] tablet:m-0 tablet:p-6 phone:rounded-lg phone:p-5">
              <div className="mb-6 text-center phone:mb-5 short:mb-4">
                <h2 className="login-title mb-2 text-[1.5rem] leading-[1.3] font-semibold tablet:text-[1.3rem] phone:mb-[0.3rem] phone:text-[1.2rem]">
                  Acceso Administrador
                </h2>
                <p className="text-[0.85rem] leading-[1.4] text-muted tablet:text-[0.8rem] phone:text-[0.75rem]">
                  Ingresa tus credenciales para acceder al panel de administración
                </p>
              </div>

              <form id="loginForm" onSubmit={handleSubmit}>
                <Field
                  variant="compact"
                  id="email"
                  label="Email:"
                  type="email"
                  required
                  placeholder="admin@admin.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Field
                  variant="compact"
                  id="password"
                  label="Contraseña:"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <Banner
                  id="loginError"
                  tone="error"
                  className="error-message mt-2 p-3 text-[0.85rem] leading-[1.3]"
                  style={{ display: error ? 'block' : 'none' }}
                >
                  {error}
                </Banner>

                <button
                  type="submit"
                  id="loginBtn"
                  disabled={loading}
                  className="flex w-full cursor-pointer items-center justify-center gap-[0.6rem] rounded-lg border-none bg-primary p-[0.85rem] text-[1rem] font-medium text-white transition-[background-color] duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span>{getButtonLabel(loading, slow)}</span>
                  <div
                    className="loading-spinner size-4 shrink-0 animate-spin rounded-full border-2 border-white/60 border-t-white"
                    style={{ display: loading ? 'inline-block' : 'none' }}
                  />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
