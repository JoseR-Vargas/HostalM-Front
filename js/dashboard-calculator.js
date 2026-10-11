/**
 * Dashboard Calculator - Hostal Mayelewoo
 * Gestión de cálculos de consumo eléctrico
 * Principios: DRY, SOLID, YAGNI
 * Diseño: 50% Mobile / 50% Desktop
 */

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================
function getApiBaseUrl() {
    // Usar la URL del config.js si está disponible
    if (window.API_URL) return window.API_URL;
    if (window.APP_CONFIG?.API_URL) return window.APP_CONFIG.API_URL;
    
    // Fallback: detectar automáticamente
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:3000`;
    }
    return 'https://mayelewoo-back.onrender.com';
}

const API_BASE_URL = getApiBaseUrl();
const ENDPOINTS = {
    CALCULOS: '/api/calculos-medidor',
    FOTO_ANTERIOR: (id) => `/api/calculos-medidor/${id}/foto-anterior`,
    FOTO_ACTUAL: (id) => `/api/calculos-medidor/${id}/foto-actual`,
};

// Log para debugging
console.log('📊 Dashboard Calculator - API URL:', API_BASE_URL);

// ============================================
// ESTADO DE LA APLICACIÓN (Single Source of Truth)
// ============================================
class AppState {
    constructor() {
        this.allCalculos = [];
        this.filteredCalculos = [];
        this.currentFilter = {
            habitacion: '',
            dni: ''
        };
        const now = new Date();
        this.currentMonth = now.getMonth();
        this.currentYear = now.getFullYear();
    }

    setCalculos(calculos) {
        this.allCalculos = calculos;
        this.applyFilters();
    }

    setFilter(type, value) {
        this.currentFilter[type] = value;
        this.applyFilters();
    }

    clearFilters() {
        this.currentFilter = { habitacion: '', dni: '' };
        this.applyFilters();
    }

    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.applyFilters();
    }

    getMonthLabel() {
        const date = new Date(this.currentYear, this.currentMonth);
        return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    }

    applyFilters() {
        this.filteredCalculos = this.allCalculos.filter(calculo => {
            // Prefer fechaRegistro (sent by the form); fall back to createdAt (set by the server).
            // If neither is present the record is still shown rather than silently discarded.
            const rawDate = calculo.fechaRegistro || calculo.createdAt;
            const fecha = rawDate ? new Date(rawDate) : null;
            const matchMonth = fecha && !isNaN(fecha)
                ? fecha.getMonth() === this.currentMonth && fecha.getFullYear() === this.currentYear
                : true; // No date → show the record; an admin can filter manually.
            const matchHabitacion = !this.currentFilter.habitacion || 
                                  calculo.habitacion === this.currentFilter.habitacion;
            const matchDNI = !this.currentFilter.dni || 
                           calculo.dni.includes(this.currentFilter.dni);
            return matchMonth && matchHabitacion && matchDNI;
        });
    }

    getFilteredCalculos() {
        return this.filteredCalculos;
    }

    getAllCalculos() {
        return this.allCalculos;
    }
}

const appState = new AppState();

// ============================================
// SERVICIO DE API (Abstracción de llamadas HTTP)
// ============================================
// Helper: build Authorization header from the token saved by login.js.
function getAuthHeaders() {
    const token = sessionStorage.getItem(
        window.APP_CONFIG?.STORAGE_KEY || 'mayelewoo_admin_token'
    );
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

class ApiService {
    static async fetchCalculos() {
        try {
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.CALCULOS}`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Error al obtener cálculos');
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error en fetchCalculos:', error);
            throw error;
        }
    }

    static getFotoUrl(id, tipo) {
        return tipo === 'anterior' 
            ? `${API_BASE_URL}${ENDPOINTS.FOTO_ANTERIOR(id)}`
            : `${API_BASE_URL}${ENDPOINTS.FOTO_ACTUAL(id)}`;
    }
}

