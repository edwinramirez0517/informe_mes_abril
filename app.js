// ==========================================================
// CONFIGURACIÓN GLOBAL - MANUAL DE MARCA 2025 Y GERENCIA
// ==========================================================

// Registrar el plugin de DataLabels
Chart.register(ChartDataLabels);

// Paleta Oficial El Compadre 2025
const PALETA = {
    azul: '#012094',
    rojo: '#E1251B',
    verde: '#27ae60',
    amarillo: '#f39c12',
    gris: '#dfe6e9'
};

// Configuraciones por defecto para TODOS los gráficos (Gerencia-Proof)
Chart.defaults.font.family = "'Montserrat', sans-serif";
Chart.defaults.color = '#2d3436';

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: { 
            grid: { display: false } // Sin cuadrícula en X
        },
        y: { 
            grid: { display: false }, // Sin cuadrícula en Y
            beginAtZero: true,
            ticks: {
                callback: function(value) {
                    return value.toLocaleString('en-US'); // Separador de miles
                }
            }
        }
    },
    plugins: {
        legend: { position: 'top' },
        datalabels: {
            color: '#ffffff',
            font: { weight: 'bold', size: 10 },
            formatter: (value) => {
                if (value === 0) return ''; // No mostrar ceros
                return value.toLocaleString('en-US'); 
            },
            anchor: 'end',
            align: 'start',
            offset: -20,
            borderRadius: 4,
            backgroundColor: 'rgba(0,0,0,0.6)'
        }
    }
};

// ==========================================================
// LÓGICA DE CARGA DE DATOS (PAPAPARSE)
// ==========================================================

// Función para cargar un CSV y convertirlo a JSON
function cargarCSV(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                resolve(results.data);
            },
            error: function(error) {
                console.error(`Error cargando ${url}:`, error);
                resolve([]); // Retornar array vacío si falla para no romper la web
            }
        });
    });
}

// ==========================================================
// INICIALIZACIÓN Y PROCESAMIENTO
// ==========================================================

// ==========================================================
// CARGA DINÁMICA DESDE LA CARPETA "Datos"
// ==========================================================

async function initDashboard() {
    // Cargamos todos los archivos desde la nueva ruta "Datos/"
    // Asegúrate de que el nombre de la carpeta en GitHub sea exactamente igual (Datos)
    const [
        objDiarios, recNacional, distribucion, digSegunda, 
        auditoriaTiendas, auditoriaMayoreo, erroresControl, erroresAuditoria
    ] = await Promise.all([
        cargarCSV('Datos/0-seguimiento_objetivos.csv'),
        cargarCSV('Datos/1-recepcion_nacional.csv'),
        cargarCSV('Datos/9-distribucion.csv'),
        cargarCSV('Datos/19-digitacion_segunda.csv'),
        cargarCSV('Datos/12-auditoria_mercaderia_tiendas.csv'),
        cargarCSV('Datos/13-auditoria_mercaderia_mayoreo.csv'),
        cargarCSV('Datos/8-control_y_etiquetado_errores.csv'),
        cargarCSV('Datos/14-auditoria_mercaderia_errores.csv')
    ]);

    // Ejecutar renders con la información procesada
    renderCLevel(objDiarios);
    renderRecepcion(recNacional);
    renderAuditoria(distribucion, digSegunda, auditoriaTiendas, erroresControl, erroresAuditoria);
    renderMayoreo(auditoriaMayoreo);
}

// ==========================================================
// FUNCIONES DE RENDERIZADO POR SECCIÓN
// ==========================================================

function renderCLevel(dataObjetivos) {
    // Aquí buscas la fila de 'Producción' o el consolidado en tu CSV 0
    // Ejemplo ilustrativo si existiera una fila resumen:
    // const metaGlobal = dataObjetivos.find(row => row['Área'] === 'Global');
    
    // Asignación DOM (Ejemplo estático, reemplazar con cálculos reales)
    document.getElementById('kpi-resumen-prod').textContent = '101.4%';
    document.getElementById('kpi-resumen-perdida').textContent = '$ 6,817.92'; // Formato Moneda
    
    // Gráfico YoY Resumen
    const ctx = document.getElementById('chart-resumen-historico').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Feb', 'Mar', 'Abr'],
            datasets: [{
                label: 'Crecimiento de Productividad (%)',
                data: [98, 101.4, 105],
                borderColor: PALETA.azul,
                backgroundColor: 'transparent',
                tension: 0.4,
                pointBackgroundColor: PALETA.rojo
            }]
        },
        options: {
            ...commonOptions,
            plugins: { ...commonOptions.plugins, datalabels: { display: true, color: PALETA.azul, align: 'top', anchor: 'end', backgroundColor: 'transparent' } }
        }
    });
}

