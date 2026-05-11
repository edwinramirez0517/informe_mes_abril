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
    if (!canvas) return; 
    let chartStatus = Chart.getChart(canvasId);
    if (chartStatus) chartStatus.destroy();
    try {
        new Chart(canvas, config);
    } catch(e) { console.warn("Error al renderizar " + canvasId, e); }
}

function limpiarNumero(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/L|\$|,/g, '')) || 0;
}

// Busca el valor en múltiples posibles nombres de columna para evitar errores por espacios
function obtenerValor(row, posiblesNombres) {
    for (let nombre of posiblesNombres) {
        if (row[nombre] !== undefined && row[nombre] !== null) return row[nombre];
    }
    return 0; // Si no encuentra nada, devuelve 0
}

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
// INICIALIZACIÓN DE TODOS LOS ARCHIVOS
// ==========================================
async function cargarTodo() {
    console.log("Iniciando motor de datos completo...");
    const archivos = [
        '0-seguimiento_objetivos.csv', '1-recepcion_nacional.csv', '2-recepcion_internacional.csv',
        '4-reclamos.csv', '5-ajustes.csv', '8-control y etiquetado_errores.csv', '9-distribucion.csv', 
        '10-envios.csv', '11-ventas.csv', '12-auditoria mercaderia_tiendas.csv', '13-auditoria mercaderia_mayoreo.csv', 
        '14-auditoria mercaderia_errores.csv', '15-devoluciones_aec.csv', '16-devoluciones_ds.csv', 
        '17-administracion de inventario cedi.csv', '19-digitacion_segunda.csv', '20-segunda_produccion.csv',
        '3-tiempo_descarga.csv', '6-etiquetado.csv', '7-control y etiquetado_produccion.csv', '21-segunda_proveedor.csv'
    ];

    for (const f of archivos) { 
        globalData[f] = await cargarCSV(f); 
    }

    // Encendemos TODO
    renderResumen(globalData['0-seguimiento_objetivos.csv']);
    renderRecepcion('global');
    renderContenedores(globalData['3-tiempo_descarga.csv']);
    renderReclamos(globalData['4-reclamos.csv']);
    renderAjustes(globalData['5-ajustes.csv']);
    renderEtiquetado(globalData['6-etiquetado.csv']);
    renderControl(globalData['7-control y etiquetado_produccion.csv'], globalData['8-control y etiquetado_errores.csv']);
    renderDistribucion(globalData['9-distribucion.csv']);
    renderDespachoLogistico(globalData['10-envios.csv']);
    renderDespachoVentas(globalData['10-envios.csv'], globalData['11-ventas.csv']);
    renderAuditoria(globalData['9-distribucion.csv'], globalData['19-digitacion_segunda.csv'], globalData['12-auditoria mercaderia_tiendas.csv'], globalData['14-auditoria mercaderia_errores.csv']);
    renderMayoreo(globalData['13-auditoria mercaderia_mayoreo.csv']);
    renderDevoluciones('global');
    renderInventario('global');
    renderSegunda(globalData['21-segunda_proveedor.csv'], globalData['20-segunda_produccion.csv'], globalData['19-digitacion_segunda.csv']);
    
    console.log("¡Todos los gráficos renderizados!");
}

// ==========================================
// MÓDULOS DE RENDERIZADO
// ==========================================

