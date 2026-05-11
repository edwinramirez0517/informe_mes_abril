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
        y: { grid: { display: false }, ticks: { callback: v => v.toLocaleString('en-US') } } 
    },
    plugins: {
        legend: { position: 'top' },
        datalabels: {
            anchor: 'end', align: 'top', font: { weight: 'bold', size: 10 },
            formatter: v => v ? v.toLocaleString('en-US') : '',
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
// LECTOR DE DATOS Y FUNCIÓN SALVAVIDAS
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

// Función salvavidas: Evita que la app se caiga si falta un canvas en el HTML
function crearGraficoSeguro(canvasId, config) {
    const canvasElement = document.getElementById(canvasId);
    if (!canvasElement) {
        console.warn(`⚠️ No se encontró el gráfico: ${canvasId}. Omitiendo para no detener el sistema.`);
        return;
    }
    new Chart(canvasElement, config);
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
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
        console.log(`Cargado: ${f} | Filas: ${data[f].length}`);
    }

    // Ejecutar todos los Renders
    renderResumenEjecutivo(data['0-seguimiento_objetivos.csv'], data['4-reclamos.csv'], data['5-ajustes.csv']);
    renderRecepcion(data['1-recepcion_nacional.csv'], data['2-recepcion_internacional.csv']);
    renderReclamosAjustes(data['4-reclamos.csv'], data['5-ajustes.csv']);
    renderDistribucion(data['9-distribucion.csv']);
    renderDespacho(data['10-envios.csv'], data['11-ventas.csv']);
    renderAuditoria(data['9-distribucion.csv'], data['19-digitacion_segunda.csv'], data['12-auditoria mercaderia_tiendas.csv']);
    renderMayoreo(data['13-auditoria mercaderia_mayoreo.csv']);
    renderDevoluciones(data['15-devoluciones_aec.csv'], data['16-devoluciones_ds.csv']);
    renderInventario(data['17-administracion de inventario cedi.csv']);
    renderSegunda(data['20-segunda_produccion.csv']);
    
    console.log("¡Renderizado Completo!");
}

// ==========================================
// FUNCIONES DE RENDERIZADO POR ÁREA
// ==========================================

function renderResumenEjecutivo(objetivos, reclamos, ajustes) {
    const kpisDiv = document.getElementById('kpis-resumen');
    if(!kpisDiv) return;

    // Calculamos totales para el resumen
    const totalReclamos = reclamos.reduce((a, b) => a + parseFloat(b.COSTO?.toString().replace('$', '') || 0), 0);
    const totalAjustes = ajustes.reduce((a, b) => a + parseFloat(b['COSTO TOTAL']?.toString().replace(/L|,/g, '') || 0), 0);
    
    // Inyectamos las tarjetas de Resumen
    kpisDiv.innerHTML = `
        <div class="card"><div class="kpi-title">Costo Reclamos</div><div class="kpi-val" style="color:${COLORS.rojo}">$ ${totalReclamos.toLocaleString('en-US', {minimumFractionDigits: 2})}</div></div>
        <div class="card"><div class="kpi-title">Costo Ajustes Inventario</div><div class="kpi-val" style="color:${COLORS.rojo}">L ${totalAjustes.toLocaleString('en-US', {minimumFractionDigits: 2})}</div></div>
    `;
}

function renderRecepcion(nac, inter) {
    const yoy = nac.reduce((acc, r) => {
        const anio = r.AÑO || '2026';
        acc[anio] = (acc[anio] || 0) + (r['Suma de Cantidad'] || 0);
        return acc;
    }, {});

    crearGraficoSeguro('chart-rec-yoy', {
        type: 'bar',
        data: {
            labels: Object.keys(yoy),
            datasets: [{ label: 'Unidades YoY', data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul] }]
        },
        options: baseOptions
    });

    let costoAEC = 0; let costoDS = 0;
    nac.forEach(r => {
        if(r['Compañía'] === 'AEC') costoAEC += (r['Suma de CostoImportacionTotal'] || 0);
        if(r['Compañía'] === 'DS') costoDS += (r['Suma de CostoImportacionTotal'] || 0);
    });
    const totalCosto = costoAEC + costoDS;

    crearGraficoSeguro('chart-rec-costo', {
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
    
    crearGraficoSeguro('chart-reclamos-motivo', {
        type: 'doughnut',
        data: { labels: Object.keys(motivosRec), datasets: [{ data: Object.values(motivosRec), backgroundColor: [COLORS.rojo, COLORS.amarillo, COLORS.gris] }] },
        options: donutOptions
    });
}

function renderDistribucion(data) {
    const comps = data.reduce((acc, r) => {
        const comp = r['Tipo Transferencia'] || 'Otros';
        acc[comp] = (acc[comp] || 0) + (r[' UNIDADES.1'] || 0);
        return acc;
    }, {});

    crearGraficoSeguro('chart-dist-comp', {
        type: 'doughnut',
        data: { labels: Object.keys(comps), datasets: [{ data: Object.values(comps), backgroundColor: [COLORS.azul, COLORS.rojo, COLORS.verde] }] },
        options: { ...donutOptions, cutout: '60%' }
    });
}

function renderDespacho(envios, ventas) {
    const totalEnvios = envios.reduce((a, b) => a + (b.UNIDADES || 0), 0);
    const totalVentas = ventas.reduce((a, b) => a + (b.UNIDADES || 0), 0);

    crearGraficoSeguro('chart-despacho-ventas', {
        type: 'bar',
        data: {
            labels: ['Despacho (Salida)', 'Venta Real (Tiendas)'],
            datasets: [{ label: 'Unidades', data: [totalEnvios, totalVentas], backgroundColor: [COLORS.azul, COLORS.verde] }]
        },
        options: baseOptions
    });
}

function renderAuditoria(dist, dig, aud) {
    let bultosFacturados = dist.reduce((a, b) => a + (b[' BULTOS.1'] || 0), 0);
    bultosFacturados += dig.reduce((a, b) => a + (b[' BULTOS.1'] || 0), 0);
    
    const meta = bultosFacturados * 0.15;
    const bultosAuditados = aud.reduce((a, b) => a + (b.BULTOS || 0), 0);
    const cobertura = bultosFacturados > 0 ? (bultosAuditados / meta) * 100 : 0;

    const elFacturado = document.getElementById('aud-facturado');
    if(elFacturado) {
        elFacturado.textContent = bultosFacturados.toLocaleString('en-US');
        document.getElementById('aud-meta').textContent = meta.toLocaleString('en-US');
        document.getElementById('aud-real').textContent = bultosAuditados.toLocaleString('en-US');
        document.getElementById('aud-cobertura').textContent = cobertura.toFixed(2) + '%';
        if(cobertura < 100) document.getElementById('aud-cobertura').style.color = COLORS.rojo;
    }

    crearGraficoSeguro('chart-aud-embudo', {
        type: 'bar',
        data: {
            labels: ['Total Facturado', 'Meta 15%', 'Auditado Real'],
            datasets: [{ data: [bultosFacturados, meta, bultosAuditados], backgroundColor: [COLORS.gris, COLORS.rojo, COLORS.verde] }]
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

    const kpisDiv = document.getElementById('kpis-mayoreo');
    if(kpisDiv) {
        kpisDiv.innerHTML = `
            <div class="card"><div class="kpi-title">Recaudación Validada</div><div class="kpi-val" style="color:${COLORS.verde}">L ${totalLps.toLocaleString('en-US', {minimumFractionDigits: 2})}</div></div>
            <div class="card"><div class="kpi-title">Unidades Auditadas</div><div class="kpi-val">${unidades.toLocaleString('en-US')}</div></div>
        `;
    }
}

function renderDevoluciones(aec, ds) {
    const motAec = aec.reduce((acc, r) => { const m = r['TIPO DE ERROR'] || 'Sin Asignar'; acc[m] = (acc[m]||0) + (r.UNIDADES||0); return acc; }, {});
    const motDs = ds.reduce((acc, r) => { const m = r['TIPO DE ERROR'] || 'Sin Asignar'; acc[m] = (acc[m]||0) + (r.UNIDADES||0); return acc; }, {});

    crearGraficoSeguro('chart-dev-aec', { type: 'doughnut', data: { labels: Object.keys(motAec), datasets: [{ data: Object.values(motAec), backgroundColor: [COLORS.rojo, COLORS.amarillo, COLORS.azul] }] }, options: donutOptions });
    crearGraficoSeguro('chart-dev-ds', { type: 'doughnut', data: { labels: Object.keys(motDs), datasets: [{ data: Object.values(motDs), backgroundColor: [COLORS.rojo, COLORS.amarillo, COLORS.azul] }] }, options: donutOptions });
}

function renderInventario(cedi) {
    const ajustesNeg = cedi.filter(r => r.Tipo === 'NEG').reduce((acc, r) => {
        const t = r['TIPO DE AJUSTE'] || 'Otros';
        acc[t] = (acc[t]||0) + Math.abs(r['Importe Costo']||0);
        return acc;
    }, {});

    crearGraficoSeguro('chart-inv-tipo', {
        type: 'bar', indexAxis: 'y',
        data: { labels: Object.keys(ajustesNeg), datasets: [{ label: 'Costo Negativo (L)', data: Object.values(ajustesNeg), backgroundColor: COLORS.rojo }] },
        options: { ...baseOptions, plugins: { datalabels: { formatter: v => 'L ' + (v/1000).toFixed(1) + 'K' } } }
    });
}

function renderSegunda(data) {
    const yoy = data.reduce((acc, r) => {
        const anio = r.AÑO || '2026';
        acc[anio] = (acc[anio] || 0) + (r.UNIDADES || 0);
        return acc;
    }, {});
    
    crearGraficoSeguro('chart-segunda-yoy', {
        type: 'bar',
        data: { labels: Object.keys(yoy), datasets: [{ label: 'Producción Segunda YoY', data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul] }] },
        options: baseOptions
    });
}

// Arrancar sistema
cargarTodo();
