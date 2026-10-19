/**
 * CONTADORES DE LUZ - HOSTAL MAYELEWOO
 * Funcionalidades para el formulario de medición de contadores
 * Aplicando principios: DRY, SOLID, YAGNI
 * Mobile-first y 100% responsive
 */

class ContadorFormHandler {
    constructor() {
        this.form = document.getElementById('contadorForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.timestampField = document.getElementById('timestamp');
        this.fotoInput = document.getElementById('fotoMedidor');
        
        this.initializeForm();
        this.bindEvents();
    }

    /**
     * Inicializa el formulario con configuraciones básicas
     */
    initializeForm() {
        // Establecer timestamp actual
        this.timestampField.value = new Date().toISOString();
        
        // Configurar validaciones de entrada
        this.setupInputValidations();
    }

    /**
     * Configura las validaciones de entrada en tiempo real
     */
    setupInputValidations() {
        const dniInput = document.getElementById('dni');
        const numeroMedicionInput = document.getElementById('numeroMedicion');
        
        // Validación DNI - solo números
        dniInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            if (e.target.value.length > 8) {
                e.target.value = e.target.value.substring(0, 8);
            }
        });

        // Validación número de medición - números y punto decimal
        numeroMedicionInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9.]/g, '');
            // Permitir solo un punto decimal
            const parts = e.target.value.split('.');
            if (parts.length > 2) {
                e.target.value = parts[0] + '.' + parts.slice(1).join('');
            }
        });
    }

    /**
     * Vincula eventos del formulario
     */
    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.fotoInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    /**
     * Maneja el evento de subida de archivo
     */
    handleFileUpload(event) {
        const file = event.target.files[0];
        
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            this.showError('Por favor selecciona un archivo de imagen válido.');
            event.target.value = '';
            return;
        }

        // Validar tamaño del archivo (5MB máximo)
        const maxSize = 5 * 1024 * 1024; // 5MB en bytes
        if (file.size > maxSize) {
            this.showError('La imagen es demasiado grande. El tamaño máximo es 5MB.');
            event.target.value = '';
            return;
        }

        // Preview de la imagen (opcional)
        this.previewImage(file);
    }

    /**
     * Muestra preview de la imagen seleccionada
     */
    previewImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Crear o actualizar preview
            let preview = document.getElementById('imagePreview');
            if (!preview) {
                preview = document.createElement('div');
                preview.id = 'imagePreview';
                preview.className = 'image-preview';
                this.fotoInput.parentNode.appendChild(preview);
            }
            
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview del medidor" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px;">
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 5px;">Vista previa de la imagen</p>
            `;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Maneja el envío del formulario
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        this.setLoadingState(true);

        try {
            const formData = await this.prepareFormData();
            
            // Simular envío (reemplazar con llamada real al backend)
            await this.submitToBackend(formData);
            
            this.showSuccess('¡Medición registrada exitosamente!');
            this.resetForm();
            
        } catch (error) {
            console.error('Error al enviar medición:', error);
            this.showError('Error al enviar la medición. Por favor intenta nuevamente.');
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Valida todos los campos del formulario
     */
    validateForm() {
        const requiredFields = [
            { id: 'nombre', name: 'Nombre' },
            { id: 'apellido', name: 'Apellido' },
            { id: 'dni', name: 'DNI' },
            { id: 'numeroMedicion', name: 'Número de medición' },
            { id: 'nroApartamento', name: 'Número de apartamento' },
            { id: 'fotoMedidor', name: 'Foto del medidor' }
        ];

        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element.value.trim()) {
                this.showError(`El campo ${field.name} es requerido.`);
                element.focus();
                return false;
            }
        }

        // Validaciones específicas
        const dni = document.getElementById('dni').value;
        if (dni.length < 7 || dni.length > 8) {
            this.showError('El DNI debe tener entre 7 y 8 dígitos.');
            return false;
        }

        const numeroMedicion = document.getElementById('numeroMedicion').value;
        if (!/^\d+(\.\d+)?$/.test(numeroMedicion)) {
            this.showError('El número de medición debe ser un valor numérico válido.');
            return false;
        }

        return true;
    }

    /**
     * Prepara los datos del formulario para envío
     */
    async prepareFormData() {
        const formData = new FormData();
        
        // Agregar campos de texto del formulario HTML
        formData.append('dni', document.getElementById('dni').value.trim());
        formData.append('nombre', document.getElementById('nombre').value.trim());
        formData.append('apellidos', document.getElementById('apellido').value.trim());
        formData.append('nroApartamento', document.getElementById('nroApartamento').value.trim());
        formData.append('numeroMedicion', document.getElementById('numeroMedicion').value.trim());
        formData.append('fechaLectura', new Date().toISOString());
        formData.append('timestamp', new Date().toISOString());
        
        // Agregar observaciones si existen
        const observaciones = document.getElementById('observaciones');
        if (observaciones && observaciones.value.trim()) {
            formData.append('observaciones', observaciones.value.trim());
        }
        
        // Agregar archivo de imagen
        const fotoInput = document.getElementById('fotoMedidor');
        if (fotoInput.files && fotoInput.files[0]) {
            formData.append('fotoMedidor', fotoInput.files[0]);
        }

        return formData;
    }

    /**
     * Envía datos al backend NestJS + MongoDB Atlas
     */
    async submitToBackend(formData) {
        try {
            // Configuración dinámica de API URL
            const apiUrl = this.getApiUrl();
            
            const response = await fetch(`${apiUrl}/contadores`, {
                method: 'POST',
                body: formData // No establecer Content-Type para FormData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al enviar los datos');
            }

            return data;
        } catch (error) {
            console.error('Error al conectar con el backend:', error);
            throw error;
        }
    }

    /**
     * Obtiene la URL de la API según el entorno
     */
    getApiUrl() {
        const { hostname, protocol } = window.location;
        const params = new URLSearchParams(window.location.search);
        const backendOverride = params.get('backend');
        if (backendOverride === 'local') {
            return `${protocol}//localhost:3000/api`;
        }
        if (backendOverride && /^https?:\/\//i.test(backendOverride)) {
            return backendOverride.replace(/\/$/, '') + '/api';
        }
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:3000/api`;
        }
        return 'https://mayelewoo-back.onrender.com/api';
    }

    /**
     * Establece el estado de carga del botón
     */
    setLoadingState(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = 'Enviando...';
            this.submitBtn.style.opacity = '0.7';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Enviar Medición';
            this.submitBtn.style.opacity = '1';
        }
    }

    /**
     * Muestra mensaje de error
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Muestra mensaje de éxito
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Sistema de notificaciones
     */
    showMessage(message, type) {
        // Remover mensaje anterior si existe
        const existingMessage = document.querySelector('.message-notification');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-notification ${type}`;
        messageDiv.innerHTML = `
            <p style="margin: 0;">${message}</p>
            <button onclick="this.parentElement.remove()" aria-label="Cerrar">&times;</button>
        `;

        // Estilos inline para el mensaje (centrado debajo del botón)
        Object.assign(messageDiv.style, {
            marginTop: '1.5rem',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            maxWidth: '100%',
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backgroundColor: type === 'error' ? '#ef4444' : '#10b981',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'center',
            animation: 'slideIn 0.3s ease-out'
        });

        messageDiv.querySelector('button').style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            margin: 0;
            min-width: 24px;
        `;

        // Insertar después del botón de envío
        this.submitBtn.parentNode.insertBefore(messageDiv, this.submitBtn.nextSibling);
        
        // Hacer scroll suave hacia la notificación
        setTimeout(() => {
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Auto-remove después de 5 segundos
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }

    /**
     * Resetea el formulario después del envío exitoso
     */
    resetForm() {
        this.form.reset();
        this.timestampField.value = new Date().toISOString();
        
        // Remover preview de imagen si existe
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.remove();
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new ContadorFormHandler();
});

// Función para validar en tiempo real (mobile-friendly)
document.addEventListener('DOMContentLoaded', () => {
    // Mejorar experiencia mobile
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        // Prevenir zoom en iOS al hacer focus
        input.addEventListener('focus', (e) => {
            if (window.innerWidth < 768) {
                e.target.style.fontSize = '16px';
            }
        });

        // Restaurar tamaño normal al perder focus
        input.addEventListener('blur', (e) => {
            e.target.style.fontSize = '';
        });
    });
});
