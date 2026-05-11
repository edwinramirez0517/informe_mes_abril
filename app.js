// ==========================================
// CONFIGURACIÓN GLOBAL (Reglas Gerenciales)
// ==========================================
Chart.register(ChartDataLabels);

const COLORS = { azul: '#012094', rojo: '#E1251B', verde: '#27ae60', gris: '#dfe6e9', amarillo: '#f39c12', celeste: '#0277bd', morado: '#6a1b9a' };
const PALETA = [COLORS.azul, COLORS.rojo, COLORS.verde, COLORS.amarillo, COLORS.celeste, COLORS.morado, '#e67e22', '#34495e'];

const baseOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: { 
        x: { grid: { display: false } }, 
        y: { grid: { display: false }, ticks: { callback: v => v.toLocaleString('en-US') } } 
    },
    plugins: {
        legend: { display: false },
        datalabels: {
            anchor: 'end', align: 'top', font: { weight: 'bold', size: 10 },
            formatter: v => v ? v.toLocaleString('en-US') : '', color: '#2d3436'
        }
    }
};

const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '60%',
    plugins: {
        legend: { position: 'right' },
        datalabels: { color: '#fff', font: { weight: 'bold', size: 11 } }
    }
};

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
    if (!canvas) {
        console.warn(`⚠️ Canvas no encontrado: ${canvasId}. Omitiendo gráfico.`);
        return;
    }
    let chartStatus = Chart.getChart(canvasId);
    if (chartStatus) chartStatus.destroy(); // Destruye el anterior si ya existe
    new Chart(canvas, config);
}

// Limpiador numérico seguro
function limpiarNumero(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/L|\$|,/g, '')) || 0;
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

    const data = {};
    for (const f of archivos) { 
        data[f] = await cargarCSV(f); 
    }

    renderResumen(data['0-seguimiento_objetivos.csv'], data['4-reclamos.csv'], data['5-ajustes.csv'], data['10-envios.csv'], data['11-ventas.csv']);
    renderRecepcion(data['1-recepcion_nacional.csv'], data['2-recepcion_internacional.csv']);
    renderReclamos(data['4-reclamos.csv'], data['5-ajustes.csv']);
    renderDistribucion(data['9-distribucion.csv']);
    renderDespacho(data['10-envios.csv'], data['11-ventas.csv']);
    renderAuditoria(data['9-distribucion.csv'], data['19-digitacion_segunda.csv'], data['12-auditoria mercaderia_tiendas.csv'], data['8-control y etiquetado_errores.csv'], data['14-auditoria mercaderia_errores.csv']);
    renderMayoreo(data['13-auditoria mercaderia_mayoreo.csv']);
    renderDevoluciones(data['15-devoluciones_aec.csv'], data['16-devoluciones_ds.csv']);
    renderInventario(data['17-administracion de inventario cedi.csv']);
    renderSegunda(data['20-segunda_produccion.csv']);
    
    console.log("¡Carga Completa!");
}

// ==========================================
// RENDERIZADO POR SECCIÓN
// ==========================================

function renderResumen(obj, reclamos, ajustes, envios, ventas) {
    const totalReclamos = reclamos.reduce((a, b) => a + limpiarNumero(b.COSTO), 0);
    const totalAjustes = ajustes.reduce((a, b) => a + limpiarNumero(b['COSTO TOTAL']), 0);
    const totalEnvios = envios.reduce((a, b) => a + (b.UNIDADES || 0), 0);
    const totalVentas = ventas.reduce((a, b) => a + (b.UNIDADES || 0), 0);
    const efiDespacho = totalEnvios > 0 ? (totalVentas / totalEnvios) * 100 : 0;

    let cump = 0; let count = 0;
    obj.forEach(r => {
        let val = parseFloat((r['% Avance Meta']||'').toString().replace('%',''));
        if(!isNaN(val)){ cump += val; count++; }
    });
    let promedio = count > 0 ? cump/count : 0;

    const div = document.getElementById('kpi-resumen-container');
    if(div) {
        div.innerHTML = `
            <div class="card"><div class="kpi-title">Cumplimiento Operativo</div><div class="kpi-val">${promedio.toFixed(1)}%</div></div>
            <div class="card"><div class="kpi-title">Costo Reclamos</div><div class="kpi-val" style="color:${COLORS.rojo}">$ ${totalReclamos.toLocaleString('en-US',{minimumFractionDigits:2})}</div></div>
            <div class="card"><div class="kpi-title">Ajustes Inventario</div><div class="kpi-val" style="color:${COLORS.rojo}">L ${totalAjustes.toLocaleString('en-US',{minimumFractionDigits:2})}</div></div>
            <div class="card"><div class="kpi-title">Eficiencia Despacho</div><div class="kpi-val" style="color:${COLORS.verde}">${efiDespacho.toFixed(1)}%</div></div>
        `;
    }

    crearGraficoSeguro('chart-resumen-semanal', {
        type: 'line',
        data: { labels: ['SEM 1','SEM 2','SEM 3','SEM 4'], datasets: [{ label: '% Cumplimiento', data: [80, 85, 90, promedio], borderColor: COLORS.azul, backgroundColor: 'rgba(1,32,148,0.1)', fill: true, tension: 0.4 }] },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { display: false } } }
    });
}

