import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import { DataTable, EmptyState, Td, Tr } from '../components/DataTable';
import Footer from '../components/Footer';
import Modal, { ModalTitle } from '../components/Modal';
import MonthPager from '../components/MonthPager';
import { ADMIN_NAV } from '../components/navLinks';
import { cls, PageSection, SectionSubtitle, TABLE_LINK } from '../components/ui';
import { getApiBase } from '../lib/apiConfig';
import { useMonthPager } from '../lib/useMonthPager';
import {
  fetchVouchers,
  filterVouchersByMonth,
  formatVoucherDate,
  isImageFile,
  normalizeVoucherFiles,
} from '../lib/voucherDashboard';

const COLUMNS = ['Nombre', 'DNI', 'Email', 'Ref 4', 'Hab/Apto', 'Monto', 'Fecha', 'Archivos'];

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
        <a href={file.url} target="_blank" rel="noopener" className={cls(TABLE_LINK, 'hover:text-shadow-none')}>
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
      className={cls(TABLE_LINK, 'mx-[5px] hover:text-shadow-none')}
    >
      {fileLabel(file, index)}
    </a>
  );
}

function VoucherRow({ voucher, apiBase, onOpenImage }) {
  const files = normalizeVoucherFiles(voucher, apiBase);
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
      <Td label="Archivos" wrap>
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
    <Modal
      id="imageModal"
      open={image !== null}
      size="wide"
      titleId="modalImageName"
      title={<ModalTitle id="modalImageName" className="min-w-0 pe-2 break-words">{image ? image.name || 'Imagen' : ''}</ModalTitle>}
      onClose={onClose}
      closeClassName="close-modal-btn"
      onBackdropClick={onClose}
      bodyClassName="flex justify-center"
    >
      <img
        id="modalImage"
        className="block h-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
        src={image?.url}
        alt="Vista completa"
      />
    </Modal>
  );
}

export default function Dashboard() {
  const [vouchers, setVouchers] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [image, setImage] = useState(null);
  const { monthKey, monthLabel, changeMonth } = useMonthPager({ capitalize: true });
  const apiBase = getApiBase();

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
                apiBase={apiBase}
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
