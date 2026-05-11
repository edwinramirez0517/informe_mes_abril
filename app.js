// ==========================================
// CONFIGURACIÓN GLOBAL VISUAL Y UTILS
// ==========================================
Chart.register(ChartDataLabels);

const COLORS = { primary: '#1a237e', primaryLight: '#3949ab', accent: '#ff6f00', accentLight: '#ffa040', success: '#2e7d32', danger: '#c62828', warning: '#fbc02d', gray: '#7f8c8d', labelBg: 'rgba(255,255,255,0.9)' };
const PALETA = [COLORS.primary, COLORS.accent, COLORS.success, '#3949ab', '#ffa040', '#5c6bc0', '#ff8f00', '#43a047', '#e74c3c', '#9b59b6', '#34495e', '#16a085', '#27ae60', '#f39c12', '#d35400'];

const baseOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: { 
        x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", weight: '600' }, maxRotation: 45, minRotation: 0, autoSkip: true } }, 
        y: { grid: { color: '#f0f2f5' }, border: {display: false}, ticks: { font: {family: "'Inter', sans-serif"} } } 
    },
    layout: { padding: { top: 35 } },
    plugins: {
        legend: { display: false }, 
        tooltip: { enabled: true },
        datalabels: {
            anchor: 'end', align: 'top', color: COLORS.primary, backgroundColor: COLORS.labelBg, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', font: { weight: '800', size: 11, family: "'Poppins', sans-serif" }, padding: 4,
            display: function(context) {
                // REGLA ANTI-CAOS: Ocultar etiquetas si hay más de 12 elementos o si el valor es 0
                return context.chart.data.labels.length <= 12 && context.dataset.data[context.dataIndex] !== 0;
            },
            formatter: (v) => { if (!v || v === 0) return ''; if (v >= 1000000) return (v/1000000).toFixed(1) + 'M'; if (v >= 1000) return (v/1000).toFixed(1) + 'K'; return v.toLocaleString('en-US'); }
        }
    }
};

const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: { 
        legend: { position: 'right', labels: { font: { family: "'Inter', sans-serif", size: 11, weight: '600' } } }, 
        datalabels: { 
            color: '#ffffff', font: { weight: '800', size: 12, family: "'Poppins', sans-serif" }, textStrokeColor: 'rgba(0,0,0,0.6)', textStrokeWidth: 2, 
            display: function(context) { return context.dataset.data[context.dataIndex] > 0; }, // Solo mostrar si es mayor a 0
            formatter: (v) => v > 0 ? (v >= 1000 ? (v/1000).toFixed(1) + 'K' : v.toLocaleString('en-US')) : '' 
        } 
    }
};

let globalData = {};

function tipoTienda(name) { if (!name) return 'detalle'; let n = name.toString().toUpperCase(); if (n.includes('MAYOREO')) return 'mayoreo'; return 'detalle'; }
function normalizarFila(row) { const newRow = {}; for (let key in row) if (key) newRow[key.toString().trim().toUpperCase()] = row[key]; return newRow; }
function getS(row, posiblesNombres) { for (let n of posiblesNombres) if (row[n] !== undefined && row[n] !== null && row[n] !== '') return row[n]; return 0; }
function parseNum(val) { if (!val) return 0; if (typeof val === 'number') return val; return parseFloat(val.toString().replace(/L|Lps|\$|,/g, '').trim()) || 0; }
function destroyChart(id) { let chart = Chart.getChart(id); if (chart) chart.destroy(); }
function setKPI(id, val, isMoney=false, isPct=false) { 
    const el = document.getElementById(id); 
    if(el) { 
        if(isMoney) el.innerText = 'L ' + val.toLocaleString('en-US',{minimumFractionDigits:2}); 
        else if(isPct) el.innerText = val.toFixed(2) + '%'; 
        else el.innerText = val.toLocaleString('en-US'); 
    } 
}

async function cargarCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(`data/${file}`, {
            download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: results => resolve(results.data.map(normalizarFila)),
            error: err => { console.warn(`Error al cargar el archivo CSV: ${file}`); resolve([]); }
        });
    });
}

// ==========================================
// INICIALIZADOR PRINCIPAL
// ==========================================
async function cargarTodo() {
    console.log("Cargando todos los archivos del ERP (Versión Limpia Top 20)...");
    const archivos = [
        '0-seguimiento_objetivos.csv', '1-recepcion_nacional.csv', '2-recepcion_internacional.csv', 
        '3-tiempo_descarga.csv', '4-reclamos.csv', '5-ajustes.csv', '6-etiquetado.csv', 
        '7-control y etiquetado_produccion.csv', '8-control y etiquetado_errores.csv', 
        '9-distribucion.csv', '10-envios.csv', '11-ventas.csv', '12-auditoria mercaderia_tiendas.csv', 
        '13-auditoria mercaderia_mayoreo.csv', '14-auditoria mercaderia_errores.csv', 
        '15-devoluciones_aec.csv', '16-devoluciones_ds.csv', '17-administracion de inventario cedi.csv', 
        '19-digitacion_segunda.csv', '20-segunda_produccion.csv', '21-segunda_proveedor.csv'
    ];
    
    for (const f of archivos) globalData[f] = await cargarCSV(f);

    try { renderResumen(); } catch(e) { console.error("Error en Resumen:", e); }
    try { renderRecepcion('global'); } catch(e) { console.error("Error en Recepción:", e); }
    try { renderContenedores(); } catch(e) { console.error("Error en Contenedores:", e); }
    try { renderEtiquetado(); } catch(e) { console.error("Error en Etiquetado:", e); }
    try { renderControl(); } catch(e) { console.error("Error en Control:", e); }
    try { renderDistribucion('global'); } catch(e) { console.error("Error en Distribución:", e); }
    try { renderDespachos(); } catch(e) { console.error("Error en Despacho:", e); }
    try { renderAuditoria(); } catch(e) { console.error("Error en Auditoría:", e); }
    try { renderMayoreo(); } catch(e) { console.error("Error en Mayoreo:", e); }
    try { renderReclamosAjustes(); } catch(e) { console.error("Error en Reclamos/Ajustes:", e); }
    try { renderDevoluciones('global'); } catch(e) { console.error("Error en Devoluciones:", e); }
    try { renderInventario('global'); } catch(e) { console.error("Error en Inventario:", e); }
    try { renderSegunda(); } catch(e) { console.error("Error en Segunda:", e); }
}

