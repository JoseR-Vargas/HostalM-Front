import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import { ADMIN_NAV } from '../components/navLinks';
import { useAuth } from '../auth/useAuth';
import {
  computeCalculoMetrics,
  fetchCalculos,
  filterCalculosByMonth,
  formatCalculoDate,
  formatDecimal1,
  getCalculoFotoUrl,
  hasFoto,
} from '../lib/meterRecords';
import { useMonthPager } from '../lib/useMonthPager';

const LOAD_ERROR_MESSAGE = 'Error al cargar los datos. Por favor, intente nuevamente.';

const PHOTO_KINDS = [
  { kind: 'anterior', label: 'Medición Anterior', missing: 'Sin foto ant.' },
  { kind: 'actual', label: 'Medición Actual', missing: 'Sin foto act.' },
];

const MODAL_IMAGE_STYLE = { width: '100%', borderRadius: '8px', marginTop: '1rem' };

function MetricCard({ title, value }) {
  return (
    <div className="metric-card">
      <h4 className="metric-title">{title}</h4>
      <p className="metric-value">{value}</p>
    </div>
  );
}

/** Meter photo thumbnail; shows the error state when the image cannot be loaded. */
function MeterPhoto({ src, alt, onOpen }) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={failed ? undefined : src}
      alt={failed ? 'Error al cargar' : alt}
      className={failed ? 'foto-medidor-preview imagen-error' : 'foto-medidor-preview'}
      onClick={onOpen}
      onError={() => setFailed(true)}
    />
  );
}

function CalculoRow({ calculo, onOpenPhoto }) {
  return (
    <tr>
      <td>{calculo.nombre}</td>
      <td>{calculo.apellido}</td>
      <td>{calculo.dni}</td>
      <td>{calculo.habitacion}</td>
      <td>{formatDecimal1(calculo.medicionAnterior)}</td>
      <td>{formatDecimal1(calculo.medicionActual)}</td>
      <td className="consumo-cell">{formatDecimal1(calculo.consumoCalculado)}</td>
      <td>{formatCalculoDate(calculo)}</td>
      <td>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PHOTO_KINDS.map(({ kind, label, missing }) =>
            hasFoto(calculo, kind) ? (
              <MeterPhoto
                key={kind}
                src={getCalculoFotoUrl(calculo._id, kind)}
                alt={label}
                onOpen={() =>
                  onOpenPhoto({
                    url: getCalculoFotoUrl(calculo._id, kind),
                    title: `${label} - ${calculo.habitacion}`,
                  })
                }
              />
            ) : (
              <span key={kind} className="sin-foto">
                {missing}
              </span>
            ),
          )}
        </div>
      </td>
    </tr>
  );
}

export default function DashboardCalculator() {
  const { token } = useAuth();
  const [calculos, setCalculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [photo, setPhoto] = useState(null);
  const { monthKey, monthLabel, changeMonth } = useMonthPager({ capitalize: true });

  useEffect(() => {
    const controller = new AbortController();

    fetchCalculos({ token, signal: controller.signal })
      .then((data) => {
        setCalculos(data);
        setLoaded(true);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('Error cargando datos:', error);
        alert(LOAD_ERROR_MESSAGE);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  // Escape closes the photo modal while it is open.
  useEffect(() => {
    if (!photo) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPhoto(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [photo]);

  const monthCalculos = useMemo(() => filterCalculosByMonth(calculos, monthKey), [calculos, monthKey]);
  const metrics = useMemo(() => computeCalculoMetrics(monthCalculos), [monthCalculos]);
  const isEmpty = loaded && monthCalculos.length === 0;

  return (
    <>
      <AdminHeader links={ADMIN_NAV['dashboard-calculator']} />

      <section className="contact page-top-offset">
        <div className="container vouchers-center">
          <h3 className="section-title">Calculadora de Medidor</h3>
          <p className="contact-subtitle">Gestión de cálculos de consumo eléctrico</p>

          <div id="metricsCalculator" className="metrics-grid">
            {loaded && (
              <>
                <MetricCard title="Total Registros" value={metrics.totalRegistros} />
                <MetricCard title="Consumo Total" value={`${metrics.consumoTotal} kWh`} />
                <MetricCard title="Promedio Consumo" value={`${metrics.promedioConsumo} kWh`} />
              </>
            )}
          </div>

          <div className="month-pagination">
            <button type="button" className="month-nav-btn" id="prevMonth" onClick={() => changeMonth(-1)}>
              ←
            </button>
            <span className="month-label" id="currentMonthLabel">
              {monthLabel}
            </span>
            <button type="button" className="month-nav-btn" id="nextMonth" onClick={() => changeMonth(1)}>
              →
            </button>
          </div>

          <h4 className="section-subtitle">Registro de cálculos</h4>
          {isEmpty ? (
            <div id="noDataMessage" className="no-data-message">
              <p>No hay registros de cálculos disponibles</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" id="calculatorTable">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>DNI</th>
                    <th>Habitación</th>
                    <th>Medición Ant.</th>
                    <th>Medición Act.</th>
                    <th>Consumo (kWh)</th>
                    <th>Fecha</th>
                    <th>Fotos</th>
                  </tr>
                </thead>
                <tbody id="calculatorTableBody">
                  {monthCalculos.map((calculo, index) => (
                    <CalculoRow key={calculo._id ?? index} calculo={calculo} onOpenPhoto={setPhoto} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Modal id="imageModal" open={photo !== null} onBackdropClick={() => setPhoto(null)}>
        <span className="close-modal" onClick={() => setPhoto(null)}>
          &times;
        </span>
        <h3 className="modal-title" id="imageModalTitle">
          {photo ? photo.title : 'Foto del Medidor'}
        </h3>
        <img id="modalImage" src={photo?.url} alt="Foto ampliada" style={MODAL_IMAGE_STYLE} />
      </Modal>

      <div id="loadingOverlay" style={{ display: loading ? 'flex' : 'none' }}>
        <div className="loading-spinner"></div>
      </div>

      <Footer />
    </>
  );
}
