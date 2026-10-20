// Verificar autenticación antes de cargar el dashboard
if (!requireAuth()) {
	// La función requireAuth ya redirecciona si no está autenticado
	throw new Error('Acceso no autorizado');
}

// Reutiliza estilos/UX existentes (SOLID/DRY): solo lógica específica del dashboard
const DASHBOARD_CONFIG = {
	apiBaseUrl: resolveApiBaseUrl()
};

// Estado de paginación por mes
const monthState = {
	currentMonth: new Date().getMonth(),
	currentYear: new Date().getFullYear(),
	allVouchers: [],

	changeMonth(delta) {
		this.currentMonth += delta;
		if (this.currentMonth > 11) {
			this.currentMonth = 0;
			this.currentYear++;
		} else if (this.currentMonth < 0) {
			this.currentMonth = 11;
			this.currentYear--;
		}
	},

	getMonthLabel() {
		const date = new Date(this.currentYear, this.currentMonth);
		const label = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
		return label.charAt(0).toUpperCase() + label.slice(1);
	},

	getFilteredVouchers() {
		return this.allVouchers.filter(v => {
			const dateStr = v.timestamp || v.createdAt || v.fechaHora;
			if (!dateStr) return false;
			const fecha = new Date(dateStr);
			return fecha.getMonth() === this.currentMonth && fecha.getFullYear() === this.currentYear;
		});
	}
};

function resolveApiBaseUrl() {
	const { hostname, protocol } = window.location;
	const params = new URLSearchParams(window.location.search);
	const backendOverride = params.get('backend');
	if (backendOverride === 'local') {
		return `${protocol}//localhost:3000`;
	}
	if (backendOverride && /^https?:\/\//i.test(backendOverride)) {
		return backendOverride.replace(/\/$/, '');
	}
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return `${protocol}//${hostname}:3000`;
	}
	// En producción, usar el backend desplegado en Render
	return 'https://mayelewoo-back.onrender.com';
}

async function fetchVouchers() {
	const url = DASHBOARD_CONFIG.apiBaseUrl
		? `${DASHBOARD_CONFIG.apiBaseUrl}/api/vouchers`
		: '/api/vouchers';
	
	console.log('Fetching vouchers from:', url);
	
	try {
		const res = await fetch(url);
		console.log('Response status:', res.status, res.ok);
		
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const response = await res.json();
		console.log('API Response:', response);
		
		// La API devuelve { success: true, data: [...] }
		return response.data || response;
	} catch (error) {
		console.error('Fetch error:', error);
		// Fallback a localStorage para entorno local/offline
		const key = 'pendingVouchers';
		return JSON.parse(localStorage.getItem(key) || '[]');
	}
}

function formatMoney(m) {
	return m;
}

function createVoucherCard(voucher) {
	const div = document.createElement('div');
	div.className = 'room-card';
	div.style.display = 'grid';
	div.style.gridTemplateColumns = '1fr';
	div.style.gap = '0.5rem';

	const title = document.createElement('h4');
	title.className = 'room-title';
	title.textContent = `${voucher.nombre || ''} ${voucher.apellido || ''}`.trim() || 'Sin nombre';
	div.appendChild(title);

	const rows = [
		['DNI', voucher.dni],
		['Email', voucher.email],
		['Ref 4 dígitos', voucher.ref4],
		['Hab/Apto', voucher.hab],
		['Monto', formatMoney(voucher.monto)],
		['Fecha', (voucher.timestamp || voucher.createdAt) ? new Date(voucher.timestamp || voucher.createdAt).toLocaleDateString('es-AR') : '—']
	];

	rows.forEach(([label, value]) => {
		const p = document.createElement('p');
		p.className = 'room-description';
		p.textContent = `${label}: ${value ?? '—'}`;
		div.appendChild(p);
	});

	// Archivos: si vienen del backend, puede ser array de objetos con url
	if (voucher.files && Array.isArray(voucher.files) && voucher.files.length) {
		const list = document.createElement('ul');
		list.className = 'room-features';
		voucher.files.forEach((f, idx) => {
			const li = document.createElement('li');
			const a = document.createElement('a');
			a.textContent = f.name || `Archivo ${idx + 1}`;
			a.href = f.url || '#';
			a.download = f.name || '';
			a.target = f.url ? '_blank' : '_self';
			a.rel = 'noopener';
			li.appendChild(a);
			list.appendChild(li);
		});
		div.appendChild(list);
	}

	return div;
}