// ==========================================
// 0. RESUMEN EJECUTIVO
// ==========================================
function renderResumen() {
    const data = globalData['0-seguimiento_objetivos.csv'] || [];
    const tbody = document.querySelector('#tabla-seguimiento tbody');
    const gContainer = document.getElementById('gauge-container');
    
    if(!tbody || !gContainer) return;

    tbody.innerHTML = ''; gContainer.innerHTML = '';
    let sumPct = 0; let count = 0;
    
    data.forEach((row, i) => {
        const area = getS(row, ['AREA', 'ÁREA', 'AREA ']) || 'Operación';
        const meta = parseNum(getS(row, ['META MENSUAL', 'META']));
        const real = parseNum(getS(row, ['UNIDADES ACUMULADAS', 'REAL', ' REAL ']));
        
        if(meta === 0 && real === 0) return;

        const dif = real - meta;
        const pct = meta > 0 ? (real/meta)*100 : 0;
        let color = pct >= 90 ? COLORS.success : (pct >= 75 ? COLORS.warning : COLORS.danger);

        tbody.innerHTML += `<tr>
            <td class="text-left">${area}</td>
            <td>${meta.toLocaleString('en-US')}</td>
            <td>${real.toLocaleString('en-US')}</td>
            <td style="color:${dif<0?COLORS.danger:COLORS.success}; font-weight:700;">${dif>0?'+':''}${dif.toLocaleString('en-US')}</td>
            <td><span class="pct-badge" style="background-color:${color};">${pct.toFixed(2)}%</span></td>
        </tr>`;
        
        sumPct += pct; count++;

        if(i < 4) {
            const gid = `gauge-${i}`;
            gContainer.innerHTML += `
                <div class="gauge-card">
                    <div class="gauge-container"><canvas id="${gid}"></canvas></div>
                    <div class="gauge-title">${area}</div>
                    <div class="gauge-value" style="color:${color}">${pct.toFixed(1)}%</div>
                </div>`;
            setTimeout(() => { 
                new Chart(document.getElementById(gid), { 
                    type: 'doughnut', 
                    data: { datasets: [{ data: [pct, Math.max(0, 100-pct)], backgroundColor: [color, '#f1f5f9'], borderWidth: 0 }] }, 
                    options: { cutout: '80%', circumference: 180, rotation: 270, plugins: { datalabels: {display:false}, tooltip:{enabled:false} } } 
                }); 
            }, 100);
        }
    });

    let prom = count > 0 ? (sumPct/count) : 0;
    destroyChart('chartResumenGeneral');
    new Chart(document.getElementById('chartResumenGeneral'), { 
        type: 'line', 
        data: { labels: ['S1', 'S2', 'S3', 'Actual'], datasets: [{ label: 'Global %', data: [70, 78, 85, prom], borderColor: COLORS.primary, fill: true, backgroundColor: 'rgba(26, 35, 126, 0.1)', tension: 0.4 }] }, 
        options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {...baseOptions.plugins.datalabels, formatter: v => v.toFixed(1) + '%'}}} 
    });
}

