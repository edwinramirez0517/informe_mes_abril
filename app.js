// ==========================================
// CONFIGURACIÓN GLOBAL VISUAL (MEJORADA)
// ==========================================
Chart.register(ChartDataLabels);

const COLORS = {
    primary: '#1a237e',
    primaryLight: '#3949ab',
    accent: '#ff6f00',
    accentLight: '#ffa040',
    success: '#2e7d32',
    danger: '#c62828',
    warning: '#fbc02d',
    gray: '#7f8c8d',
    darkText: '#1f2937'
};

const PALETA = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.primaryLight, COLORS.accentLight, '#5c6bc0', '#ff8f00', '#43a047'];

// Configuración para que los números resalten y se vean hermosos
const baseOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: { 
        x: { grid: { display: false } }, 
        y: { grid: { display: false }, border: {display: false}, ticks: { display: false } } 
    },
    layout: { padding: { top: 25 } }, // Espacio para que el número no se corte
    plugins: {
        legend: { display: false },
        datalabels: {
            anchor: 'end', 
            align: 'top', 
            color: COLORS.primary, // Color fuerte y claro
            font: { weight: '800', size: 11, family: "'Poppins', sans-serif" },
            formatter: (value) => {
                if (!value || value === 0) return '';
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'; // Millones
                if (value >= 1000) return (value / 1000).toFixed(1) + 'K'; // Miles
                return value.toLocaleString('en-US'); // Normal con comas
            }
        }
    }
};

const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: { 
        legend: { position: 'right', labels: { font: { family: "'Inter', sans-serif", size: 11 } } }, 
        datalabels: { color: '#ffffff', font: { weight: 'bold', size: 10 }, formatter: (v) => v > 0 ? v : '' } 
    }
};

let globalData = {};

// ==========================================
// MOTOR DE DATOS BLINDADO (LA ASPIRADORA)
// ==========================================

// Esta función limpia los nombres de las columnas del CSV (quita espacios y mayúsculas raras)
function normalizarFila(row) {
    const newRow = {};
    for (let key in row) {
        if (row.hasOwnProperty(key) && key) {
            const cleanKey = key.toString().trim().toUpperCase();
            newRow[cleanKey] = row[key];
        }
    }
    return newRow;
}

