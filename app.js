// ==========================================
// CONFIGURACIÓN GLOBAL (Reglas Gerenciales)
// ==========================================
Chart.register(ChartDataLabels);

const COLORS = { azul: '#012094', rojo: '#E1251B', verde: '#27ae60', gris: '#dfe6e9', amarillo: '#f39c12' };

const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
        x: { grid: { display: false } }, 
        y: { grid: { display: false }, ticks: { callback: v => v.toLocaleString() } } 
    },
    plugins: {
        legend: { position: 'top' },
        datalabels: {
            anchor: 'end', align: 'top', font: { weight: 'bold', size: 10 },
            formatter: v => v ? v.toLocaleString() : '',
            color: '#2d3436'
        }
    }
};

const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '60%',
    plugins: {
        legend: { position: 'right' },
        datalabels: { color: '#fff', font: { weight: 'bold' } }
    }
};

// ==========================================
// LECTOR DE DATOS (PapaParse)
// ==========================================
async function cargarCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(`Datos/${file}`, {
            download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: results => resolve(results.data),
            error: err => { console.error(`Error en ${file}:`, err); resolve([]); }
        });
    });
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================
async function init() {
    console.log("Iniciando motor de datos...");
    const data = {};
    const files = [
        '0-seguimiento_objetivos.csv', '1-recepcion_nacional.csv', '2-recepcion_internacional.csv',
        '4-reclamos.csv', '5-ajustes.csv', '8-control y etiquetado_errores.csv', '9-distribucion.csv', 
        '10-envios.csv', '11-ventas.csv', '12-auditoria mercaderia_tiendas.csv', '13-auditoria mercaderia_mayoreo.csv', 
        '15-devoluciones_aec.csv', '16-devoluciones_ds.csv', '17-administracion de inventario cedi.csv',
        '19-digitacion_segunda.csv', '20-segunda_produccion.csv'
    ];

    for (const f of files) { 
        data[f] = await cargarCSV(f); 
        console.log(`Cargado: ${f} | Filas: ${data[f].length}`);
    }

    // Ejecutar todos los Renders
    renderRecepcion(data['1-recepcion_nacional.csv'], data['2-recepcion_internacional.csv']);
    renderReclamosAjustes(data['4-reclamos.csv'], data['5-ajustes.csv']);
    renderDistribucion(data['9-distribucion.csv']);
    renderDespacho(data['10-envios.csv'], data['11-ventas.csv']);
    renderAuditoria(data['9-distribucion.csv'], data['19-digitacion_segunda.csv'], data['12-auditoria mercaderia_tiendas.csv']);
    renderMayoreo(data['13-auditoria mercaderia_mayoreo.csv']);
    renderDevoluciones(data['15-devoluciones_aec.csv'], data['16-devoluciones_ds.csv']);
    renderInventario(data['17-administracion de inventario cedi.csv']);
    renderSegunda(data['20-segunda_produccion.csv']);
    
    // Quitar "Cargando..." y activar dashboard
    console.log("¡Renderizado Completo!");
}

// ==========================================
// FUNCIONES DE DIBUJO (CHART.JS)
// ==========================================

function renderRecepcion(nac, inter) {
    // YoY Unidades
    const yoy = nac.reduce((acc, row) => {
        const anio = row.AÑO || 'Desconocido';
        acc[anio] = (acc[anio] || 0) + (row['Suma de Cantidad'] || 0);
        return acc;
    }, {});

    new Chart(document.getElementById('chart-rec-yoy'), {
        type: 'bar',
        data: {
            labels: Object.keys(yoy),
            datasets: [{ label: 'Unidades YoY', data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul] }]
        },
        options: baseOptions
    });

    // % Costo por Compañía
    let costoAEC = 0; let costoDS = 0;
    nac.forEach(r => {
        if(r['Compañía'] === 'AEC') costoAEC += (r['Suma de CostoImportacionTotal'] || 0);
        if(r['Compañía'] === 'DS') costoDS += (r['Suma de CostoImportacionTotal'] || 0);
    });
    const totalCosto = costoAEC + costoDS;

    new Chart(document.getElementById('chart-rec-costo'), {
        type: 'doughnut',
        data: {
            labels: ['AEC', 'Danilos Store'],
            datasets: [{ data: [costoAEC, costoDS], backgroundColor: [COLORS.azul, COLORS.rojo] }]
        },
        options: { ...donutOptions, plugins: { datalabels: { formatter: v => ((v/totalCosto)*100).toFixed(2) + '%' } } }
    });
}

function renderReclamosAjustes(reclamos, ajustes) {
    const motivosRec = reclamos.reduce((acc, r) => {
        const m = r.MOTIVO || 'Otros';
        acc[m] = (acc[m] || 0) + (r.UND || 0);
        return acc;
    }, {});
    
    new Chart(document.getElementById('chart-reclamos-motivo'), {
        type: 'doughnut',
        data: { labels: Object.keys(motivosRec), datasets: [{ data: Object.values(motivosRec), backgroundColor: [COLORS.rojo, COLORS.amarillo, COLORS.gris] }] },
        options: donutOptions
    });
}

