// ==========================================
// CONFIGURACIÓN GLOBAL Y VARIABLES
// ==========================================
Chart.register(ChartDataLabels);

const COLORS = { azul: '#012094', rojo: '#E1251B', verde: '#27ae60', gris: '#dfe6e9', amarillo: '#f39c12', celeste: '#0277bd', morado: '#6a1b9a' };
const PALETA = [COLORS.azul, COLORS.rojo, COLORS.verde, COLORS.amarillo, COLORS.celeste, COLORS.morado, '#e67e22', '#34495e'];

const baseOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: { x: { grid: { display: false } }, y: { grid: { display: false }, ticks: { callback: v => v.toLocaleString('en-US') } } },
    plugins: {
        legend: { display: false },
        datalabels: { anchor: 'end', align: 'top', font: { weight: 'bold', size: 10 }, formatter: v => v ? v.toLocaleString('en-US') : '', color: '#2d3436' }
    }
};

const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '60%',
    plugins: { legend: { position: 'right' }, datalabels: { color: '#fff', font: { weight: 'bold', size: 11 } } }
};

// Variable global para almacenar todos los datos y poder usar los filtros sin recargar
let globalData = {};

// ==========================================
// MOTOR DE CARGA Y SALVAVIDAS
// ==========================================
async function cargarCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(`data/${file}`, {
            download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: results => resolve(results.data),
            error: err => { console.warn(`Aviso: No se pudo cargar ${file}`, err); resolve([]); }
        });
    });
}

function crearGraficoSeguro(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return; // Si no existe, no hace nada (no da error)
    let chartStatus = Chart.getChart(canvasId);
    if (chartStatus) chartStatus.destroy();
    new Chart(canvas, config);
}

function limpiarNumero(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/L|\$|,/g, '')) || 0;
}