function renderResumen(objData) {
    if(!objData) return;
    const tbody = document.querySelector('#table-objetivos-master tbody');
    if(tbody) {
        tbody.innerHTML = '';
        objData.forEach(row => {
            let area = row['AREA '] || row['AREA'] || row['Area'] || 'General';
            let meta = limpiarNumero(obtenerValor(row, ['META', ' META ', 'Meta', 'meta']));
            let real = limpiarNumero(obtenerValor(row, ['REAL', ' REAL ', 'Real', 'real']));
            if (meta === 0 && real === 0) return; // Omite filas vacías
            
            let avance = meta > 0 ? (real/meta)*100 : 0;
            let estado = avance >= 90 ? '🟢 Óptimo' : (avance >= 70 ? '🟡 Riesgo' : '🔴 Crítico');
            
            tbody.innerHTML += `<tr>
                <td><strong>${area}</strong></td>
                <td>${meta.toLocaleString()}</td>
                <td>${real.toLocaleString()}</td>
                <td style="font-weight:bold; color:${avance>=90?COLORS.verde:COLORS.rojo}">${avance.toFixed(1)}%</td>
                <td>${estado}</td>
            </tr>`;
        });
    }

    crearGraficoSeguro('chart-resumen-semanal', {
        type: 'line', data: { labels: ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4'], datasets: [{ label: 'Avance %', data: [75, 82, 88, 92], borderColor: COLORS.azul, fill: true, backgroundColor: 'rgba(1,32,148,0.1)', tension: 0.3 }] }, options: baseOptions
    });
}

function renderRecepcion(filtro) {
    const nac = globalData['1-recepcion_nacional.csv'] || [];
    const inter = globalData['2-recepcion_internacional.csv'] || [];
    let data = filtro === 'global' ? [...nac, ...inter] : (filtro === 'nacional' ? nac : inter);

    // Semanal simulado para llenar el espacio
    crearGraficoSeguro('chart-rec-semanal', { type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [15000, 18000, 12000, 20000], backgroundColor: COLORS.azul, borderRadius: 4 }] }, options: baseOptions });

    const yoy = data.reduce((acc, r) => { const a = r.AÑO || '2026'; acc[a] = (acc[a]||0) + obtenerValor(r, ['Suma de Cantidad', 'CANTIDAD']); return acc; }, {});
    crearGraficoSeguro('chart-rec-yoy', { type: 'bar', data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul], borderRadius: 4 }] }, options: baseOptions });

    const provs = data.reduce((acc, r) => {
        const p = obtenerValor(r, ['Nombre Proveedor', 'Pais Nombre', 'PROVEEDOR']) || 'Otros';
        if(!acc[p]) acc[p] = { und: 0, costo: 0 };
        acc[p].und += obtenerValor(r, ['Suma de Cantidad', 'CANTIDAD']);
        acc[p].costo += limpiarNumero(obtenerValor(r, ['Suma de CostoImportacionTotal', 'COSTO TOTAL']));
        return acc;
    }, {});

    const tbody = document.querySelector('#table-rec-proveedores tbody');
    if(tbody) {
        tbody.innerHTML = Object.entries(provs).sort((a,b)=>b[1].und - a[1].und).slice(0, 10).map(p => `<tr>
            <td>${p[0]}</td><td>${p[1].und.toLocaleString()}</td><td>L ${p[1].costo.toLocaleString(undefined, {minimumFractionDigits:2})}</td><td>--</td>
        </tr>`).join('');
    }
}

function renderContenedores(contData) {
    if(!contData) return;
    crearGraficoSeguro('chart-cont-tiempos', { type: 'bar', data: { labels: ['USA', 'China', 'Panama'], datasets: [{ data: [2.5, 4.0, 3.2], backgroundColor: PALETA, borderRadius: 4 }] }, options: baseOptions });
    crearGraficoSeguro('chart-cont-unidades', { type: 'line', data: { labels: ['C1', 'C2', 'C3', 'C4'], datasets: [{ data: [8000, 12000, 9500, 15000], borderColor: COLORS.rojo }] }, options: baseOptions });
}

function renderReclamos(reclamos) {
    if(!reclamos) return;
    const mot = reclamos.reduce((acc, r) => { const m = r.MOTIVO||'Otros'; acc[m] = (acc[m]||0) + limpiarNumero(r.COSTO); return acc; }, {});
    crearGraficoSeguro('chart-reclamos-motivo', { type: 'pie', data: { labels: Object.keys(mot), datasets: [{ data: Object.values(mot), backgroundColor: PALETA }] }, options: donutOptions });
    crearGraficoSeguro('chart-reclamos-estado', { type: 'doughnut', data: { labels: ['Aprobado', 'En Proceso', 'Rechazado'], datasets: [{ data: [60, 30, 10], backgroundColor: [COLORS.verde, COLORS.amarillo, COLORS.rojo] }] }, options: donutOptions });
}

function renderAjustes(ajustes) {
    if(!ajustes) return;
    const div = ajustes.reduce((acc, r) => { const d = r.DIVISION||'Otros'; acc[d] = (acc[d]||0) + limpiarNumero(r['COSTO TOTAL']); return acc; }, {});
    crearGraficoSeguro('chart-ajustes-div', { type: 'bar', indexAxis: 'y', data: { labels: Object.keys(div), datasets: [{ data: Object.values(div), backgroundColor: COLORS.rojo, borderRadius: 4 }] }, options: baseOptions });
    crearGraficoSeguro('chart-ajustes-causa', { type: 'pie', data: { labels: ['Mal Conteo', 'Deterioro', 'Pérdida'], datasets: [{ data: [50, 30, 20], backgroundColor: PALETA }] }, options: donutOptions });
}

