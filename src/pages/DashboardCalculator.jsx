import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import { DataTable, EmptyState, Td, Tr } from '../components/DataTable';
import Footer from '../components/Footer';
import { Metric } from '../components/MetricCard';
import Modal, { ModalTitle } from '../components/Modal';
import MonthPager from '../components/MonthPager';
import { ADMIN_NAV } from '../components/navLinks';
import { cls, PageSection, SectionSubtitle, Spinner } from '../components/ui';
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

const COLUMNS = [
  'Nombre',
  'Apellido',
  'DNI',
  'Habitación',
  'Medición Ant.',
  'Medición Act.',
  'Consumo (kWh)',
  'Fecha',
  'Fotos',
];

const PHOTO =
  'foto-medidor-preview size-[60px] cursor-pointer object-cover shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 ease-[ease] hover:scale-110 hover:border-current hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]';
const PHOTO_OK = 'rounded-lg border-2 border-[#e9ecef]';
const PHOTO_FAILED =
  'imagen-error rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-2.5 py-1.5 text-center text-[0.8rem] text-[#dc3545] italic';

/** Meter photo thumbnail; shows the error state when the image cannot be loaded. */
function MeterPhoto({ src, alt, onOpen }) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={failed ? undefined : src}
      alt={failed ? 'Error al cargar' : alt}
      className={cls(PHOTO, failed ? PHOTO_FAILED : PHOTO_OK)}
      onClick={onOpen}
      onError={() => setFailed(true)}
    />
  );
}

function CalculoRow({ calculo, onOpenPhoto }) {
  return (
    <Tr>
      <Td>{calculo.nombre}</Td>
      <Td>{calculo.apellido}</Td>
      <Td>{calculo.dni}</Td>
      <Td>{calculo.habitacion}</Td>
      <Td>{formatDecimal1(calculo.medicionAnterior)}</Td>
      <Td>{formatDecimal1(calculo.medicionActual)}</Td>
      <Td className="consumo-cell font-semibold">{formatDecimal1(calculo.consumoCalculado)}</Td>
      <Td>{formatCalculoDate(calculo)}</Td>
      <Td>
        <div className="flex flex-wrap gap-2">
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
              <span
                key={kind}
                className="sin-foto min-w-20 rounded-md border border-[#e9ecef] bg-[#f8f9fa] px-3 py-2 text-center text-[0.9rem] text-muted italic"
              >
                {missing}
              </span>
            ),
          )}
        </div>
      </Td>
    </Tr>
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

      <PageSection title="Calculadora de Medidor" subtitle="Gestión de cálculos de consumo eléctrico">
        <div
          id="metricsCalculator"
          className="mt-8 mb-12 grid w-full grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 px-4 tablet:grid-cols-2 tablet:px-0"
        >
          {loaded && (
            <>
              <Metric title="Total Registros" value={metrics.totalRegistros} />
              <Metric title="Consumo Total" value={`${metrics.consumoTotal} kWh`} />
              <Metric title="Promedio Consumo" value={`${metrics.promedioConsumo} kWh`} />
            </>
          )}
        </div>

        <MonthPager label={monthLabel} onChange={changeMonth} />

        <SectionSubtitle>Registro de cálculos</SectionSubtitle>
        {isEmpty ? (
          <EmptyState id="noDataMessage">No hay registros de cálculos disponibles</EmptyState>
        ) : (
          <DataTable id="calculatorTable" bodyId="calculatorTableBody" columns={COLUMNS}>
            {monthCalculos.map((calculo, index) => (
              <CalculoRow key={calculo._id ?? index} calculo={calculo} onOpenPhoto={setPhoto} />
            ))}
          </DataTable>
        )}
      </PageSection>

      <Modal id="imageModal" open={photo !== null} onBackdropClick={() => setPhoto(null)}>
        <span className="close-modal" onClick={() => setPhoto(null)}>
          &times;
        </span>
        <ModalTitle as="h3" id="imageModalTitle">
          {photo ? photo.title : 'Foto del Medidor'}
        </ModalTitle>
        <img id="modalImage" className="mt-4 w-full rounded-lg" src={photo?.url} alt="Foto ampliada" />
      </Modal>

      <div
        id="loadingOverlay"
        className="fixed inset-0 z-1000 items-center justify-center bg-[rgba(255,255,255,0.9)]"
        style={{ display: loading ? 'flex' : 'none' }}
      >
        <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-card p-8 text-[1.1rem] font-semibold text-ink shadow-hover">
          <Spinner />
        </div>
      </div>

      <Footer />
    </>
  );
}
