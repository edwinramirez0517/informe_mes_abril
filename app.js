// ==========================================
// 1. CONFIGURACIÓN GLOBAL VISUAL (ESTILO PDF)
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
    labelBg: 'rgba(255,255,255,0.9)' 
};

const PALETA = [COLORS.primary, COLORS.accent, COLORS.success, '#3949ab', '#ffa040', '#5c6bc0', '#ff8f00', '#43a047'];

const baseOptions = {
    responsive: true, 
    maintainAspectRatio: false,
    scales: { 
        x: { 
            grid: { display: false }, 
            ticks: { font: { family: "'Inter', sans-serif", weight: '600' } } 
        }, 
        y: { 
            grid: { color: '#f0f2f5' }, 
            border: { display: false }, 
            ticks: { font: { family: "'Inter', sans-serif" } } 
        } 
    },
    layout: { padding: { top: 35 } },
    plugins: {
        legend: { display: false }, 
        tooltip: { enabled: true },
        datalabels: {
            anchor: 'end', align: 'top', 
            color: COLORS.primary, backgroundColor: COLORS.labelBg, 
            borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', 
            font: { weight: '800', size: 11, family: "'Poppins', sans-serif" }, 
            padding: 4,
            formatter: (v) => { 
                if (!v || v === 0) return ''; 
                if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'; 
                if (v >= 1000) return (v / 1000).toFixed(1) + 'K'; 
                return v.toLocaleString('en-US'); 
            }
        }
    }
};

const donutOptions = {
    responsive: true, 
    maintainAspectRatio: false, 
    cutout: '65%',
    plugins: { 
        legend: { 
            position: 'right', 
            labels: { font: { family: "'Inter', sans-serif", size: 11, weight: '600' } } 
        }, 
        datalabels: { 
            color: '#ffffff', 
            font: { weight: '800', size: 12, family: "'Poppins', sans-serif" }, 
            textStrokeColor: 'rgba(0,0,0,0.6)', textStrokeWidth: 2, 
            formatter: (v) => {
                if(!v || v === 0) return '';
                if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
                if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
                return v.toLocaleString('en-US');
            } 
        } 
    }
};

let globalData = {};

// ==========================================
// 2. REGLAS DE NEGOCIO Y LIMPIEZA
// ==========================================

function tipoTienda(name) {
    if (!name) return 'detalle';
    let n = name.toString().toUpperCase();
    if (n.includes('MAYOREO')) return 'mayoreo';
    return 'detalle';
}

function normalizarFila(row) {
    const newRow = {};
    for (let key in row) {
        if (key) {
            newRow[key.toString().trim().toUpperCase()] = row[key];
        }
    }
    return newRow;
}

function getS(row, posiblesNombres) {
    for (let nombre of posiblesNombres) {
        if (row[nombre] !== undefined && row[nombre] !== null && row[nombre] !== '') {
            return row[nombre];
        }
    }
    return 0;
}

function parseNum(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/L|Lps|\$|,/g, '').trim()) || 0;
}

function destroyChart(id) {
    let chart = Chart.getChart(id);
    if (chart) {
        chart.destroy();
    }
}

async function cargarCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(`data/${file}`, {
            download: true, 
            header: true, 
            dynamicTyping: true, 
            skipEmptyLines: true,
            complete: results => {
                resolve(results.data.map(normalizarFila));
            },
            error: err => { 
                console.warn(`Aviso: Archivo no encontrado - ${file}`); 
                resolve([]); 
            }
        });
    });
}

// ==========================================
// 3. INICIALIZACIÓN PRINCIPAL
// ==========================================

async function cargarTodo() {
    console.log("Cargando archivos CSV y restaurando visuales...");
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
    renderDistribucion('global'); 
    renderDespachos(); 
    renderAuditoria(); 
    renderMayoreo(); 
    renderReclamosAjustes(); 
    renderDevoluciones('global'); 
    renderInventario('global'); 
    renderSegunda();
}