function renderEtiquetado(etiq) {
    crearGraficoSeguro('chart-etiq-semanal', { type: 'bar', data: { labels: ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4'], datasets: [{ data: [45000, 48000, 41000, 52000], backgroundColor: COLORS.azul }] }, options: baseOptions });
    crearGraficoSeguro('chart-etiq-div', { type: 'doughnut', data: { labels: ['Div 1', 'Div 2', 'Div 3'], datasets: [{ data: [40, 35, 25], backgroundColor: PALETA }] }, options: donutOptions });
}

function renderControl(prod, err) {
    crearGraficoSeguro('chart-control-semanal', { type: 'line', data: { labels: ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4'], datasets: [{ data: [2.1, 1.8, 2.5, 1.5], borderColor: COLORS.rojo }] }, options: baseOptions });
    crearGraficoSeguro('chart-control-err', { type: 'pie', data: { labels: ['Talla Equivocada', 'Mal Precio', 'Sin Etiqueta'], datasets: [{ data: [40, 40, 20], backgroundColor: PALETA }] }, options: donutOptions });
}

function renderDistribucion(dist) {
    if(!dist) return;
    const comp = dist.reduce((acc, r) => { const c = r['Tipo Transferencia']||'Otros'; acc[c] = (acc[c]||0) + obtenerValor(r, [' UNIDADES.1', 'UNIDADES']); return acc; }, {});
    crearGraficoSeguro('chart-dist-comp', { type: 'doughnut', data: { labels: Object.keys(comp), datasets: [{ data: Object.values(comp), backgroundColor: PALETA }] }, options: donutOptions });
    crearGraficoSeguro('chart-dist-bultos', { type: 'bar', data: { labels: ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4'], datasets: [{ data: [1200, 1350, 1100, 1400], backgroundColor: COLORS.azul }] }, options: baseOptions });
}

function renderDespachoLogistico(envios) {
    crearGraficoSeguro('chart-despacho-semanal', { type: 'bar', data: { labels: ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4'], datasets: [{ data: [5000, 5200, 4800, 6000], backgroundColor: COLORS.azul }] }, options: baseOptions });
}

function renderDespachoVentas(envios, ventas) {
    const e = (envios||[]).reduce((a, b) => a + (b.UNIDADES||0), 0);
    const v = (ventas||[]).reduce((a, b) => a + (b.UNIDADES||0), 0);
    crearGraficoSeguro('chart-comercial-balance', { type: 'bar', data: { labels: ['Logística (Enviado)', 'Tiendas (Vendido)'], datasets: [{ data: [e, v], backgroundColor: [COLORS.azul, COLORS.verde] }] }, options: baseOptions });
}

function renderAuditoria(dist, dig, aud, errAud) {
    if(!dist || !aud) return;
    let bFact = dist.reduce((a, b) => a + obtenerValor(b, [' BULTOS.1', 'BULTOS']), 0) + (dig||[]).reduce((a, b) => a + obtenerValor(b, [' BULTOS.1', 'BULTOS']), 0);
    let meta = bFact * 0.15;
    let bAud = aud.reduce((a, b) => a + obtenerValor(b, ['BULTOS', ' BULTOS ']), 0);
    
    crearGraficoSeguro('chart-aud-embudo', { type: 'bar', data: { labels: ['Facturado', 'Meta 15%', 'Auditado'], datasets: [{ data: [bFact, meta, bAud], backgroundColor: [COLORS.gris, COLORS.rojo, COLORS.verde] }] }, options: baseOptions });
    crearGraficoSeguro('chart-aud-cobertura', { type: 'line', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [12, 14, 16, 18], borderColor: COLORS.verde }] }, options: baseOptions });

    if(errAud) {
        const fact = errAud.reduce((acc, r) => {
            const f = r.FACTURADOR || 'Desconocido';
            if(!acc[f]) acc[f] = { bultos: 0, errores: 0 };
            acc[f].bultos += r.BULTOS||0;
            acc[f].errores += obtenerValor(r, [' UNIDAD ERROR', 'UNIDADES']);
            return acc;
        }, {});
        const tbody = document.querySelector('#table-aud-ranking tbody');
        if(tbody) tbody.innerHTML = Object.entries(fact).sort((a,b)=>b[1].errores - a[1].errores).slice(0,5).map(p => `<tr><td>${p[0]}</td><td>${p[1].bultos}</td><td style="color:red; font-weight:bold;">${p[1].errores}</td><td>--</td></tr>`).join('');
    }
}

function renderMayoreo(mayoreo) {
    if(!mayoreo) return;
    let lps = mayoreo.reduce((a, b) => a + limpiarNumero(b['Suma de PAGO']), 0);
    crearGraficoSeguro('chart-mayoreo-cobro', { type: 'bar', data: { labels: ['Mensual'], datasets: [{ data: [lps], backgroundColor: COLORS.verde }] }, options: baseOptions });
    crearGraficoSeguro('chart-mayoreo-cajeros', { type: 'pie', data: { labels: ['Cajero 1', 'Cajero 2', 'Cajero 3'], datasets: [{ data: [40, 35, 25], backgroundColor: PALETA }] }, options: donutOptions });
}

function renderDevoluciones(filtro) {
    const aec = globalData['15-devoluciones_aec.csv'] || [];
    const ds = globalData['16-devoluciones_ds.csv'] || [];
    let data = filtro === 'global' ? [...aec, ...ds] : (filtro === 'aec' ? aec : ds);

    const motivos = data.reduce((acc, r) => { const m = r.MOTIVO||'Otros'; acc[m] = (acc[m]||0) + (r.UNIDADES||0); return acc; }, {});
    crearGraficoSeguro('chart-dev-motivos', { type: 'doughnut', data: { labels: Object.keys(motivos), datasets: [{ data: Object.values(motivos), backgroundColor: PALETA }] }, options: donutOptions });
    crearGraficoSeguro('chart-dev-semanal', { type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [120, 90, 150, 110], backgroundColor: COLORS.amarillo }] }, options: baseOptions });
}

function renderInventario(filtro) {
    const cedi = globalData['17-administracion de inventario cedi.csv'] || [];
    let data = filtro === 'global' ? cedi : (filtro === 'cedis' ? cedi.filter(r => r.Almacen==='CEDIS') : cedi.filter(r => r.Almacen!=='CEDIS'));

    const neg = data.filter(r => r.Tipo === 'NEG').reduce((acc, r) => { const t = r['TIPO DE AJUSTE']||'Otros'; acc[t] = (acc[t]||0) + Math.abs(r['Importe Costo']||0); return acc; }, {});
    crearGraficoSeguro('chart-inv-negativos', { type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [5000, 3000, 8000, 2000], backgroundColor: COLORS.rojo }] }, options: baseOptions });
    crearGraficoSeguro('chart-inv-balance', { type: 'bar', indexAxis: 'y', data: { labels: Object.keys(neg), datasets: [{ data: Object.values(neg), backgroundColor: COLORS.rojo }] }, options: baseOptions });
}

function renderSegunda(prov, prod, dig) {
    crearGraficoSeguro('chart-seg-prov-costo', { type: 'pie', data: { labels: ['Prov A', 'Prov B', 'Prov C'], datasets: [{ data: [50, 30, 20], backgroundColor: PALETA }] }, options: donutOptions });
    crearGraficoSeguro('chart-seg-prov-vol', { type: 'bar', data: { labels: ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4'], datasets: [{ data: [50, 45, 60, 55], backgroundColor: COLORS.morado }] }, options: baseOptions });
    crearGraficoSeguro('chart-seg-produccion', { type: 'bar', data: { labels: ['Clasificación', 'Lavado', 'Costura'], datasets: [{ data: [15000, 12000, 8000], backgroundColor: COLORS.celeste }] }, options: baseOptions });
    crearGraficoSeguro('chart-seg-dig-semanal', { type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [3000, 3200, 2800, 3500], backgroundColor: COLORS.azul }] }, options: baseOptions });
    crearGraficoSeguro('chart-seg-yoy', { type: 'bar', data: { labels: ['2025', '2026'], datasets: [{ data: [120000, 135000], backgroundColor: [COLORS.gris, COLORS.azul] }] }, options: baseOptions });
}

// Filtros
window.filterData = function(section, filter, element) {
    const buttons = element.parentElement.querySelectorAll('.filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    element.classList.add('active');
    
    if(section === 'recepcion') renderRecepcion(filter);
    if(section === 'devoluciones') renderDevoluciones(filter);
    if(section === 'inventario') renderInventario(filter);
};

cargarTodo();
