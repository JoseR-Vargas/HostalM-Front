/**
 * Calcular Pago Electricidad - Hostal Mayelewoo
 * Calculadora del costo eléctrico por residente.
 * Paso 1: precio kWh desde factura. Paso 2: selección de residente y cálculo del total.
 * Principios: DRY, SOLID, YAGNI
 */

// ============================================
// UTILIDADES DE ENTRADA NUMÉRICA
// ============================================
class NumberInputService {
    /** Normaliza separador decimal: acepta ',' o '.' */
    static normalize(value) {
        return (value || '').trim().replace(',', '.');
    }

    /** Parsea un valor positivo (campos kWh). Devuelve NaN si inválido o <= 0. */
    static parsePositive(value) {
        const n = parseFloat(NumberInputService.normalize(value));
        return isFinite(n) && n > 0 ? n : NaN;
    }

    /**
     * Parsea el campo montoFactura con formato argentino de miles (puntos como separador).
     * Ej: "200.000,50" → 200000.50
     */
    static parseMontoFactura(value) {
        const normalized = (value || '').trim().replace(/\./g, '').replace(',', '.');
        const n = parseFloat(normalized);
        return isFinite(n) && n > 0 ? n : NaN;
    }

    /**
     * Formatea el entero de un monto con puntos de miles mientras el usuario escribe.
     * Ej: "200000,50" → "200.000,50"
     */
    static formatMontoInput(value) {
        let v = value.replace(/[^0-9,]/g, '');
        const commaIdx = v.indexOf(',');
        let intPart, decPart;
        if (commaIdx !== -1) {
            intPart = v.slice(0, commaIdx);
            decPart = ',' + v.slice(commaIdx + 1).replace(/[^0-9]/g, '');
        } else {
            intPart = v;
            decPart = '';
        }
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return intPart + decPart;
    }
}

// ============================================
// ESTADO DE LA CALCULADORA (Single Source of Truth)
// ============================================
class CalcState {
    constructor() {
        /** @type {number|null} */
        this.precioKwh = null;

        /** @type {Array} Todos los registros traídos de la API */
        this.allResidents = [];
        /** @type {Object|null} Residente seleccionado actualmente */
        this.selectedResident = null;
        /** @type {boolean} */
        this.residentsLoaded = false;
        /** @type {number} Mes actual (0-indexed) */
        this.currentMonth = new Date().getMonth();
        /** @type {number} Año actual */
        this.currentYear = new Date().getFullYear();
    }

    setPrecioKwh(value)  { this.precioKwh = value; }
    getPrecioKwh()       { return this.precioKwh; }
    hasPrecioKwh()       { return this.precioKwh !== null && isFinite(this.precioKwh); }

    reset() {
        this.precioKwh = null;
        this.clearSelectedResident();
    }

    setResidents(records)      { this.allResidents = records; this.residentsLoaded = true; }
    getResidents()             { return this.allResidents; }
    setSelectedResident(r)     { this.selectedResident = r; }
    getSelectedResident()      { return this.selectedResident; }
    clearSelectedResident()    { this.selectedResident = null; }

    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        else if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    }

    getMonthLabel() {
        const label = new Date(this.currentYear, this.currentMonth)
            .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    }
}

const calcState = new CalcState();

// ============================================
// SERVICIO DE API
// ============================================
class CalcApiService {
    static async fetchCalculos() {
        const token = sessionStorage.getItem(CONFIG.STORAGE_KEY);
        if (!token) throw new Error('No autenticado');
        const url = `${window.APP_CONFIG.API_URL}/api/calculos-medidor`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
        const data = await res.json();
        return data.data || [];
    }
}

