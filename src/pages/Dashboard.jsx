import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
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

const THUMBNAIL_STYLE = {
  width: '40px',
  height: '40px',
  objectFit: 'cover',
  borderRadius: '4px',
  cursor: 'pointer',
  border: '1px solid #ccc',
};

function fileLabel(file, index) {
  return file.name || `Archivo ${index + 1}`;
}

/** Image file: a clickable thumbnail that becomes a text link if the image cannot be loaded. */
function ImageThumbnail({ file, index, onOpen }) {
  const [failed, setFailed] = useState(false);
  const name = file.name || `Imagen ${index + 1}`;

  return (
    <div style={{ display: 'inline-block', margin: '2px' }}>
      <img
        src={file.url}
        alt={name}
        title="Clic para ver completa"
        loading="lazy"
        style={{ ...THUMBNAIL_STYLE, display: failed ? 'none' : undefined }}
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
      style={{ margin: '0 5px' }}
    >
      {fileLabel(file, index)}
    </a>
  );
}

function VoucherRow({ voucher, vouchersBase, onOpenImage }) {
  const files = normalizeVoucherFiles(voucher, vouchersBase);

  return (
    <tr>
      <td data-label="Nombre">{`${voucher.nombre || ''} ${voucher.apellido || ''}`.trim()}</td>
      <td data-label="DNI">{voucher.dni || '—'}</td>
      <td data-label="Email">{voucher.email || '—'}</td>
      <td data-label="Ref 4">{voucher.ref4 || '—'}</td>
      <td data-label="Hab/Apto">{voucher.hab || '—'}</td>
      <td data-label="Monto">{voucher.monto || '—'}</td>
      <td data-label="Fecha">{formatVoucherDate(voucher)}</td>
      <td data-label="Archivos">
        {files.length === 0
          ? '—'
          : files.map((file, index) =>
              isImageFile(file.name) && file.url ? (
                <ImageThumbnail key={index} file={file} index={index} onOpen={onOpenImage} />
              ) : (
                <FileLink key={index} file={file} index={index} />
              ),
            )}
      </td>
    </tr>
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

        <SectionSubtitle>Datos de Usuarios Registrados</SectionSubtitle>
        {loadFailed ? (
          <div id="vouchersLoadError" className="no-data-message" role="alert">
            <p>No se pudieron cargar los comprobantes.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table" id="voucherTable">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Email</th>
                  <th>Ref 4</th>
                  <th>Hab/Apto</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                  <th>Archivos</th>
                </tr>
              </thead>
              <tbody id="voucherTableBody">
                {monthVouchers.map((voucher, index) => (
                  <VoucherRow
                    key={voucher._id ?? index}
                    voucher={voucher}
                    vouchersBase={vouchersBase}
                    onOpenImage={(url, name) => setImage({ url, name })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <Footer />

      <Modal
        id="imageModal"
        open={image !== null}
        onBackdropClick={() => setImage(null)}
        contentClassName="image-modal-content"
      >
        <span className="close-modal-btn" onClick={() => setImage(null)}>
          &times;
        </span>
        <img id="modalImage" className="modal-image" src={image?.url} alt="Vista completa" />
        <p id="modalImageName" className="modal-image-name">
          {image ? image.name || 'Imagen' : ''}
        </p>
      </Modal>
    </>
  );
}
