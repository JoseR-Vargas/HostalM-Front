// ─── State ──────────────────────────────────────────────────────────────────

class ComprobanteServiciosState {
    constructor() {
        this.cliente = '';
        this.propiedad = '';
        this.periodo = '';
        this.montoAgua = '';
        this.montoLuz = '';
        this.fecha = '';
    }
}

const comprobanteServiciosState = new ComprobanteServiciosState();

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

        const montoAguaRaw = this.normalizeMoney(state.montoAgua);
        const montoAguaNum = parseFloat(montoAguaRaw);
        if (!montoAguaRaw || isNaN(montoAguaNum) || montoAguaNum <= 0) errors.push('montoAgua');

        const montoLuzRaw = this.normalizeMoney(state.montoLuz);
        const montoLuzNum = parseFloat(montoLuzRaw);
        if (!montoLuzRaw || isNaN(montoLuzNum) || montoLuzNum <= 0) errors.push('montoLuz');

        return { valid: errors.length === 0, errors };
    }

    static calcularTotal(state) {
        return parseFloat(this.normalizeMoney(state.montoAgua)) + parseFloat(this.normalizeMoney(state.montoLuz));
    }
}

// ─── UIService ───────────────────────────────────────────────────────────────

class UIService {
    static getFormValues() {
        return {
            cliente: document.getElementById('cliente').value,
            propiedad: document.getElementById('propiedad').value,
            periodo: document.getElementById('periodo').value,
            montoAgua: document.getElementById('montoAgua').value,
            montoLuz: document.getElementById('montoLuz').value,
            fecha: document.getElementById('fechaRecibo').value,
        };
    }

    static setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('fechaRecibo').value = today;
    }

    static setupMontoInputs() {
        ['montoAgua', 'montoLuz'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', () => {
                // Strip thousand separators, keep only digits and one comma
                let clean = input.value.replace(/\./g, '').replace(/[^\d,]/g, '');

                const commaIdx = clean.indexOf(',');
                let intPart = commaIdx >= 0 ? clean.slice(0, commaIdx) : clean;
                const decPart = commaIdx >= 0 ? clean.slice(commaIdx) : '';

                intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

                input.value = intPart + decPart;
            });
        });
    }

    static clearErrors() {
        ['cliente', 'propiedad', 'periodo', 'fecha', 'montoAgua', 'montoLuz'].forEach(field => {
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
            btn.textContent = '📄 Generando PDF...';
        } else {
            btn.classList.remove('processing');
            btn.textContent = '📄 Generar Comprobante de Servicios';
        }
    }

    static escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    static populatePdfTemplate(state) {
        const montoAguaNum = parseFloat(DomainLogic.normalizeMoney(state.montoAgua));
        const montoLuzNum = parseFloat(DomainLogic.normalizeMoney(state.montoLuz));
        const total = DomainLogic.calcularTotal(state);

        document.getElementById('pdf-fecha').textContent = DomainLogic.formatDate(state.fecha);
        document.getElementById('pdf-cliente').textContent = state.cliente.toUpperCase();
        document.getElementById('pdf-propiedad').textContent = state.propiedad.toUpperCase();
        document.getElementById('pdf-periodo').textContent = state.periodo.toUpperCase();
        document.getElementById('pdf-periodo-luz').textContent = state.periodo.toUpperCase();
        document.getElementById('pdf-monto-agua').textContent = DomainLogic.formatMoney(montoAguaNum);
        document.getElementById('pdf-monto-luz').textContent = DomainLogic.formatMoney(montoLuzNum);
        document.getElementById('pdf-total').textContent = DomainLogic.formatMoney(total);
    }
}

// ─── PdfService ───────────────────────────────────────────────────────────────

class PdfService {
    static async download(state) {
        const template = document.getElementById('pdfTemplate');
        // position: fixed anchors the template to the viewport, not the document scroll.
        // position: absolute with top:0 caused content to land mid-page on machines
        // where the body had a scroll offset or extra margin at capture time.
        template.style.cssText = 'display: block; position: fixed; top: 0; left: -9999px; z-index: 9999;';

        // Give the browser a full layout pass before html2canvas captures.
        await new Promise(r => setTimeout(r, 150));

        const filename = `Comprobante_Servicios_${state.cliente.replace(/\s+/g, '_')}_${state.periodo}.pdf`;

        const options = {
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
            },
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

class ComprobanteServiciosController {
    static init() {
        requireAuth();
        UIService.setDefaultDate();
        UIService.setupMontoInputs();
    }

    static async generate() {
        const values = UIService.getFormValues();

        Object.assign(comprobanteServiciosState, values);

        const { valid, errors } = DomainLogic.validate(comprobanteServiciosState);
        if (!valid) {
            UIService.showErrors(errors);
            return;
        }

        UIService.clearErrors();

        const btn = document.getElementById('btnGenerar');
        UIService.setProcessing(btn, true);

        UIService.populatePdfTemplate(comprobanteServiciosState);

        try {
            await PdfService.download(comprobanteServiciosState);
        } catch (err) {
            console.error('Error generando PDF:', err);
            alert('Error al generar el PDF. Intentá de nuevo.');
        } finally {
            UIService.setProcessing(btn, false);
        }
    }
}

// ─── Global bridges ──────────────────────────────────────────────────────────

function generarComprobanteServicios() {
    ComprobanteServiciosController.generate();
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    ComprobanteServiciosController.init();
});