// Inyecta el encabezado de Objetivos en cada sección
function renderObjetivoHeader(idElemento, area, meta, real, avance) {
    const el = document.getElementById(idElemento);
    if(!el) return;
    let colorObj = avance >= 90 ? COLORS.verde : (avance >= 70 ? COLORS.amarillo : COLORS.rojo);
    el.innerHTML = `
        <div class="obj-stat"><div class="label">Área</div><div class="val" style="font-size:1.1rem; color:#2d3436;">${area}</div></div>
        <div class="obj-stat"><div class="label">Meta Mensual</div><div class="val">${meta.toLocaleString()}</div></div>
        <div class="obj-stat"><div class="label">Real Acumulado</div><div class="val">${real.toLocaleString()}</div></div>
        <div class="obj-stat"><div class="label">% Avance</div><div class="val" style="color:${colorObj};">${avance.toFixed(1)}%</div></div>
    `;
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function cargarTodo() {
    console.log("Iniciando motor de datos...");
    const archivos = [
        '0-seguimiento_objetivos.csv', '1-recepcion_nacional.csv', '2-recepcion_internacional.csv',
        '4-reclamos.csv', '5-ajustes.csv', '8-control y etiquetado_errores.csv', '9-distribucion.csv', 
        '10-envios.csv', '11-ventas.csv', '12-auditoria mercaderia_tiendas.csv', '13-auditoria mercaderia_mayoreo.csv', 
        '14-auditoria mercaderia_errores.csv', '15-devoluciones_aec.csv', '16-devoluciones_ds.csv', 
        '17-administracion de inventario cedi.csv', '19-digitacion_segunda.csv', '20-segunda_produccion.csv'
    ];

    for (const f of archivos) { 
        globalData[f] = await cargarCSV(f); 
    }

    // Renders Iniciales (Vista Global por defecto)
    renderResumen(globalData['0-seguimiento_objetivos.csv']);
    renderRecepcion('global'); // Usa el filtro por defecto
    renderReclamos(globalData['4-reclamos.csv'], globalData['5-ajustes.csv']);
    renderDistribucion(globalData['9-distribucion.csv']);
    renderDespacho(globalData['10-envios.csv'], globalData['11-ventas.csv']);
    renderAuditoria(globalData['9-distribucion.csv'], globalData['19-digitacion_segunda.csv'], globalData['12-auditoria mercaderia_tiendas.csv'], globalData['14-auditoria mercaderia_errores.csv']);
    renderMayoreo(globalData['13-auditoria mercaderia_mayoreo.csv']);
    renderDevoluciones('global');
    renderInventario('global');
    renderSegunda(globalData['20-segunda_produccion.csv'], globalData['19-digitacion_segunda.csv']);
    
    console.log("¡Carga Completa y Tablas Llenas!");
}

// ==========================================
// RENDERIZADO POR SECCIÓN (CON FILTROS Y TABLAS)
// ==========================================

function renderResumen(objData) {
    if(!objData || objData.length === 0) return;
    
    // Llenar tabla maestra
    const tbody = document.querySelector('#table-objetivos-master tbody');
    if(tbody) {
        tbody.innerHTML = '';
        let html = '';
        objData.forEach(row => {
            let area = row['AREA '] || row['AREA'] || 'N/A';
            let meta = limpiarNumero(row['META'] || row[' META ']);
            let real = limpiarNumero(row[' REAL '] || row['REAL']);
            let avance = meta > 0 ? (real/meta)*100 : 0;
            let estado = avance >= 90 ? '🟢 Óptimo' : (avance >= 70 ? '🟡 Riesgo' : '🔴 Crítico');
            
            html += `<tr>
                <td><strong>${area}</strong></td>
                <td>${meta.toLocaleString()}</td>
                <td>${real.toLocaleString()}</td>
                <td style="font-weight:bold; color:${avance>=90?COLORS.verde:COLORS.rojo}">${avance.toFixed(1)}%</td>
                <td>${estado}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }

    // Headers de otras secciones (Valores de ejemplo extraídos de la primera fila operativa)
    renderObjetivoHeader('obj-recepcion', 'Recepción', 500000, 350000, 70);
    renderObjetivoHeader('obj-auditoria', 'Auditoría', 15000, 14500, 96);
    renderObjetivoHeader('obj-etiquetado', 'Etiquetado', 200000, 180000, 90);
    // Agrega el resto de headers según necesites cruzar la data exacta
}

// FILTRO DINÁMICO: RECEPCIÓN
function renderRecepcion(filtro) {
    const nac = globalData['1-recepcion_nacional.csv'] || [];
    const inter = globalData['2-recepcion_internacional.csv'] || [];
    
    let dataGraficos = [];
    if(filtro === 'global') dataGraficos = [...nac, ...inter];
    else if(filtro === 'nacional') dataGraficos = [...nac];
    else if(filtro === 'internacional') dataGraficos = [...inter];

    // YoY
    const yoy = dataGraficos.reduce((acc, r) => { const anio = r.AÑO || '2026'; acc[anio] = (acc[anio]||0) + (r['Suma de Cantidad']||0); return acc; }, {});
    crearGraficoSeguro('chart-rec-yoy', { type: 'bar', data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul], borderRadius: 4 }] }, options: baseOptions });

    // Tabla Proveedores (Top 10)
    const provs = dataGraficos.reduce((acc, r) => {
        const p = r['Nombre Proveedor'] || r['Pais Nombre'] || 'Desconocido';
        if(!acc[p]) acc[p] = { und: 0, costo: 0 };
        acc[p].und += (r['Suma de Cantidad']||0);
        acc[p].costo += limpiarNumero(r['Suma de CostoImportacionTotal'] || r['Costo']);
        return acc;
    }, {});

    const topProvs = Object.entries(provs).sort((a,b) => b[1].und - a[1].und).slice(0, 10);
    const tbody = document.querySelector('#table-rec-proveedores tbody');
    if(tbody) {
        tbody.innerHTML = topProvs.map(p => `<tr>
            <td>${p[0]}</td>
            <td>${p[1].und.toLocaleString()}</td>
            <td>L ${p[1].costo.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
            <td>--</td>
        </tr>`).join('');
    }
}

// FILTRO DINÁMICO: DEVOLUCIONES
function renderDevoluciones(filtro) {
    const aec = globalData['15-devoluciones_aec.csv'] || [];
    const ds = globalData['16-devoluciones_ds.csv'] || [];
    
    let dataEvaluar = [];
    if(filtro === 'global') dataEvaluar = [...aec, ...ds];
    else if(filtro === 'aec') dataEvaluar = [...aec];
    else if(filtro === 'ds') dataEvaluar = [...ds];

    const motivos = dataEvaluar.reduce((acc, r) => { const m = r.MOTIVO||'Otros'; acc[m] = (acc[m]||0) + (r.UNIDADES||0); return acc; }, {});
    crearGraficoSeguro('chart-dev-motivos', { type: 'pie', data: { labels: Object.keys(motivos), datasets: [{ data: Object.values(motivos), backgroundColor: PALETA }] }, options: donutOptions });
}

// FILTRO DINÁMICO: INVENTARIO (Con Regla de Negocio CEDIS)
function renderInventario(filtro) {
    const cedi = globalData['17-administracion de inventario cedi.csv'] || [];
    
    // Reglas de negocio: Mantener CEDIS visible incluso si filtramos tienda
    let dataFiltrada = cedi;
    if(filtro === 'tiendas') {
        // Ejemplo de regla: Filtramos para mostrar solo tiendas, pero la lógica futura 
        // de la UI permitirá mantener CEDIS en el comparativo.
        dataFiltrada = cedi.filter(r => r.Almacen !== 'CEDIS'); 
    } else if (filtro === 'cedis') {
        dataFiltrada = cedi.filter(r => r.Almacen === 'CEDIS');
    }

    const neg = dataFiltrada.filter(r => r.Tipo === 'NEG').reduce((acc, r) => { 
        const t = r['TIPO DE AJUSTE']||'Otros'; 
        acc[t] = (acc[t]||0) + Math.abs(r['Importe Costo']||0); 
        return acc; 
    }, {});
    
    crearGraficoSeguro('chart-inv-negativos', {
        type: 'bar', indexAxis: 'y', data: { labels: Object.keys(neg), datasets: [{ data: Object.values(neg), backgroundColor: COLORS.rojo, borderRadius: 4 }] },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { formatter: v => 'L ' + (v/1000).toFixed(1) + 'K' } } }
    });
}

function renderReclamos(reclamos, ajustes) {
    const mot = reclamos.reduce((acc, r) => { const m = r.MOTIVO||'Otros'; acc[m] = (acc[m]||0) + (r.UND||0); return acc; }, {});
    crearGraficoSeguro('chart-reclamos-motivo', { type: 'pie', data: { labels: Object.keys(mot), datasets: [{ data: Object.values(mot), backgroundColor: PALETA }] }, options: donutOptions });
}

function renderDistribucion(dist) {
    const comp = dist.reduce((acc, r) => { const c = r['Tipo Transferencia']||'Otros'; acc[c] = (acc[c]||0) + (r[' UNIDADES.1']||0); return acc; }, {});
    crearGraficoSeguro('chart-dist-comp', { type: 'doughnut', data: { labels: Object.keys(comp), datasets: [{ data: Object.values(comp), backgroundColor: PALETA, borderWidth: 0 }] }, options: donutOptions });
}

function renderDespacho(envios, ventas) {
    const e = envios.reduce((a, b) => a + (b.UNIDADES||0), 0);
    const v = ventas.reduce((a, b) => a + (b.UNIDADES||0), 0);
    crearGraficoSeguro('chart-comercial-balance', { type: 'bar', data: { labels: ['Logística (Enviado)', 'Tiendas (Vendido)'], datasets: [{ data: [e, v], backgroundColor: [COLORS.azul, COLORS.verde], borderRadius: 4 }] }, options: baseOptions });
}

function renderAuditoria(dist, dig, aud, errAud) {
    let bFact = dist.reduce((a, b) => a + (b[' BULTOS.1']||0), 0) + dig.reduce((a, b) => a + (b[' BULTOS.1']||0), 0);
    let meta = bFact * 0.15;
    let bAud = aud.reduce((a, b) => a + (b.BULTOS||0), 0);
    
    crearGraficoSeguro('chart-aud-embudo', { type: 'bar', data: { labels: ['Facturado', 'Meta 15%', 'Auditado'], datasets: [{ data: [bFact, meta, bAud], backgroundColor: [COLORS.gris, COLORS.rojo, COLORS.verde], borderRadius: 4 }] }, options: baseOptions });

    // Llenar tabla de errores (Top 5 Facturadores)
    const errByFact = errAud.reduce((acc, r) => {
        const fact = r.FACTURADOR || 'Desconocido';
        if(!acc[fact]) acc[fact] = { bultos: 0, errores: 0 };
        acc[fact].bultos += (r.BULTOS||0);
        acc[fact].errores += (r[' UNIDAD ERROR']||0); // O la columna correspondiente
        return acc;
    }, {});

    const topErr = Object.entries(errByFact).sort((a,b) => b[1].errores - a[1].errores).slice(0, 5);
    const tbody = document.querySelector('#table-aud-ranking tbody');
    if(tbody) {
        tbody.innerHTML = topErr.map(p => `<tr>
            <td>${p[0]}</td>
            <td>${p[1].bultos}</td>
            <td style="color:${COLORS.rojo}; font-weight:bold;">${p[1].errores}</td>
            <td>--</td>
        </tr>`).join('');
    }
}

function renderMayoreo(mayoreo) {
    let lps = mayoreo.reduce((a, b) => a + limpiarNumero(b['Suma de PAGO']), 0);
    crearGraficoSeguro('chart-mayoreo-cobro', { type: 'bar', data: { labels: ['Recaudación Total'], datasets: [{ data: [lps], backgroundColor: COLORS.verde, borderRadius: 4 }] }, options: baseOptions });
}

function renderSegunda(prod, dig) {
    const yoy = prod.reduce((acc, r) => { const a = r.AÑO||'2026'; acc[a] = (acc[a]||0) + (r.UNIDADES||0); return acc; }, {});
    crearGraficoSeguro('chart-seg-yoy', { type: 'bar', data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul], borderRadius: 4 }] }, options: baseOptions });
}

// Lógica para que el HTML ejecute los filtros
window.filterData = function(section, filter, element) {
    const buttons = element.parentElement.querySelectorAll('.filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    element.classList.add('active');
    
    if(section === 'recepcion') renderRecepcion(filter);
    if(section === 'devoluciones') renderDevoluciones(filter);
    if(section === 'inventario') renderInventario(filter);
};

// Arrancar
cargarTodo();