function renderDistribucion(data) {
    const comps = data.reduce((acc, row) => {
        const c = row['Tipo Transferencia'] || 'Otros';
        acc[c] = (acc[c] || 0) + (row[' UNIDADES.1'] || 0);
        return acc;
    }, {});

    new Chart(document.getElementById('chart-dist-comp'), {
        type: 'doughnut',
        data: { labels: Object.keys(comps), datasets: [{ data: Object.values(comps), backgroundColor: [COLORS.azul, COLORS.rojo] }] },
        options: donutOptions
    });
}

function renderDespacho(envios, ventas) {
    const totalEnvios = envios.reduce((a, b) => a + (b.UNIDADES || 0), 0);
    const totalVentas = ventas.reduce((a, b) => a + (b.UNIDADES || 0), 0);

    new Chart(document.getElementById('chart-despacho-ventas'), {
        type: 'bar',
        data: {
            labels: ['Enviado (Logística)', 'Venta Real (Tiendas)'],
            datasets: [{ label: 'Unidades', data: [totalEnvios, totalVentas], backgroundColor: [COLORS.azul, COLORS.verde] }]
        },
        options: baseOptions
    });
}

function renderAuditoria(dist, dig, aud) {
    let facturado = dist.reduce((a, b) => a + (b[' BULTOS.1'] || 0), 0);
    facturado += dig.reduce((a, b) => a + (b[' BULTOS.1'] || 0), 0);
    
    const meta = facturado * 0.15;
    const auditado = aud.reduce((a, b) => a + (b.BULTOS || 0), 0);
    const cobertura = facturado > 0 ? (auditado / meta) * 100 : 0;

    // Llenar KPIs
    document.getElementById('aud-facturado').textContent = facturado.toLocaleString();
    document.getElementById('aud-meta').textContent = meta.toLocaleString();
    document.getElementById('aud-real').textContent = auditado.toLocaleString();
    document.getElementById('aud-cobertura').textContent = cobertura.toFixed(2) + '%';
    if(cobertura < 100) document.getElementById('aud-cobertura').style.color = COLORS.rojo;

    new Chart(document.getElementById('chart-aud-embudo'), {
        type: 'bar',
        data: {
            labels: ['Total Facturado', 'Meta Auditoría (15%)', 'Real Auditado'],
            datasets: [{ data: [facturado, meta, auditado], backgroundColor: [COLORS.gris, COLORS.rojo, COLORS.verde] }]
        },
        options: baseOptions
    });
}

function renderMayoreo(data) {
    const totalLps = data.reduce((a, b) => {
        const val = parseFloat(b['Suma de PAGO']?.toString().replace(/L|,/g, '') || 0);
        return a + val;
    }, 0);
    const unidades = data.reduce((a, b) => a + (b['Suma de CANTIDAD PRODUCTO'] || 0), 0);

    document.getElementById('kpis-mayoreo').innerHTML = `
        <div class="card"><div class="kpi-title">Recaudación</div><div class="kpi-val" style="color:${COLORS.verde}">L ${totalLps.toLocaleString()}</div></div>
        <div class="card"><div class="kpi-title">Unidades Revisadas</div><div class="kpi-val">${unidades.toLocaleString()}</div></div>
    `;
}

function renderDevoluciones(aec, ds) {
    const motAec = aec.reduce((acc, r) => { const m = r['TIPO DE ERROR'] || 'Sin Asignar'; acc[m] = (acc[m]||0) + (r.UNIDADES||0); return acc; }, {});
    const motDs = ds.reduce((acc, r) => { const m = r['TIPO DE ERROR'] || 'Sin Asignar'; acc[m] = (acc[m]||0) + (r.UNIDADES||0); return acc; }, {});

    new Chart(document.getElementById('chart-dev-aec'), { type: 'doughnut', data: { labels: Object.keys(motAec), datasets: [{ data: Object.values(motAec), backgroundColor: [COLORS.rojo, COLORS.amarillo, COLORS.azul] }] }, options: donutOptions });
    new Chart(document.getElementById('chart-dev-ds'), { type: 'doughnut', data: { labels: Object.keys(motDs), datasets: [{ data: Object.values(motDs), backgroundColor: [COLORS.rojo, COLORS.amarillo, COLORS.azul] }] }, options: donutOptions });
}

function renderInventario(cedi) {
    const ajustesNeg = cedi.filter(r => r.Tipo === 'NEG').reduce((acc, r) => {
        const t = r['TIPO DE AJUSTE'] || 'Otros';
        acc[t] = (acc[t]||0) + Math.abs(r['Importe Costo']||0);
        return acc;
    }, {});

    new Chart(document.getElementById('chart-inv-tipo'), {
        type: 'bar', indexAxis: 'y',
        data: { labels: Object.keys(ajustesNeg), datasets: [{ label: 'Costo (L)', data: Object.values(ajustesNeg), backgroundColor: COLORS.rojo }] },
        options: { ...baseOptions, plugins: { datalabels: { formatter: v => 'L ' + (v/1000).toFixed(1) + 'K' } } }
    });
}

function renderSegunda(data) {
    const yoy = data.reduce((acc, r) => {
        const anio = r.AÑO || '2026';
        acc[anio] = (acc[anio] || 0) + (r.UNIDADES || 0);
        return acc;
    }, {});
    
    new Chart(document.getElementById('chart-segunda-yoy'), {
        type: 'bar',
        data: { labels: Object.keys(yoy), datasets: [{ label: 'Producción YoY', data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul] }] },
        options: baseOptions
    });
}

init();
