// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
Chart.register(ChartDataLabels);

const COLORS = {
    primary: '#1a237e',
    primaryLight: '#3949ab',
    accent: '#ff6f00',
    accentLight: '#ffa040',
    success: '#2e7d32',
    danger: '#c62828',
    gray: '#7f8c8d'
};

const PALETA = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.primaryLight, COLORS.accentLight, '#5c6bc0', '#ff8f00', '#43a047'];

let globalData = {};

// ==========================================
// MOTOR DE DATOS
// ==========================================
async function cargarCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(`data/${file}`, {
            download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: results => resolve(results.data),
            error: () => resolve([])
        });
    });
}

function destroyChart(id) {
    let chart = Chart.getChart(id);
    if (chart) chart.destroy();
}

function parseNum(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/L|\$|,/g, '')) || 0;
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function cargarTodo() {
    const archivos = [
        '0-seguimiento_objetivos.csv', '1-recepcion_nacional.csv', '2-recepcion_internacional.csv',
        '3-tiempo_descarga.csv', '4-reclamos.csv', '5-ajustes.csv', '6-etiquetado.csv',
        '7-control y etiquetado_produccion.csv', '8-control y etiquetado_errores.csv',
        '9-distribucion.csv', '10-envios.csv', '11-ventas.csv', '12-auditoria mercaderia_tiendas.csv',
        '13-auditoria mercaderia_mayoreo.csv', '14-auditoria mercaderia_errores.csv',
        '15-devoluciones_aec.csv', '16-devoluciones_ds.csv', '17-administracion de inventario cedi.csv',
        '19-digitacion_segunda.csv', '20-segunda_produccion.csv', '21-segunda_proveedor.csv'
    ];

    for (const f of archivos) {
        globalData[f] = await cargarCSV(f);
    }

    renderResumen();
    renderRecepcion('global');
    renderContenedores();
    renderEtiquetado();
    renderControl();
    renderAuditoria();
    renderDevoluciones('global');
    renderSegunda();
}