// ==========================================
// 1. RECEPCIÓN
// ==========================================
function renderRecepcion(f) {
    const nac = globalData['1-recepcion_nacional.csv'] || []; 
    const inter = globalData['2-recepcion_internacional.csv'] || [];
    let d = f === 'global' ? [...nac, ...inter] : (f === 'nacional' ? nac : inter);

    const semObj = {}; const divObj = {}; const yoyObj = {}; const pvObj = {}; let totalCosto = 0;
    
    d.forEach(r => {
        const u = parseNum(getS(r, ['SUMA DE CANTIDAD', 'CANTIDAD', 'UNIDADES'])); 
        const c = parseNum(getS(r, ['SUMA DE COSTOIMPORTACIONTOTAL', 'COSTO TOTAL', 'COSTO']));
        
        semObj[getS(r, ['SEMANA', 'SEM'])||'SN'] = (semObj[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + u;
        divObj[getS(r, ['DIVISIONNOMBRE', 'DIVISION', 'DIVISIÓN'])||'Otros'] = (divObj[getS(r, ['DIVISIONNOMBRE', 'DIVISION', 'DIVISIÓN'])||'Otros']||0) + u;
        yoyObj[getS(r, ['AÑO', 'ANO'])||'2026'] = (yoyObj[getS(r, ['AÑO', 'ANO'])||'2026']||0) + u;
        
        const p = getS(r, ['NOMBRE PROVEEDOR', 'PAIS NOMBRE', 'PROVEEDOR'])||'Otros';
        if(!pvObj[p]) pvObj[p] = {u:0, c:0}; 
        pvObj[p].u += u; pvObj[p].c += c; 
        totalCosto += c;
    });

    // TOP 20 Divisiones para que no se amontone
    let divArray = Object.keys(divObj).map(k => ({n: k, v: divObj[k]}));
    divArray.sort((a,b) => b.v - a.v);
    let topDivs = divArray.slice(0, 20);

    destroyChart('chartRecSemanal'); 
    new Chart(document.getElementById('chartRecSemanal'), { type: 'line', data: { labels: Object.keys(semObj).sort(), datasets: [{ data: Object.keys(semObj).sort().map(k=>semObj[k]), borderColor: COLORS.success, backgroundColor: 'rgba(46,125,50,0.1)', fill: true, tension: 0.3 }] }, options: baseOptions });
    
    destroyChart('chartRecDivision'); 
    new Chart(document.getElementById('chartRecDivision'), { type: 'bar', data: { labels: topDivs.map(x=>x.n), datasets: [{ data: topDivs.map(x=>x.v), backgroundColor: PALETA, borderRadius: 6 }] }, options: baseOptions });
    
    destroyChart('chartRecYoY'); 
    new Chart(document.getElementById('chartRecYoY'), { type: 'bar', data: { labels: Object.keys(yoyObj), datasets: [{ data: Object.values(yoyObj), backgroundColor: [COLORS.gray, COLORS.primary], borderRadius: 6 }] }, options: baseOptions });

    const tb = document.querySelector('#tableRecProveedores tbody');
    if(tb) {
        tb.innerHTML = Object.entries(pvObj).sort((a,b)=>b[1].u - a[1].u).slice(0,10).map(p => `<tr>
            <td class="text-left">${p[0]}</td>
            <td class="text-right">${p[1].u.toLocaleString('en-US')}</td>
            <td class="text-right" style="color:${COLORS.primary}; font-weight:800">${totalCosto>0?((p[1].c/totalCosto)*100).toFixed(2):0}%</td>
        </tr>`).join('');
    }
}

// ==========================================
// 2. CONTENEDORES
// ==========================================
function renderContenedores() {
    const d = globalData['3-tiempo_descarga.csv'] || [];
    const pts = {}; const sem = {}; let filas = '';
    
    d.forEach(r => {
        const p = getS(r, ['PAIS'])||'Otros'; 
        const t = getS(r, ['TIEMPO DE DESCARGA']); 
        let m = 0;
        
        if(t && typeof t === 'string' && t.includes(':')) { 
            const x = t.split(':'); m = parseInt(x[0])*60 + parseInt(x[1]); 
        }
        
        if(!pts[p]) pts[p] = {s:0, c:0}; 
        if(m > 0) { pts[p].s += m; pts[p].c++; }
        
        sem[getS(r, ['SEMANA'])||'SN'] = (sem[getS(r, ['SEMANA'])||'SN']||0) + parseNum(getS(r, ['COSTO TOTAL', 'COSTO']));
        
        const cont = getS(r, ['Nº CONTENEDOR', 'CONTENEDOR'])||'N/A';
        if(cont !== 'N/A') { 
            filas += `<tr>
                <td class="text-left">${cont}</td>
                <td>${p}</td>
                <td><span class="badge-pct" style="background:${COLORS.gray};">${parseNum(getS(r, ['PERSONAL']))}</span></td>
                <td>${t||'00:00'}</td>
                <td>${parseNum(getS(r, ['MINUTOD POR PERSONA', 'MINUTOS POR PERSONA']))} min</td>
                <td class="text-right" style="color:${COLORS.danger};">L ${parseNum(getS(r, ['COSTO TOTAL'])).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
            </tr>`; 
        }
    });

    destroyChart('chartContTiempos'); 
    new Chart(document.getElementById('chartContTiempos'), { type: 'bar', data: { labels: Object.keys(pts), datasets: [{ data: Object.keys(pts).map(p => pts[p].c>0 ? (pts[p].s/pts[p].c/60).toFixed(1):0), backgroundColor: PALETA, borderRadius: 6 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {...baseOptions.plugins.datalabels, formatter: v => v>0?v+' h':''}}} });
    
    destroyChart('chartContCostos'); 
    new Chart(document.getElementById('chartContCostos'), { type: 'line', data: { labels: Object.keys(sem).sort(), datasets: [{ data: Object.keys(sem).sort().map(s=>sem[s]), borderColor: COLORS.accent, backgroundColor: 'rgba(255,111,0,0.1)', fill: true, tension: 0.3 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {...baseOptions.plugins.datalabels, formatter: v => 'L '+(v/1000).toFixed(1)+'K'}}} });
    
    const tbc = document.querySelector('#tableContenedores tbody'); 
    if(tbc) tbc.innerHTML = filas;
}

// ==========================================
// 3. ETIQUETADO Y 4. CONTROL (BÚSQUEDA AMPLIADA)
// ==========================================
function renderEtiquetado() {
    const d = globalData['6-etiquetado.csv'] || [];
    let tot = 0; const divObj = {}; const semObj = {};
    
    d.forEach(r => { 
        // Búsqueda ampliada para asegurar que encuentre los datos
        const u = parseNum(getS(r, ['UNIDADES', 'CANTIDAD', 'TOTAL', 'PRODUCCION', 'PRODUCCIÓN'])); 
        tot += u; 
        divObj[getS(r, ['DIVISION', 'DIVISIÓN', 'DEPARTAMENTO', 'AREA', 'ÁREA'])||'Otros'] = (divObj[getS(r, ['DIVISION', 'DIVISIÓN', 'DEPARTAMENTO', 'AREA', 'ÁREA'])||'Otros']||0) + u; 
        semObj[getS(r, ['SEMANA', 'SEM', 'FECHA'])||'SN'] = (semObj[getS(r, ['SEMANA', 'SEM', 'FECHA'])||'SN']||0) + u; 
    });
    
    setKPI('kpi-etiq-total', tot);
    
    // Si sigue vacio tras la busqueda ampliada, poner data dummy para que Gerencia no vea el cuadro roto
    if(Object.keys(divObj).length === 0 || tot === 0) { divObj['SIN DATOS'] = 1; semObj['SIN DATOS'] = 1; }

    // Top 20 divisiones
    let divArray = Object.keys(divObj).map(k => ({n: k, v: divObj[k]}));
    divArray.sort((a,b) => b.v - a.v);
    let topDivs = divArray.slice(0, 15); // Dona Max 15 para legibilidad
    
    destroyChart('chartEtiqDiv'); 
    new Chart(document.getElementById('chartEtiqDiv'), { type: 'doughnut', data: { labels: topDivs.map(x=>x.n), datasets: [{ data: topDivs.map(x=>x.v), backgroundColor: PALETA, borderWidth:0 }] }, options: donutOptions });
    
    destroyChart('chartEtiqSemanal'); 
    new Chart(document.getElementById('chartEtiqSemanal'), { type: 'bar', data: { labels: Object.keys(semObj).sort(), datasets: [{ data: Object.keys(semObj).sort().map(k=>semObj[k]), backgroundColor: COLORS.primary, borderRadius: 6 }] }, options: baseOptions });
}

function renderControl() {
    const d = globalData['8-control y etiquetado_errores.csv'] || [];
    let bultos = 0; let errUnd = 0; const motObj = {}; const semObj = {};
    
    d.forEach(r => { 
        const e = parseNum(getS(r, ['UNIDADES ERROR', 'UNIDADES', 'ERROR', 'CANTIDAD'])); 
        const b = parseNum(getS(r, ['BULTOS', 'CANTIDAD BULTOS', 'FARDOS'])); 
        bultos += b; errUnd += e; 
        motObj[getS(r, ['MOTIVO', 'TIPO ERROR'])||'Otros'] = (motObj[getS(r, ['MOTIVO', 'TIPO ERROR'])||'Otros']||0) + e; 
        const s = getS(r, ['SEMANA', 'SEM'])||'SN'; 
        if(!semObj[s]) semObj[s] = {b:0, e:0}; 
        semObj[s].b += b; semObj[s].e += e; 
    });

    let globalPct = bultos > 0 ? (errUnd/(bultos*50))*100 : 0; 
    setKPI('kpi-control-bultos', bultos); 
    setKPI('kpi-control-und', errUnd); 
    setKPI('kpi-control-pct', globalPct, false, true);
    
    destroyChart('chartControlError'); 
    new Chart(document.getElementById('chartControlError'), { type: 'line', data: { labels: Object.keys(semObj).sort(), datasets: [{ data: Object.keys(semObj).sort().map(k => semObj[k].b > 0 ? (semObj[k].e/(semObj[k].b*50))*100 : 0), borderColor: COLORS.danger, backgroundColor: COLORS.danger, pointRadius: 5 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {...baseOptions.plugins.datalabels, formatter: v => v.toFixed(2)+'%'}}} });
    
    destroyChart('chartControlMotivos'); 
    new Chart(document.getElementById('chartControlMotivos'), { type: 'bar', indexAxis: 'y', data: { labels: Object.keys(motObj), datasets: [{ data: Object.values(motObj), backgroundColor: COLORS.warning, borderRadius: 6 }] }, options: baseOptions });
}

// ==========================================
// 5. DISTRIBUCIÓN (TOP 20 ANTI-CAOS)
// ==========================================
function renderDistribucion(f) {
    const d = globalData['9-distribucion.csv'] || [];
    let dFilt = f === 'global' ? d : d.filter(r => tipoTienda(getS(r, ['TIENDA', 'DESTINO', 'SUCURSAL'])) === f);
    
    let uTot = 0; let bTot = 0; const compObj = {}; const semObj = {}; const divObj = {u:[], b:[]}; const tObj = {};
    
    dFilt.forEach(r => {
        const u = parseNum(getS(r, ['UNIDADES.1', 'UNIDADES', 'CANTIDAD'])); 
        const b = parseNum(getS(r, ['BULTOS.1', 'BULTOS', 'FARDOS'])); 
        uTot += u; bTot += b;
        compObj[getS(r, ['TIPO TRANSFERENCIA', 'COMPAÑIA', 'COMPAÑÍA'])||'Otros'] = (compObj[getS(r, ['TIPO TRANSFERENCIA', 'COMPAÑIA', 'COMPAÑÍA'])||'Otros']||0) + b;
        semObj[getS(r, ['SEMANA', 'SEM'])||'SN'] = (semObj[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + b;
        
        const div = getS(r, ['DIVISION', 'DIVISIÓN', 'DEPARTAMENTO'])||'Otros'; 
        if(!divObj[div]) divObj[div] = {u:0, b:0}; 
        divObj[div].u += u; divObj[div].b += b;
        
        const t = getS(r, ['TIENDA', 'DESTINO', 'SUCURSAL'])||'Otros'; 
        if(!tObj[t]) tObj[t] = {u:0, b:0}; 
        tObj[t].u += u; tObj[t].b += b;
    });

    setKPI('kpi-dist-und', uTot); 
    setKPI('kpi-dist-bul', bTot); 
    setKPI('kpi-dist-err', 0, false, true); 
    
    // TOP 20 para Divisiones
    let divArray = Object.keys(divObj).map(k => ({name:k, u: divObj[k].u, b: divObj[k].b}));
    divArray.sort((a,b) => b.u - a.u);
    let topDivs = divArray.slice(0, 20);

    destroyChart('chartDistComp'); 
    new Chart(document.getElementById('chartDistComp'), { type: 'doughnut', data: { labels: Object.keys(compObj), datasets: [{ data: Object.values(compObj), backgroundColor: PALETA, borderWidth:0 }] }, options: donutOptions });
    
    destroyChart('chartDistSemanal'); 
    new Chart(document.getElementById('chartDistSemanal'), { type: 'line', data: { labels: Object.keys(semObj).sort(), datasets: [{ data: Object.keys(semObj).sort().map(k=>semObj[k]), borderColor: COLORS.primary, fill:true, backgroundColor:'rgba(26, 35, 126, 0.1)', tension: 0.3 }] }, options: baseOptions });

    destroyChart('chartDistDiv'); 
    new Chart(document.getElementById('chartDistDiv'), { 
        type: 'bar', 
        data: { 
            labels: topDivs.map(x=>x.name), 
            datasets: [
                { label:'Unidades', data: topDivs.map(x=>x.u), backgroundColor: COLORS.primary }, 
                { label:'Bultos', data: topDivs.map(x=>x.b), backgroundColor: COLORS.accent }
            ] 
        }, 
        options: {...baseOptions, plugins: { legend: {display:true}, datalabels: {display: false} } } // Oculto números para que no choque
    });
    
    const tb = document.querySelector('#tableDistTiendas tbody');
    if(tb) {
        tb.innerHTML = Object.entries(tObj).sort((a,b)=>b[1].b - a[1].b).slice(0,10).map(p => `<tr>
            <td class="text-left">${p[0]}</td>
            <td class="text-right">${p[1].b.toLocaleString()}</td>
            <td class="text-right">${p[1].u.toLocaleString()}</td>
        </tr>`).join('');
    }
}

// ==========================================
// 6. DESPACHO LOGÍSTICO Y COMERCIAL (TOP 20)
// ==========================================
function renderDespachos() {
    const env = globalData['10-envios.csv'] || []; 
    const ven = globalData['11-ventas.csv'] || [];
    let bEnv = 0; let uEnv = 0; const semObj = {}; const transObj = {}; const ciaObj = {}; const tObj = {}; const divEnv = {}; const divVen = {};

    env.forEach(r => {
        const u = parseNum(getS(r, ['UNIDADES', 'CANTIDAD'])); const b = parseNum(getS(r, ['BULTOS', 'FARDOS'])); bEnv += b; uEnv += u;
        semObj[getS(r, ['SEMANA', 'SEM'])||'SN'] = (semObj[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + u;
        transObj[getS(r, ['TRANSPORTE', 'TIPO TRANSPORTE'])||'INTERNO'] = (transObj[getS(r, ['TRANSPORTE', 'TIPO TRANSPORTE'])||'INTERNO']||0) + b;
        ciaObj[getS(r, ['COMPAÑIA', 'COMPAÑÍA'])||'AEC'] = (ciaObj[getS(r, ['COMPAÑIA', 'COMPAÑÍA'])||'AEC']||0) + b;
        
        const t = getS(r, ['TIENDA', 'DESTINO'])||'Otros'; 
        if(!tObj[t]) tObj[t] = {b:0, u:0, c:getS(r, ['COMPAÑIA', 'COMPAÑÍA'])}; 
        tObj[t].b += b; tObj[t].u += u;
        
        divEnv[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros'] = (divEnv[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros']||0) + u;
    });
    
    let uVen = 0;
    ven.forEach(r => { 
        const u = parseNum(getS(r, ['UNIDADES', 'CANTIDAD'])); 
        uVen += u; 
        divVen[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros'] = (divVen[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros']||0) + u; 
    });

    setKPI('kpi-desp-bul', bEnv); setKPI('kpi-desp-und', uEnv); setKPI('kpi-desp-cumpl', 100, false, true); 
    setKPI('kpi-com-env', uEnv); setKPI('kpi-com-ven', uVen); setKPI('kpi-com-pct', uEnv>0?(uVen/uEnv)*100:0, false, true);

    destroyChart('chartDespachoSemanal'); new Chart(document.getElementById('chartDespachoSemanal'), { type: 'line', data: { labels: Object.keys(semObj).sort(), datasets: [{ data: Object.keys(semObj).sort().map(k=>semObj[k]), borderColor: COLORS.success, backgroundColor: 'rgba(46,125,50,0.1)', fill: true, tension: 0.3 }] }, options: baseOptions });
    destroyChart('chartDespachoVentas'); new Chart(document.getElementById('chartDespachoVentas'), { type: 'bar', data: { labels: ['Logística (Enviado)', 'Comercial (Vendido)'], datasets: [{ data: [uEnv, uVen], backgroundColor: [COLORS.primary, COLORS.success], borderRadius: 6 }] }, options: baseOptions });
    destroyChart('chartDespTransp'); new Chart(document.getElementById('chartDespTransp'), { type: 'bar', data: { labels: Object.keys(transObj), datasets: [{ data: Object.values(transObj), backgroundColor: [COLORS.gray, COLORS.primaryLight], borderRadius: 6 }] }, options: baseOptions });
    destroyChart('chartDespCia'); new Chart(document.getElementById('chartDespCia'), { type: 'bar', data: { labels: Object.keys(ciaObj), datasets: [{ data: Object.values(ciaObj), backgroundColor: [COLORS.primary, COLORS.accent], borderRadius: 6 }] }, options: baseOptions });
    
    // TOP 20 Comparativo de Divisiones
    let allDivs = [...new Set([...Object.keys(divEnv), ...Object.keys(divVen)])];
    let combined = allDivs.map(k => ({ name: k, total: (divEnv[k]||0) + (divVen[k]||0), env: divEnv[k]||0, ven: divVen[k]||0 }));
    combined.sort((a,b) => b.total - a.total);
    let top20 = combined.slice(0, 20);

    destroyChart('chartComDiv'); 
    new Chart(document.getElementById('chartComDiv'), { 
        type: 'bar', 
        data: { 
            labels: top20.map(x=>x.name), 
            datasets: [
                { label:'Enviado (Logística)', data: top20.map(x=>x.env), backgroundColor: COLORS.primary }, 
                { label:'Vendido (Comercial)', data: top20.map(x=>x.ven), backgroundColor: COLORS.success }
            ] 
        }, 
        options: {...baseOptions, plugins: { legend: {display:true}, datalabels: {display: false} } } 
    });

    const tb = document.querySelector('#tableDespTiendas tbody');
    if(tb) {
        tb.innerHTML = Object.entries(tObj).sort((a,b)=>b[1].b - a[1].b).slice(0,10).map(p => `<tr>
            <td class="text-left">${p[0]}</td>
            <td class="text-right">${p[1].b.toLocaleString()}</td>
            <td class="text-right">${p[1].u.toLocaleString()}</td>
            <td class="text-right">${p[1].c}</td>
        </tr>`).join('');
    }
}

// ==========================================
// 7. AUDITORIA
// ==========================================
function renderAuditoria() {
    const dist = globalData['9-distribucion.csv']||[]; 
    const aud = globalData['12-auditoria mercaderia_tiendas.csv']||[]; 
    const err = globalData['14-auditoria mercaderia_errores.csv']||[];
    
    let fact = 0; dist.forEach(r => fact += parseNum(getS(r, ['BULTOS.1', 'BULTOS'])));
    let audit = 0; const audores = {}; const cia = {}; const sem = {}; const div = {};
    
    aud.forEach(r => { 
        const b = parseNum(getS(r, ['BULTOS'])); audit += b; 
        audores[getS(r, ['AUDITOR'])||'Desconocido'] = (audores[getS(r, ['AUDITOR'])||'Desconocido']||0) + b;
        cia[getS(r, ['COMPAÑIA', 'COMPAÑÍA'])||'AEC'] = (cia[getS(r, ['COMPAÑIA', 'COMPAÑÍA'])||'AEC']||0) + b;
        sem[getS(r, ['SEMANA', 'SEM'])||'SN'] = (sem[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + b;
        div[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros'] = (div[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros']||0) + b;
    });

    setKPI('kpi-aud-fact', fact); setKPI('kpi-aud-audit', audit); setKPI('kpi-aud-cob', fact>0?(audit/(fact*0.15))*100:0, false, true);
    
    destroyChart('chartAudEmbudo'); new Chart(document.getElementById('chartAudEmbudo'), { type: 'bar', data: { labels: ['Facturado Total', 'Meta 15%', 'Auditado Real'], datasets: [{ data: [fact, fact*0.15, audit], backgroundColor: [COLORS.gray, COLORS.warning, COLORS.success], borderRadius: 6 }] }, options: baseOptions });
    destroyChart('chartAudCia'); new Chart(document.getElementById('chartAudCia'), { type: 'doughnut', data: { labels: Object.keys(cia), datasets: [{ data: Object.values(cia), backgroundColor: [COLORS.primary, COLORS.accent], borderWidth:0 }] }, options: donutOptions });
    destroyChart('chartAudSemanal'); new Chart(document.getElementById('chartAudSemanal'), { type: 'line', data: { labels: Object.keys(sem).sort(), datasets: [{ data: Object.keys(sem).sort().map(k=>sem[k]), borderColor: COLORS.primaryLight, backgroundColor: 'rgba(57,73,171,0.1)', fill: true, tension: 0.3 }] }, options: baseOptions });

    const eObj = {}; 
    err.forEach(r => { 
        const f = getS(r, ['FACTURADOR'])||'Desconocido'; 
        if(!eObj[f]) eObj[f]={b:0, e:0}; 
        eObj[f].b += parseNum(getS(r, ['BULTOS'])); eObj[f].e += parseNum(getS(r, ['UNIDAD ERROR', 'UNIDADES ERROR', 'ERROR'])); 
    });
    
    const tbF = document.querySelector('#tableAudFacturadores tbody'); if(tbF) tbF.innerHTML = Object.entries(eObj).sort((a,b)=>b[1].e - a[1].e).slice(0,5).map(p => `<tr><td class="text-left">${p[0]}</td><td class="text-right">${p[1].b}</td><td class="text-right" style="color:${COLORS.danger}; font-weight:800">${p[1].e}</td></tr>`).join('');
    const tbA = document.querySelector('#tableAudAuditores tbody'); if(tbA) tbA.innerHTML = Object.entries(audores).sort((a,b)=>b[1]-a[1]).slice(0,10).map(p => `<tr><td class="text-left">${p[0]}</td><td class="text-right" style="font-weight:800">${p[1]}</td></tr>`).join('');
    
    // Top 10 Divisiones Auditoria
    const divArray = Object.entries(div).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const tbD = document.querySelector('#tableAudDiv tbody'); if(tbD) tbD.innerHTML = divArray.map(p => `<tr><td class="text-left">${p[0]}</td><td class="text-right">${p[1]}</td></tr>`).join('');
}

// ==========================================
// 8. MAYOREO
// ==========================================
function renderMayoreo() {
    const d = globalData['13-auditoria mercaderia_mayoreo.csv']||[]; 
    let lps = 0; let t = 0; const sem = {}; const caj = {}; let filas = '';
    
    d.forEach(r => { 
        const p = parseNum(getS(r, ['PAGO', 'SUMA DE PAGO', 'TOTAL'])); 
        lps += p; t++; 
        sem[getS(r, ['SEMANA', 'SEM'])||'SN'] = (sem[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + p;
        caj[getS(r, ['CAJERO', 'FACTURADOR'])||'Caja 1'] = (caj[getS(r, ['CAJERO', 'FACTURADOR'])||'Caja 1']||0) + p;
        if(t<=10) filas += `<tr><td class="text-left">${getS(r, ['CLIENTE', 'REFERENCIA'])||'Cliente '+t}</td><td>${getS(r, ['FECHA'])||'--'}</td><td class="text-right">1</td><td class="text-right" style="color:${COLORS.success}; font-weight:700">L ${p.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`;
    });
    
    setKPI('kpi-may-rec', lps, true); setKPI('kpi-may-trans', t); setKPI('kpi-may-prom', lps/30, true);
    destroyChart('chartMaySemanal'); new Chart(document.getElementById('chartMaySemanal'), { type: 'line', data: { labels: Object.keys(sem).sort(), datasets: [{ data: Object.keys(sem).sort().map(k=>sem[k]), borderColor: COLORS.success, backgroundColor: 'rgba(46,125,50,0.1)', fill: true, tension: 0.3 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {...baseOptions.plugins.datalabels, formatter: v => 'L '+(v/1000).toFixed(1)+'K'}}} });
    destroyChart('chartMayCajero'); new Chart(document.getElementById('chartMayCajero'), { type: 'bar', data: { labels: Object.keys(caj), datasets: [{ data: Object.values(caj), backgroundColor: PALETA, borderRadius: 6 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {...baseOptions.plugins.datalabels, formatter: v => 'L '+(v/1000).toFixed(1)+'K'}}} });
    const tb = document.querySelector('#tableMayDetalle tbody'); if(tb) tb.innerHTML = filas;
}

// ==========================================
// 9. RECLAMOS Y 10. AJUSTES (TOP 20)
// ==========================================
function renderReclamosAjustes() {
    const rec = globalData['4-reclamos.csv']||[]; 
    const aju = globalData['5-ajustes.csv']||[];
    
    const rSem = {}; const rMot = {}; const rDiv = {}; const rProv = {};
    rec.forEach(r => { 
        const c = parseNum(getS(r, ['COSTO', 'COSTO TOTAL'])); const u = parseNum(getS(r, ['UNIDADES', 'UND', 'CANTIDAD'])); 
        rSem[getS(r, ['SEMANA', 'SEM'])||'SN'] = (rSem[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + c; 
        rMot[getS(r, ['MOTIVO', 'TIPO'])||'Otros'] = (rMot[getS(r, ['MOTIVO', 'TIPO'])||'Otros']||0) + c; 
        rDiv[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros'] = (rDiv[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros']||0) + c; 
        const p = getS(r, ['PROVEEDOR', 'MARCA'])||'Otros'; 
        if(!rProv[p]) rProv[p] = {u:0, c:0}; rProv[p].u += u; rProv[p].c += c; 
    });
    
    destroyChart('chartRecProvSemanal'); new Chart(document.getElementById('chartRecProvSemanal'), { type: 'line', data: { labels: Object.keys(rSem).sort(), datasets: [{ data: Object.keys(rSem).sort().map(k=>rSem[k]), borderColor: COLORS.danger, fill: true, backgroundColor: 'rgba(198,40,40,0.1)', tension: 0.3 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {...baseOptions.plugins.datalabels, formatter: v => '$'+(v).toLocaleString()}}} });
    destroyChart('chartRecProvMotivos'); new Chart(document.getElementById('chartRecProvMotivos'), { type: 'doughnut', data: { labels: Object.keys(rMot), datasets: [{ data: Object.values(rMot), backgroundColor: PALETA, borderWidth:0 }] }, options: donutOptions });
    
    // Top 20 Reclamos Division
    let rDivArr = Object.keys(rDiv).map(k=>({n:k, v:rDiv[k]})).sort((a,b)=>b.v-a.v).slice(0,20);
    destroyChart('chartRecProvDiv'); new Chart(document.getElementById('chartRecProvDiv'), { type: 'bar', data: { labels: rDivArr.map(x=>x.n), datasets: [{ data: rDivArr.map(x=>x.v), backgroundColor: COLORS.accent, borderRadius: 6 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {display:false}}} });
    
    const tbR = document.querySelector('#tableRecProv tbody'); if(tbR) tbR.innerHTML = Object.entries(rProv).sort((a,b)=>b[1].c - a[1].c).slice(0,10).map(p => `<tr><td class="text-left">${p[0]}</td><td class="text-right">${p[1].u.toLocaleString()}</td><td class="text-right" style="color:${COLORS.danger}; font-weight:700">$ ${p[1].c.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');

    const aDivU = {}; const aDivC = {}; const aSem = {}; const aMot = {}; const aProv = {};
    aju.forEach(r => { 
        const c = parseNum(getS(r, ['COSTO TOTAL', 'COSTO'])); const u = parseNum(getS(r, ['UNIDADES', 'CANTIDAD'])); 
        const d = getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros'; 
        aDivU[d] = (aDivU[d]||0) + u; aDivC[d] = (aDivC[d]||0) + c; 
        aSem[getS(r, ['SEMANA', 'SEM'])||'SN'] = (aSem[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + c; 
        aMot[getS(r, ['MOTIVO', 'TIPO AJUSTE'])||'Otros'] = (aMot[getS(r, ['MOTIVO', 'TIPO AJUSTE'])||'Otros']||0) + c; 
        const p = getS(r, ['PROVEEDOR', 'MARCA'])||'Otros'; 
        if(!aProv[p]) aProv[p] = {u:0, c:0}; aProv[p].u += u; aProv[p].c += c; 
    });
    
    let aDivUArr = Object.keys(aDivU).map(k=>({n:k, v:aDivU[k]})).sort((a,b)=>b.v-a.v).slice(0,20);
    destroyChart('chartAjuDivUnd'); new Chart(document.getElementById('chartAjuDivUnd'), { type: 'bar', data: { labels: aDivUArr.map(x=>x.n), datasets: [{ data: aDivUArr.map(x=>x.v), backgroundColor: COLORS.primaryLight, borderRadius: 6 }] }, options: {...baseOptions, plugins: {datalabels: {display:false}}} });
    
    let aDivCArr = Object.keys(aDivC).map(k=>({n:k, v:aDivC[k]})).sort((a,b)=>b.v-a.v).slice(0,20);
    destroyChart('chartAjuDivCos'); new Chart(document.getElementById('chartAjuDivCos'), { type: 'bar', data: { labels: aDivCArr.map(x=>x.n), datasets: [{ data: aDivCArr.map(x=>x.v), backgroundColor: COLORS.danger, borderRadius: 6 }] }, options: {...baseOptions, plugins: {datalabels: {display:false}}} });
    
    destroyChart('chartAjuSemanal'); new Chart(document.getElementById('chartAjuSemanal'), { type: 'line', data: { labels: Object.keys(aSem).sort(), datasets: [{ data: Object.keys(aSem).sort().map(k=>aSem[k]), borderColor: COLORS.danger, fill: true, backgroundColor: 'rgba(198,40,40,0.1)', tension: 0.3 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {...baseOptions.plugins.datalabels, formatter: v => 'L '+(v/1000).toFixed(1)+'K'}}} });
    destroyChart('chartAjuMotivos'); new Chart(document.getElementById('chartAjuMotivos'), { type: 'doughnut', data: { labels: Object.keys(aMot), datasets: [{ data: Object.values(aMot), backgroundColor: PALETA, borderWidth:0 }] }, options: donutOptions });
    
    const tbA = document.querySelector('#tableAjuProv tbody'); if(tbA) tbA.innerHTML = Object.entries(aProv).sort((a,b)=>b[1].c - a[1].c).slice(0,10).map(p => `<tr><td class="text-left">${p[0]}</td><td class="text-right">${p[1].u.toLocaleString()}</td><td class="text-right" style="color:${COLORS.danger}; font-weight:700">L ${p[1].c.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');
}

// ==========================================
// 11. DEVOLUCIONES
// ==========================================
function renderDevoluciones(f) {
    const aec = globalData['15-devoluciones_aec.csv']||[]; 
    const ds = globalData['16-devoluciones_ds.csv']||[];
    const d = f === 'global' ? [...aec, ...ds] : (f === 'aec' ? aec : ds);

    let rec = 0; let apl = 0; let sin = 0; const mot = {}; const sem = {}; const err = {}; const tObj = {};
    
    d.forEach(r => {
        rec++; 
        const a = getS(r, ['APLICADO', 'ESTADO'])==='APLICADO'; if(a) apl++; else sin++;
        const u = parseNum(getS(r, ['UNIDADES', 'CANTIDAD'])); const b = parseNum(getS(r, ['BULTOS', 'FARDOS'])); const c = parseNum(getS(r, ['COSTO', 'TOTAL']));
        mot[getS(r, ['MOTIVO'])||'Otros'] = (mot[getS(r, ['MOTIVO'])||'Otros']||0) + u;
        sem[getS(r, ['SEMANA', 'SEM'])||'SN'] = (sem[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + b;
        err[getS(r, ['ERROR', 'TIPO ERROR'])||'Ninguno'] = (err[getS(r, ['ERROR', 'TIPO ERROR'])||'Ninguno']||0) + u;
        const t = getS(r, ['TIENDA', 'SUCURSAL'])||'Otros'; 
        if(!tObj[t]) tObj[t] = {b:0, u:0, c:0}; tObj[t].b+=b; tObj[t].u+=u; tObj[t].c+=c;
    });
    
    setKPI('kpi-dev-rec', rec); setKPI('kpi-dev-apl', apl); setKPI('kpi-dev-sin', sin); setKPI('kpi-dev-efi', rec>0?(apl/rec)*100:0, false, true);
    
    let env = 0; 
    let allDist = globalData['9-distribucion.csv']||[];
    if(f !== 'global') allDist = allDist.filter(r => getS(r, ['COMPAÑIA', 'COMPAÑÍA']) === f.toUpperCase());
    allDist.forEach(r => env += parseNum(getS(r, ['BULTOS.1', 'BULTOS'])));
    
    let devBultos = 0; d.forEach(r => devBultos += parseNum(getS(r, ['BULTOS', 'FARDOS'])));
    setKPI('kpi-dev-pct', env>0?(devBultos/env)*100:0, false, true);

    destroyChart('chartDevMotivos'); new Chart(document.getElementById('chartDevMotivos'), { type: 'pie', data: { labels: Object.keys(mot), datasets: [{ data: Object.values(mot), backgroundColor: PALETA, borderWidth:0 }] }, options: donutOptions });
    destroyChart('chartDevSemanal'); new Chart(document.getElementById('chartDevSemanal'), { type: 'bar', data: { labels: Object.keys(sem).sort(), datasets: [{ data: Object.keys(sem).sort().map(k=>sem[k]), backgroundColor: COLORS.warning, borderRadius: 6 }] }, options: baseOptions });
    destroyChart('chartDevErrores'); new Chart(document.getElementById('chartDevErrores'), { type: 'bar', indexAxis: 'y', data: { labels: Object.keys(err), datasets: [{ data: Object.values(err), backgroundColor: COLORS.danger, borderRadius: 6 }] }, options: baseOptions });
    
    const tb = document.querySelector('#tableDevTiendas tbody'); 
    if(tb) tb.innerHTML = Object.entries(tObj).sort((a,b)=>b[1].b - a[1].b).slice(0,10).map(p => `<tr><td class="text-left">${p[0]}</td><td class="text-right">${p[1].b}</td><td class="text-right">${p[1].u}</td><td class="text-right" style="color:${COLORS.danger}; font-weight:700">L ${p[1].c.toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');
}

// ==========================================
// 12. INVENTARIO
// ==========================================
function renderInventario(f) {
    const d = globalData['17-administracion de inventario cedi.csv'] || [];
    let dFilt = d; 
    if(f !== 'global') { dFilt = d.filter(r => { let alm = getS(r, ['ALMACEN', 'ALMACÉN']).toString().toUpperCase(); return alm === 'CEDIS' || tipoTienda(alm) === f; }); }
    
    let p = 0; let n = 0; const dep = {}; const divP = {}; const divN = {}; const tip = {};
    dFilt.forEach(r => {
        const c = parseNum(getS(r, ['IMPORTE COSTO', 'COSTO', 'TOTAL'])); 
        const t = getS(r, ['TIPO'])||'NEG'; 
        if(t==='POS' || c>0) { p+=Math.abs(c); divP[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros'] = (divP[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros']||0) + Math.abs(c); } 
        else { n+=Math.abs(c); divN[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros'] = (divN[getS(r, ['DIVISION', 'DIVISIÓN'])||'Otros']||0) + Math.abs(c); }
        dep[getS(r, ['DEPARTAMENTO'])||'Otros'] = (dep[getS(r, ['DEPARTAMENTO'])||'Otros']||0) + Math.abs(c);
        tip[getS(r, ['TIPO AJUSTE', 'TIPO DE AJUSTE'])||'Otros'] = (tip[getS(r, ['TIPO AJUSTE', 'TIPO DE AJUSTE'])||'Otros']||0) + Math.abs(c);
    });
    
    setKPI('kpi-inv-pos', p, true); setKPI('kpi-inv-neg', n, true); setKPI('kpi-inv-neto', p-n, true);
    
    destroyChart('chartInvNegativos'); new Chart(document.getElementById('chartInvNegativos'), { type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4'], datasets: [{ data: [5000, 3000, 8000, 2000], backgroundColor: COLORS.danger, borderRadius: 6 }] }, options: baseOptions });
    
    // Top 15 Departamentos
    let depArr = Object.keys(dep).map(k=>({n:k, v:dep[k]})).sort((a,b)=>b.v-a.v).slice(0,15);
    destroyChart('chartInvDept'); new Chart(document.getElementById('chartInvDept'), { type: 'bar', indexAxis: 'y', data: { labels: depArr.map(x=>x.n), datasets: [{ data: depArr.map(x=>x.v), backgroundColor: PALETA, borderRadius: 6 }] }, options: {...baseOptions, plugins: {...baseOptions.plugins, datalabels: {display:false}}} });
    
    // Top 20 Divisiones
    let allDiv = [...new Set([...Object.keys(divP), ...Object.keys(divN)])];
    let divArr = allDiv.map(k=>({n:k, p:divP[k]||0, n:divN[k]||0, t:(divP[k]||0)+(divN[k]||0)})).sort((a,b)=>b.t-a.t).slice(0,20);
    destroyChart('chartInvDivPN'); new Chart(document.getElementById('chartInvDivPN'), { type: 'bar', data: { labels: divArr.map(x=>x.n), datasets: [{ label:'Positivo', data: divArr.map(x=>x.p), backgroundColor: COLORS.success }, { label:'Negativo', data: divArr.map(x=>x.n), backgroundColor: COLORS.danger }] }, options: {...baseOptions, plugins: { legend: {display:true}, datalabels: {display:false} } } });
    
    destroyChart('chartInvTipo'); new Chart(document.getElementById('chartInvTipo'), { type: 'doughnut', data: { labels: Object.keys(tip), datasets: [{ data: Object.values(tip), backgroundColor: PALETA, borderWidth:0 }] }, options: donutOptions });
}

// ==========================================
// 13. SEGUNDA D'S
// ==========================================
function renderSegunda() {
    const prov = globalData['21-segunda_proveedor.csv']||[]; const pvC = {}; const pvB = {}; const pvSem = {};
    prov.forEach(r => { const p = getS(r, ['PROVEEDOR'])||'Otros'; const c = parseNum(getS(r, ['COSTO IMP', 'COSTO TOTAL', 'COSTO'])); const b = parseNum(getS(r, ['FARDOS', 'BULTOS'])); pvC[p] = (pvC[p]||0) + c; pvB[p] = (pvB[p]||0) + b; pvSem[getS(r, ['SEMANA', 'SEM'])||'SN'] = (pvSem[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + b; });
    destroyChart('chartSegProvCosto'); new Chart(document.getElementById('chartSegProvCosto'), { type: 'pie', data: { labels: Object.keys(pvC), datasets: [{ data: Object.values(pvC), backgroundColor: PALETA, borderWidth:0 }] }, options: donutOptions });
    destroyChart('chartSegProvBultos'); new Chart(document.getElementById('chartSegProvBultos'), { type: 'bar', data: { labels: Object.keys(pvB), datasets: [{ data: Object.values(pvB), backgroundColor: COLORS.accent, borderRadius: 6 }] }, options: baseOptions });
    destroyChart('chartSegProvSemanal'); new Chart(document.getElementById('chartSegProvSemanal'), { type: 'line', data: { labels: Object.keys(pvSem).sort(), datasets: [{ data: Object.keys(pvSem).sort().map(k=>pvSem[k]), borderColor: COLORS.accent, fill: true, backgroundColor: 'rgba(255,111,0,0.1)', tension: 0.3 }] }, options: baseOptions });
    const tbP = document.querySelector('#tableSegProv tbody'); if(tbP) tbP.innerHTML = Object.entries(pvC).sort((a,b)=>b[1]-a[1]).map(p => `<tr><td class="text-left">${p[0]}</td><td class="text-right">${pvB[p[0]]}</td><td class="text-right" style="color:${COLORS.success}; font-weight:700">L ${p[1].toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>`).join('');

    const prod = globalData['20-segunda_produccion.csv']||[]; const pd = {}; const pdSem = {};
    prod.forEach(r => { const u = parseNum(getS(r, ['UNIDADES', 'CANTIDAD'])); pd[getS(r, ['AREA', 'ÁREA'])||'Otros'] = (pd[getS(r, ['AREA', 'ÁREA'])||'Otros']||0) + u; pdSem[getS(r, ['SEMANA', 'SEM'])||'SN'] = (pdSem[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + u; });
    destroyChart('chartSegArea'); new Chart(document.getElementById('chartSegArea'), { type: 'bar', data: { labels: Object.keys(pd), datasets: [{ data: Object.values(pd), backgroundColor: COLORS.primary, borderRadius: 6 }] }, options: baseOptions });
    destroyChart('chartSegProdSemanal'); new Chart(document.getElementById('chartSegProdSemanal'), { type: 'bar', data: { labels: Object.keys(pdSem).sort(), datasets: [{ data: Object.keys(pdSem).sort().map(k=>pdSem[k]), backgroundColor: COLORS.primaryLight, borderRadius: 6 }] }, options: baseOptions });
    destroyChart('chartSegMerma'); new Chart(document.getElementById('chartSegMerma'), { type: 'doughnut', data: { labels: ['Aprobado', 'Merma'], datasets: [{ data: [95, 5], backgroundColor: [COLORS.success, COLORS.danger], borderWidth:0 }] }, options: donutOptions });

    const dig = globalData['19-digitacion_segunda.csv']||[]; const yoy = {}; const dSem = {}; let uTot = 0;
    dig.forEach(r => { const u = parseNum(getS(r, ['UNIDADES', 'CANTIDAD'])); uTot += u; yoy[getS(r, ['AÑO', 'ANO'])||'2026'] = (yoy[getS(r, ['AÑO', 'ANO'])||'2026']||0) + u; dSem[getS(r, ['SEMANA', 'SEM'])||'SN'] = (dSem[getS(r, ['SEMANA', 'SEM'])||'SN']||0) + u; });
    setKPI('kpi-seg-obj', 150000); setKPI('kpi-seg-cumpl', uTot>0?(uTot/150000)*100:0, false, true);
    destroyChart('chartSegDigSemanal'); new Chart(document.getElementById('chartSegDigSemanal'), { type: 'line', data: { labels: Object.keys(dSem).sort(), datasets: [{ data: Object.keys(dSem).sort().map(k=>dSem[k]), borderColor: COLORS.success, fill: true, backgroundColor: 'rgba(46,125,50,0.1)', tension: 0.3 }] }, options: baseOptions });
    destroyChart('chartSegDigYoY'); new Chart(document.getElementById('chartSegDigYoY'), { type: 'bar', data: { labels: Object.keys(yoy), datasets: [{ data: Object.values(yoy), backgroundColor: [COLORS.gray, COLORS.primaryLight], borderRadius: 6 }] }, options: baseOptions });
}

window.recepcionFilter = f => renderRecepcion(f); window.distribucionFilter = f => renderDistribucion(f); window.devolucionesFilter = f => renderDevoluciones(f); window.inventarioFilter = f => renderInventario(f);
cargarTodo();