async function renderDashboard() {
	console.log('Starting dashboard render...');
	
	let vouchers = await fetchVouchers();
	console.log('Vouchers received:', vouchers);
	console.log('Vouchers count:', vouchers ? vouchers.length : 0);
	
	// Asegurar que vouchers sea un array
	if (!Array.isArray(vouchers)) {
		vouchers = [];
	}
	
	console.log('✅ Using real API data:', vouchers.length, 'vouchers');

	// Log each voucher to debug
	vouchers.forEach((voucher, i) => {
		console.log(`Voucher ${i + 1}:`, {
			nombre: voucher.nombre,
			files: voucher.files,
			fotos: voucher.fotos
		});
	});

	// Guardar todos los vouchers y renderizar mes actual
	monthState.allVouchers = vouchers;
	renderMonthView();
}

document.addEventListener('DOMContentLoaded', renderDashboard);

function renderMonthView() {
	const filtered = monthState.getFilteredVouchers();
	const label = document.getElementById('currentMonthLabel');
	if (label) label.textContent = monthState.getMonthLabel();
	renderMetrics(filtered);
	renderTable(filtered);
}

function changeMonth(delta) {
	monthState.changeMonth(delta);
	renderMonthView();
}

function renderMetrics(vouchers) {
	const metrics = document.getElementById('metrics');
	if (!metrics) return;
	const today = new Date().toISOString().slice(0, 10);
	const todayCount = vouchers.filter(v => (v.timestamp || v.createdAt || '').slice(0, 10) === today).length;
	const totalCount = vouchers.length;

	metrics.innerHTML = '';
	metrics.appendChild(metricCard('Total Comprobantes', totalCount));
	metrics.appendChild(metricCard('Cargados Hoy', todayCount));
}

function metricCard(title, value) {
	const div = document.createElement('div');
	div.className = 'metric-card';
	const t = document.createElement('div');
	t.className = 'metric-title';
	t.textContent = title;
	const v = document.createElement('div');
	v.className = 'metric-value';
	v.textContent = String(value);
	div.appendChild(t);
	div.appendChild(v);
	return div;
}

function renderTable(vouchers) {
	const tbody = document.getElementById('voucherTableBody');
	if (!tbody) return;
	tbody.innerHTML = '';
	for (const v of vouchers) {
		const tr = document.createElement('tr');
		appendCell(tr, `${v.nombre || ''} ${v.apellido || ''}`.trim(), 'Nombre');
		appendCell(tr, v.dni || '—', 'DNI');
		appendCell(tr, v.email || '—', 'Email');
		appendCell(tr, v.ref4 || '—', 'Ref 4');
		appendCell(tr, v.hab || '—', 'Hab/Apto');
		appendCell(tr, formatMoney(v.monto || '—'), 'Monto');
		const rawDate = v.timestamp || v.createdAt || '';
		const fechaFormatted = rawDate ? new Date(rawDate).toLocaleDateString('es-AR') : '—';
		appendCell(tr, fechaFormatted, 'Fecha');
		const filesTd = document.createElement('td');
		filesTd.setAttribute('data-label', 'Archivos');
		// Normalizar: si no hay v.files pero sí v.fotos (backend crudo)
		if ((!v.files || !v.files.length) && Array.isArray(v.fotos) && v.fotos.length) {
			const apiBase = DASHBOARD_CONFIG.apiBaseUrl.replace(/\/$/, '');
			v.files = v.fotos.map(f => ({
				name: f,
				url: `${apiBase}/uploads/vouchers/${f}`
			}));
		}
		if (Array.isArray(v.files) && v.files.length) {
			const frag = document.createDocumentFragment();
			v.files.forEach((f, idx) => {
				// Normalizar URL relativa
				if (f.url && f.url.startsWith('/')) {
					f.url = `${DASHBOARD_CONFIG.apiBaseUrl.replace(/\/$/, '')}${f.url}`;
				}
				// Verificar si es una imagen
				const isImage = f.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
				
				if (isImage && f.url) {
					// Crear thumbnail de imagen
					const imgContainer = document.createElement('div');
					imgContainer.style.display = 'inline-block';
					imgContainer.style.margin = '2px';
					
					const img = document.createElement('img');
					img.src = f.url;
					img.alt = f.name || `Imagen ${idx + 1}`;
					img.style.width = '40px';
					img.style.height = '40px';
					img.style.objectFit = 'cover';
					img.style.borderRadius = '4px';
					img.style.cursor = 'pointer';
					img.style.border = '1px solid #ccc';
					img.title = 'Clic para ver completa';
					img.loading = 'lazy';
					
					img.onclick = () => {
						openImageModal(f.url, f.name || `Imagen ${idx + 1}`);
					};
					
					img.onerror = function() {
						this.style.display = 'none';
						// Fallback a enlace de texto
						const a = document.createElement('a');
						a.textContent = f.name || `Archivo ${idx + 1}`;
						a.href = f.url || '#';
						a.target = '_blank';
						a.rel = 'noopener';
						imgContainer.appendChild(a);
					};
					
					imgContainer.appendChild(img);
					frag.appendChild(imgContainer);
				} else {
					// Enlace de texto para archivos no imagen
					const a = document.createElement('a');
					a.textContent = f.name || `Archivo ${idx + 1}`;
					a.href = f.url || '#';
					a.download = f.name || '';
					a.target = f.url ? '_blank' : '_self';
					a.rel = 'noopener';
					a.style.margin = '0 5px';
					frag.appendChild(a);
				}
			});
			filesTd.appendChild(frag);
		} else {
			filesTd.textContent = '—';
		}
		tr.appendChild(filesTd);
		tbody.appendChild(tr);
	}
}

