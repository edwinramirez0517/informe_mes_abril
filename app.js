Chart.register(ChartDataLabels);

const COLORS = { azul: '#012094', rojo: '#E1251B', verde: '#27ae60', gris: '#dfe6e9' };

// Configuración Base de Gráficos (Gerencia)
const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { grid: { display: false } }, y: { grid: { display: false }, ticks: { callback: v => v.toLocaleString() } } },
    plugins: {
        datalabels: {
            anchor: 'end', align: 'top', font: { weight: 'bold' },
            formatter: v => v.toLocaleString()
        }
    }
};

async function cargarCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(`Datos/${file}`, {
            download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: results => resolve(results.data),
            error: () => resolve([])
        });
    });
}

async function init() {
    const data = {};
    const files = [
        '0-seguimiento_objetivos.csv', '1-recepcion_nacional.csv', '2-recepcion_internacional.csv',
        '9-distribucion.csv', '10-envios.csv', '11-ventas.csv', '12-auditoria mercaderia_tiendas.csv',
        '13-auditoria mercaderia_mayoreo.csv', '14-auditoria mercaderia_errores.csv',
        '19-digitacion_segunda.csv', '20-segunda_produccion.csv'
    ];

    for (const f of files) { data[f] = await cargarCSV(f); }

    renderRecepcion(data['1-recepcion_nacional.csv'], data['2-recepcion_internacional.csv']);
    renderDistribucion(data['9-distribucion.csv']);
    renderDespacho(data['10-envios.csv'], data['11-ventas.csv']);
    renderAuditoria(data['9-distribucion.csv'], data['19-digitacion_segunda.csv'], data['12-auditoria mercaderia_tiendas.csv']);
    renderMayoreo(data['13-auditoria mercaderia_mayoreo.csv']);
    renderSegunda(data['20-segunda_produccion.csv']);
}

// 1. RECEPCIÓN (YoY y % Costo)
function renderRecepcion(nac, inter) {
    const sumNac = nac.reduce((a, b) => a + (b['Suma de Cantidad'] || 0), 0);
    const sumInt = inter.reduce((a, b) => a + (b['Suma de Cantidad'] || 0), 0);
    
    // Comparativo YoY (Agrupando por AÑO)
    const yoy = nac.reduce((acc, row) => {
        acc[row.AÑO] = (acc[row.AÑO] || 0) + (row['Suma de Cantidad'] || 0);
        return acc;
    }, {});

    new Chart(document.getElementById('chart-rec-yoy'), {
        type: 'bar',
        data: {
            labels: Object.keys(yoy),
            datasets: [{ label: 'Unidades Recibidas YoY', data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul] }]
        },
        options: baseOptions
    });
}

// 2. DISTRIBUCIÓN (Solo Transferencias)
function renderDistribucion(data) {
    const comps = data.reduce((acc, row) => {
        const c = row['Tipo Transferencia'] || 'Otros';
        acc[c] = (acc[c] || 0) + (row[' UNIDADES.1'] || 0);
        return acc;
    }, {});

    new Chart(document.getElementById('chart-dist-comp'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(comps),
            datasets: [{ data: Object.values(comps), backgroundColor: [COLORS.azul, COLORS.rojo] }]
        },
        options: { ...baseOptions, plugins: { datalabels: { formatter: v => v.toLocaleString() } } }
    });
}

// 3. DESPACHO VS VENTAS (File 10 vs 11)
function renderDespacho(envios, ventas) {
    const totalEnvios = envios.reduce((a, b) => a + (b.UNIDADES || 0), 0);
    const totalVentas = ventas.reduce((a, b) => a + (b.UNIDADES || 0), 0);

    new Chart(document.getElementById('chart-despacho-ventas'), {
        type: 'bar',
        data: {
            labels: ['Enviado (Logística)', 'Venta (Tiendas)'],
            datasets: [{ label: 'Unidades', data: [totalEnvios, totalVentas], backgroundColor: [COLORS.azul, COLORS.verde] }]
        },
        options: baseOptions
    });
}

// 4. AUDITORÍA (Regla del 15%)
function renderAuditoria(dist, dig, aud) {
    let facturado = dist.reduce((a, b) => a + (b[' UNIDADES.1'] || 0), 0);
    facturado += dig.reduce((a, b) => a + (b[' UNIDADES.1'] || 0), 0);
    
    const auditado = aud.reduce((a, b) => a + (b.UNIDADES || 0), 0);
    const cobertura = (auditado / facturado) * 100;

    document.getElementById('aud-cobertura').textContent = cobertura.toFixed(2) + '%';

    new Chart(document.getElementById('chart-aud-embudo'), {
        type: 'bar',
        data: {
            labels: ['Total Facturado', 'Meta Auditoría (15%)', 'Real Auditado'],
            datasets: [{ 
                data: [facturado, facturado * 0.15, auditado], 
                backgroundColor: [COLORS.gris, COLORS.rojo, COLORS.verde] 
            }]
        },
        options: baseOptions
    });
}

// 5. MAYOREO
function renderMayoreo(data) {
    const totalLps = data.reduce((a, b) => {
        const val = parseFloat(b['Suma de PAGO']?.toString().replace(/L|,/g, '') || 0);
        return a + val;
    }, 0);

    document.getElementById('kpis-mayoreo').innerHTML = `
        <div class="card"><div>Total Lempiras</div><div class="kpi-val">L ${totalLps.toLocaleString()}</div></div>
        <div class="card"><div>Unidades Mayoreo</div><div class="kpi-val">${data.reduce((a,b)=>a+(b['Suma de CANTIDAD PRODUCTO']||0),0).toLocaleString()}</div></div>
    `;
}

// 6. SEGUNDA YoY
function renderSegunda(data) {
    const yoy = data.reduce((acc, row) => {
        acc[row.AÑO] = (acc[row.AÑO] || 0) + (row.UNIDADES || 0);
        return acc;
    }, {});

    new Chart(document.getElementById('chart-segunda-yoy'), {
        type: 'bar',
        data: {
            labels: Object.keys(yoy),
            datasets: [{ label: 'Producción Total Segunda YoY', data: Object.values(yoy), backgroundColor: [COLORS.gris, COLORS.azul] }]
        },
        options: baseOptions
    });
}

init();