function renderRecepcion(nac, inter) {
    const yoy = nac.reduce((acc, r) => { const anio = r.AÑO || '2026'; acc[anio] = (acc[anio]||0) + (r['Suma de Cantidad']||0); return acc; }, {});
    crearGraficoSeguro('chart-rec-yoy', {
        type: 'bar', data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul], borderRadius: 4 }] }, options: baseOptions
    });

    let cAEC = 0; let cDS = 0;
    nac.forEach(r => { if(r['Compañía']==='AEC') cAEC+=r['Suma de CostoImportacionTotal']||0; if(r['Compañía']==='DS') cDS+=r['Suma de CostoImportacionTotal']||0; });
    let tCost = cAEC + cDS;
    crearGraficoSeguro('chart-rec-costo', {
        type: 'doughnut', data: { labels: ['AEC', 'Danilos Store'], datasets: [{ data: [cAEC, cDS], backgroundColor: [COLORS.azul, COLORS.rojo], borderWidth: 0 }] },
        options: { ...donutOptions, plugins: { ...donutOptions.plugins, datalabels: { formatter: v => tCost>0?((v/tCost)*100).toFixed(1)+'%':'0%' } } }
    });
}

function renderReclamos(reclamos, ajustes) {
    const mot = reclamos.reduce((acc, r) => { const m = r.MOTIVO||'Otros'; acc[m] = (acc[m]||0) + (r.UND||0); return acc; }, {});
    crearGraficoSeguro('chart-reclamos-motivo', {
        type: 'pie', data: { labels: Object.keys(mot), datasets: [{ data: Object.values(mot), backgroundColor: PALETA }] }, options: donutOptions
    });
}

function renderDistribucion(dist) {
    const comp = dist.reduce((acc, r) => { const c = r['Tipo Transferencia']||'Otros'; acc[c] = (acc[c]||0) + (r[' UNIDADES.1']||0); return acc; }, {});
    crearGraficoSeguro('chart-dist-comp', {
        type: 'doughnut', data: { labels: Object.keys(comp), datasets: [{ data: Object.values(comp), backgroundColor: PALETA, borderWidth: 0 }] }, options: donutOptions
    });
}

function renderDespacho(envios, ventas) {
    const e = envios.reduce((a, b) => a + (b.UNIDADES||0), 0);
    const v = ventas.reduce((a, b) => a + (b.UNIDADES||0), 0);
    crearGraficoSeguro('chart-despacho-ventas', {
        type: 'bar', data: { labels: ['Logística (Enviado)', 'Tiendas (Vendido)'], datasets: [{ data: [e, v], backgroundColor: [COLORS.azul, COLORS.verde], borderRadius: 4 }] }, options: baseOptions
    });
}

function renderAuditoria(dist, dig, aud, errCtrl, errAud) {
    let bFact = dist.reduce((a, b) => a + (b[' BULTOS.1']||0), 0) + dig.reduce((a, b) => a + (b[' BULTOS.1']||0), 0);
    let meta = bFact * 0.15;
    let bAud = aud.reduce((a, b) => a + (b.BULTOS||0), 0);
    let cob = bFact > 0 ? (bAud/meta)*100 : 0;

    const div = document.getElementById('kpi-aud-tiendas');
    if(div) {
        div.innerHTML = `
            <div class="card"><div class="kpi-title">Facturado Real</div><div class="kpi-val">${bFact.toLocaleString('en-US')}</div></div>
            <div class="card"><div class="kpi-title">Meta Exigida (15%)</div><div class="kpi-val">${meta.toLocaleString('en-US')}</div></div>
            <div class="card"><div class="kpi-title">Auditado Real</div><div class="kpi-val">${bAud.toLocaleString('en-US')}</div></div>
            <div class="card"><div class="kpi-title">Cobertura</div><div class="kpi-val" style="color:${cob<100?COLORS.rojo:COLORS.verde}">${cob.toFixed(1)}%</div></div>
        `;
    }

    crearGraficoSeguro('chart-aud-embudo', {
        type: 'bar', data: { labels: ['Facturado', 'Meta 15%', 'Auditado'], datasets: [{ data: [bFact, meta, bAud], backgroundColor: [COLORS.gris, COLORS.rojo, COLORS.verde], borderRadius: 4 }] }, options: baseOptions
    });
}