// ==========================================
// RESUMEN - OBJETIVOS (TUS CARDS)
// ==========================================
function renderResumen() {
    const data = globalData['0-seguimiento_objetivos.csv'];
    const container = document.getElementById('goals-container');
    if (!container || !data) return;

    container.innerHTML = '';
    data.forEach(row => {
        const area = row['AREA '] || row['AREA'] || 'General';
        const meta = parseNum(row['META'] || row[' META ']);
        const real = parseNum(row[' REAL '] || row['REAL']);
        const pct = meta > 0 ? (real / meta) * 100 : 0;
        
        let color = pct >= 90 ? COLORS.success : (pct >= 75 ? COLORS.accent : COLORS.danger);

        container.innerHTML += `
            <div class="kpi-card">
                <div class="kpi-title">${area}</div>
                <div class="kpi-value">${pct.toFixed(1)}%</div>
                <div class="kpi-detail" style="font-size:0.75rem; color:#7f8c8d; font-weight:600;">
                    Meta: ${meta.toLocaleString()} | Real: ${real.toLocaleString()}
                </div>
                <div class="kpi-progress">
                    <div class="kpi-bar" style="width: ${Math.min(pct, 100)}%; background: ${color}"></div>
                </div>
            </div>
        `;
    });

    destroyChart('chartResumenGeneral');
    new Chart(document.getElementById('chartResumenGeneral'), {
        type: 'line',
        data: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
            datasets: [{
                label: '% Cumplimiento',
                data: [75, 82, 88, 92],
                borderColor: COLORS.primary,
                fill: true,
                backgroundColor: 'rgba(26, 35, 126, 0.1)',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ==========================================
// RECEPCIÓN
// ==========================================
function renderRecepcion(filtro) {
    const nac = globalData['1-recepcion_nacional.csv'] || [];
    const inter = globalData['2-recepcion_internacional.csv'] || [];
    let data = filtro === 'global' ? [...nac, ...inter] : (filtro === 'nacional' ? nac : inter);

    // YoY
    const yoyData = data.reduce((acc, r) => {
        const a = r.AÑO || '2026';
        acc[a] = (acc[a] || 0) + (r['Suma de Cantidad'] || 0);
        return acc;
    }, {});

    destroyChart('chartRecYoY');
    new Chart(document.getElementById('chartRecYoY'), {
        type: 'bar',
        data: {
            labels: Object.keys(yoyData),
            datasets: [{ data: Object.values(yoyData), backgroundColor: [COLORS.gray, COLORS.primary], borderRadius: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Costo por Cía
    let aec = 0; let ds = 0;
    nac.forEach(r => {
        if (r['Compañía'] === 'AEC') aec += (r['Suma de CostoImportacionTotal'] || 0);
        if (r['Compañía'] === 'DS') ds += (r['Suma de CostoImportacionTotal'] || 0);
    });

    destroyChart('chartRecCosto');
    new Chart(document.getElementById('chartRecCosto'), {
        type: 'doughnut',
        data: {
            labels: ['AEC', 'Danilos'],
            datasets: [{ data: [aec, ds], backgroundColor: [COLORS.primary, COLORS.accent], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });

    // Tabla
    const provs = data.reduce((acc, r) => {
        const p = r['Nombre Proveedor'] || r['Pais Nombre'] || 'Otros';
        if (!acc[p]) acc[p] = { und: 0, costo: 0 };
        acc[p].und += (r['Suma de Cantidad'] || 0);
        acc[p].costo += (r['Suma de CostoImportacionTotal'] || 0);
        return acc;
    }, {});

    const tbody = document.querySelector('#tableRecProveedores tbody');
    if (tbody) {
        tbody.innerHTML = Object.entries(provs).sort((a,b) => b[1].und - a[1].und).slice(0, 10).map(p => `
            <tr>
                <td>${p[0]}</td>
                <td class="text-right">${p[1].und.toLocaleString()}</td>
                <td class="text-right">L ${p[1].costo.toLocaleString()}</td>
                <td class="text-right">--</td>
            </tr>
        `).join('');
    }
}

// ==========================================
// CONTENEDORES (TU NUEVO ARCHIVO)
// ==========================================
function renderContenedores() {
    const data = globalData['3-tiempo_descarga.csv'];
    if (!data) return;

    const paisStats = {};
    const costoSemana = {};

    data.forEach(r => {
        const p = r.PAIS || 'Otros';
        const tiempoStr = r['TIEMPO DE DESCARGA'];
        let mins = 0;
        if (tiempoStr && typeof tiempoStr === 'string' && tiempoStr.includes(':')) {
            const pts = tiempoStr.split(':');
            mins = parseInt(pts[0]) * 60 + parseInt(pts[1]);
        }
        if (!paisStats[p]) paisStats[p] = { sum: 0, count: 0 };
        paisStats[p].sum += mins; paisStats[p].count++;

        const s = r.SEMANA || 'SN';
        const c = parseNum(r['COSTO TOTAL']);
        costoSemana[s] = (costoSemana[s] || 0) + c;
    });

    destroyChart('chartContTiempos');
    new Chart(document.getElementById('chartContTiempos'), {
        type: 'bar',
        data: {
            labels: Object.keys(paisStats),
            datasets: [{ data: Object.keys(paisStats).map(p => (paisStats[p].sum / paisStats[p].count / 60).toFixed(2)), backgroundColor: PALETA, borderRadius: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    destroyChart('chartContCostos');
    new Chart(document.getElementById('chartContCostos'), {
        type: 'line',
        data: {
            labels: Object.keys(costoSemana).sort(),
            datasets: [{ data: Object.keys(costoSemana).sort().map(s => costoSemana[s]), borderColor: COLORS.accent, fill: false, tension: 0.3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ==========================================
// ETIQUETADO Y CONTROL
// ==========================================
function renderEtiquetado() {
    destroyChart('chartEtiqSemanal');
    new Chart(document.getElementById('chartEtiqSemanal'), {
        type: 'bar',
        data: {
            labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
            datasets: [
                { label: 'Real', data: [45000, 48000, 42000, 51000], backgroundColor: COLORS.primary, borderRadius: 6 },
                { label: 'Meta', data: [50000, 50000, 50000, 50000], backgroundColor: COLORS.gray + '44', borderRadius: 6 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderControl() {
    destroyChart('chartControlError');
    new Chart(document.getElementById('chartControlError'), {
        type: 'line',
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [1.5, 2.1, 1.8, 1.2], borderColor: COLORS.danger, tension: 0.3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ==========================================
// AUDITORÍA
// ==========================================
function renderAuditoria() {
    const dist = globalData['9-distribucion.csv'] || [];
    const aud = globalData['12-auditoria mercaderia_tiendas.csv'] || [];
    
    let fact = dist.reduce((a, b) => a + (b[' BULTOS.1'] || 0), 0);
    let audit = aud.reduce((a, b) => a + (b.BULTOS || 0), 0);
    let meta = fact * 0.15;

    destroyChart('chartAudEmbudo');
    new Chart(document.getElementById('chartAudEmbudo'), {
        type: 'bar',
        data: {
            labels: ['Total Facturado', 'Meta 15%', 'Auditado Real'],
            datasets: [{ data: [fact, meta, audit], backgroundColor: [COLORS.gray, COLORS.accent, COLORS.success], borderRadius: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ==========================================
// DEVOLUCIONES
// ==========================================
function renderDevoluciones(filtro) {
    const aec = globalData['15-devoluciones_aec.csv'] || [];
    const ds = globalData['16-devoluciones_ds.csv'] || [];
    let data = filtro === 'global' ? [...aec, ...ds] : (filtro === 'aec' ? aec : ds);

    const container = document.getElementById('dev-kpis');
    if (container) {
        let appCount = data.filter(r => r.APLICADO === 'APLICADO').length;
        let pct = data.length > 0 ? (appCount / data.length) * 100 : 0;
        
        container.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-title">Eficiencia Aplicación NC</div>
                <div class="kpi-value">${pct.toFixed(1)}%</div>
                <div class="kpi-progress"><div class="kpi-bar" style="width:${pct}%; background:${COLORS.success}"></div></div>
            </div>
        `;
    }

    const motivos = data.reduce((acc, r) => {
        const m = r.MOTIVO || 'Otros';
        acc[m] = (acc[m] || 0) + 1;
        return acc;
    }, {});

    destroyChart('chartDevMotivos');
    new Chart(document.getElementById('chartDevMotivos'), {
        type: 'pie',
        data: { labels: Object.keys(motivos), datasets: [{ data: Object.values(motivos), backgroundColor: PALETA }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==========================================
// SEGUNDA D'S (TU FLUJO)
// ==========================================
function renderSegunda() {
    // Etapa 1: Prov
    const prov = globalData['21-segunda_proveedor.csv'] || [];
    const provCosto = prov.reduce((acc, r) => {
        const p = r.PROVEEDOR || 'Otros';
        acc[p] = (acc[p] || 0) + parseNum(r['COSTO TOTAL']);
        return acc;
    }, {});

    destroyChart('chartSegProvCosto');
    new Chart(document.getElementById('chartSegProvCosto'), {
        type: 'pie',
        data: { labels: Object.keys(provCosto), datasets: [{ data: Object.values(provCosto), backgroundColor: PALETA }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Etapa 2: Prod
    const prod = globalData['20-segunda_produccion.csv'] || [];
    const prodArea = prod.reduce((acc, r) => {
        const a = r.AREA || 'Otros';
        acc[a] = (acc[a] || 0) + (r.UNIDADES || 0);
        return acc;
    }, {});

    destroyChart('chartSegProduccion');
    new Chart(document.getElementById('chartSegProduccion'), {
        type: 'bar',
        data: { labels: Object.keys(prodArea), datasets: [{ data: Object.values(prodArea), backgroundColor: COLORS.primary, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Etapa 3: Salida
    const dig = globalData['19-digitacion_segunda.csv'] || [];
    const yoy = dig.reduce((acc, r) => {
        const a = r.AÑO || '2026';
        acc[a] = (acc[a] || 0) + (r.UNIDADES || 0);
        return acc;
    }, {});

    destroyChart('chartSegDigYoY');
    new Chart(document.getElementById('chartSegDigYoY'), {
        type: 'bar',
        data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gray, COLORS.accent], borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ==========================================
// FILTROS
// ==========================================
window.filterRecepcion = (f, el) => {
    document.querySelectorAll('#recepcion .btn-filter').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    renderRecepcion(f);
};

window.filterDevoluciones = (f, el) => {
    document.querySelectorAll('#devoluciones .btn-filter').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    renderDevoluciones(f);
};

// Arrancar
cargarTodo();
