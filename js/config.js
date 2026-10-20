/**
 * Configuración del Frontend - Hostal Mayelewoo
 * 
 * Este archivo contiene la configuración central del frontend
 * incluyendo la URL del API backend
 */

// Configuración del API Backend
const CONFIG = {
    // URL del API - Cambiar según el entorno
    // Si estás usando Live Server (puerto 5500) o abriendo el archivo directamente
    // Detectar entorno automáticamente
    API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'  // URL del backend local
        : 'https://hostal-mayelewoo-backend.vercel.app',  // URL de producción

    
    // Otras configuraciones
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    PRICE_PER_KWH: 439.26,
    
    // Configuración de reintentos para peticiones fallidas
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // ms
    
    // Configuración de timeout
    REQUEST_TIMEOUT: 30000, // 30 segundos

    // Auth — migrado desde login.js para evitar redeclaración de CONFIG
    API_BASE_URL: (() => {
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
        return 'https://hostal-mayelewoo-backend.vercel.app/api';
    })(),
    STORAGE_KEY: 'mayelewoo_admin_token',
    ADMIN_DASHBOARD: 'dashboard.html',
};

// Exponer configuración globalmente
window.APP_CONFIG = CONFIG;
window.API_URL = CONFIG.API_URL;

// Log de configuración (para debugging en todos los entornos)
const environment = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'DESARROLLO' : 'PRODUCCIÓN';
console.log(`🔧 Entorno: ${environment}`);
console.log(`🔧 Hostname detectado: ${window.location.hostname}`);
console.log('🔧 Configuración cargada:', CONFIG);
console.log(`📡 API URL: ${CONFIG.API_URL}`);
