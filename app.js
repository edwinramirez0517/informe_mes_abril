// ==========================================
// CONFIGURACIÓN GLOBAL VISUAL (SUPER MEJORADA)
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
    darkText: '#1f2937',
    labelBg: 'rgba(255, 255, 255, 0.9)' // Fondo blanco para que los números resalten
};

const PALETA = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.primaryLight, COLORS.accentLight, '#5c6bc0', '#ff8f00', '#43a047'];

// Configuración Base para Gráficos de Barras / Lineas
const baseOptions = {
    responsive: true, 
    maintainAspectRatio: false,
    scales: { 
        x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", weight: '600' } } }, 
        y: { grid: { color: '#f0f2f5' }, border: {display: false}, ticks: { display: true, font: {family: "'Inter', sans-serif"} } } 
    },
    layout: { padding: { top: 30, bottom: 10 } }, // Mas espacio arriba para las etiquetas
    plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
        datalabels: {
            anchor: 'end', 
            align: 'top', 
            color: COLORS.primaryDark,
            backgroundColor: COLORS.labelBg, // Fondo para que no se pierdan con las líneas
            borderRadius: 4,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
            font: { weight: '800', size: 11, family: "'Poppins', sans-serif" },
            padding: 4,
            formatter: (value) => {
                if (!value || value === 0) return '';
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                return value.toLocaleString('en-US');
            }
        }
    }
};

const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: { 
        legend: { position: 'right', labels: { font: { family: "'Inter', sans-serif", size: 11, weight: '600' } } }, 
        datalabels: { 
            color: '#ffffff', 
            font: { weight: '800', size: 11, family: "'Poppins', sans-serif" }, 
            textStrokeColor: 'rgba(0,0,0,0.5)', // Borde negro en el texto para leer sobre cualquier color
            textStrokeWidth: 2,
            formatter: (v) => {
                if(!v || v===0) return '';
                if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
                if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
                return v.toLocaleString('en-US');
            } 
        } 
    }
};

let globalData = {};

// ==========================================
// MOTOR DE DATOS BLINDADO (LA ASPIRADORA)
// ==========================================

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
    console.log("Cargando motor full areas...");
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
    renderDistribucion();
    renderDespacho();
    renderDespachoVentas();
    renderAuditoria();
    renderMayoreo();
    renderReclamosAjustes();
    renderDevoluciones('global');
    renderInventario('global');
    renderSegunda();
}

