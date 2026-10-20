/**
 * Script de Prueba - Módulo Cálculos de Medidor
 * 
 * Este script permite probar el endpoint desde el navegador
 * Ejecutar en la consola del navegador (F12)
 */

const TestCalculosMedidor = {
    API_URL: 'http://localhost:3000',

    /**
     * Prueba básica sin fotos
     */
    async testBasic() {
        console.log('🧪 Probando endpoint sin fotos...');
        
        const formData = new FormData();
        formData.append('nombre', 'Juan');
        formData.append('apellido', 'Pérez');
        formData.append('dni', '12345678');
        formData.append('habitacion', '101');
        formData.append('medicionAnterior', '1000');
        formData.append('medicionActual', '1150');
        formData.append('consumoCalculado', '150');
        formData.append('montoTotal', '65889');
        formData.append('precioKWH', '439.26');
        formData.append('fechaRegistro', new Date().toISOString());

        try {
            const response = await fetch(`${this.API_URL}/calculos-medidor`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                console.log('✅ Prueba exitosa:', result);
                return result;
            } else {
                console.error('❌ Error:', result);
                return null;
            }
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            return null;
        }
    },

    /**
     * Listar todos los cálculos
     */
    async listAll() {
        console.log('📋 Obteniendo todos los cálculos...');
        
        try {
            const response = await fetch(`${this.API_URL}/calculos-medidor`);
            const result = await response.json();
            
            console.log(`📊 Total de registros: ${result.total}`);
            console.table(result.data.map(item => ({
                ID: item._id,
                Habitacion: item.habitacion,
                DNI: item.dni,
                Nombre: `${item.nombre} ${item.apellido}`,
                Consumo: item.consumoCalculado,
                Monto: item.montoTotal,
                Fecha: new Date(item.fechaRegistro).toLocaleDateString()
            })));
            
            return result;
        } catch (error) {
            console.error('❌ Error:', error);
            return null;
        }
    },

    /**
     * Buscar por habitación
     */
    async findByHabitacion(habitacion) {
        console.log(`🔍 Buscando cálculos de la habitación ${habitacion}...`);
        
        try {
            const response = await fetch(`${this.API_URL}/calculos-medidor/habitacion/${habitacion}`);
            const result = await response.json();
            
            console.log(`📊 Encontrados: ${result.total} registros`);
            console.table(result.data);
            
            return result;
        } catch (error) {
            console.error('❌ Error:', error);
            return null;
        }
    },

    /**
     * Obtener estadísticas de una habitación
     */
    async getStats(habitacion) {
        console.log(`📈 Obteniendo estadísticas de la habitación ${habitacion}...`);
        
        try {
            const response = await fetch(`${this.API_URL}/calculos-medidor/estadisticas/habitacion/${habitacion}`);
            const result = await response.json();
            
            if (response.ok) {
                console.log('📊 Estadísticas:', result.data);
                return result;
            } else {
                console.warn('⚠️ No hay datos para esta habitación');
                return null;
            }
        } catch (error) {
            console.error('❌ Error:', error);
            return null;
        }
    },

    /**
     * Crear múltiples registros de prueba
     */
    async createTestData() {
        console.log('🔧 Creando datos de prueba...');
        
        const habitaciones = ['101', '102', '103', '201', '202'];
        const nombres = ['Juan', 'María', 'Pedro', 'Ana', 'Luis'];
        const apellidos = ['Pérez', 'González', 'Rodríguez', 'López', 'Martínez'];
        
        let creados = 0;
        let errores = 0;
        
        for (let i = 0; i < 5; i++) {
            const medicionAnterior = 1000 + (i * 100);
            const medicionActual = medicionAnterior + 100 + (Math.random() * 50);
            const consumo = medicionActual - medicionAnterior;
            const monto = consumo * 439.26;
            
            const formData = new FormData();
            formData.append('nombre', nombres[i]);
            formData.append('apellido', apellidos[i]);
            formData.append('dni', `1234567${i}`);
            formData.append('habitacion', habitaciones[i]);
            formData.append('medicionAnterior', medicionAnterior.toString());
            formData.append('medicionActual', medicionActual.toString());
            formData.append('consumoCalculado', consumo.toString());
            formData.append('montoTotal', monto.toString());
            formData.append('precioKWH', '439.26');
            
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            formData.append('fechaRegistro', fecha.toISOString());
            
            try {
                const response = await fetch(`${this.API_URL}/calculos-medidor`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    creados++;
                    console.log(`✅ Registro ${i + 1} creado`);
                } else {
                    errores++;
                    console.error(`❌ Error en registro ${i + 1}`);
                }
            } catch (error) {
                errores++;
                console.error(`❌ Error de conexión en registro ${i + 1}:`, error);
            }
            
            // Pequeña pausa entre peticiones
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`\n📊 Resumen:`);
        console.log(`✅ Creados: ${creados}`);
        console.log(`❌ Errores: ${errores}`);
        
        return { creados, errores };
    },

    /**
     * Ejecutar todas las pruebas
     */
    async runAllTests() {
        console.log('🚀 Ejecutando suite de pruebas completa...\n');
        
        // 1. Prueba básica
        await this.testBasic();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 2. Listar todos
        await this.listAll();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. Crear datos de prueba
        await this.createTestData();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 4. Listar de nuevo para ver los nuevos
        await this.listAll();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 5. Buscar por habitación
        await this.findByHabitacion('101');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 6. Obtener estadísticas
        await this.getStats('101');
        
        console.log('\n✅ Suite de pruebas completada');
    }
};

// Exponer globalmente
window.TestCalculosMedidor = TestCalculosMedidor;

console.log(`
🧪 Test Suite para Cálculos de Medidor cargado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Comandos disponibles:

TestCalculosMedidor.testBasic()           - Prueba básica sin fotos
TestCalculosMedidor.listAll()             - Listar todos los cálculos
TestCalculosMedidor.findByHabitacion('101') - Buscar por habitación
TestCalculosMedidor.getStats('101')       - Estadísticas de habitación
TestCalculosMedidor.createTestData()      - Crear 5 registros de prueba
TestCalculosMedidor.runAllTests()         - Ejecutar todas las pruebas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
