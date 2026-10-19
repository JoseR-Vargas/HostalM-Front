// Configuración principal
const CONFIG = {
	whatsappNumber: '5493516664584', // REEMPLAZAR con el número real del hostal
	hostalName: 'Hostal Mayelewoo'
};

// Elementos del DOM
const contactForm = document.getElementById('contactForm');
const whatsappLink = document.getElementById('whatsappLink');

// Función para validar formulario
function validateForm(formData) {
	const errors = [];
	
	// Validaciones requeridas
	if (!formData.nombre.trim()) {
		errors.push('El nombre es requerido');
	}
	
	if (!formData.apellido.trim()) {
		errors.push('El apellido es requerido');
	}
	
	if (!formData.dni.trim()) {
		errors.push('El DNI es requerido');
	}
	
	if (!formData.email.trim()) {
		errors.push('El correo electrónico es requerido');
	} else if (!isValidEmail(formData.email)) {
		errors.push('El correo electrónico no es válido');
	}
	
	return errors;
}

// Función para validar email
function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

// Función para generar mensaje de WhatsApp
function generateWhatsAppMessage(formData) {
	let message = `¡Hola! Quiero hacer una consulta para ${CONFIG.hostalName}\n\n`;
	message += `*Datos del huésped:*\n`;
	message += `👤 Nombre: ${formData.nombre} ${formData.apellido}\n`;
	message += `📋 DNI: ${formData.dni}\n`;
	message += `📧 Email: ${formData.email}\n\n`;
	
	message += `👥 *Huéspedes:* ${formData.huespedes}\n`;
	message += `🏠 *Tipo de alojamiento:* ${getAlojamientoText(formData.tipo)}\n\n`;
	
	if (formData.mensaje) {
		message += `💬 *Mensaje adicional:*\n${formData.mensaje}\n\n`;
	}
	
	message += `Espero su respuesta. ¡Gracias!`;
	
	return encodeURIComponent(message);
}

// Función para obtener texto del tipo de alojamiento
function getAlojamientoText(tipo) {
	const tipos = {
		'habitacion': 'Habitación',
		'apartamento': 'Apartamento',
		'consultar': 'Consultar opciones disponibles'
	};
	return tipos[tipo] || tipo;
}

// Función para generar enlace de WhatsApp
function generateWhatsAppLink(message) {
	return `https://wa.me/${CONFIG.whatsappNumber}?text=${message}`;
}

// Función para detectar si es móvil
function isMobileDevice() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
		   window.innerWidth <= 768;
}

// Función para abrir WhatsApp según el dispositivo
function openWhatsApp(url) {
	if (isMobileDevice()) {
		// En móviles, usar location.href es más confiable
		window.location.href = url;
	} else {
		// En desktop, usar window.open
		window.open(url, '_blank');
	}
}

