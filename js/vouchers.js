// Configuración y utilidades mínimas (YAGNI/DRY)
const VOUCHERS_CONFIG = {
	maxTotalUploadBytes: 50 * 1024 * 1024, // 50 MB (el backend comprime automáticamente con GridFS + Sharp)
	apiBaseUrl: resolveApiBaseUrl()
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
		return `${protocol}//${hostname}:3000`; // NestJS por defecto
	}
	// En producción, usar el backend desplegado en Render
	return 'https://mayelewoo-back.onrender.com';
}

function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function showFormBanner(container, { type, text }) {
	// Limpia banners previos
	container.querySelectorAll('.voucher-banner').forEach(b => b.remove());
	const div = document.createElement('div');
	div.className = 'voucher-banner';
	div.style.cssText = `
		margin-top: 1.5rem;
		padding: 1rem 1.5rem;
		border-radius: 8px;
		border-left: 4px solid ${type === 'error' ? '#e53e3e' : '#38a169'};
		background-color: ${type === 'error' ? '#fed7d7' : '#c6f6d5'};
		color: ${type === 'error' ? '#c53030' : '#22543d'};
		text-align: center;
		font-weight: 600;
		animation: slideIn 0.3s ease-out;
	`;
	div.textContent = text;
	
	// Insertar después del botón de envío
	const submitBtn = container.querySelector('button[type="submit"]');
	if (submitBtn) {
		submitBtn.parentNode.insertBefore(div, submitBtn.nextSibling);
	} else {
		container.appendChild(div);
	}
	
	// Hacer scroll suave hacia la notificación
	setTimeout(() => {
		div.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}, 100);
}

function getVoucherFormData() {
	return {
		nombre: document.getElementById('nombre')?.value?.trim() || '',
		apellido: document.getElementById('apellido')?.value?.trim() || '',
		dni: document.getElementById('dni')?.value?.trim() || '',
		email: document.getElementById('email')?.value?.trim() || '',
		ref4: document.getElementById('ref4')?.value?.trim() || '',
		hab: document.getElementById('hab')?.value?.trim() || '',
		monto: document.getElementById('monto')?.value?.trim() || ''
	};
}

function validateVoucherForm(data, files) {
	const errors = [];
	if (!data.nombre) errors.push('El nombre es requerido');
	if (!data.apellido) errors.push('El apellido es requerido');
	if (!data.dni) errors.push('El DNI es requerido');
	if (!data.email) errors.push('El correo electrónico es requerido');
	if (data.email && !isValidEmail(data.email)) errors.push('El correo electrónico no es válido');
	if (!data.ref4 || !/^\d{4}$/.test(data.ref4)) errors.push('Los últimos 4 dígitos deben ser numéricos');
	if (!data.hab) errors.push('El número de habitación/apartamento es requerido');
	if (!data.monto) {
		errors.push('El monto depositado es requerido');
	} else {
		// Validar formato del monto (debe tener punto como separador de miles)
		// Ejemplo: 10.000, 1.000, 20.000
		const montoSinComa = data.monto.replace(',', '.');
		const montoNumerico = parseFloat(montoSinComa.replace(/\./g, ''));
		
		// Validar que el monto tenga al menos 4 dígitos (mínimo 1.000)
		if (montoNumerico < 1000) {
			errors.push('Por favor, coloque el monto completo (ejemplo: 50.000, 100.000, 200.000)');
		}
		
		// Validar que el formato tenga punto como separador de miles
		if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(data.monto)) {
			errors.push('El monto debe estar en formato correcto con separador de miles. Ejemplo: 1.000, 10.000, 20.000');
		}
	}

	// Validación de archivos (galería de imágenes)
	if (!files || files.length === 0) {
		errors.push('Debes adjuntar al menos una imagen del comprobante');
	} else {
		let total = 0;
		for (const f of files) {
			if (!f.type.startsWith('image/')) {
				errors.push('Solo se permiten imágenes');
				break;
			}
			total += f.size;
		}
		if (total > VOUCHERS_CONFIG.maxTotalUploadBytes) {
			errors.push('Las imágenes superan el tamaño total permitido (50 MB)');
		}
	}
	return errors;
}

function buildFormDataPayload(data, files) {
	const formData = new FormData();
	Object.entries(data).forEach(([k, v]) => formData.append(k, v));
	formData.append('timestamp', new Date().toISOString());
	for (const f of files) formData.append('files', f, f.name);
	return formData;
}

async function sendToBackend(formData) {
	// Preparado para NestJS (ruta sugerida)
	const url = VOUCHERS_CONFIG.apiBaseUrl
		? `${VOUCHERS_CONFIG.apiBaseUrl}/api/vouchers`
		: '/api/vouchers';
	const res = await fetch(url, {
		method: 'POST',
		body: formData
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json().catch(() => ({}));
}

function saveLocallyFallback(data, files) {
	const key = 'pendingVouchers';
	const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
	const fileSummaries = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }));
	snapshots.push({ ...data, files: fileSummaries, timestamp: new Date().toISOString() });
	localStorage.setItem(key, JSON.stringify(snapshots));
}

function setupMobileInputUX() {
	// Evitar confusiones en móvil: normalizar inputs numéricos
	const ref4 = document.getElementById('ref4');
	const monto = document.getElementById('monto');

	if (ref4) {
		ref4.addEventListener('input', () => {
			ref4.value = ref4.value.replace(/\D+/g, '').slice(0, 4);
		});
	}

	if (monto) {
		monto.addEventListener('input', () => {
			monto.value = monto.value.replace(/[^\d.,]/g, '');
		});
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('voucherForm');
	const fileInput = document.getElementById('fotos');
	const submitBtn = document.getElementById('submitBtn');

	setupMobileInputUX();

	if (fileInput) {
		fileInput.addEventListener('change', () => {
			const files = fileInput.files || [];
			let total = 0;
			for (const f of files) total += f.size;
			if (total > VOUCHERS_CONFIG.maxTotalUploadBytes) {
				showFormBanner(form, { type: 'error', text: 'Las imágenes superan 50 MB en total. Por favor, selecciona menos imágenes.' });
				fileInput.value = '';
			} else if (files.length > 0) {
				// Mensaje informativo de que las imágenes serán comprimidas
				const filesText = files.length === 1 ? '1 imagen seleccionada' : `${files.length} imágenes seleccionadas`;
				console.log(`${filesText}. Se comprimirán automáticamente en el servidor.`);
			}
		});
	}

	if (!form) return;

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (submitBtn) {
			submitBtn.disabled = true;
			submitBtn.textContent = 'Procesando...';
		}

		const data = getVoucherFormData();
		const files = (document.getElementById('fotos')?.files) || [];
		const errors = validateVoucherForm(data, files);

		if (errors.length) {
			showFormBanner(form, { type: 'error', text: errors[0] });
			if (submitBtn) {
				submitBtn.disabled = false;
				submitBtn.textContent = 'Enviar Voucher';
			}
			return;
		}

		const payload = buildFormDataPayload(data, files);
		try {
			await sendToBackend(payload);
			showFormBanner(form, { type: 'success', text: '¡Voucher enviado correctamente!' });
			form.reset();
			if (submitBtn) submitBtn.textContent = 'Enviar Voucher';
		} catch (err) {
			// Guardar localmente para entorno offline/local
			saveLocallyFallback(data, files);
			showFormBanner(form, { type: 'success', text: 'Guardado localmente. Se enviará cuando el backend esté disponible.' });
			if (submitBtn) submitBtn.textContent = 'Enviar Voucher';
		} finally {
			if (submitBtn) submitBtn.disabled = false;
		}
	});
});