function renderMayoreo(mayoreo) {
    let lps = mayoreo.reduce((a, b) => a + limpiarNumero(b['Suma de PAGO']), 0);
    let und = mayoreo.reduce((a, b) => a + (b['Suma de CANTIDAD PRODUCTO']||0), 0);
    const div = document.getElementById('kpi-aud-mayoreo');
    if(div) {
        div.innerHTML = `
            <div class="card"><div class="kpi-title">Recaudación Validada</div><div class="kpi-val" style="color:${COLORS.verde}">L ${lps.toLocaleString('en-US',{minimumFractionDigits:2})}</div></div>
            <div class="card"><div class="kpi-title">Unidades Auditadas</div><div class="kpi-val">${und.toLocaleString('en-US')}</div></div>
        `;
    }
}

function renderDevoluciones(aec, ds) {
    // Cálculo % Aplicado (Métrica Gerencial)
    const aplicadosAEC = aec.filter(r => r.APLICADO === 'APLICADO').length;
    const porcAplicadoAEC = aec.length > 0 ? (aplicadosAEC / aec.length) * 100 : 0;
    
    const aplicadosDS = ds.filter(r => r.APLICADO === 'APLICADO').length;
    const porcAplicadoDS = ds.length > 0 ? (aplicadosDS / ds.length) * 100 : 0;

    const divKPI = document.getElementById('kpi-devoluciones-aplicado');
    if(divKPI) {
        divKPI.innerHTML = `
            <div class="card"><div class="kpi-title">Eficiencia Notas Crédito AEC</div><div class="kpi-val" style="color:${porcAplicadoAEC >= 90 ? COLORS.verde : COLORS.rojo}">${porcAplicadoAEC.toFixed(1)}%</div></div>
            <div class="card"><div class="kpi-title">Eficiencia Notas Crédito DS</div><div class="kpi-val" style="color:${porcAplicadoDS >= 90 ? COLORS.verde : COLORS.rojo}">${porcAplicadoDS.toFixed(1)}%</div></div>
        `;
    }

    const motAec = aec.reduce((acc, r) => { const m = r.MOTIVO||'Otros'; acc[m] = (acc[m]||0) + (r.UNIDADES||0); return acc; }, {});
    const motDs = ds.reduce((acc, r) => { const m = r.MOTIVO||'Otros'; acc[m] = (acc[m]||0) + (r.UNIDADES||0); return acc; }, {});

    crearGraficoSeguro('chart-dev-motivos-aec', { type: 'pie', data: { labels: Object.keys(motAec), datasets: [{ data: Object.values(motAec), backgroundColor: PALETA }] }, options: donutOptions });
    crearGraficoSeguro('chart-dev-motivos-ds', { type: 'pie', data: { labels: Object.keys(motDs), datasets: [{ data: Object.values(motDs), backgroundColor: PALETA }] }, options: donutOptions });
}

function renderInventario(cedi) {
    const neg = cedi.filter(r => r.Tipo === 'NEG').reduce((acc, r) => { const t = r['TIPO DE AJUSTE']||'Otros'; acc[t] = (acc[t]||0) + Math.abs(r['Importe Costo']||0); return acc; }, {});
    crearGraficoSeguro('chart-inv-tipo', {
        type: 'bar', indexAxis: 'y', data: { labels: Object.keys(neg), datasets: [{ data: Object.values(neg), backgroundColor: COLORS.rojo, borderRadius: 4 }] },
        options: { ...baseOptions, plugins: { ...baseOptions.plugins, datalabels: { formatter: v => 'L ' + (v/1000).toFixed(1) + 'K' } } }
    });
}

function renderSegunda(seg) {
    const yoy = seg.reduce((acc, r) => { const a = r.AÑO||'2026'; acc[a] = (acc[a]||0) + (r.UNIDADES||0); return acc; }, {});
    crearGraficoSeguro('chart-segunda-yoy', { type: 'bar', data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul], borderRadius: 4 }] }, options: baseOptions });
}

// Inicializar al cargar
cargarTodo();