// Función para mostrar errores
function showErrors(errors) {
	// Remover errores anteriores
	const existingErrors = document.querySelectorAll('.error-message');
	existingErrors.forEach(error => error.remove());
	
	if (errors.length > 0) {
		const errorDiv = document.createElement('div');
		errorDiv.className = 'error-message';
		errorDiv.style.cssText = `
			background-color: #fed7d7;
			color: #c53030;
			padding: 1rem;
			border-radius: 8px;
			margin-bottom: 1rem;
			border-left: 4px solid #e53e3e;
		`;
		
		errorDiv.innerHTML = `
			<strong>Por favor corrige los siguientes errores:</strong>
			<ul style="margin-top: 0.5rem; margin-bottom: 0;">
				${errors.map(error => `<li>${error}</li>`).join('')}
			</ul>
		`;
		
		contactForm.insertBefore(errorDiv, contactForm.firstChild);
		
		// Scroll suave al formulario
		errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
}

// Función para mostrar mensaje de éxito
function showSuccess() {
	const successDiv = document.createElement('div');
	successDiv.className = 'success-message';
	successDiv.style.cssText = `
		background-color: #c6f6d5;
		color: #22543d;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border-left: 4px solid #38a169;
		text-align: center;
	`;
	
	successDiv.innerHTML = `
		<strong>¡Perfecto!</strong> Te estamos redirigiendo a WhatsApp...
	`;
	
	contactForm.insertBefore(successDiv, contactForm.firstChild);
	
	// Remover el mensaje después de 3 segundos
	setTimeout(() => {
		successDiv.remove();
	}, 3000);
}

// Función para recopilar datos del formulario
function getFormData() {
	return {
		nombre: document.getElementById('nombre').value,
		apellido: document.getElementById('apellido').value,
		dni: document.getElementById('dni').value,
		email: document.getElementById('email').value,
		huespedes: document.getElementById('huespedes').value,
		tipo: document.getElementById('tipo').value,
		mensaje: document.getElementById('mensaje').value
	};
}

// Event listener para el formulario
if (contactForm) {
	contactForm.addEventListener('submit', function(e) {
		e.preventDefault();
		
		const formData = getFormData();
		const errors = validateForm(formData);
		
		if (errors.length > 0) {
			showErrors(errors);
			return;
		}
		
		// Si no hay errores, generar WhatsApp
		const message = generateWhatsAppMessage(formData);
		const whatsappUrl = generateWhatsAppLink(message);
		
		// Mostrar mensaje de éxito
		showSuccess();
		
		// Abrir WhatsApp usando la función optimizada para móviles
		if (isMobileDevice()) {
			// En móviles, redirigir inmediatamente
			openWhatsApp(whatsappUrl);
		} else {
			// En desktop, mantener el delay
			setTimeout(() => {
				openWhatsApp(whatsappUrl);
			}, 1000);
		}
	});
}

// Configurar enlace directo de WhatsApp en el footer
if (whatsappLink) {
	whatsappLink.addEventListener('click', function(e) {
		e.preventDefault();
		const message = encodeURIComponent(`¡Hola! Quiero información sobre ${CONFIG.hostalName}`);
		const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${message}`;
		openWhatsApp(whatsappUrl);
	});
}

// Smooth scrolling para navegación
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
	anchor.addEventListener('click', function (e) {
		e.preventDefault();
		const target = document.querySelector(this.getAttribute('href'));
		if (target) {
			target.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		}
	});
});

// Función para animar elementos al hacer scroll
function animateOnScroll() {
	const elements = document.querySelectorAll('.room-card, .hero-img');
	
	elements.forEach(element => {
		const elementTop = element.getBoundingClientRect().top;
		const elementVisible = 150;
		
		if (elementTop < window.innerHeight - elementVisible) {
			element.style.opacity = '1';
			element.style.transform = 'translateY(0)';
		}
	});
}

// Configurar animaciones iniciales
document.addEventListener('DOMContentLoaded', function() {
	// Configurar elementos para animación (excluyendo el formulario)
	const animatedElements = document.querySelectorAll('.room-card, .hero-img');
	animatedElements.forEach(element => {
		element.style.opacity = '0';
		element.style.transform = 'translateY(20px)';
		element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
	});
	
	// Asegurar que el formulario permanezca estático
	const contactForm = document.querySelector('.contact-form');
	if (contactForm) {
		contactForm.style.transform = 'none';
		contactForm.style.transition = 'none';
	}
	
	// Ejecutar animación inicial
	setTimeout(animateOnScroll, 100);
	
	// Configurar contador de caracteres
	setupCharacterCounter();
});

// Función para configurar el contador de caracteres
function setupCharacterCounter() {
	const messageTextarea = document.getElementById('mensaje');
	const charCountElement = document.getElementById('charCount');
	const counterElement = document.querySelector('.character-counter');
	
	if (messageTextarea && charCountElement) {
		// Función para actualizar el contador
		function updateCharacterCount() {
			const currentLength = messageTextarea.value.length;
			const maxLength = 200;
			
			charCountElement.textContent = currentLength;
			
			// Cambiar color según la cantidad de caracteres
			counterElement.classList.remove('warning', 'near-limit');
			
			if (currentLength >= maxLength) {
				counterElement.classList.add('warning');
			} else if (currentLength >= maxLength * 0.8) { // 80% del límite (160 caracteres)
				counterElement.classList.add('near-limit');
			}
		}
		
		// Event listeners para actualizar el contador
		messageTextarea.addEventListener('input', updateCharacterCount);
		messageTextarea.addEventListener('paste', function() {
			// Usar setTimeout para que se ejecute después de que el texto se pegue
			setTimeout(updateCharacterCount, 10);
		});
		
		// Inicializar contador
		updateCharacterCount();
	}
}

// Event listener para scroll
window.addEventListener('scroll', animateOnScroll);

// Función para mejorar la experiencia del usuario en dispositivos móviles
function handleMobileMenu() {
	const nav = document.querySelector('.nav');
	const navMenu = document.querySelector('.nav-menu');
	
	// En dispositivos móviles, cerrar menú al hacer click en un enlace
	if (window.innerWidth <= 768) {
		navMenu.addEventListener('click', function(e) {
			if (e.target.classList.contains('nav-link')) {
				// Aquí se podría agregar lógica para cerrar un menú móvil si fuera necesario
			}
		});
	}
}

// Event listener para resize
window.addEventListener('resize', handleMobileMenu);
window.addEventListener('DOMContentLoaded', handleMobileMenu);

// Validación en tiempo real para mejorar UX
document.addEventListener('DOMContentLoaded', function() {
	const inputs = document.querySelectorAll('input[required], select[required]');
	
	inputs.forEach(input => {
		input.addEventListener('blur', function() {
			// Remover clases de error anteriores
			this.classList.remove('error-field');
			
			// Validar campo
			if (!this.value.trim()) {
				this.classList.add('error-field');
			} else if (this.type === 'email' && !isValidEmail(this.value)) {
				this.classList.add('error-field');
			} else {
				this.classList.remove('error-field');
			}
		});
		
		input.addEventListener('input', function() {
			// Remover clase de error mientras escribe
			if (this.classList.contains('error-field') && this.value.trim()) {
				this.classList.remove('error-field');
			}
		});
	});
});

// Agregar estilos CSS para campos con error
const style = document.createElement('style');
style.textContent = `
	.error-field {
		border-color: #e53e3e !important;
		box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1) !important;
	}
`;
document.head.appendChild(style);
