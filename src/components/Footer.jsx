import { Link } from 'react-router-dom';

const FOOTER =
  'footer footer-centered relative w-full border-t border-border bg-page pt-16 pb-8 text-ink before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-bar tablet:pt-12';
const COLUMNS =
  'footer-content mb-12 flex flex-wrap items-start justify-center gap-12 text-left tablet:flex-col tablet:items-center tablet:gap-10 tablet:text-center';
const SECTION =
  'footer-section flex flex-col items-start text-left tablet:mx-auto tablet:w-full tablet:max-w-[320px] tablet:items-center tablet:text-center';
const HEADING = 'mb-6 text-[1.4rem] text-primary tablet:mb-[1.2rem] tablet:text-[1.3rem]';
const LINKS = 'flex w-full flex-col items-start gap-4 tablet:items-center tablet:gap-[1.2rem]';
const LINK =
  'group relative flex items-center justify-start gap-4 overflow-hidden rounded-xl border border-border bg-white/70 px-[1.2rem] py-4 text-[1.05rem] text-muted before:absolute before:top-0 before:-left-full before:h-full before:w-full before:bg-[linear-gradient(90deg,transparent,rgba(21,39,81,0.1),transparent)] before:transition-all before:duration-300 hover:-translate-y-[3px] hover:scale-[1.02] hover:border-primary hover:bg-white/90 hover:text-primary hover:shadow-[0_8px_25px_rgba(21,39,81,0.15)] hover:before:left-full tablet:min-h-14 tablet:justify-center tablet:px-6 tablet:py-[1.2rem] tablet:text-[1.1rem]';
function Section({ title, children }) {
  return (
    <div className={SECTION}>
      <h4 className={HEADING}>{title}</h4>
      {children}
    </div>
  );
}

function Address() {
  return (
    <Section title="Hostal Mayelewoo">
      <p className="text-left text-[1.05rem] leading-[1.7] text-muted">
        Humberto Primo 3070
        <br />
        Córdoba, Argentina
      </p>
    </Section>
  );
}

/**
 * Site footer.
 * - `home`: address only
 * - `vouchers`: address and a back link
 * - default: copyright only (admin pages)
 */
export default function Footer({ variant = 'minimal' }) {
  return (
    <footer className={FOOTER}>
      <div className="container">
        {variant === 'home' && (
          <div className={COLUMNS}>
            <Address />
          </div>
        )}
        {variant === 'vouchers' && (
          <div className={COLUMNS}>
            <Address />
            <Section title="Volver">
              <div className={`social-links ${LINKS}`}>
                <Link className={`social-link ${LINK}`} to="/#inicio" target="_self">
                  Inicio
                </Link>
              </div>
            </Section>
          </div>
        )}
        <div className="footer-bottom w-full border-t border-border pt-12 text-center text-[1.05rem] text-muted tablet:pt-10 tablet:text-[1rem]">
          <p>&copy; 2024 Hostal Mayelewoo. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
