const NBSP = '\u00A0';

// html2canvas reads computed styles, so the printable sheet is styled inline (as in the
// original pages) and does not depend on any global CSS.
const SHEET_STYLE = {
  width: '210mm',
  minHeight: '257mm',
  padding: '20mm 20mm',
  background: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11pt',
  color: '#1a1a1a',
  position: 'relative',
  boxSizing: 'border-box',
};

const STAMP_COLOR = 'rgba(0, 130, 0, 0.48)';
const STAMP_OUTER_STYLE = {
  position: 'absolute',
  top: '36mm',
  right: '18mm',
  width: '92px',
  height: '92px',
  border: `5px solid ${STAMP_COLOR}`,
  borderRadius: '50%',
  transform: 'rotate(-18deg)',
  pointerEvents: 'none',
  userSelect: 'none',
  boxSizing: 'border-box',
};
const STAMP_INNER_STYLE = {
  position: 'absolute',
  top: '5px',
  left: '5px',
  right: '5px',
  bottom: '5px',
  border: `2px solid ${STAMP_COLOR}`,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const STAMP_TEXT_STYLE = {
  fontSize: '11pt',
  fontWeight: 900,
  color: 'rgba(0, 130, 0, 0.52)',
  letterSpacing: '3px',
};

const HEADER_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '28px',
};
const TITLE_STYLE = { fontSize: '13pt', fontWeight: 700, letterSpacing: '1px' };
const DATE_STYLE = { fontSize: '11pt', fontWeight: 600 };

const VALUE_STYLE = { color: '#c05e00' };
const LABEL_STYLE = { fontWeight: 700 };
const DIVIDER_STYLE = { border: 'none', borderTop: '1.5px solid #1a1a1a', margin: 0 };
const TABLE_STYLE = { width: '100%', borderCollapse: 'collapse', marginTop: 0 };

const HEAD_CELL_STYLE = { padding: '10px 0 8px 0', fontSize: '11pt', fontWeight: 700 };
const TOP_ROW_PADDING = '12px 0 8px 0';
const ROW_PADDING = '8px 0';
const TOTAL_CELL_STYLE = { padding: '8px 0', borderTop: '1px dashed #999' };

// The wrapper is the element `downloadPdf` shows off-screen while it captures the sheet.
const WRAPPER_STYLE = { display: 'none', position: 'absolute', top: 0, left: '-9999px' };

/**
 * Hidden printable receipt (A4 width). `rows` is a list of
 * `{ label, periodo, periodoId, monto, montoId }`; the first row has extra top padding.
 * Attach `ref` to the wrapper and pass it to `downloadPdf`.
 */
export default function ReceiptTemplate({ ref, title, content, rows, total }) {
  return (
    <div id="pdfTemplate" ref={ref} style={WRAPPER_STYLE}>
      <div style={SHEET_STYLE}>
        {/* "PAGADO" stamp */}
        <div style={STAMP_OUTER_STYLE}>
          <div style={STAMP_INNER_STYLE}>
            <span style={STAMP_TEXT_STYLE}>PAGADO</span>
          </div>
        </div>

        <div style={HEADER_STYLE}>
          <div style={TITLE_STYLE}>{title}</div>
          <div style={DATE_STYLE}>
            FECHA {NBSP}
            <span id="pdf-fecha">{content.fecha}</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '11pt' }}>
            <span style={LABEL_STYLE}>CLIENTE:</span> {NBSP}
            <span id="pdf-cliente" style={VALUE_STYLE}>
              {content.cliente}
            </span>
          </p>
          <p style={{ margin: 0, fontSize: '11pt' }}>
            <span style={LABEL_STYLE}>PROPIEDAD:</span> {NBSP}
            <span id="pdf-propiedad" style={VALUE_STYLE}>
              {content.propiedad}
            </span>
          </p>
        </div>

        <hr style={DIVIDER_STYLE} />

        <table style={TABLE_STYLE}>
          <thead>
            <tr style={{ borderBottom: '1px solid #555' }}>
              <th style={{ ...HEAD_CELL_STYLE, textAlign: 'left', width: '50%' }}>Concepto</th>
              <th style={{ ...HEAD_CELL_STYLE, textAlign: 'center', width: '25%' }}>PERIODO</th>
              <th style={{ ...HEAD_CELL_STYLE, textAlign: 'right', width: '25%' }}>MONTO</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const cellStyle = {
                padding: index === 0 ? TOP_ROW_PADDING : ROW_PADDING,
                fontSize: '11pt',
                verticalAlign: 'top',
              };
              return (
                <tr key={row.label}>
                  <td style={cellStyle}>{row.label}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }} id={row.periodoId}>
                    {row.periodo}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }} id={row.montoId}>
                    {row.monto}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td style={TOTAL_CELL_STYLE} />
              <td style={{ ...TOTAL_CELL_STYLE, textAlign: 'center', fontWeight: 700, fontSize: '11pt' }}>TOTAL</td>
              <td
                style={{ ...TOTAL_CELL_STYLE, textAlign: 'right', fontWeight: 700, fontSize: '11pt' }}
                id="pdf-total"
              >
                {total}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
