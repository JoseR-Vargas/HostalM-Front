import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import { DataTable, EmptyState, Td, Tr } from '../components/DataTable';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import MonthPager from '../components/MonthPager';
import { ADMIN_NAV } from '../components/navLinks';
import { PageSection, SectionSubtitle } from '../components/ui';
import { getVouchersBase } from '../lib/apiConfig';
import { useMonthPager } from '../lib/useMonthPager';
import {
  fetchVouchers,
  filterVouchersByMonth,
  formatVoucherDate,
  isImageFile,
  normalizeVoucherFiles,
} from '../lib/voucherDashboard';

const COLUMNS = ['Nombre', 'DNI', 'Email', 'Ref 4', 'Hab/Apto', 'Monto', 'Fecha', 'Archivos'];

const IMAGE_BOX =
  'relative flex w-[90%] max-h-fit max-w-fit flex-col items-center justify-center rounded-xl border border-border bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] tablet:m-4 tablet:max-h-[95vh] tablet:max-w-[95vw] tablet:p-4';
const CLOSE_BUTTON =
  'close-modal-btn absolute top-2 right-2 z-10001 flex size-10 cursor-pointer items-center justify-center rounded-full border-2 border-border bg-white text-[2rem] leading-none font-bold text-ink shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-300 ease-[ease] hover:scale-110 hover:rotate-90 hover:border-primary hover:bg-primary hover:text-white hover:shadow-[0_6px_24px_rgba(43,108,176,0.6)] tablet:top-1 tablet:right-1 tablet:size-[35px] tablet:text-[1.75rem]';

function fileLabel(file, index) {
  return file.name || `Archivo ${index + 1}`;
}

/** Image file: a clickable thumbnail that becomes a text link if the image cannot be loaded. */
function ImageThumbnail({ file, index, onOpen }) {
  const [failed, setFailed] = useState(false);
  const name = file.name || `Imagen ${index + 1}`;

  return (
    <div className="m-0.5 inline-block">
      <img
        src={file.url}
        alt={name}
        title="Clic para ver completa"
        loading="lazy"
        className="size-10 cursor-pointer rounded-sm border border-[#ccc] object-cover"
        style={failed ? { display: 'none' } : undefined}
        onClick={() => onOpen(file.url, name)}
        onError={() => setFailed(true)}
      />
      {failed && (
        <a href={file.url} target="_blank" rel="noopener">
          {fileLabel(file, index)}
        </a>
      )}
    </div>
  );
}

function FileLink({ file, index }) {
  return (
    <a
      href={file.url || '#'}
      download={file.name || ''}
      target={file.url ? '_blank' : '_self'}
      rel="noopener"
      className="mx-[5px]"
    >
      {fileLabel(file, index)}
    </a>
  );
}

function VoucherRow({ voucher, vouchersBase, onOpenImage }) {
  const files = normalizeVoucherFiles(voucher, vouchersBase);
  const values = [
    `${voucher.nombre || ''} ${voucher.apellido || ''}`.trim(),
    voucher.dni || '—',
    voucher.email || '—',
    voucher.ref4 || '—',
    voucher.hab || '—',
    voucher.monto || '—',
    formatVoucherDate(voucher),
  ];

  return (
    <Tr>
      {values.map((value, index) => (
        <Td key={COLUMNS[index]} label={COLUMNS[index]}>
          {value}
        </Td>
      ))}
      <Td label="Archivos">
        {files.length === 0
          ? '—'
          : files.map((file, index) =>
              isImageFile(file.name) && file.url ? (
                <ImageThumbnail key={index} file={file} index={index} onOpen={onOpenImage} />
              ) : (
                <FileLink key={index} file={file} index={index} />
              ),
            )}
      </Td>
    </Tr>
  );
}

function ImageModal({ image, onClose }) {
  return (
    <Modal id="imageModal" open={image !== null} onBackdropClick={onClose} contentClassName={IMAGE_BOX}>
      <span className={CLOSE_BUTTON} onClick={onClose}>
        &times;
      </span>
      <img
        id="modalImage"
        className="block h-auto max-h-[80vh] w-auto max-w-[85vw] rounded-lg object-contain tablet:max-h-[75vh] tablet:max-w-[90vw]"
        src={image?.url}
        alt="Vista completa"
      />
      <p id="modalImageName" className="mt-6 text-[1.1rem] font-semibold text-primary tablet:mt-4 tablet:text-[0.95rem]">
        {image ? image.name || 'Imagen' : ''}
      </p>
    </Modal>
  );
}

export default function Dashboard() {
  const [vouchers, setVouchers] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [image, setImage] = useState(null);
  const { monthKey, monthLabel, changeMonth } = useMonthPager({ capitalize: true });
  const vouchersBase = getVouchersBase();

  useEffect(() => {
    const controller = new AbortController();
    fetchVouchers({ signal: controller.signal })
      .then(setVouchers)
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('Error al obtener vouchers:', error);
        setLoadFailed(true);
      });
    return () => controller.abort();
  }, []);

  const monthVouchers = useMemo(
    () => filterVouchersByMonth(vouchers, monthKey),
    [vouchers, monthKey],
  );

  return (
    <>
      <AdminHeader links={ADMIN_NAV.dashboard} />

      <PageSection title="Dashboard Administrativo" subtitle="Gestión de datos de usuarios">
        <MonthPager label={monthLabel} onChange={changeMonth} />

        <SectionSubtitle>Datos de Usuarios Registrados</SectionSubtitle>
        {loadFailed ? (
          <EmptyState id="vouchersLoadError" role="alert">
            No se pudieron cargar los comprobantes.
          </EmptyState>
        ) : (
          <DataTable id="voucherTable" bodyId="voucherTableBody" columns={COLUMNS}>
            {monthVouchers.map((voucher, index) => (
              <VoucherRow
                key={voucher._id ?? index}
                voucher={voucher}
                vouchersBase={vouchersBase}
                onOpenImage={(url, name) => setImage({ url, name })}
              />
            ))}
          </DataTable>
        )}
      </PageSection>

      <Footer />

      <ImageModal image={image} onClose={() => setImage(null)} />
    </>
  );
}