// ============================================
// SERVICIO DE UI (Responsabilidad única: Renderizado)
// ============================================
class UIService {
    static showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    static hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    static showNoData() {
        document.getElementById('noDataMessage').style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
    }

    static hideNoData() {
        document.getElementById('noDataMessage').style.display = 'none';
        document.querySelector('.table-container').style.display = 'block';
    }

    static renderMetrics(calculos) {
        const totalRegistros = calculos.length;
        const totalConsumo = calculos.reduce((sum, c) => sum + c.consumoCalculado, 0);
        const totalMonto = calculos.reduce((sum, c) => sum + c.montoTotal, 0);
        
        const totalConsumoDisplay = totalConsumo.toFixed(1);
        const promedioConsumo = totalRegistros > 0 ? (totalConsumo / totalRegistros).toFixed(1) : 0;

        const metricsHTML = `
            <div class="metric-card">
                <h4 class="metric-title">Total Registros</h4>
                <p class="metric-value">${totalRegistros}</p>
            </div>
            <div class="metric-card">
                <h4 class="metric-title">Consumo Total</h4>
                <p class="metric-value">${totalConsumoDisplay} kWh</p>
            </div>
            <div class="metric-card">
                <h4 class="metric-title">Promedio Consumo</h4>
                <p class="metric-value">${promedioConsumo} kWh</p>
            </div>
        `;

        document.getElementById('metricsCalculator').innerHTML = metricsHTML;
    }

    static renderTable(calculos) {
        const tbody = document.getElementById('calculatorTableBody');
        
        if (calculos.length === 0) {
            this.showNoData();
            return;
        }

        this.hideNoData();

        const rows = calculos.map(calculo => this.createTableRow(calculo)).join('');
        tbody.innerHTML = rows;
    }

    static createTableRow(calculo) {
        const fecha = new Date(calculo.fechaRegistro).toLocaleDateString('es-AR');
        const hasFotoAnterior = calculo.fotoAnteriorData && calculo.fotoAnteriorData.filename;
        const hasFotoActual = calculo.fotoActualData && calculo.fotoActualData.filename;
        
        const medicionAnteriorDisplay = calculo.medicionAnterior.toFixed(1);
        const medicionActualDisplay = calculo.medicionActual.toFixed(1);
        const consumoDisplay = calculo.consumoCalculado.toFixed(1);

        return `
            <tr>
                <td>${this.escapeHtml(calculo.nombre)}</td>
                <td>${this.escapeHtml(calculo.apellido)}</td>
                <td>${this.escapeHtml(calculo.dni)}</td>
                <td>${this.escapeHtml(calculo.habitacion)}</td>
                <td>${medicionAnteriorDisplay}</td>
                <td>${medicionActualDisplay}</td>
                <td class="consumo-cell">${consumoDisplay}</td>
                <!-- <td><strong>$${calculo.montoTotal.toFixed(2)}</strong></td> -->
                <td>${fecha}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${hasFotoAnterior ? 
                            `<img src="${ApiService.getFotoUrl(calculo._id, 'anterior')}" 
                                  alt="Medición Anterior" 
                                  class="foto-medidor-preview" 
                                  onclick="openImageModal('${calculo._id}', 'anterior', 'Medición Anterior - ${calculo.habitacion}')"
                                  onerror="this.src=''; this.classList.add('imagen-error'); this.alt='Error al cargar'">` 
                            : '<span class="sin-foto">Sin foto ant.</span>'
                        }
                        ${hasFotoActual ? 
                            `<img src="${ApiService.getFotoUrl(calculo._id, 'actual')}" 
                                  alt="Medición Actual" 
                                  class="foto-medidor-preview" 
                                  onclick="openImageModal('${calculo._id}', 'actual', 'Medición Actual - ${calculo.habitacion}')"
                                  onerror="this.src=''; this.classList.add('imagen-error'); this.alt='Error al cargar'">` 
                            : '<span class="sin-foto">Sin foto act.</span>'
                        }
                    </div>
                </td>
            </tr>
        `;
    }

    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    static renderMonthLabel(label) {
        const el = document.getElementById('currentMonthLabel');
        if (el) el.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    }