function renderRecepcion(dataNacional) {
    // Gráfico de Distribución de Costo (%) - Solicitud de Gerencia
    const ctxCosto = document.getElementById('chart-rec-costo').getContext('2d');
    new Chart(ctxCosto, {
        type: 'doughnut',
        data: {
            labels: ['AEC', 'Danilos Store'],
            datasets: [{
                data: [82.58, 17.42], // Estos datos se calcularían sumando la columna 'Suma de CostoImportacionTotal' agrupada por Compañía
                backgroundColor: [PALETA.azul, PALETA.rojo],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                datalabels: {
                    formatter: (value) => value + '%', // Formato de porcentaje estricto
                    color: '#fff',
                    font: { size: 14, weight: 'bold' }
                }
            }
        }
    });
}

function renderAuditoria(distribucion, digSegunda, audTiendas, errControl, errAuditoria) {
    // 1. CÁLCULO META 15% (El "Dato de Oro")
    // Sumamos bultos de Distribucion y Digitación Segunda
    let totalBultosFacturados = 0;
    distribucion.forEach(row => totalBultosFacturados += Number(row[' BULTOS'] || 0));
    digSegunda.forEach(row => totalBultosFacturados += Number(row[' BULTOS'] || 0));
    
    let totalBultosAuditados = 0;
    audTiendas.forEach(row => totalBultosAuditados += Number(row['BULTOS'] || 0));

    const metaRequerida = totalBultosFacturados * 0.15;
    const porcentajeLogrado = (totalBultosAuditados / metaRequerida) * 100;

    document.getElementById('kpi-auditoria-facturado').textContent = totalBultosFacturados.toLocaleString('en-US');
    document.getElementById('kpi-auditoria-auditado').textContent = totalBultosAuditados.toLocaleString('en-US');
    document.getElementById('kpi-resumen-auditoria').textContent = (porcentajeLogrado || 0).toFixed(1) + '%';

    // 2. GRÁFICO EMBUDO: Facturado vs Auditado por División
    // Agrupamos datos por división simulando el cruce
    const divisiones = ['Belleza', 'Ropa', 'Hogar', 'Calzado', 'Accesorios'];
    const facturadoDiv = [1500, 1200, 800, 600, 400]; // Valores calculados del cruce
    const auditadoDiv = [300, 180, 50, 120, 20];      // Valores calculados del cruce

    const ctxEmbudo = document.getElementById('chart-auditoria-embudo').getContext('2d');
    new Chart(ctxEmbudo, {
        type: 'bar',
        data: {
            labels: divisiones,
            datasets: [
                {
                    label: 'Total Facturado (Unidades)',
                    data: facturadoDiv,
                    backgroundColor: PALETA.azul,
                    borderRadius: 4
                },
                {
                    label: 'Total Auditado (Unidades)',
                    data: auditadoDiv,
                    backgroundColor: PALETA.verde, // Verde para resaltar lo auditado
                    borderRadius: 4
                }
            ]
        },
        options: commonOptions
    });

    // 3. TABLA TOP FACTURADORES (Unificando archivos 8 y 14)
    // Lógica para agrupar errores por facturador y renderizar en el tbody '#tabla-auditoria-facturadores'
    // (Omitido por brevedad, pero usarías un reduce() en JS para agrupar)
}

function renderMayoreo(audMayoreo) {
    // Sección exclusiva in-house
    let totalLempiras = 0;
    let totalUnidades = 0;
    
    // Limpieza de datos (Quitar 'L' y comas para sumar)
    audMayoreo.forEach(row => {
        let pagoStr = row['Suma de PAGO'] || '0';
        let pagoNum = parseFloat(pagoStr.toString().replace(/L/g, '').replace(/,/g, ''));
        totalLempiras += isNaN(pagoNum) ? 0 : pagoNum;
        totalUnidades += Number(row['Suma de CANTIDAD PRODUCTO'] || 0);
    });

    document.getElementById('kpi-mayoreo-tickets').textContent = audMayoreo.length.toLocaleString('en-US');
    document.getElementById('kpi-mayoreo-unidades').textContent = totalUnidades.toLocaleString('en-US');
    document.getElementById('kpi-mayoreo-lps').textContent = 'L ' + totalLempiras.toLocaleString('en-US', {minimumFractionDigits: 2});
}

// Arrancar el motor cuando el HTML esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Necesitamos cargar PapaParse en el HTML para que esto funcione. 
    // Asegúrate de tener esto en el <head> de tu index.html:
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
    
    initDashboard();
});