// ============================================
// LÓGICA DE RESIDENTES (pura, sin acceso al DOM)
// ============================================
class ResidentLogic {
    /** Filtra registros por mes y año según fechaRegistro */
    static filterByMonth(records, month, year) {
        return records.filter(r => {
            const d = new Date(r.fechaRegistro);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }

    /** Mantiene solo el registro más reciente por habitacion */
    static deduplicateByHabitacion(records) {
        const map = new Map();
        for (const r of records) {
            const existing = map.get(r.habitacion);
            if (!existing || new Date(r.fechaRegistro) > new Date(existing.fechaRegistro)) {
                map.set(r.habitacion, r);
            }
        }
        return Array.from(map.values());
    }

    /** Ordena alfabéticamente por habitacion */
    static sortByHabitacion(records) {
        return [...records].sort((a, b) => a.habitacion.localeCompare(b.habitacion));
    }

    /** Pipeline completo: filter → deduplicate → sort */
    static getResidentsForMonth(allRecords, month, year) {
        const filtered = ResidentLogic.filterByMonth(allRecords, month, year);
        const deduped  = ResidentLogic.deduplicateByHabitacion(filtered);
        return ResidentLogic.sortByHabitacion(deduped);
    }

    /** Busca un residente por habitacion dentro de una lista ya filtrada */
    static findByHabitacion(residents, habitacion) {
        return residents.find(r => r.habitacion === habitacion) || null;
    }
}

// ============================================
// LÓGICA DE NEGOCIO (pura, sin acceso al DOM)
// ============================================
class ElectricityCalculator {
    /** precio_kWh = monto_factura / total_kWh_factura */
    static calcularPrecioKwh(montoFactura, totalKwhFactura) {
        return montoFactura / totalKwhFactura;
    }

    /** total_a_pagar = consumo_kWh × precio_kWh */
    static calcularTotalAPagar(consumoKwh, precioKwh) {
        return consumoKwh * precioKwh;
    }
}

// ============================================
// SERVICIO DE UI (responsabilidad única: DOM)
// ============================================
class CalcUIService {
    static escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static getInputValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    static setReadonlyField(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    static clearReadonlyField(id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    }

    static showFieldError(inputId, message) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const group = input.closest('.form-group');
        if (!group) return;
        group.classList.add('error');
        const errEl = group.querySelector('.error-message');
        if (errEl && message) errEl.textContent = message;
    }

    static clearFieldError(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const group = input.closest('.form-group');
        if (group) group.classList.remove('error');
    }

    static clearAllErrors() {
        document.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
    }

    static setButtonProcessing(buttonId, isProcessing) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.classList.toggle('processing', isProcessing);
        btn.disabled = isProcessing;
    }

    /**
     * Formatea un número con convención argentina: miles con '.', decimal con ','
     * Ej: 17614.333 → "17.614,33"
     */
    static formatMoney(amount) {
        const [intPart, decPart] = amount.toFixed(2).split('.');
        const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${withThousands},${decPart}`;
    }

    // --- Métodos de Paso 2 ---

    static showStep2() {
        const el = document.getElementById('step2Section');
        if (el) el.style.display = '';
    }

    static setResidentesLoading(isLoading) {
        const loading    = document.getElementById('residentesLoading');
        const tableWrap  = document.getElementById('residentesTableContainer');
        const errorWrap  = document.getElementById('residentesError');
        const emptyWrap  = document.getElementById('residentesEmpty');
        if (loading)   loading.style.display   = isLoading ? '' : 'none';
        if (isLoading) {
            if (tableWrap) tableWrap.style.display = 'none';
            if (errorWrap) errorWrap.style.display = 'none';
            if (emptyWrap) emptyWrap.style.display = 'none';
        }
    }

    static showResidentesError(msg) {
        const errorWrap  = document.getElementById('residentesError');
        const errorMsg   = document.getElementById('residentesErrorMsg');
        const tableWrap  = document.getElementById('residentesTableContainer');
        const emptyWrap  = document.getElementById('residentesEmpty');
        if (errorMsg)  errorMsg.textContent    = msg;
        if (errorWrap) errorWrap.style.display = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyWrap) emptyWrap.style.display = 'none';
    }

    static hideResidentesError() {
        const errorWrap = document.getElementById('residentesError');
        if (errorWrap) errorWrap.style.display = 'none';
    }

    static renderResidentesMonthLabel(label) {
        const el = document.getElementById('residentesMonthLabel');
        if (el) el.textContent = label;
    }

    static buildResidentRow(r) {
        const consumo = r.consumoCalculado.toFixed(1);
        return `<tr id="fila-${CalcUIService.escapeHtml(r.habitacion)}">
            <td>${CalcUIService.escapeHtml(r.nombre)}</td>
            <td>${CalcUIService.escapeHtml(r.apellido)}</td>
            <td>${CalcUIService.escapeHtml(r.habitacion)}</td>
            <td>${consumo} kWh</td>
            <td>
                <button
                    type="button"
                    class="cta-button"
                    style="padding: 0.5rem 1rem; font-size: 0.85rem; animation: none;"
                    data-habitacion="${CalcUIService.escapeHtml(r.habitacion)}"
                    onclick="seleccionarResidente(this.getAttribute('data-habitacion'))">
                    Seleccionar
                </button>
            </td>
        </tr>`;
    }

    static renderResidentTable(residents) {
        const tableWrap = document.getElementById('residentesTableContainer');
        const tbody     = document.getElementById('residentesTableBody');
        const emptyWrap = document.getElementById('residentesEmpty');
        if (!tableWrap || !tbody || !emptyWrap) return;

        if (residents.length === 0) {
            tableWrap.style.display = 'none';
            emptyWrap.style.display = '';
            return;
        }

        emptyWrap.style.display = 'none';
        tbody.innerHTML = residents.map(r => CalcUIService.buildResidentRow(r)).join('');
        tableWrap.style.display = '';
    }

    static highlightSelectedRow(habitacion) {
        const tbody = document.getElementById('residentesTableBody');
        if (!tbody) return;
        tbody.querySelectorAll('tr').forEach(tr => {
            tr.style.backgroundColor = '';
            tr.style.borderLeft = '';
        });
        const row = document.getElementById(`fila-${habitacion}`);
        if (row) {
            row.style.backgroundColor = 'rgba(43, 108, 176, 0.1)';
            row.style.borderLeft = '3px solid var(--color-primary)';
        }
    }

    static renderSelectedResident(resident, total, precioKwh) {
        const nombre     = document.getElementById('residenteNombreDisplay');
        const habitacion = document.getElementById('residenteHabitacionDisplay');
        const consumo    = document.getElementById('residenteConsumoDisplay');
        const precio     = document.getElementById('residentePrecioKwhDisplay');
        const totalEl    = document.getElementById('residenteTotalDisplay');
        const card       = document.getElementById('residenteSeleccionado');

        if (nombre)     nombre.textContent     = `${CalcUIService.escapeHtml(resident.nombre)} ${CalcUIService.escapeHtml(resident.apellido)}`;
        if (habitacion) habitacion.textContent = `Habitación: ${CalcUIService.escapeHtml(resident.habitacion)}`;
        if (consumo)    consumo.textContent    = `${resident.consumoCalculado.toFixed(1)} kWh`;
        if (precio)     precio.textContent     = `$${CalcUIService.formatMoney(precioKwh)}`;
        if (totalEl)    totalEl.textContent    = `$${CalcUIService.formatMoney(total)}`;
        if (card)       card.style.display     = '';
    }

    static clearSelectedResident() {
        const card  = document.getElementById('residenteSeleccionado');
        const tbody = document.getElementById('residentesTableBody');
        if (card)  card.style.display = 'none';
        if (tbody) tbody.querySelectorAll('tr').forEach(tr => {
            tr.style.backgroundColor = '';
            tr.style.borderLeft = '';
        });
    }
}

// ============================================
// CONTROLADOR PRINCIPAL
// ============================================
class CalcularPagoController {
    static init() {
        requireAuth();
        this.setupDecimalInputs();
    }

    /** Configura los inputs numéricos */
    static setupDecimalInputs() {
        // montoFactura: formato argentino con puntos de miles (200.000,50)
        const montoInput = document.getElementById('montoFactura');
        if (montoInput) {
            montoInput.addEventListener('input', (e) => {
                const cursor = e.target.selectionStart;
                const prevLen = e.target.value.length;
                e.target.value = NumberInputService.formatMontoInput(e.target.value);
                const diff = e.target.value.length - prevLen;
                e.target.setSelectionRange(cursor + diff, cursor + diff);
            });
        }

        // totalKwhFactura: solo un separador decimal (. o ,)
        const kwhInput = document.getElementById('totalKwhFactura');
        if (kwhInput) {
            kwhInput.addEventListener('input', (e) => {
                let v = e.target.value.replace(/[^0-9.,]/g, '');
                const separators = v.match(/[.,]/g);
                if (separators && separators.length > 1) {
                    const firstIdx = v.search(/[.,]/);
                    v = v.slice(0, firstIdx + 1) + v.slice(firstIdx + 1).replace(/[.,]/g, '');
                }
                e.target.value = v;
            });
        }
    }

    /** "Calcular Precio kWh": valida monto + totalKwh, calcula y muestra precio_kWh */
    static async handleCalcularPrecioKwh() {
        CalcUIService.clearAllErrors();
        CalcUIService.clearReadonlyField('precioKwh');
        calcState.reset();

        const monto    = NumberInputService.parseMontoFactura(CalcUIService.getInputValue('montoFactura'));
        const totalKwh = NumberInputService.parsePositive(CalcUIService.getInputValue('totalKwhFactura'));

        let valid = true;
        if (isNaN(monto)) {
            CalcUIService.showFieldError('montoFactura', 'Ingresá un monto válido mayor a cero');
            valid = false;
        }
        if (isNaN(totalKwh)) {
            CalcUIService.showFieldError('totalKwhFactura', 'Ingresá los kWh totales de la factura (mayor a cero)');
            valid = false;
        }
        if (!valid) return;

        CalcUIService.setButtonProcessing('btnCalcularPrecio', true);

        const precio = ElectricityCalculator.calcularPrecioKwh(monto, totalKwh);
        calcState.setPrecioKwh(precio);

        CalcUIService.setReadonlyField('precioKwh', CalcUIService.formatMoney(precio));
        CalcUIService.setButtonProcessing('btnCalcularPrecio', false);

        CalcUIService.showStep2();
        await CalcularPagoController.loadResidents();
    }

    /** Carga los residentes desde la API y renderiza el mes actual */
    static async loadResidents() {
        CalcUIService.setResidentesLoading(true);
        CalcUIService.hideResidentesError();
        CalcUIService.clearSelectedResident();
        calcState.clearSelectedResident();

        try {
            const records = await CalcApiService.fetchCalculos();
            calcState.setResidents(records);
            CalcularPagoController.renderResidentesForCurrentMonth();
        } catch (err) {
            console.error('Error al cargar residentes:', err);
            const msg = err.message === 'No autenticado'
                ? 'No estás autenticado. Por favor, iniciá sesión nuevamente.'
                : 'No se pudo cargar la lista de residentes. Verificá tu conexión e intentá de nuevo.';
            CalcUIService.showResidentesError(msg);
        } finally {
            CalcUIService.setResidentesLoading(false);
        }
    }

    /** Renderiza la tabla de residentes para el mes/año actual del estado */
    static renderResidentesForCurrentMonth() {
        const residents = ResidentLogic.getResidentsForMonth(
            calcState.getResidents(),
            calcState.currentMonth,
            calcState.currentYear
        );
        CalcUIService.renderResidentesMonthLabel(calcState.getMonthLabel());
        CalcUIService.renderResidentTable(residents);
        CalcUIService.clearSelectedResident();
        calcState.clearSelectedResident();
    }

    /** Navega al mes anterior/siguiente sin re-fetchear la API */
    static handleCambiarMesResidentes(delta) {
        calcState.changeMonth(delta);
        CalcularPagoController.renderResidentesForCurrentMonth();
    }

    /** Selecciona un residente y calcula su total a pagar */
    static handleSeleccionarResidente(habitacion) {
        if (!calcState.hasPrecioKwh()) return;

        const residents = ResidentLogic.getResidentsForMonth(
            calcState.getResidents(),
            calcState.currentMonth,
            calcState.currentYear
        );
        const resident = ResidentLogic.findByHabitacion(residents, habitacion);
        if (!resident) return;

        calcState.setSelectedResident(resident);

        const total = ElectricityCalculator.calcularTotalAPagar(
            resident.consumoCalculado,
            calcState.getPrecioKwh()
        );

        CalcUIService.highlightSelectedRow(habitacion);
        CalcUIService.renderSelectedResident(resident, total, calcState.getPrecioKwh());
    }
}

// ============================================
// FUNCIONES GLOBALES (interfaz para onclick en HTML)
// ============================================
function calcularPrecioKwh() {
    CalcularPagoController.handleCalcularPrecioKwh();
}

function seleccionarResidente(habitacion) {
    CalcularPagoController.handleSeleccionarResidente(habitacion);
}

function cambiarMesResidentes(delta) {
    CalcularPagoController.handleCambiarMesResidentes(delta);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    CalcularPagoController.init();
});