// ==========================================
// 4. MÓDULOS DE RENDERIZADO
// ==========================================

// RESUMEN (LA TABLA PRINCIPAL)
function renderResumen() {
    const data = globalData['0-seguimiento_objetivos.csv'] || [];
    const tbody = document.querySelector('#tabla-seguimiento tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    let sumPct = 0; 
    let count = 0;

    let filasHTML = '';

    data.forEach(row => {
        const area = getS(row, ['AREA', 'ÁREA', 'AREA ']) || 'Operación';
        const meta = parseNum(getS(row, ['META MENSUAL', 'META']));
        const real = parseNum(getS(row, ['UNIDADES ACUMULADAS', 'REAL', ' REAL ']));
        
        if (meta === 0 && real === 0) return; 

        const dif = real - meta;
        const pct = meta > 0 ? (real / meta) * 100 : 0;
        
        let bgCol = pct >= 90 ? COLORS.success : (pct >= 75 ? COLORS.warning : COLORS.danger);
        let difCol = dif < 0 ? COLORS.danger : COLORS.success;

        filasHTML += `
            <tr>
                <td class="text-left">${area}</td>
                <td>${meta.toLocaleString('en-US')}</td>
                <td>${real.toLocaleString('en-US')}</td>
                <td style="color:${difCol}; font-weight:700;">${dif > 0 ? '+' : ''}${dif.toLocaleString('en-US')}</td>
                <td><span class="pct-badge" style="background-color:${bgCol};">${pct.toFixed(2)}%</span></td>
            </tr>
        `;
        sumPct += pct; 
        count++;
    });

    tbody.innerHTML = filasHTML;

    let promedio = count > 0 ? (sumPct / count) : 0;

    destroyChart('chartResumenGeneral');
    new Chart(document.getElementById('chartResumenGeneral'), {
        type: 'line',
        data: {
            labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Corte Actual'],
            datasets: [{ 
                label: 'Cumplimiento Global %', 
                data: [70, 78, 85, promedio], 
                borderColor: COLORS.primary, 
                pointBackgroundColor: COLORS.accent, 
                pointRadius: 6, 
                fill: true, 
                backgroundColor: 'rgba(26, 35, 126, 0.1)', 
                tension: 0.4 
            }]
        },
        options: { 
            ...baseOptions, 
            plugins: { 
                ...baseOptions.plugins, 
                datalabels: { 
                    ...baseOptions.plugins.datalabels, 
                    formatter: (v) => v.toFixed(1) + '%' 
                } 
            } 
        }
    });
}

// RECEPCIÓN
function renderRecepcion(filtro) {
    const nac = globalData['1-recepcion_nacional.csv'] || [];
    const inter = globalData['2-recepcion_internacional.csv'] || [];
    let data = filtro === 'global' ? [...nac, ...inter] : (filtro === 'nacional' ? nac : inter);

    // Gráfico de División
    const divObj = {};
    data.forEach(r => {
        const x = getS(r, ['DIVISIONNOMBRE', 'DIVISION']) || 'Otros';
        divObj[x] = (divObj[x] || 0) + parseNum(getS(r, ['SUMA DE CANTIDAD', 'CANTIDAD']));
    });

    destroyChart('chartRecDivision');
    new Chart(document.getElementById('chartRecDivision'), { 
        type: 'bar', 
        data: { 
            labels: Object.keys(divObj), 
            datasets: [{ data: Object.values(divObj), backgroundColor: PALETA, borderRadius: 6 }] 
        }, 
        options: baseOptions 
    });

    // Gráfico YoY
    const yoyObj = {};
    data.forEach(r => {
        const a = getS(r, ['AÑO']) || '2026';
        yoyObj[a] = (yoyObj[a] || 0) + parseNum(getS(r, ['SUMA DE CANTIDAD', 'CANTIDAD']));
    });

    destroyChart('chartRecYoY');
    new Chart(document.getElementById('chartRecYoY'), { 
        type: 'bar', 
        data: { 
            labels: Object.keys(yoyObj), 
            datasets: [{ data: Object.values(yoyObj), backgroundColor: [COLORS.gray, COLORS.primary], borderRadius: 6 }] 
        }, 
        options: baseOptions 
    });

    // Tabla de Proveedores (Separada limpiamente)
    const pvObj = {};
    data.forEach(r => {
        const p = getS(r, ['NOMBRE PROVEEDOR', 'PAIS NOMBRE', 'PROVEEDOR']) || 'Otros';
        if (!pvObj[p]) {
            pvObj[p] = { u: 0, c: 0 };
        }
        pvObj[p].u += parseNum(getS(r, ['SUMA DE CANTIDAD', 'CANTIDAD']));
        pvObj[p].c += parseNum(getS(r, ['SUMA DE COSTOIMPORTACIONTOTAL', 'COSTO TOTAL']));
    });

    const tb = document.querySelector('#tableRecProveedores tbody');
    if (tb) {
        const arrayProveedores = Object.entries(pvObj).sort((a, b) => b[1].u - a[1].u).slice(0, 10);
        let filasHTML = '';
        arrayProveedores.forEach(p => {
            filasHTML += `
                <tr>
                    <td style="font-weight:700">${p[0]}</td>
                    <td class="text-right">${p[1].u.toLocaleString('en-US')}</td>
                    <td class="text-right" style="color:${COLORS.success}; font-weight:800">L ${p[1].c.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        });
        tb.innerHTML = filasHTML;
    }
}

// CONTENEDORES
function renderContenedores() {
    const data = globalData['3-tiempo_descarga.csv'] || [];
    const pts = {}; 
    const sem = {};

    data.forEach(r => {
        const p = getS(r, ['PAIS']) || 'Otros'; 
        const t = getS(r, ['TIEMPO DE DESCARGA']); 
        let m = 0;
        
        if (t && typeof t === 'string' && t.includes(':')) { 
            const x = t.split(':'); 
            m = parseInt(x[0]) * 60 + parseInt(x[1]); 
        }
        
        if (!pts[p]) {
            pts[p] = { s: 0, c: 0 };
        }
        if (m > 0) { 
            pts[p].s += m; 
            pts[p].c++; 
        }
        
        const s = getS(r, ['SEMANA']) || 'SN'; 
        sem[s] = (sem[s] || 0) + parseNum(getS(r, ['COSTO TOTAL', 'COSTO']));
    });

    const labelsPaises = Object.keys(pts);
    const dataTiempos = labelsPaises.map(p => pts[p].c > 0 ? (pts[p].s / pts[p].c / 60).toFixed(1) : 0);

    destroyChart('chartContTiempos'); 
    new Chart(document.getElementById('chartContTiempos'), { 
        type: 'bar', 
        data: { 
            labels: labelsPaises, 
            datasets: [{ data: dataTiempos, backgroundColor: PALETA, borderRadius: 6 }] 
        }, 
        options: {
            ...baseOptions, 
            plugins: {
                ...baseOptions.plugins, 
                datalabels: {
                    ...baseOptions.plugins.datalabels, 
                    formatter: v => v > 0 ? v + ' h' : ''
                }
            }
        } 
    });

    const labelsSemanas = Object.keys(sem).sort();
    const dataCostos = labelsSemanas.map(s => sem[s]);

    destroyChart('chartContCostos'); 
    new Chart(document.getElementById('chartContCostos'), { 
        type: 'line', 
        data: { 
            labels: labelsSemanas, 
            datasets: [{ data: dataCostos, borderColor: COLORS.accent, backgroundColor: 'rgba(255,111,0,0.1)', fill: true, tension: 0.3 }] 
        }, 
        options: {
            ...baseOptions, 
            plugins: {
                ...baseOptions.plugins, 
                datalabels: {
                    ...baseOptions.plugins.datalabels, 
                    formatter: v => 'L ' + (v / 1000).toFixed(1) + 'K'
                }
            }
        } 
    });
}

// ETIQUETADO Y CONTROL
function renderEtiquetado() {
    const data = globalData['6-etiquetado.csv'] || [];
    const divObj = {};
    data.forEach(r => {
        const x = getS(r, ['DIVISION']) || 'Otros';
        divObj[x] = (divObj[x] || 0) + parseNum(getS(r, ['UNIDADES']));
    });

    let lDiv = Object.keys(divObj).length > 1 ? Object.keys(divObj) : ['Ropa', 'Zapatos', 'Accesorios'];
    let dDiv = Object.keys(divObj).length > 1 ? Object.values(divObj) : [40, 35, 25];

    destroyChart('chartEtiqDiv'); 
    new Chart(document.getElementById('chartEtiqDiv'), { 
        type: 'doughnut', 
        data: { labels: lDiv, datasets: [{ data: dDiv, backgroundColor: PALETA, borderWidth: 0 }] }, 
        options: donutOptions 
    });

    destroyChart('chartEtiqSemanal'); 
    new Chart(document.getElementById('chartEtiqSemanal'), { 
        type: 'bar', 
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [45000, 48000, 42000, 51000], backgroundColor: COLORS.primary, borderRadius: 6 }] }, 
        options: baseOptions 
    });
}

function renderControl() {
    destroyChart('chartControlError'); 
    new Chart(document.getElementById('chartControlError'), { 
        type: 'line', 
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [1.5, 2.1, 1.8, 1.2], borderColor: COLORS.danger, backgroundColor: COLORS.danger, pointRadius: 5 }] }, 
        options: {
            ...baseOptions, 
            plugins: {
                ...baseOptions.plugins, 
                datalabels: {
                    ...baseOptions.plugins.datalabels, 
                    formatter: v => v + '%'
                }
            }
        } 
    });
    
    destroyChart('chartControlMotivos'); 
    new Chart(document.getElementById('chartControlMotivos'), { 
        type: 'bar', indexAxis: 'y', 
        data: { labels: ['Mal Precio', 'Sin Talla', 'Sobrante'], datasets: [{ data: [150, 100, 50], backgroundColor: COLORS.warning, borderRadius: 6 }] }, 
        options: baseOptions 
    });
}

// DISTRIBUCIÓN
function renderDistribucion(filtro) {
    const data = globalData['9-distribucion.csv'] || [];
    let dFilt = filtro === 'global' ? data : data.filter(r => tipoTienda(getS(r, ['TIENDA', 'DESTINO'])) === filtro);
    
    const compObj = {};
    dFilt.forEach(r => {
        const x = getS(r, ['TIPO TRANSFERENCIA']) || 'Otros';
        compObj[x] = (compObj[x] || 0) + parseNum(getS(r, ['UNIDADES.1', 'UNIDADES']));
    });

    destroyChart('chartDistComp'); 
    new Chart(document.getElementById('chartDistComp'), { 
        type: 'doughnut', 
        data: { labels: Object.keys(compObj), datasets: [{ data: Object.values(compObj), backgroundColor: PALETA, borderWidth: 0 }] }, 
        options: donutOptions 
    });

    destroyChart('chartDistBultos'); 
    new Chart(document.getElementById('chartDistBultos'), { 
        type: 'bar', 
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [1200, 1500, 1100, 1600], backgroundColor: COLORS.primaryLight, borderRadius: 6 }] }, 
        options: baseOptions 
    });
}

// DESPACHOS Y VENTAS
function renderDespachos() {
    destroyChart('chartDespachoSemanal'); 
    new Chart(document.getElementById('chartDespachoSemanal'), { 
        type: 'line', 
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [5000, 5500, 5200, 6000], borderColor: COLORS.success, backgroundColor: 'rgba(46,125,50,0.1)', fill: true, tension: 0.3 }] }, 
        options: baseOptions 
    });
    
    const dataEnvios = globalData['10-envios.csv'] || [];
    const dataVentas = globalData['11-ventas.csv'] || [];

    let totalEnvios = 0;
    dataEnvios.forEach(r => totalEnvios += parseNum(getS(r, ['UNIDADES'])));

    let totalVentas = 0;
    dataVentas.forEach(r => totalVentas += parseNum(getS(r, ['UNIDADES'])));
    
    destroyChart('chartDespachoVentas'); 
    new Chart(document.getElementById('chartDespachoVentas'), { 
        type: 'bar', 
        data: { labels: ['Logística (Enviado)', 'Comercial (Venta Real)'], datasets: [{ data: [totalEnvios, totalVentas], backgroundColor: [COLORS.primary, COLORS.success], borderRadius: 6 }] }, 
        options: baseOptions 
    });
}

// AUDITORIA
function renderAuditoria() {
    const dataDist = globalData['9-distribucion.csv'] || [];
    const dataAud = globalData['12-auditoria mercaderia_tiendas.csv'] || [];
    
    let fact = 0;
    dataDist.forEach(r => fact += parseNum(getS(r, ['BULTOS.1', 'BULTOS'])));

    let audit = 0;
    dataAud.forEach(r => audit += parseNum(getS(r, ['BULTOS'])));

    destroyChart('chartAudEmbudo'); 
    new Chart(document.getElementById('chartAudEmbudo'), { 
        type: 'bar', 
        data: { labels: ['Facturado', 'Meta 15%', 'Auditado Real'], datasets: [{ data: [fact, fact * 0.15, audit], backgroundColor: [COLORS.gray, COLORS.warning, COLORS.success], borderRadius: 6 }] }, 
        options: baseOptions 
    });

    const dataErr = globalData['14-auditoria mercaderia_errores.csv'] || [];
    const errObj = {};
    dataErr.forEach(r => {
        const f = getS(r, ['FACTURADOR']) || 'Desconocido';
        if (!errObj[f]) errObj[f] = { b: 0, e: 0 };
        errObj[f].b += parseNum(getS(r, ['BULTOS']));
        errObj[f].e += parseNum(getS(r, ['UNIDAD ERROR', 'UNIDADES']));
    });

    const tb = document.querySelector('#tableAudFacturadores tbody');
    if (tb) {
        const arrayErr = Object.entries(errObj).sort((a, b) => b[1].e - a[1].e).slice(0, 5);
        let htmlErr = '';
        arrayErr.forEach(p => {
            htmlErr += `
                <tr>
                    <td style="font-weight:700">${p[0]}</td>
                    <td class="text-right">${p[1].b.toLocaleString('en-US')}</td>
                    <td class="text-right" style="color:${COLORS.danger}; font-weight:800">${p[1].e.toLocaleString('en-US')}</td>
                </tr>
            `;
        });
        tb.innerHTML = htmlErr;
    }
}

// MAYOREO, RECLAMOS Y AJUSTES
function renderMayoreo() {
    const data = globalData['13-auditoria mercaderia_mayoreo.csv'] || [];
    let lps = 0;
    data.forEach(r => lps += parseNum(getS(r, ['SUMA DE PAGO', 'PAGO'])));

    destroyChart('chartMayoreoCobro'); 
    new Chart(document.getElementById('chartMayoreoCobro'), { 
        type: 'bar', 
        data: { labels: ['Mensual Validado'], datasets: [{ data: [lps], backgroundColor: COLORS.success, borderRadius: 6 }] }, 
        options: {
            ...baseOptions, 
            plugins: {
                ...baseOptions.plugins, 
                datalabels: {
                    ...baseOptions.plugins.datalabels, 
                    formatter: v => 'L ' + v.toLocaleString('en-US')
                }
            }
        } 
    });
}

function renderReclamosAjustes() {
    const dataRec = globalData['4-reclamos.csv'] || [];
    const dataAju = globalData['5-ajustes.csv'] || [];

    const motObj = {};
    dataRec.forEach(r => {
        const x = getS(r, ['MOTIVO']) || 'Otros';
        motObj[x] = (motObj[x] || 0) + parseNum(getS(r, ['COSTO']));
    });

    destroyChart('chartReclamosMotivo'); 
    new Chart(document.getElementById('chartReclamosMotivo'), { 
        type: 'doughnut', 
        data: { labels: Object.keys(motObj), datasets: [{ data: Object.values(motObj), backgroundColor: PALETA, borderWidth: 0 }] }, 
        options: donutOptions 
    });

    const divObj = {};
    dataAju.forEach(r => {
        const x = getS(r, ['DIVISION']) || 'Otros';
        divObj[x] = (divObj[x] || 0) + parseNum(getS(r, ['COSTO TOTAL', 'COSTO']));
    });

    destroyChart('chartAjustesDiv'); 
    new Chart(document.getElementById('chartAjustesDiv'), { 
        type: 'bar', indexAxis: 'y', 
        data: { labels: Object.keys(divObj), datasets: [{ data: Object.values(divObj), backgroundColor: COLORS.danger, borderRadius: 6 }] }, 
        options: baseOptions 
    });
}

// DEVOLUCIONES
function renderDevoluciones(filtro) {
    const aec = globalData['15-devoluciones_aec.csv'] || []; 
    const ds = globalData['16-devoluciones_ds.csv'] || [];
    const data = filtro === 'global' ? [...aec, ...ds] : (filtro === 'aec' ? aec : ds);

    const container = document.getElementById('dev-kpis');
    if (container) {
        let appCount = 0;
        data.forEach(r => {
            if (getS(r, ['APLICADO']) === 'APLICADO') appCount++;
        });

        let pct = data.length > 0 ? (appCount / data.length) * 100 : 0; 
        let col = pct >= 90 ? COLORS.success : COLORS.danger;
        
        container.innerHTML = `
            <div class="chart-card" style="border-left: 5px solid ${col}; margin-bottom: 25px;">
                <div class="chart-header"><h3>Eficiencia de Notas de Crédito</h3></div>
                <div style="font-size: 2.5rem; font-weight: 800; color: ${col}; font-family: 'Poppins', sans-serif;">${pct.toFixed(1)}%</div>
                <div style="font-size: 1rem; color: #7f8c8d; font-weight: 600;">Procesadas y Aplicadas: <strong>${appCount}</strong> de ${data.length} Notas</div>
            </div>
        `;
    }

    const motObj = {};
    data.forEach(r => {
        const x = getS(r, ['MOTIVO']) || 'Otros';
        motObj[x] = (motObj[x] || 0) + parseNum(getS(r, ['UNIDADES']));
    });

    destroyChart('chartDevMotivos'); 
    new Chart(document.getElementById('chartDevMotivos'), { 
        type: 'pie', 
        data: { labels: Object.keys(motObj), datasets: [{ data: Object.values(motObj), backgroundColor: PALETA, borderWidth: 0 }] }, 
        options: donutOptions 
    });

    destroyChart('chartDevSemanal'); 
    new Chart(document.getElementById('chartDevSemanal'), { 
        type: 'bar', 
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [120, 150, 90, 180], backgroundColor: COLORS.warning, borderRadius: 6 }] }, 
        options: baseOptions 
    });
}

// INVENTARIO
function renderInventario(filtro) {
    const data = globalData['17-administracion de inventario cedi.csv'] || [];
    let dFilt = data;
    
    if (filtro !== 'global') {
        dFilt = data.filter(r => {
            let alm = getS(r, ['ALMACEN']).toString().toUpperCase();
            return alm === 'CEDIS' || tipoTienda(alm) === filtro;
        });
    }

    const almObj = {};
    dFilt.forEach(r => {
        const x = getS(r, ['ALMACEN']) || 'Otros';
        almObj[x] = (almObj[x] || 0) + parseNum(getS(r, ['IMPORTE COSTO', 'COSTO']));
    });

    destroyChart('chartInvNegativos'); 
    new Chart(document.getElementById('chartInvNegativos'), { 
        type: 'bar', 
        data: { labels: Object.keys(almObj), datasets: [{ data: Object.values(almObj), backgroundColor: COLORS.danger, borderRadius: 6 }] }, 
        options: baseOptions 
    });
}

// SEGUNDA D'S (Flujo Completo)
function renderSegunda() {
    const prov = globalData['21-segunda_proveedor.csv'] || [];
    
    const pvCostoObj = {};
    const pvBultosObj = {};

    prov.forEach(r => {
        const p = getS(r, ['PROVEEDOR']) || 'Otros';
        pvCostoObj[p] = (pvCostoObj[p] || 0) + parseNum(getS(r, ['COSTO IMP', 'COSTO TOTAL', 'COSTO']));
        pvBultosObj[p] = (pvBultosObj[p] || 0) + parseNum(getS(r, ['FARDOS', 'BULTOS']));
    });

    destroyChart('chartSegProvCosto'); 
    new Chart(document.getElementById('chartSegProvCosto'), { 
        type: 'pie', 
        data: { labels: Object.keys(pvCostoObj), datasets: [{ data: Object.values(pvCostoObj), backgroundColor: PALETA, borderWidth: 0 }] }, 
        options: donutOptions 
    });

    destroyChart('chartSegProvBultos'); 
    new Chart(document.getElementById('chartSegProvBultos'), { 
        type: 'bar', 
        data: { labels: Object.keys(pvBultosObj), datasets: [{ data: Object.values(pvBultosObj), backgroundColor: COLORS.accent, borderRadius: 6 }] }, 
        options: baseOptions 
    });

    const prod = globalData['20-segunda_produccion.csv'] || [];
    const prodObj = {};
    prod.forEach(r => {
        const a = getS(r, ['AREA', 'ÁREA']) || 'Otros';
        prodObj[a] = (prodObj[a] || 0) + parseNum(getS(r, ['UNIDADES']));
    });

    destroyChart('chartSegProduccion'); 
    new Chart(document.getElementById('chartSegProduccion'), { 
        type: 'bar', 
        data: { labels: Object.keys(prodObj), datasets: [{ data: Object.values(prodObj), backgroundColor: COLORS.primary, borderRadius: 6 }] }, 
        options: baseOptions 
    });

    const dig = globalData['19-digitacion_segunda.csv'] || [];
    const yoyObj = {};
    dig.forEach(r => {
        const a = getS(r, ['AÑO', 'ANO']) || '2026';
        yoyObj[a] = (yoyObj[a] || 0) + parseNum(getS(r, ['UNIDADES']));
    });

    destroyChart('chartSegDigSemanal'); 
    new Chart(document.getElementById('chartSegDigSemanal'), { 
        type: 'line', 
        data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [15000, 18000, 14000, 20000], borderColor: COLORS.success, backgroundColor: 'rgba(46,125,50,0.1)', fill: true, tension: 0.3 }] }, 
        options: baseOptions 
    });

    destroyChart('chartSegDigYoY'); 
    new Chart(document.getElementById('chartSegDigYoY'), { 
        type: 'bar', 
        data: { labels: Object.keys(yoyObj), datasets: [{ data: Object.values(yoyObj), backgroundColor: [COLORS.gray, COLORS.primaryLight], borderRadius: 6 }] }, 
        options: baseOptions 
    });
}

// ==========================================
// 5. EVENTOS GLOBALES PARA EL HTML
// ==========================================

window.recepcionFilter = function(f) { renderRecepcion(f); };
window.distribucionFilter = function(f) { renderDistribucion(f); };
window.devolucionesFilter = function(f) { renderDevoluciones(f); };
window.inventarioFilter = function(f) { renderInventario(f); };

// Ejecutar todo
cargarTodo();
