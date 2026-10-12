// ─── State ──────────────────────────────────────────────────────────────────

class ComprobanteState {
    constructor() {
        this.cliente = '';
        this.propiedad = '';
        this.periodo = '';
        this.monto = 0;
        this.fecha = '';
    }
}

const comprobanteState = new ComprobanteState();

// ─── DomainLogic ─────────────────────────────────────────────────────────────

class DomainLogic {
    static normalizeMoney(value) {
        if (!value) return '';
        // Remove thousand separators (dots before groups of 3 digits) then replace comma decimal
        return value.trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    }

    static formatMoney(amount) {
        const [intPart, decPart] = amount.toFixed(2).split('.');
        const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `$${withThousands},${decPart}`;
    }

    static formatDate(dateStr) {
        // YYYY-MM-DD → DD/MM/YYYY
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    static validate(state) {
        const errors = [];

        if (!state.cliente.trim()) errors.push('cliente');
        if (!state.propiedad.trim()) errors.push('propiedad');
        if (!state.periodo) errors.push('periodo');
        if (!state.fecha) errors.push('fecha');

        const montoRaw = this.normalizeMoney(state.monto);
        const montoNum = parseFloat(montoRaw);
        if (!montoRaw || isNaN(montoNum) || montoNum <= 0) errors.push('monto');

        return { valid: errors.length === 0, errors };
    }
}

// ─── UIService ───────────────────────────────────────────────────────────────

class UIService {
    static getFormValues() {
        return {
            cliente: document.getElementById('cliente').value,
            propiedad: document.getElementById('propiedad').value,
            periodo: document.getElementById('periodo').value,
            monto: document.getElementById('monto').value,
            fecha: document.getElementById('fechaRecibo').value,
        };
    }

    static setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('fechaRecibo').value = today;
    }

    static setupMontoInput() {
        const input = document.getElementById('monto');
        input.addEventListener('input', () => {
            // Strip thousand separators, keep only digits and one comma
            let clean = input.value.replace(/\./g, '').replace(/[^\d,]/g, '');

            const commaIdx = clean.indexOf(',');
            let intPart = commaIdx >= 0 ? clean.slice(0, commaIdx) : clean;
            const decPart = commaIdx >= 0 ? clean.slice(commaIdx) : '';

            intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

            input.value = intPart + decPart;
        });
    }

    static clearErrors() {
        ['cliente', 'propiedad', 'periodo', 'fecha', 'monto'].forEach(field => {
            const group = document.getElementById(`group-${field}`);
            if (group) group.classList.remove('error');
        });
    }

    static showErrors(errorFields) {
        this.clearErrors();
        errorFields.forEach(field => {
            const group = document.getElementById(`group-${field}`);
            if (group) group.classList.add('error');
        });
    }

    static setProcessing(btn, isProcessing) {
        if (isProcessing) {
            btn.classList.add('processing');
            btn.textContent = 'Generando PDF...';
        } else {
            btn.classList.remove('processing');
            btn.textContent = '📄 Generar y Descargar PDF';
        }
    }

    static escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    static populatePdfTemplate(state) {
        const montoNum = parseFloat(DomainLogic.normalizeMoney(state.monto));
        const montoFormatted = DomainLogic.formatMoney(montoNum);

        document.getElementById('pdf-fecha').textContent = DomainLogic.formatDate(state.fecha);
        document.getElementById('pdf-cliente').textContent = state.cliente.toUpperCase();
        document.getElementById('pdf-propiedad').textContent = state.propiedad.toUpperCase();
        document.getElementById('pdf-periodo').textContent = state.periodo.toUpperCase();
        document.getElementById('pdf-monto').textContent = montoFormatted;
        document.getElementById('pdf-total').textContent = montoFormatted;
    }
}

// ─── PdfService ───────────────────────────────────────────────────────────────

class PdfService {
    static async download(state) {
        const template = document.getElementById('pdfTemplate');
        // z-index: 9999 keeps the node above the document background so html2canvas
        // captures the full template. z-index: -1 caused content to be clipped.
        template.style.cssText = 'display: block; position: absolute; top: 0; left: -9999px; z-index: 9999;';

        // Wait for the browser to complete the full layout pass before capture.
        await new Promise(r => setTimeout(r, 150));

        const filename = `Comprobante_${state.cliente.replace(/\s+/g, '_')}_${state.periodo}.pdf`;

        const options = {
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: 'avoid-all' },
        };

        try {
            await html2pdf().set(options).from(template.firstElementChild).save();
        } finally {
            template.style.cssText = 'display: none;';
        }
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class ComprobanteController {
    static init() {
        requireAuth();
        UIService.setDefaultDate();
        UIService.setupMontoInput();
    }

    static async generate() {
        const values = UIService.getFormValues();

        Object.assign(comprobanteState, values);

        const { valid, errors } = DomainLogic.validate(comprobanteState);
        if (!valid) {
            UIService.showErrors(errors);
            return;
        }

        UIService.clearErrors();

        const btn = document.getElementById('btnGenerar');
        UIService.setProcessing(btn, true);

        UIService.populatePdfTemplate(comprobanteState);

        try {
            await PdfService.download(comprobanteState);
        } catch (err) {
            console.error('Error generando PDF:', err);
            alert('Error al generar el PDF. Intentá de nuevo.');
        } finally {
            UIService.setProcessing(btn, false);
        }
    }
}

// ─── Global bridges ──────────────────────────────────────────────────────────

function generarComprobante() {
    ComprobanteController.generate();
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    ComprobanteController.init();
});
