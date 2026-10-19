/**
 * DASHBOARD CONTADORES LUZ - HOSTAL MAYELEWOO
 * Sistema simplificado para mostrar mediciones registradas
 * Aplicando principios: DRY, SOLID, YAGNI
 */

// Verificar autenticación antes de cargar el dashboard
if (!requireAuth()) {
    // La función requireAuth ya redirecciona si no está autenticado
    throw new Error('Acceso no autorizado');
}

class DashboardMediciones {
    constructor() {
        this.apiUrl = this.getApiUrl();
        this.mediciones = [];
        this.init();
    }

    /**
     * Obtiene la URL de la API según el entorno
     */
    getApiUrl() {
        const { hostname, protocol } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:3000/api`;
        }
        // En producción, usar el backend desplegado en Render
        return 'https://mayelewoo-back.onrender.com/api';
    }

    async init() {
        await this.cargarMediciones();
    }

    async cargarMediciones() {
        try {
            this.mostrarCarga(true);
            
            const response = await fetch(`${this.apiUrl}/contadores`);
            if (response.ok) {
                const data = await response.json();
                this.mediciones = data.data || [];
                console.log('Mediciones cargadas:', this.mediciones.length);
                console.log('Primera medición:', this.mediciones[0]);
            } else {
                console.warn('Error al obtener mediciones, usando datos de ejemplo');
                this.mediciones = this.obtenerDatosEjemplo();
            }
            
            this.mostrarMediciones();
            
        } catch (error) {
            console.error('Error de conexión:', error);
            this.mediciones = this.obtenerDatosEjemplo();
            this.mostrarMediciones();
        } finally {
            this.mostrarCarga(false);
        }
    }

    obtenerDatosEjemplo() {
        return [
            {
                habitacion: '101',
                nombre: 'Ana',
                apellidos: 'García López',
                dni: '11223344',
                numeroMedicion: '234.5',
                fechaLectura: new Date('2025-09-06T10:30:00').toISOString(),
                fotoMedidor: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Gb3RvIDEwMTwvdGV4dD4KPC9zdmc+'
            },
            {
                habitacion: '102',
                nombre: 'Carlos',
                apellidos: 'Rodríguez Silva',
                dni: '55667788',
                numeroMedicion: '156.8',
                fechaLectura: new Date('2025-09-06T14:15:00').toISOString(),
                fotoMedidor: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRUZGNkZGIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjODg1NkYyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Gb3RvIDEwMjwvdGV4dD4KPC9zdmc+'
            },
            {
                habitacion: '201',
                nombre: 'María',
                apellidos: 'Fernández Torres',
                dni: '99887766',
                numeroMedicion: '189.3',
                fechaLectura: new Date('2025-09-06T16:45:00').toISOString(),
                fotoMedidor: null // Ejemplo sin foto
            }
        ];
    }

    mostrarMediciones() {
        const tbody = document.getElementById('medicionesTableBody');
        const noDataMessage = document.getElementById('noDataMessage');
        
        if (!this.mediciones.length) {
            tbody.innerHTML = '';
            noDataMessage.style.display = 'block';
            return;
        }

        noDataMessage.style.display = 'none';
        tbody.innerHTML = this.mediciones.map(medicion => {
            let foto = medicion.fotoMedidor;
            if (foto && foto.startsWith('/')) {
                // Normalizar URL relativa con api base (remover posible doble //)
                foto = `${this.apiUrl.replace(/\/api$/, '')}${foto}`.replace(/([^:]\/)\/\//, '$1/');
            }
            return `
            <tr>
                <td>${medicion.habitacion}</td>
                <td>${medicion.nombre} ${medicion.apellidos}</td>
                <td>${medicion.dni}</td>
                <td>${medicion.numeroMedicion || medicion.lecturaActual || 'N/A'}</td>
                <td>
                    ${foto ? 
                        `<img src="${foto}" 
                             alt="Foto medidor ${medicion.habitacion}" 
                             class="foto-medidor-preview" 
                             onclick="this.classList.toggle('foto-ampliada')"
                             title="Clic para ampliar"
                             loading="lazy"> `
                        : '<span class="sin-foto">Sin foto</span>'}
                </td>
                <td>${this.formatearFecha(medicion.fechaLectura || medicion.createdAt)}</td>
            </tr>
        `}).join('');
    }

    setupImageErrorHandlers() {
        const images = document.querySelectorAll('#medicionesTableBody img');
        console.log('Configurando manejo de errores para', images.length, 'imágenes');
        
        images.forEach((img, index) => {
            console.log(`Imagen ${index + 1}: ${img.src}`);
            
            // Remover handlers previos si existen
            img.onload = null;
            img.onerror = null;
            
            img.onload = function() {
                console.log(`✅ Imagen ${index + 1} cargada correctamente:`, this.src);
            };
            
            img.onerror = function() {
                console.error(`❌ Error cargando imagen ${index + 1}:`, this.src);
                this.style.display = 'none';
                this.parentElement.innerHTML = '<span class="sin-foto">Imagen no disponible</span>';
            };
        });
    }

    formatearFecha(fechaISO) {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    mostrarCarga(mostrar) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = mostrar ? 'flex' : 'none';
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new DashboardMediciones();
});