function appendCell(tr, text, label) {
	const td = document.createElement('td');
	td.textContent = text;
	td.setAttribute('data-label', label);
	tr.appendChild(td);
}

function displayVouchers(vouchers) {
    const tbody = document.getElementById('voucherTableBody');
    
    if (!vouchers || vouchers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No hay datos de usuarios registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = vouchers.map(voucher => {
        // Manejar diferentes formatos de fecha
        const fecha = voucher.fechaHora 
            ? new Date(voucher.fechaHora).toLocaleDateString('es-ES')
            : voucher.timestamp 
                ? new Date(voucher.timestamp).toLocaleDateString('es-ES')
                : voucher.createdAt
                    ? new Date(voucher.createdAt).toLocaleDateString('es-ES')
                    : '—';
        
        // Manejar archivos con el nuevo formato
        let archivos = 'Sin archivo';
        if (voucher.files && Array.isArray(voucher.files) && voucher.files.length) {
            archivos = voucher.files.map((f, idx) => {
                const isImage = f.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
                if (isImage && f.url) {
                    return `<img src="${f.url}" 
                                 alt="${f.name}" 
                                 style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; margin: 2px; cursor: pointer;" 
                                 onclick="openImageModal('${f.url}', '${f.name || `Archivo ${idx + 1}`}')"
                                 title="Clic para ver completa">`;
                } else {
                    return `<a href="${f.url || '#'}" target="_blank" style="color: var(--color-primary); margin: 0 5px;">${f.name || `Archivo ${idx + 1}`}</a>`;
                }
            }).join('');
        } else if (voucher.comprobante) {
            // Formato legacy
            archivos = `<a href="${voucher.comprobante}" target="_blank" style="color: var(--color-primary);">${voucher.comprobante.split('/').pop()}</a>`;
        }
        
        return `
            <tr>
                <td data-label="Nombre:">${voucher.nombre || ''} ${voucher.apellido || ''}</td>
                <td data-label="DNI:">${voucher.dni || '—'}</td>
                <td data-label="Email:">${voucher.email || '—'}</td>
                <td data-label="Ref 4:">${voucher.ref4 || '—'}</td>
                <td data-label="Hab/Apto:">${voucher.hab || voucher.habitacion || '—'}</td>
                <td data-label="Monto:">${voucher.monto || '—'}</td>
                <td data-label="Fecha/Hora:">${fecha}</td>
                <td data-label="Archivos:">${archivos}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Abre el modal de imagen
 */
function openImageModal(imageUrl, imageName) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalImageName = document.getElementById('modalImageName');
    
    modalImage.src = imageUrl;
    modalImageName.textContent = imageName || 'Imagen';
    modal.classList.add('show');
    
    // Cerrar modal al hacer clic fuera de la imagen
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeImageModal();
        }
    };
}

/**
 * Cierra el modal de imagen
 */
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
}

// Hacer las funciones globales para que puedan ser llamadas desde onclick
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