    static populateHabitacionFilter(calculos) {
        const select = document.getElementById('filterHabitacion');
        if (!select) return; // Elemento no existe en el DOM
        
        const habitaciones = [...new Set(calculos.map(c => c.habitacion))].sort();
        const options = habitaciones.map(hab => 
            `<option value="${hab}">${hab}</option>`
        ).join('');
        
        select.innerHTML = '<option value="">Todas las habitaciones</option>' + options;
    }
}

// ============================================
// CONTROLADOR DE MODAL DE IMAGEN
// ============================================
class ImageModalController {
    static open(calculoId, tipo, title) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const modalTitle = document.getElementById('imageModalTitle');
        
        modalTitle.textContent = title;
        modalImage.src = ApiService.getFotoUrl(calculoId, tipo);
        modal.classList.add('show');
        
        // Cerrar con ESC
        document.addEventListener('keydown', this.handleEscKey);
    }

    static close() {
        const modal = document.getElementById('imageModal');
        modal.classList.remove('show');
        document.removeEventListener('keydown', this.handleEscKey);
    }

    static handleEscKey(e) {
        if (e.key === 'Escape') {
            ImageModalController.close();
        }
    }
}

// ============================================
// CONTROLADOR PRINCIPAL
// ============================================
class DashboardController {
    static async init() {
        await this.loadData();
        this.setupEventListeners();
    }

    static async loadData() {
        UIService.showLoading();
        try {
            const calculos = await ApiService.fetchCalculos();
            appState.setCalculos(calculos);
            this.render();
        } catch (error) {
            console.error('Error cargando datos:', error);
            alert('Error al cargar los datos. Por favor, intente nuevamente.');
        } finally {
            UIService.hideLoading();
        }
    }

    static render() {
        const calculos = appState.getFilteredCalculos();
        UIService.renderMetrics(calculos);
        UIService.renderTable(calculos);
        UIService.renderMonthLabel(appState.getMonthLabel());
        UIService.populateHabitacionFilter(appState.getAllCalculos());
    }

    static setupEventListeners() {
        // Filtro de habitación
        const filterHabitacion = document.getElementById('filterHabitacion');
        if (filterHabitacion) {
            filterHabitacion.addEventListener('change', (e) => {
                appState.setFilter('habitacion', e.target.value);
                this.render();
            });
        }

        // Búsqueda por DNI
        const searchDNI = document.getElementById('searchDNI');
        if (searchDNI) {
            searchDNI.addEventListener('input', (e) => {
                appState.setFilter('dni', e.target.value.trim());
                this.render();
            });
        }

        // Cerrar modal al hacer click fuera
        const imageModal = document.getElementById('imageModal');
        if (imageModal) {
            imageModal.addEventListener('click', (e) => {
                if (e.target.id === 'imageModal') {
                    ImageModalController.close();
                }
            });
        }
    }
}

// ============================================
// FUNCIONES GLOBALES (Interfaz para HTML)
// ============================================
function clearFilters() {
    appState.clearFilters();
    
    const filterHabitacion = document.getElementById('filterHabitacion');
    if (filterHabitacion) filterHabitacion.value = '';
    
    const searchDNI = document.getElementById('searchDNI');
    if (searchDNI) searchDNI.value = '';
    
    DashboardController.render();
}

function openImageModal(calculoId, tipo, title) {
    ImageModalController.open(calculoId, tipo, title);
}

function closeImageModal() {
    ImageModalController.close();
}

function changeMonth(delta) {
    appState.changeMonth(delta);
    DashboardController.render();
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    DashboardController.init();
});