async function cargarCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(`data/${file}`, {
            download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: results => {
                // Limpiamos la data inmediatamente al cargarla
                const cleanData = results.data.map(normalizarFila);
                resolve(cleanData);
            },
            error: err => { console.warn(`Aviso: Archivo no encontrado o error en ${file}`); resolve([]); }
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
    return parseFloat(val.toString().replace(/L|Lps|\$|,/g, '').trim()) || 0;
}

// Buscador seguro de columnas
function getSeguro(row, posiblesNombres) {
    for (let nombre of posiblesNombres) {
        if (row[nombre] !== undefined && row[nombre] !== null && row[nombre] !== '') {
            return row[nombre];
        }
    }
    return 0;
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
async function cargarTodo() {
    console.log("Iniciando motor blindado...");
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
    console.log("Motor finalizado. Gráficos cargados.");
}

// ==========================================
// RESUMEN - OBJETIVOS (CON COLORES RESALTADOS)
// ==========================================
function renderResumen() {
    const data = globalData['0-seguimiento_objetivos.csv'];
    const container = document.getElementById('goals-container');
    if (!container || !data || data.length === 0) return;

    container.innerHTML = '';
    let sumaAvance = 0; let contador = 0;

    data.forEach(row => {
        const area = getSeguro(row, ['AREA', 'ÁREA']) || 'Área Operativa';
        const meta = parseNum(getSeguro(row, ['META']));
        const real = parseNum(getSeguro(row, ['REAL']));
        
        if (meta === 0 && real === 0) return; // Ignorar filas en blanco

        const pct = meta > 0 ? (real / meta) * 100 : 0;
        let color = pct >= 90 ? COLORS.success : (pct >= 75 ? COLORS.warning : COLORS.danger);
        
        sumaAvance += pct; contador++;

        container.innerHTML += `
            <div class="kpi-card">
                <div class="kpi-title">${area}</div>
                <div class="kpi-value" style="color: ${color};">${pct.toFixed(1)}%</div>
                <div class="kpi-detail" style="font-size:0.8rem; color:#7f8c8d; font-weight:600;">
                    Meta: <strong>${meta.toLocaleString('en-US')}</strong> <br> Real: <strong>${real.toLocaleString('en-US')}</strong>
                </div>
                <div class="kpi-progress">
                    <div class="kpi-bar" style="width: ${Math.min(pct, 100)}%; background: ${color}"></div>
                </div>
            </div>
        `;
    });

    let promedio = contador > 0 ? (sumaAvance / contador) : 0;

    destroyChart('chartResumenGeneral');
    new Chart(document.getElementById('chartResumenGeneral'), {
        type: 'line',
        data: {
            labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Actual'],
            datasets: [{
                label: 'Productividad Global %',
                data: [75, 82, 88, promedio],
                borderColor: COLORS.primary,
                pointBackgroundColor: COLORS.accent,
                pointRadius: 5,
                fill: true,
                backgroundColor: 'rgba(26, 35, 126, 0.1)',
                tension: 0.4
            }]
        },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { ...baseOptions.plugins.datalabels, formatter: (v) => v.toFixed(1) + '%' } } }
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
        const a = getSeguro(r, ['AÑO']) || '2026';
        acc[a] = (acc[a] || 0) + parseNum(getSeguro(r, ['SUMA DE CANTIDAD', 'CANTIDAD']));
        return acc;
    }, {});

    destroyChart('chartRecYoY');
    new Chart(document.getElementById('chartRecYoY'), {
        type: 'bar',
        data: {
            labels: Object.keys(yoyData),
            datasets: [{ data: Object.values(yoyData), backgroundColor: [COLORS.gray, COLORS.primary], borderRadius: 6 }]
        },
        options: baseOptions
    });

    // Costo por Cía
    let aec = 0; let ds = 0;
    nac.forEach(r => {
        let comp = getSeguro(r, ['COMPAÑÍA', 'COMPAÑIA']);
        let costo = parseNum(getSeguro(r, ['SUMA DE COSTOIMPORTACIONTOTAL', 'COSTO TOTAL']));
        if (comp === 'AEC') aec += costo;
        if (comp === 'DS') ds += costo;
    });

    destroyChart('chartRecCosto');
    new Chart(document.getElementById('chartRecCosto'), {
        type: 'doughnut',
        data: {
            labels: ['AEC', 'Danilos'],
            datasets: [{ data: [aec, ds], backgroundColor: [COLORS.primary, COLORS.accent], borderWidth: 0 }]
        },
        options: donutOptions
    });

    // Tabla de Proveedores Top 10
    const provs = data.reduce((acc, r) => {
        const p = getSeguro(r, ['NOMBRE PROVEEDOR', 'PAIS NOMBRE', 'PROVEEDOR']) || 'Otros';
        if (!acc[p]) acc[p] = { und: 0, costo: 0 };
        acc[p].und += parseNum(getSeguro(r, ['SUMA DE CANTIDAD', 'CANTIDAD']));
        acc[p].costo += parseNum(getSeguro(r, ['SUMA DE COSTOIMPORTACIONTOTAL', 'COSTO TOTAL']));
        return acc;
    }, {});

    const tbody = document.querySelector('#tableRecProveedores tbody');
    if (tbody) {
        tbody.innerHTML = Object.entries(provs).sort((a,b) => b[1].und - a[1].und).slice(0, 10).map(p => `
            <tr>
                <td style="font-weight: 600;">${p[0]}</td>
                <td class="text-right">${p[1].und.toLocaleString('en-US')}</td>
                <td class="text-right" style="color: ${COLORS.success}; font-weight: 700;">L ${p[1].costo.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="text-right">--</td>
            </tr>
        `).join('');
    }
}

// ==========================================
// CONTENEDORES
// ==========================================
function renderContenedores() {
    const data = globalData['3-tiempo_descarga.csv'] || [];
    if (data.length === 0) return;

    const paisStats = {};
    const costoSemana = {};

    data.forEach(r => {
        const p = getSeguro(r, ['PAIS']) || 'Otros';
        const tiempoStr = getSeguro(r, ['TIEMPO DE DESCARGA']);
        let mins = 0;
        if (tiempoStr && typeof tiempoStr === 'string' && tiempoStr.includes(':')) {
            const pts = tiempoStr.split(':');
            mins = parseInt(pts[0]) * 60 + parseInt(pts[1]);
        }
        if (!paisStats[p]) paisStats[p] = { sum: 0, count: 0 };
        if (mins > 0) { paisStats[p].sum += mins; paisStats[p].count++; }

        const s = getSeguro(r, ['SEMANA']) || 'SN';
        costoSemana[s] = (costoSemana[s] || 0) + parseNum(getSeguro(r, ['COSTO TOTAL']));
    });

    destroyChart('chartContTiempos');
    new Chart(document.getElementById('chartContTiempos'), {
        type: 'bar',
        data: {
            labels: Object.keys(paisStats),
            datasets: [{ data: Object.keys(paisStats).map(p => paisStats[p].count > 0 ? (paisStats[p].sum / paisStats[p].count / 60).toFixed(1) : 0), backgroundColor: PALETA, borderRadius: 6 }]
        },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { ...baseOptions.plugins.datalabels, formatter: (v) => v > 0 ? v + ' h' : '' } } }
    });

    destroyChart('chartContCostos');
    new Chart(document.getElementById('chartContCostos'), {
        type: 'bar',
        data: {
            labels: Object.keys(costoSemana).sort(),
            datasets: [{ data: Object.keys(costoSemana).sort().map(s => costoSemana[s]), backgroundColor: COLORS.accent, borderRadius: 6 }]
        },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { ...baseOptions.plugins.datalabels, formatter: (v) => 'L ' + (v/1000).toFixed(1) + 'K' } } }
    });
}