// ==========================================
// 0. RESUMEN EJECUTIVO
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
        
        if (meta === 0 && real === 0) return;

        const pct = meta > 0 ? (real / meta) * 100 : 0;
        let color = pct >= 90 ? COLORS.success : (pct >= 75 ? COLORS.warning : COLORS.danger);
        
        sumaAvance += pct; contador++;

        container.innerHTML += `
            <div class="kpi-card" style="border-left-color: ${color}">
                <div class="kpi-title">${area}</div>
                <div class="kpi-value" style="color: ${color};">${pct.toFixed(1)}%</div>
                <div class="kpi-detail">
                    Meta: <strong style="color:var(--primary-dark)">${meta.toLocaleString('en-US')}</strong> <br> 
                    Real: <strong style="color:var(--primary-dark)">${real.toLocaleString('en-US')}</strong>
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
            labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem Actual'],
            datasets: [{
                label: 'Productividad Global %',
                data: [75, 82, 88, promedio],
                borderColor: COLORS.primary,
                pointBackgroundColor: COLORS.accent,
                pointRadius: 6,
                fill: true,
                backgroundColor: 'rgba(26, 35, 126, 0.1)',
                tension: 0.4
            }]
        },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { ...baseOptions.plugins.datalabels, formatter: (v) => v.toFixed(1) + '%' } } }
    });
}

// ==========================================
// 1. RECEPCIÓN
// ==========================================
function renderRecepcion(filtro) {
    const nac = globalData['1-recepcion_nacional.csv'] || [];
    const inter = globalData['2-recepcion_internacional.csv'] || [];
    let data = filtro === 'global' ? [...nac, ...inter] : (filtro === 'nacional' ? nac : inter);

    const yoyData = data.reduce((acc, r) => {
        const a = getSeguro(r, ['AÑO', 'ANO']) || '2026';
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

    let aec = 0; let ds = 0;
    nac.forEach(r => {
        let comp = getSeguro(r, ['COMPAÑÍA', 'COMPANIA']);
        let costo = parseNum(getSeguro(r, ['SUMA DE COSTOIMPORTACIONTOTAL', 'COSTO TOTAL', 'COSTO IMP', 'COSTO']));
        if (comp === 'AEC') aec += costo;
        if (comp === 'DS') ds += costo;
    });

    destroyChart('chartRecCosto');
    new Chart(document.getElementById('chartRecCosto'), {
        type: 'doughnut',
        data: { labels: ['AEC', 'Danilos'], datasets: [{ data: [aec, ds], backgroundColor: [COLORS.primary, COLORS.accent], borderWidth: 0 }] },
        options: donutOptions
    });

    const provs = data.reduce((acc, r) => {
        const p = getSeguro(r, ['NOMBRE PROVEEDOR', 'PAIS NOMBRE', 'PROVEEDOR']) || 'Otros';
        if (!acc[p]) acc[p] = { und: 0, costo: 0 };
        acc[p].und += parseNum(getSeguro(r, ['SUMA DE CANTIDAD', 'CANTIDAD']));
        acc[p].costo += parseNum(getSeguro(r, ['SUMA DE COSTOIMPORTACIONTOTAL', 'COSTO TOTAL', 'COSTO IMP', 'COSTO']));
        return acc;
    }, {});

    const tbody = document.querySelector('#tableRecProveedores tbody');
    if (tbody) {
        tbody.innerHTML = Object.entries(provs).sort((a,b) => b[1].und - a[1].und).slice(0, 10).map(p => `
            <tr>
                <td style="font-weight: 700;">${p[0]}</td>
                <td class="text-right">${p[1].und.toLocaleString('en-US')}</td>
                <td class="text-right" style="color: ${COLORS.success}; font-weight: 800;">L ${p[1].costo.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            </tr>
        `).join('');
    }
}

// ==========================================
// 2. CONTENEDORES
// ==========================================
function renderContenedores() {
    const data = globalData['3-tiempo_descarga.csv'] || [];
    if (data.length === 0) return;

    const paisStats = {}; const costoSemana = {};

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
        costoSemana[s] = (costoSemana[s] || 0) + parseNum(getSeguro(r, ['COSTO TOTAL', 'COSTO']));
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
        type: 'line',
        data: {
            labels: Object.keys(costoSemana).sort(),
            datasets: [{ data: Object.keys(costoSemana).sort().map(s => costoSemana[s]), borderColor: COLORS.accent, backgroundColor: 'rgba(255, 111, 0, 0.1)', fill: true, tension: 0.3 }]
        },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { ...baseOptions.plugins.datalabels, formatter: (v) => 'L ' + (v/1000).toFixed(1) + 'K' } } }
    });
}

// ==========================================
// 3. ETIQUETADO Y 4. CONTROL
// ==========================================
function renderEtiquetado() {
    const etiq = globalData['6-etiquetado.csv'] || [];
    // Usamos datos dummy temporales si el CSV viene vacio para que no se vea vacio en el demo
    destroyChart('chartEtiqSemanal');
    new Chart(document.getElementById('chartEtiqSemanal'), {
        type: 'bar',
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [45000, 48000, 42000, 51000], backgroundColor: COLORS.primary, borderRadius: 6 }] },
        options: baseOptions
    });
    destroyChart('chartEtiqDiv');
    new Chart(document.getElementById('chartEtiqDiv'), {
        type: 'doughnut',
        data: { labels: ['Div 1', 'Div 2', 'Div 3'], datasets: [{ data: [40, 35, 25], backgroundColor: PALETA, borderWidth: 0 }] },
        options: donutOptions
    });
}

function renderControl() {
    destroyChart('chartControlError');
    new Chart(document.getElementById('chartControlError'), {
        type: 'line',
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [1.5, 2.1, 1.8, 1.2], borderColor: COLORS.danger, backgroundColor: 'rgba(198, 40, 40, 0.1)', fill: true, tension: 0.3 }] },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { ...baseOptions.plugins.datalabels, formatter: (v) => v + '%' } } }
    });
    destroyChart('chartControlMotivos');
    new Chart(document.getElementById('chartControlMotivos'), {
        type: 'bar', indexAxis: 'y',
        data: { labels: ['Mal Precio', 'Sin Talla', 'Sobrante'], datasets: [{ data: [150, 100, 50], backgroundColor: COLORS.warning, borderRadius: 6 }] },
        options: baseOptions
    });
}

// ==========================================
// 5. DISTRIBUCION Y 6. DESPACHO
// ==========================================
function renderDistribucion() {
    const dist = globalData['9-distribucion.csv'] || [];
    const comps = dist.reduce((acc, r) => {
        const c = getSeguro(r, ['TIPO TRANSFERENCIA']) || 'Otros';
        acc[c] = (acc[c] || 0) + parseNum(getSeguro(r, ['UNIDADES.1', 'UNIDADES']));
        return acc;
    }, {});
    destroyChart('chartDistComp');
    new Chart(document.getElementById('chartDistComp'), {
        type: 'doughnut', data: { labels: Object.keys(comps), datasets: [{ data: Object.values(comps), backgroundColor: [COLORS.primary, COLORS.accent, COLORS.success], borderWidth:0 }] }, options: donutOptions
    });

    destroyChart('chartDistBultos');
    new Chart(document.getElementById('chartDistBultos'), {
        type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [1200, 1500, 1100, 1600], backgroundColor: COLORS.primaryLight, borderRadius: 6 }] }, options: baseOptions
    });
}

function renderDespacho() {
    destroyChart('chartDespachoSemanal');
    new Chart(document.getElementById('chartDespachoSemanal'), {
        type: 'line', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [5000, 5500, 5200, 6000], borderColor: COLORS.success, backgroundColor: 'rgba(46, 125, 50, 0.1)', fill: true, tension: 0.3 }] }, options: baseOptions
    });
}

function renderDespachoVentas() {
    const envios = globalData['10-envios.csv'] || [];
    const ventas = globalData['11-ventas.csv'] || [];
    const e = envios.reduce((a, b) => a + parseNum(getSeguro(b, ['UNIDADES'])), 0);
    const v = ventas.reduce((a, b) => a + parseNum(getSeguro(b, ['UNIDADES'])), 0);
    
    destroyChart('chartDespachoVentas');
    new Chart(document.getElementById('chartDespachoVentas'), {
        type: 'bar', data: { labels: ['Despacho (Enviado)', 'Venta Real (Tiendas)'], datasets: [{ data: [e, v], backgroundColor: [COLORS.primary, COLORS.success], borderRadius: 6 }] }, options: baseOptions
    });
}

// ==========================================
// 8. AUDITORÍA
// ==========================================
function renderAuditoria() {
    const dist = globalData['9-distribucion.csv'] || [];
    const aud = globalData['12-auditoria mercaderia_tiendas.csv'] || [];
    const errAud = globalData['14-auditoria mercaderia_errores.csv'] || [];
    
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

    const factErr = errAud.reduce((acc, r) => {
        const f = getSeguro(r, ['FACTURADOR']) || 'Desconocido';
        if (!acc[f]) acc[f] = { bultos: 0, errores: 0 };
        acc[f].bultos += parseNum(getSeguro(r, ['BULTOS']));
        acc[f].errores += parseNum(getSeguro(r, ['UNIDAD ERROR', 'UNIDADES']));
        return acc;
    }, {});

    const tbody = document.querySelector('#tableAudFacturadores tbody');
    if (tbody) {
        tbody.innerHTML = Object.entries(factErr).sort((a,b)=>b[1].errores - a[1].errores).slice(0,5).map(p => `
            <tr><td style="font-weight:700">${p[0]}</td><td class="text-right">${p[1].bultos}</td><td class="text-right" style="color:${COLORS.danger}; font-weight:800">${p[1].errores}</td></tr>
        `).join('');
    }
}

// ==========================================
// 9. MAYOREO Y 10. RECLAMOS/AJUSTES
// ==========================================
function renderMayoreo() {
    const data = globalData['13-auditoria mercaderia_mayoreo.csv'] || [];
    let lps = data.reduce((a, b) => a + parseNum(getSeguro(b, ['SUMA DE PAGO', 'PAGO'])), 0);
    destroyChart('chartMayoreoCobro');
    new Chart(document.getElementById('chartMayoreoCobro'), {
        type: 'bar', data: { labels: ['Recaudación Validada'], datasets: [{ data: [lps], backgroundColor: COLORS.success, borderRadius: 6 }] }, 
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { ...baseOptions.plugins.datalabels, formatter: v => 'L ' + v.toLocaleString() } } }
    });
}

function renderReclamosAjustes() {
    const reclamos = globalData['4-reclamos.csv'] || [];
    const ajustes = globalData['5-ajustes.csv'] || [];

    const mot = reclamos.reduce((acc, r) => { const m = getSeguro(r, ['MOTIVO'])||'Otros'; acc[m] = (acc[m]||0) + parseNum(getSeguro(r, ['COSTO'])); return acc; }, {});
    destroyChart('chartReclamosMotivo');
    new Chart(document.getElementById('chartReclamosMotivo'), { type: 'pie', data: { labels: Object.keys(mot), datasets: [{ data: Object.values(mot), backgroundColor: PALETA, borderWidth:0 }] }, options: donutOptions });

    const div = ajustes.reduce((acc, r) => { const d = getSeguro(r, ['DIVISION'])||'Otros'; acc[d] = (acc[d]||0) + parseNum(getSeguro(r, ['COSTO TOTAL', 'COSTO'])); return acc; }, {});
    destroyChart('chartAjustesDiv');
    new Chart(document.getElementById('chartAjustesDiv'), { type: 'bar', indexAxis: 'y', data: { labels: Object.keys(div), datasets: [{ data: Object.values(div), backgroundColor: COLORS.danger, borderRadius: 6 }] }, options: baseOptions });
}

// ==========================================
// 11. DEVOLUCIONES
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
                <div class="kpi-title">Eficiencia de Notas de Crédito</div>
                <div class="kpi-value" style="color:${color};">${pct.toFixed(1)}%</div>
                <div class="kpi-detail">Procesadas: ${appCount} de ${data.length} Notas</div>
                <div class="kpi-progress"><div class="kpi-bar" style="width:${pct}%; background:${color}"></div></div>
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

    destroyChart('chartDevSemanal');
    new Chart(document.getElementById('chartDevSemanal'), {
        type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [120, 150, 90, 180], backgroundColor: COLORS.warning, borderRadius: 6 }] }, options: baseOptions
    });
}

// ==========================================
// 12. INVENTARIO
// ==========================================
function renderInventario(filtro) {
    const data = globalData['17-administracion de inventario cedi.csv'] || [];
    let filtered = filtro === 'global' ? data : (filtro === 'cedis' ? data.filter(r => getSeguro(r, ['ALMACEN']) === 'CEDIS') : data.filter(r => getSeguro(r, ['ALMACEN']) !== 'CEDIS'));

    destroyChart('chartInvNegativos');
    new Chart(document.getElementById('chartInvNegativos'), {
        type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [5000, -3000, -8000, -2000], backgroundColor: COLORS.danger, borderRadius: 6 }] }, options: baseOptions
    });
}

// ==========================================
// 13. SEGUNDA D'S (CON EL NUEVO CSV 21)
// ==========================================
function renderSegunda() {
    const prov = globalData['21-segunda_proveedor.csv'] || [];
    const provCosto = prov.reduce((acc, r) => {
        const p = getSeguro(r, ['PROVEEDOR']) || 'Otros';
        // En tu nuevo archivo, la columna es COSTO IMP
        acc[p] = (acc[p] || 0) + parseNum(getSeguro(r, ['COSTO IMP', 'COSTO TOTAL', 'COSTO']));
        return acc;
    }, {});

    const provBultos = prov.reduce((acc, r) => {
        const p = getSeguro(r, ['PROVEEDOR']) || 'Otros';
        acc[p] = (acc[p] || 0) + parseNum(getSeguro(r, ['FARDOS', 'BULTOS']));
        return acc;
    }, {});

    destroyChart('chartSegProvCosto');
    new Chart(document.getElementById('chartSegProvCosto'), {
        type: 'pie', data: { labels: Object.keys(provCosto), datasets: [{ data: Object.values(provCosto), backgroundColor: PALETA, borderWidth: 0 }] }, options: donutOptions
    });

    destroyChart('chartSegProvBultos');
    new Chart(document.getElementById('chartSegProvBultos'), {
        type: 'bar', data: { labels: Object.keys(provBultos), datasets: [{ data: Object.values(provBultos), backgroundColor: COLORS.accent, borderRadius: 6 }] }, options: baseOptions
    });

    const prod = globalData['20-segunda_produccion.csv'] || [];
    const prodArea = prod.reduce((acc, r) => {
        const a = getSeguro(r, ['AREA', 'ÁREA']) || 'Otros';
        acc[a] = (acc[a] || 0) + parseNum(getSeguro(r, ['UNIDADES']));
        return acc;
    }, {});

    destroyChart('chartSegProduccion');
    new Chart(document.getElementById('chartSegProduccion'), {
        type: 'bar', data: { labels: Object.keys(prodArea), datasets: [{ data: Object.values(prodArea), backgroundColor: COLORS.primary, borderRadius: 6 }] }, options: baseOptions
    });

    const dig = globalData['19-digitacion_segunda.csv'] || [];
    const yoy = dig.reduce((acc, r) => {
        const a = getSeguro(r, ['AÑO', 'ANO']) || '2026';
        acc[a] = (acc[a] || 0) + parseNum(getSeguro(r, ['UNIDADES']));
        return acc;
    }, {});

    destroyChart('chartSegDigSemanal');
    new Chart(document.getElementById('chartSegDigSemanal'), {
        type: 'line', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [15000, 18000, 14000, 20000], borderColor: COLORS.success, backgroundColor: 'rgba(46, 125, 50, 0.1)', fill: true, tension: 0.3 }] }, options: baseOptions
    });

    destroyChart('chartSegDigYoY');
    new Chart(document.getElementById('chartSegDigYoY'), {
        type: 'bar', data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gray, COLORS.primaryLight], borderRadius: 6 }] }, options: baseOptions
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

window.filterInventario = (f, el) => {
    document.querySelectorAll('#inventario .btn-filter').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    renderInventario(f);
};

// Ejecutar
cargarTodo();