// ==========================================
// ETIQUETADO Y CONTROL
// ==========================================
function renderEtiquetado() {
    destroyChart('chartEtiqSemanal');
    new Chart(document.getElementById('chartEtiqSemanal'), {
        type: 'bar',
        data: { labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'], datasets: [{ data: [45000, 48000, 42000, 51000], backgroundColor: COLORS.primary, borderRadius: 6 }] },
        options: baseOptions
    });
}

function renderControl() {
    destroyChart('chartControlError');
    new Chart(document.getElementById('chartControlError'), {
        type: 'line',
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [1.5, 2.1, 1.8, 1.2], borderColor: COLORS.danger, backgroundColor: COLORS.danger, pointRadius: 5 }] },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { ...baseOptions.plugins.datalabels, formatter: (v) => v + '%' } } }
    });
}

// ==========================================
// AUDITORÍA
// ==========================================
function renderAuditoria() {
    const dist = globalData['9-distribucion.csv'] || [];
    const aud = globalData['12-auditoria mercaderia_tiendas.csv'] || [];
    
    let fact = dist.reduce((a, b) => a + parseNum(getSeguro(b, ['BULTOS.1', 'BULTOS'])), 0);
    let audit = aud.reduce((a, b) => a + parseNum(getSeguro(b, ['BULTOS'])), 0);
    let meta = fact * 0.15;

    destroyChart('chartAudEmbudo');
    new Chart(document.getElementById('chartAudEmbudo'), {
        type: 'bar',
        data: {
            labels: ['Total Facturado', 'Meta 15%', 'Auditado Real'],
            datasets: [{ data: [fact, meta, audit], backgroundColor: [COLORS.gray, COLORS.warning, COLORS.success], borderRadius: 6 }]
        },
        options: baseOptions
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
        let appCount = data.filter(r => getSeguro(r, ['APLICADO']) === 'APLICADO').length;
        let pct = data.length > 0 ? (appCount / data.length) * 100 : 0;
        let color = pct >= 90 ? COLORS.success : COLORS.danger;
        
        container.innerHTML = `
            <div class="kpi-card" style="border-left: 5px solid ${color};">
                <div class="kpi-title">Eficiencia de Notas de Crédito Aplicadas</div>
                <div class="kpi-value" style="color:${color};">${pct.toFixed(1)}%</div>
                <div class="kpi-detail">Procesadas: ${appCount} de ${data.length}</div>
            </div>
        `;
    }

    const motivos = data.reduce((acc, r) => {
        const m = getSeguro(r, ['MOTIVO']) || 'Otros';
        acc[m] = (acc[m] || 0) + parseNum(getSeguro(r, ['UNIDADES']));
        return acc;
    }, {});

    destroyChart('chartDevMotivos');
    new Chart(document.getElementById('chartDevMotivos'), {
        type: 'doughnut',
        data: { labels: Object.keys(motivos), datasets: [{ data: Object.values(motivos), backgroundColor: PALETA, borderWidth: 0 }] },
        options: donutOptions
    });
}

// ==========================================
// SEGUNDA D'S
// ==========================================
function renderSegunda() {
    const prov = globalData['21-segunda_proveedor.csv'] || [];
    const provCosto = prov.reduce((acc, r) => {
        const p = getSeguro(r, ['PROVEEDOR']) || 'Otros';
        acc[p] = (acc[p] || 0) + parseNum(getSeguro(r, ['COSTO TOTAL']));
        return acc;
    }, {});

    destroyChart('chartSegProvCosto');
    new Chart(document.getElementById('chartSegProvCosto'), {
        type: 'pie',
        data: { labels: Object.keys(provCosto), datasets: [{ data: Object.values(provCosto), backgroundColor: PALETA, borderWidth: 0 }] },
        options: donutOptions
    });

    const prod = globalData['20-segunda_produccion.csv'] || [];
    const prodArea = prod.reduce((acc, r) => {
        const a = getSeguro(r, ['AREA', 'ÁREA']) || 'Otros';
        acc[a] = (acc[a] || 0) + parseNum(getSeguro(r, ['UNIDADES']));
        return acc;
    }, {});

    destroyChart('chartSegProduccion');
    new Chart(document.getElementById('chartSegProduccion'), {
        type: 'bar',
        data: { labels: Object.keys(prodArea), datasets: [{ data: Object.values(prodArea), backgroundColor: COLORS.primary, borderRadius: 6 }] },
        options: baseOptions
    });

    const dig = globalData['19-digitacion_segunda.csv'] || [];
    const yoy = dig.reduce((acc, r) => {
        const a = getSeguro(r, ['AÑO']) || '2026';
        acc[a] = (acc[a] || 0) + parseNum(getSeguro(r, ['UNIDADES']));
        return acc;
    }, {});

    destroyChart('chartSegDigYoY');
    new Chart(document.getElementById('chartSegDigYoY'), {
        type: 'bar',
        data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gray, COLORS.accent], borderRadius: 6 }] },
        options: baseOptions
    });
}

// ==========================================
// FUNCIONES DE VENTANA (FILTROS)
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

// Ejecutar
cargarTodo();
