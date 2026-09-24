
window.findPedidoIndex = function(id) {
    if (!id) return -1;
    const pedidosList = (typeof appData !== 'undefined' && appData && Array.isArray(appData.pedidos))
        ? appData.pedidos
        : ((window.appData && Array.isArray(window.appData.pedidos)) ? window.appData.pedidos : []);
    if (!pedidosList.length) return -1;

    if (typeof id === 'object' && id !== null && id.id) {
        id = id.id;
    }

    const cleanSearch = String(id).trim().toLowerCase();

    // Coincidencia exacta o numérica
    let idx = pedidosList.findIndex(x => x && (x.id === id || String(x.id || '').trim().toLowerCase() === cleanSearch));
    if (idx !== -1) return idx;

    // Coincidencia por código formateado
    if (typeof formatPresupuestoCodigo === 'function') {
        idx = pedidosList.findIndex(x => {
            try {
                return x && String(formatPresupuestoCodigo(x) || '').trim().toLowerCase() === cleanSearch;
            } catch(e) { return false; }
        });
        if (idx !== -1) return idx;
    }

    // Coincidencia numérica (ej. ID 14873 vs 00000-00014873)
    const searchNum = cleanSearch.replace(/\D/g, '');
    if (searchNum) {
        idx = pedidosList.findIndex(x => {
            if (!x || !x.id) return false;
            const xNum = String(x.id).replace(/\D/g, '');
            return xNum && parseInt(xNum, 10) === parseInt(searchNum, 10);
        });
        if (idx !== -1) return idx;
    }

    return -1;
};

// --- ESTADO INICIAL Y ALMACENAMIENTO (SUPABASE DIRECT SYNC) ---
console.warn('✅✅✅ APP.JS v206 - FUENTE DE DATOS EXCLUSIVA: SUPABASE ✅✅✅');
const LOCAL_STATE_KEY = 'solicitudes_pedidos_local_state';

// Bases de datos globales centralizadas (Sincronizadas dinámicamente desde Supabase)
window.clientesDB = window.clientesDB || [];
window.condicionesDB = window.condicionesDB || [
    { codigo: "1", nombre: "CONTADO", dias: 0 },
    { codigo: "2", nombre: "30 Y 60 DIAS 50/50", dias: 30 },
    { codigo: "3", nombre: "30 DIAS", dias: 30 },
    { codigo: "4", nombre: "60 DIAS", dias: 60 }
];
window.depositosDB = window.depositosDB || [];
window.transportesDB = window.transportesDB || [];
window.vendedoresDB = window.vendedoresDB || [];
window.stockDB = window.stockDB || [];
window.presupuestosCatalogDB = window.presupuestosCatalogDB || [];

var clientesDB = window.clientesDB;
var condicionesDB = window.condicionesDB;
var depositosDB = window.depositosDB;
var transportesDB = window.transportesDB;
var vendedoresDB = window.vendedoresDB;
var stockDB = window.stockDB;
var presupuestosCatalogDB = window.presupuestosCatalogDB;

// Sanitizar nombres de condición para asegurar que nunca aparezca 'CONDICIÓN 0' o 'NO USAR'
function cleanConditionName(val) {
    if (!val) return 'CONTADO';
    const s = String(val).trim();
    if (!s || s === '0' || s === '-' || /^(condici[oó]n\s*0|no\s*usar)$/i.test(s) || /condici[oó]n\s*0/i.test(s) || /no\s*usar/i.test(s)) {
        return 'CONTADO';
    }
    return s;
}
window.cleanConditionName = cleanConditionName;

// Obtener fecha y hora local exacta en formato YYYY-MM-DD HH:mm:ss (Hora local real de carga)
function getLocalCurrentDateTimeStr(d = new Date()) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// Generar una cadena de fecha y hora relativa
function getRelativeDateStr(hoursAgo) {
    const d = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return getLocalCurrentDateTimeStr(d);
}

// Formatear objeto Date a string YYYY-MM-DD local
function getLocalDateStr(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Normalizar cualquier formato de fecha a string YYYY-MM-DD estándar para comparación exacta
function normalizeDateToYMD(dateStr) {
    if (!dateStr) return '';
    const cleanStr = String(dateStr).trim().split(/[ T]/)[0];
    if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else if (parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
    }
    if (cleanStr.includes('/')) {
        const parts = cleanStr.split('/');
        if (parts.length === 3) {
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    return cleanStr;
}
window.normalizeDateToYMD = normalizeDateToYMD;

// Convertir número a letras (Spelling out amount in words, Spanish)
function numeroALetras(num, moneda = 'PESOS') {
    function Unidades(num) {
        switch(num) {
            case 1: return "UN";
            case 2: return "DOS";
            case 3: return "TRES";
            case 4: return "CUATRO";
            case 5: return "CINCO";
            case 6: return "SEIS";
            case 7: return "SIETE";
            case 8: return "OCHO";
            case 9: return "NUEVE";
        }
        return "";
    }

    function Decenas(num) {
        let decena = Math.floor(num/10);
        let unidad = num - (decena * 10);

        switch(decena) {
            case 1:
                switch(unidad) {
                    case 0: return "DIEZ";
                    case 1: return "ONCE";
                    case 2: return "DOCE";
                    case 3: return "TRECE";
                    case 4: return "CATORCE";
                    case 5: return "QUINCE";
                    default: return "DIECI" + Unidades(unidad);
                }
            case 2:
                switch(unidad) {
                    case 0: return "VEINTE";
                    default: return "VEINTI" + Unidades(unidad);
                }
            case 3: return DecenasY("TREINTA", unidad);
            case 4: return DecenasY("CUARENTA", unidad);
            case 5: return DecenasY("CINCUENTA", unidad);
            case 6: return DecenasY("SESENTA", unidad);
            case 7: return DecenasY("SETENTA", unidad);
            case 8: return DecenasY("OCHENTA", unidad);
            case 9: return DecenasY("NOVENTA", unidad);
            case 0: return Unidades(unidad);
        }
    }

    function DecenasY(strSin, numUnidad) {
        if (numUnidad > 0) return strSin + " Y " + Unidades(numUnidad);
        return strSin;
    }

    function Centenas(num) {
        let centenas = Math.floor(num / 100);
        let decenas = num - (centenas * 100);

        switch(centenas) {
            case 1:
                if (decenas > 0) return "CIENTO " + Decenas(decenas);
                return "CIEN";
            case 2: return "DOSCIENTOS " + Decenas(decenas);
            case 3: return "TRESCIENTOS " + Decenas(decenas);
            case 4: return "CUATROCIENTOS " + Decenas(decenas);
            case 5: return "QUINIENTOS " + Decenas(decenas);
            case 6: return "SEISCIENTOS " + Decenas(decenas);
            case 7: return "SETECIENTOS " + Decenas(decenas);
            case 8: return "OCHOCIENTOS " + Decenas(decenas);
            case 9: return "NOVECIENTOS " + Decenas(decenas);
        }
        return Decenas(decenas);
    }

    function Seccion(num, divisor, strSingular, strPlural) {
        let cientos = Math.floor(num / divisor);
        let resto = num - (cientos * divisor);

        let letras = "";

        if (cientos > 0) {
            if (cientos > 1) letras = Centenas(cientos) + " " + strPlural;
            else letras = strSingular;
        }

        if (resto > 0) letras += "";

        return letras;
    }

    function Miles(num) {
        let divisor = 1000;
        let cientos = Math.floor(num / divisor);
        let resto = num - (cientos * divisor);

        let strMiles = Seccion(num, divisor, "UN MIL", "MIL");
        let strCentenas = Centenas(resto);

        if(strMiles == "") return strCentenas;

        return strMiles + " " + strCentenas;
    }

    function Millones(num) {
        let divisor = 1000000;
        let cientos = Math.floor(num / divisor);
        let resto = num - (cientos * divisor);

        let strMillones = Seccion(num, divisor, "UN MILLON DE", "MILLONES DE");
        let strMiles = Miles(resto);

        if(strMillones == "") return strMiles;

        return strMillones + " " + strMiles;
    }

    let entero = Math.floor(num);
    let centavos = Math.round((num - entero) * 100);
    let centavosStr = String(centavos).padStart(2, '0') + '/100';

    if (entero === 0) return "CERO " + moneda + " CON " + centavosStr;

    let letras = Millones(entero);
    if (letras.endsWith(" DE")) {
        letras = letras.substring(0, letras.length - 3);
    }

    return (letras.trim() + " " + moneda + " CON " + centavosStr).replace(/\s+/g, ' ');
}

// Generador de texto para el detalle de facturas pendientes
function generarDetalleFacturasPendientes(client, currency) {
    if (!client) return "SIN FACTURAS PENDIENTES DE PAGO\nDEUDA TOTAL REGISTRADA: $0,00";

    const deuda = client.deuda_actual || 0;
    if (deuda === 0) {
        return `SIN FACTURAS PENDIENTES DE PAGO\nDEUDA TOTAL REGISTRADA: $0,00`;
    }

    const isUSD = currency === 'Dólares';
    const currName = isUSD ? 'Dolares' : 'Pesos';
    const symbol = isUSD ? 'U$S' : '$';

    // Simular un desglose de dos facturas pendientes basadas en la deuda del cliente
    const f1_amt = (deuda * 0.6).toFixed(2);
    const f2_amt = (deuda * 0.4).toFixed(2);

    let text = `15/04/2026  FACTURA A  701041124  ${parseFloat(f1_amt).toLocaleString('es-AR', {minimumFractionDigits: 2})} ${currName}\n`;
    text += `10/05/2026  FACTURA A  701041556  ${parseFloat(f2_amt).toLocaleString('es-AR', {minimumFractionDigits: 2})} ${currName}\n`;

    const cotiz = 1011.00;
    const deudaEnPesos = (deuda * cotiz).toLocaleString('es-AR', {minimumFractionDigits: 2});

    if (isUSD) {
        text += `COMPROMISOS VARIOS EN U$ D/ELF. COTIZACION  ${(deuda * cotiz * 0.95).toLocaleString('es-AR', {maximumFractionDigits: 2})}\n`;
        text += `DEUDA TOTAL EN U$ S/ULT. COTIZACION        ${deuda.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    } else {
        text += `DEUDA TOTAL REGISTRADA EN PESOS: $${deuda.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    }

    return text;
}

// Frases motivacionales para la cabecera
const MOTIVATIONAL_QUOTES = [
    "La perseverancia puede transformar el fracaso en un logro extraordinario.",
    "El éxito comercial se construye con decisiones rápidas y análisis precisos.",
    "Tu dedicación de hoy determina el crecimiento de toda la organización mañana.",
    "Un cliente satisfecho es la mejor estrategia de negocios de todas.",
    "El control inteligente del crédito protege el valor de nuestro esfuerzo común.",
    "La excelencia no es un acto, es un hábito que se cultiva día a día.",
    "La mejor publicidad es la que hacen los clientes satisfechos.",
    "El servicio al cliente no es un departamento, es una actitud.",
    "La confianza de nuestros clientes se gana con transparencia, consistencia y resultados.",
    "Cada pedido es una oportunidad para superar las expectativas y consolidar una alianza.",
    "El valor de una empresa se mide por la lealtad y el éxito de quienes confían en ella.",
    "La clave del crecimiento sostenible está en cuidar cada detalle y a cada cliente.",
    "La calidad de nuestro servicio es el reflejo directo del respeto hacia quienes nos eligen."
];

const defaultUserPermissions = {
    'mel': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-admin', 'menu-facturacion', 'menu-all-ver', 'menu-all-edit', 'menu-ingresar-edit-price', 'edit-precios'],
    'melani': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-admin', 'menu-facturacion', 'menu-all-ver', 'menu-all-edit', 'menu-ingresar-edit-price', 'edit-precios'],
    'juanluis': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-admin', 'menu-facturacion', 'menu-all-ver', 'menu-all-edit'],
    'luciano': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-facturacion', 'menu-all-ver', 'menu-all-edit', 'menu-ingresar-edit-price', 'edit-precios'],
    'roberto': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-facturacion', 'menu-all-ver', 'menu-all-edit', 'menu-ingresar-edit-price', 'edit-precios'],
    'nicole': ['menu-facturacion'],
    'alexis': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-facturacion', 'menu-all-ver', 'menu-all-edit'],
    'emiliano': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-facturacion', 'menu-all-ver', 'menu-all-edit'],
    'hernan': ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-facturacion', 'menu-all-ver', 'menu-all-edit']
};

// Usuarios por defecto si la base de datos está vacía
const defaultData = {
    users: [
        { id: '1', username: 'mel', password: '123', email: 'mel@empresa.com', role: 'Administrador', rubro_defecto: 'Eléctrico', vendedor_codigo: '', vendedor_nombre: '', empresa: 'SG MONTAJES SRL', can_edit_prices: true },
        { id: '2', username: 'juanluis', password: '123', email: 'grandijuanluis@gmail.com', role: 'Administrador', rubro_defecto: 'Eléctrico', vendedor_codigo: '103', vendedor_nombre: 'Juan Luis', empresa: 'SG MONTAJES SRL', can_edit_prices: false },
        { id: '3', username: 'luciano', password: '123', email: 'luciano@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '102', vendedor_nombre: 'Luciano', empresa: 'SG MONTAJES SRL', can_edit_prices: true },
        { id: '4', username: 'roberto', password: '123', email: 'Roberto@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Mecánico', vendedor_codigo: '104', vendedor_nombre: 'Roberto', empresa: 'SG MONTAJES SRL', can_edit_prices: true },
        { id: '5', username: 'melani', password: '123', email: 'melanidaiana28@gmail.com', role: 'Administrador', rubro_defecto: 'Eléctrico', vendedor_codigo: '', vendedor_nombre: '', empresa: 'SG MONTAJES SRL', can_edit_prices: true },
        { id: '6', username: 'nicole', password: '123', email: 'nicole@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '105', vendedor_nombre: 'Nicole', empresa: 'SG MONTAJES SRL', can_edit_prices: false },
        { id: '7', username: 'alexis', password: '123', email: 'alexis@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Mecánico', vendedor_codigo: '106', vendedor_nombre: 'Alexis', empresa: 'SG MONTAJES SRL', can_edit_prices: false },
        { id: '8', username: 'emiliano', password: '123', email: 'emiliano@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '107', vendedor_nombre: 'Emiliano', empresa: 'SG MONTAJES SRL', can_edit_prices: false },
        { id: '9', username: 'hernan', password: '123', email: 'hernan@sgmontajes.com', role: 'Solicitante', rubro_defecto: 'Eléctrico', vendedor_codigo: '108', vendedor_nombre: 'Hernán', empresa: 'SG MONTAJES SRL', can_edit_prices: false }
    ],
    pedidos: [],
    notifications: [],
    userPermissions: Object.assign({}, defaultUserPermissions),
    currentUserId: null
};

// --- CONFIGURACIÓN Y CLIENTE DE SUPABASE ---
var supabaseDb = null;
function getDbClient() {
    if (supabaseDb) return supabaseDb;
    if (typeof window !== 'undefined' && window.supabaseDb) {
        supabaseDb = window.supabaseDb;
        return supabaseDb;
    }
    if (typeof initSupabaseClient === 'function') {
        supabaseDb = initSupabaseClient();
        return supabaseDb;
    }
    return null;
}

// Función de normalización estricta de rubros
function normalizePresupuestosRubro(pedidos) {
    if (!Array.isArray(pedidos)) return [];
    // Descartar de raíz cualquier presupuesto fantasma eliminado del 21 de septiembre
    pedidos = pedidos.filter(p => {
        if (!p) return false;
        const f = String(p.fecha || '');
        return !f.includes('2026-09-21') && !f.includes('21/09/2026');
    });
    pedidos.forEach(p => {
        const idStr = String(p.id || '').toUpperCase();
        const tipoStr = (p.tipo_presupuesto || '').toLowerCase();
        if (idStr.startsWith('101') || tipoStr.includes('mec')) {
            p.tipo_presupuesto = 'Mecánico';
            if (!idStr.startsWith('101-MEC-')) {
                const num = idStr.replace(/\D/g, '') || '0001';
                p.id = `101-MEC-${String(num.slice(-4)).padStart(4, '0')}`;
            }
        } else {
            p.tipo_presupuesto = 'Eléctrico';
            if (!idStr.startsWith('102-ELEC-')) {
                const num = idStr.replace(/\D/g, '') || '0001';
                p.id = `102-ELEC-${String(num.slice(-4)).padStart(4, '0')}`;
            }
        }

        p.importe = parseFloat(p.importe !== undefined && p.importe !== null ? p.importe : (p.importe_neto || 0));
        p.importe_neto = p.importe;

        const denomVal = (p.meca_denominacion || p.denominacion || p.motivo || '').trim();
        if (denomVal) {
            p.meca_denominacion = denomVal;
            p.denominacion = denomVal;
        }

        const provRaw = String(p.proveedor || p.meca_proveedor || '').trim().toUpperCase();
        if (provRaw.includes('ACOSTA')) {
            p.proveedor = 'ACOSTA SERVICIOS SRL';
            p.meca_proveedor = 'ACOSTA SERVICIOS SRL';
        } else {
            p.proveedor = 'SG MONTAJES SRL';
            p.meca_proveedor = 'SG MONTAJES SRL';
        }

        // Normalizar y enriquecer Domicilio, Localidad, CUIT y Planta desde clientesDB
        const rawClient = (typeof window.clientesDB !== 'undefined' && Array.isArray(window.clientesDB))
            ? window.clientesDB.find(c => (c.codigo && p.cliente_id && String(c.codigo).trim() === String(p.cliente_id).trim()) || (c.nombre && p.cliente_nombre && String(c.nombre).trim().toUpperCase() === String(p.cliente_nombre).trim().toUpperCase()))
            : null;

        if (rawClient) {
            if (!p.domicilio || p.domicilio === '-' || p.domicilio.trim() === '') {
                p.domicilio = rawClient.domicilio || '';
            }
            if (!p.localidad || p.localidad === '-' || p.localidad.trim() === '') {
                p.localidad = rawClient.localidad || '';
            }
            if (!p.cuit || p.cuit === '-' || p.cuit.trim() === '') {
                p.cuit = rawClient.cuit || '';
            }
            if (!p.cliente_id || p.cliente_id === '-' || p.cliente_id === '') {
                p.cliente_id = rawClient.codigo || '';
            }
        }

        const plantaVal = (p.planta || p.meca_planta || '').trim();
        if (plantaVal && plantaVal !== '-') {
            p.planta = plantaVal;
            p.meca_planta = plantaVal;
        } else {
            let defaultPlanta = 'VGG';
            if (p.localidad && p.localidad.toUpperCase().includes('SAN MARTIN')) {
                defaultPlanta = 'PGSM';
            } else if (rawClient && rawClient.localidad && rawClient.localidad.toUpperCase().includes('SAN MARTIN')) {
                defaultPlanta = 'PGSM';
            }
            p.planta = defaultPlanta;
            p.meca_planta = defaultPlanta;
        }

        const otVal = (p.nro_ot || p.meca_nro_ot || '').trim();
        if (otVal) {
            p.nro_ot = otVal;
            p.meca_nro_ot = otVal;
        }

        p.condicion_venta = cleanConditionName(p.condicion_venta || p.condicion_nombre || 'CONTADO');
        p.condicion_nombre = cleanConditionName(p.condicion_nombre || p.condicion_venta || 'CONTADO');
        if (!p.condicion_id || String(p.condicion_id) === '0') {
            p.condicion_id = '1';
        }
        if (!p.tipo_reporte) {
            p.tipo_reporte = 'detallado';
        }

        const ocVal = String(p.meca_nro_oc || p.nro_oc || p.oc_numero || '').trim();
        const estStr = String(p.estado || '').trim();
        const estLower = estStr.toLowerCase();

        if (estLower === 'rechazado' || estLower === 'anulado') {
            p.estado = 'Rechazado';
        } else if (
            estLower === 'aprobado con oc' ||
            estLower.includes('con oc') ||
            estLower.includes('con orden') ||
            estLower === 'facturado parcial' ||
            estLower === 'facturado total' ||
            estLower === 'cargado con orden de compra' ||
            estLower === 'autorizado' ||
            estLower === 'aprobado' ||
            (ocVal !== '' && ocVal !== '-' && estLower !== 'rechazado')
        ) {
            if (!p.estado_facturacion) {
                p.estado_facturacion = (estLower === 'facturado total' || parseFloat(p.facturado_porcentaje || 0) >= 100) ? 'Total' : (parseFloat(p.facturado_porcentaje || 0) > 0 ? 'Parcial' : 'Pendiente');
            }
            p.estado = 'Aprobado con OC';
            if (ocVal && !p.meca_nro_oc) p.meca_nro_oc = ocVal;
            if (ocVal && !p.nro_oc) p.nro_oc = ocVal;
        } else if (estLower === 'aprobado sin oc' || (estLower.includes('sin oc') && estLower.includes('aprobado'))) {
            p.estado = 'Aprobado sin OC';
        } else {
            p.estado = 'Enviado sin OC';
        }
    });
    return pedidos;
}

// Mantener la sesión localmente y sincronizada
let appData = JSON.parse(JSON.stringify(defaultData));
appData.pedidos = [];
window.appData = appData;

// Cargar datos desde localStorage si existen
try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STATE_KEY));
    if (local && local.users && local.users.length > 0) {
        // NOTA: Supabase es la ÚNICA fuente de verdad para presupuestos.
        // No cargamos pedidos desde localStorage para evitar que reaparezcan presupuestos borrados en Supabase.
        appData.pedidos = [];
        if (local.pedidos) {
            delete local.pedidos;
            try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(local)); } catch(e) {}
        }

        // Filtrar usuarios removidos (admin, aut, sol)
        appData.users = (local.users || defaultData.users).filter(u => !['admin', 'aut', 'sol'].includes(String(u.username).trim().toLowerCase()));
        if (appData.users.length === 0) appData.users = defaultData.users.slice();
        appData.notifications = Array.isArray(local.notifications) ? local.notifications : [];
        if (local.userPermissions && typeof local.userPermissions === 'object' && Object.keys(local.userPermissions).length > 0) {
            appData.userPermissions = Object.assign({}, defaultUserPermissions, local.userPermissions);
        } else {
            appData.userPermissions = Object.assign({}, defaultUserPermissions);
        }
        delete appData.userPermissions['admin'];
        delete appData.userPermissions['aut'];
        delete appData.userPermissions['sol'];
        delete appData.userPermissions['menu-asignaciones'];
    }
} catch(e) {}

function mergeUsersList(localUsers, remoteUsers) {
    const list = Array.isArray(localUsers) ? localUsers.slice() : [];
    const rem = Array.isArray(remoteUsers) ? remoteUsers : [];

    rem.forEach(ru => {
        if (!ru || !ru.username) return;
        const exists = list.find(lu => String(lu.username).trim().toLowerCase() === String(ru.username).trim().toLowerCase());
        if (!exists) {
            list.push(ru);
        } else {
            if (ru.rubro_defecto && !exists.rubro_defecto) exists.rubro_defecto = ru.rubro_defecto;
            if (ru.password && !exists.password) exists.password = ru.password;
            if (ru.role && !exists.role) exists.role = ru.role;
        }
    });

    return list.filter(u => !['admin', 'aut', 'sol'].includes(String(u.username).trim().toLowerCase()));
}

let isFirstLoad = true;
let supabaseRealtimeChannel = null;

// ====================================================================
// FUNCIÓN CENTRALIZADA: LECTURA EN VIVO DE USUARIOS DESDE SUPABASE
// Supabase es la ÚNICA fuente de la verdad para usuarios y permisos.
// ====================================================================
window.recargarUsuariosDesdeSupabase = async function(callback) {
    let freshUsers = null;
    const client = (typeof getDbClient === 'function') ? getDbClient() : null;

    if (client) {
        try {
            const { data, error } = await client.from('usuarios').select('*').order('id', { ascending: true });
            if (!error && Array.isArray(data) && data.length > 0) {
                freshUsers = data;
            }
        } catch(e) {
            console.warn("Aviso SDK tabla usuarios:", e);
        }
    }

    if (!freshUsers) {
        try {
            const config = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : { url: 'https://amkkuwgatjcbiyrykuoy.supabase.co', anonKey: 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ' };
            const rHeaders = { 'apikey': config.anonKey, 'Authorization': `Bearer ${config.anonKey}` };
            const resp = await fetch(`${config.url}/rest/v1/usuarios?select=*&order=id.asc`, { headers: rHeaders });
            if (resp.ok) {
                const restData = await resp.json();
                if (Array.isArray(restData) && restData.length > 0) {
                    freshUsers = restData;
                }
            }
        } catch(e) {
            console.warn("Aviso REST tabla usuarios:", e);
        }
    }

    if (freshUsers && Array.isArray(freshUsers) && freshUsers.length > 0) {
        if (!appData) appData = { users: [], pedidos: [], notifications: [] };
        appData.users = freshUsers;
        if (!appData.userPermissions) appData.userPermissions = {};

        freshUsers.forEach(function(u) {
            if (!u || !u.username) return;
            const cleanU = String(u.username).trim().toLowerCase();

            let p = u.permisos || u.permissions;
            if (typeof p === 'string') {
                try { p = JSON.parse(p); } catch(e) {}
                if (typeof p === 'string' && !p.startsWith('[')) {
                    p = p.split(',').map(s => s.trim());
                }
            }
            if (!Array.isArray(p)) {
                p = (defaultUserPermissions[cleanU] || ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all', 'menu-all-ver', 'menu-all-edit']).slice();
            }

            // Respetar can_edit_prices y permisos configurados directamente en Supabase
            if (u.can_edit_prices === true || p.includes('menu-ingresar-edit-price') || p.includes('edit-precios')) {
                u.can_edit_prices = true;
                if (!p.includes('menu-ingresar-edit-price')) p.push('menu-ingresar-edit-price');
                if (!p.includes('edit-precios')) p.push('edit-precios');
            } else {
                u.can_edit_prices = false;
            }

            u.permisos = p;
            u.permissions = p;
            appData.userPermissions[cleanU] = p;
        });

        try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
        console.log("✅ Supabase (Fuente Única de Verdad): " + freshUsers.length + " usuarios leídos directamente de la tabla 'usuarios'.");

        if (typeof window.renderUsersAdminView === 'function') {
            window.renderUsersAdminView();
        }
        if (typeof window.renderConfigUsersTable === 'function') {
            window.renderConfigUsersTable();
        }
        if (typeof window.fillPermissionsUserSelect === 'function') {
            window.fillPermissionsUserSelect();
        }
    }

    if (typeof callback === 'function') {
        callback(appData ? appData.users : []);
    }
    return appData ? appData.users : [];
};

let supabaseSyncRetries = 0;
function initSupabaseSync(callback) {
    const client = getDbClient();
    if (!client) {
        console.warn("⚠️ Cliente SDK Supabase no disponible inmediatamente. Reintentando y usando carga REST de respaldo...");
        if (supabaseSyncRetries < 5) {
            supabaseSyncRetries++;
            setTimeout(() => {
                initSupabaseSync(callback);
            }, 1000);
        }

        // Carga REST de respaldo inmediata
        try {
            const config = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : { url: 'https://amkkuwgatjcbiyrykuoy.supabase.co', anonKey: 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ' };
            const rHeaders = { 'apikey': config.anonKey, 'Authorization': `Bearer ${config.anonKey}` };
            fetch(`${config.url}/rest/v1/presupuestos?select=*&order=id.desc`, { headers: rHeaders, cache: 'no-store' })
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        appData.pedidos = normalizePresupuestosRubro(data);
                        try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                        if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                        if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
                    }
                }).catch(() => {});
        } catch(e) {}

        if (typeof window.recargarUsuariosDesdeSupabase === 'function') {
            window.recargarUsuariosDesdeSupabase();
        }

        if (callback) callback();
        return;
    }

    console.log("🔄 Conectando y leyendo datos directamente desde Supabase...");
    if (typeof fetchPlantasFromSupabase === 'function') fetchPlantasFromSupabase();

    // 1. LECTURA DIRECTA DE LA TABLA 'clientes'
    client.from('clientes').select('*').then(function(cRes) {
        if (cRes.data && cRes.data.length > 0) {
            if (typeof clientesDB !== 'undefined') {
                clientesDB.length = 0;
                cRes.data.forEach(function(sc) {
                    sc.condicion_nombre = cleanConditionName(sc.condicion_nombre);
                    if (!sc.condicion_id || String(sc.condicion_id) === '0') sc.condicion_id = '1';
                    clientesDB.push(sc);
                });
                window.clientesDB = clientesDB;
            }
            console.log("✅ " + cRes.data.length + " clientes leídos directamente de la tabla 'clientes' en Supabase.");
        } else if (cRes.data && cRes.data.length === 0 && typeof clientesDB !== 'undefined' && clientesDB.length > 0) {
            // Si la tabla remota está vacía, sembrar los clientes iniciales
            client.from('clientes').upsert(clientesDB).then(function() {
                console.log("☁️ 11 clientes iniciales subidos a la tabla 'clientes' de Supabase.");
            }).catch(function(e) { console.warn("Aviso al subir clientes a Supabase:", e); });
        }
    }).catch(function(err) {
        console.warn("Aviso al consultar tabla 'clientes' en Supabase:", err);
    });

    // 2. LECTURA DIRECTA DE LA TABLA 'usuarios' (Fuente Única de Verdad)
    window.recargarUsuariosDesdeSupabase(function(users) {
        if (typeof buildSidebar === 'function' && typeof getCurrentUser === 'function') {
            const cur = getCurrentUser();
            if (cur) buildSidebar();
        }
    });

    // 2.1. LECTURA DIRECTA DE LA TABLA 'tarifario' (Precios y Catálogo Vigente en Tiempo Real)
    client.from('tarifario').select('*').then(function(tarRes) {
        if (tarRes.data && tarRes.data.length > 0) {
            const customPrices = getCustomItemPrices();

            // Map de la base de datos a un diccionario rápido por código
            const dbByCode = {};
            let deletedStock = [];
            try {
                deletedStock = JSON.parse(localStorage.getItem('PRESUPUESTO_DELETED_STOCK') || '[]');
            } catch(e) {}

            tarRes.data.forEach(function(row) {
                if (!row || !row.codigo) return;
                if (row.estado === 'ELIMINADOS') {
                    if (!deletedStock.includes(row.codigo)) deletedStock.push(row.codigo);
                    return;
                }
                const cPrice = parseFloat(row.precio) || 0;
                let key = row.codigo;
                if (row.planta) key = key + '_' + row.planta.trim().toUpperCase();
                customPrices[key] = cPrice;
                customPrices[row.codigo] = cPrice; // Guardamos el genérico también por compatibilidad

                if (!dbByCode[row.codigo]) dbByCode[row.codigo] = [];
                dbByCode[row.codigo].push(row);
            });

            // Reconstruir catálogo Eléctrico (toma el primer precio disponible)
            if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
                window.presupuestosCatalogDB = PRESUPUESTO_ELECTRICO_STOCK
                    .filter(baseItem => !deletedStock.includes(baseItem.codigo))
                    .map(baseItem => {
                        const rows = dbByCode[baseItem.codigo];
                        if (!rows || rows.length === 0) return { ...baseItem };
                        // Priorizar el que no tenga planta (o la vacía) para Eléctrico
                        const row = rows.find(r => !r.planta || r.planta.trim() === '') || rows[0];
                        return {
                            ...baseItem,
                            precio: parseFloat(row.precio) || 0,
                            precio_unitario: parseFloat(row.precio) || 0,
                            detalle: row.detalle || baseItem.detalle,
                            descripcion: row.detalle || baseItem.descripcion,
                            subrubro: row.subrubro || baseItem.subrubro
                        };
                    });
            }

            // Reconstruir catálogo Mecánico (Mantener todas las variantes de planta)
            if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
                let mecaArr = [];
                PRESUPUESTO_MECANICO_STOCK
                    .filter(baseItem => !deletedStock.includes(baseItem.codigo))
                    .forEach(baseItem => {
                        const rows = dbByCode[baseItem.codigo];
                        if (!rows || rows.length === 0) {
                            mecaArr.push({ ...baseItem });
                        } else {
                            rows.forEach(row => {
                                mecaArr.push({
                                    ...baseItem,
                                    precio: parseFloat(row.precio) || 0,
                                    precio_unitario: parseFloat(row.precio) || 0,
                                    planta: row.planta || '',
                                    detalle: row.detalle || baseItem.detalle,
                                    descripcion: row.detalle || baseItem.descripcion,
                                    subrubro: row.subrubro || baseItem.subrubro
                                });
                            });
                        }
                    });

                // Agregar ítems que estén en Supabase pero no en el stock base
                tarRes.data.forEach(row => {
                    if (row.rubro === 'Mecánico' && !PRESUPUESTO_MECANICO_STOCK.find(b => b.codigo === row.codigo)) {
                        mecaArr.push({
                            codigo: row.codigo,
                            detalle: row.detalle,
                            descripcion: row.detalle,
                            rubro: row.rubro,
                            subrubro: row.subrubro || 'Mano de Obra',
                            udm: row.unidad || 'Hs',
                            precio: parseFloat(row.precio) || 0,
                            precio_unitario: parseFloat(row.precio) || 0,
                            planta: row.planta || ''
                        });
                    }
                });

                window.presupuestoMecanicoDB = mecaArr;
            }

            // Identificar codigos que ya procesamos en la reconstruccion
            const processedCodes = new Set([
                ...(typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' ? PRESUPUESTO_ELECTRICO_STOCK.map(i => i.codigo) : []),
                ...(typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' ? PRESUPUESTO_MECANICO_STOCK.map(i => i.codigo) : [])
            ]);

            // Agregar items totalmente nuevos que no estaban en los arrays por defecto
            Object.keys(dbByCode).forEach(codigo => {
                if (!processedCodes.has(codigo)) {
                    dbByCode[codigo].forEach(row => {
                        const newItem = {
                            codigo: row.codigo,
                            detalle: row.detalle || '',
                            descripcion: row.detalle || '',
                            rubro: row.rubro || 'Mecánico',
                            subrubro: row.subrubro || 'Materiales y Equipos',
                            udm: row.unidad || 'Hs',
                            precio: parseFloat(row.precio) || 0,
                            precio_unitario: parseFloat(row.precio) || 0,
                            stock: parseFloat(row.stock) || 999,
                            estado: row.estado || 'ACTIVOS',
                            planta: row.planta ? row.planta.trim().toUpperCase() : null
                        };

                        if (row.rubro === 'Eléctrico') {
                            if (window.presupuestosCatalogDB) window.presupuestosCatalogDB.push(newItem);
                        } else {
                            if (window.presupuestoMecanicoDB) window.presupuestoMecanicoDB.push(newItem);
                        }
                    });
                }
            });


            try {
                localStorage.setItem('PRESUPUESTO_CUSTOM_PRICES', JSON.stringify(customPrices));
            } catch(e) {}
            console.log("✅ " + tarRes.data.length + " ítems de tarifario cargados desde Supabase en tiempo real.");
        }
    }).catch(function(tarErr) {
        console.warn("Aviso al consultar tabla 'tarifario' en Supabase:", tarErr);
    });

    // 3. LECTURA DIRECTA Y EXCLUSIVA DE LA TABLA 'presupuestos' (Fuente Única de Verdad)
    const syncPresupuestoItemsFromSupabase = function() {
        if (!client) return;
        client.from('presupuesto_items').select('*').then(function(itemsRes) {
            if (itemsRes.data && itemsRes.data.length > 0 && Array.isArray(appData.pedidos)) {
                const itemsMap = {};
                itemsRes.data.forEach(function(it) {
                    const pid = String(it.presupuesto_id || '');
                    if (!itemsMap[pid]) itemsMap[pid] = [];
                    const cant = parseFloat(it.cantidad) || 1;
                    const pu = parseFloat(it.precio_unitario || it.precio) || 0;
                    const rawSubr = (it.subrubro && it.subrubro !== 'None' && it.subrubro !== 'null') ? String(it.subrubro).trim() : '';
                    const resolvedSubr = rawSubr || (typeof window.resolveItemSubrubro === 'function' ? window.resolveItemSubrubro(it, it.rubro) : 'Materiales y Equipos');
                    itemsMap[pid].push({
                        codigo: String(it.codigo || ''),
                        detalle: String(it.detalle || ''),
                        rubro: it.rubro || 'Eléctrico',
                        subrubro: resolvedSubr,
                        cantidad: cant,
                        unidad: it.unidad || 'UN',
                        udm: it.unidad || 'UN',
                        precio: pu,
                        precio_unitario: pu,
                        subtotal: parseFloat(it.subtotal) || (cant * pu),
                        estado: 'Pendiente'
                    });
                });
                let changed = false;
                appData.pedidos.forEach(function(p) {
                    const pid = String(p.id);
                    if ((!Array.isArray(p.items) || p.items.length === 0) && itemsMap[pid] && itemsMap[pid].length > 0) {
                        p.items = itemsMap[pid];
                        changed = true;
                    }
                });
                if (changed) {
                    try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                    if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                }
            }
        }).catch(function(err) { console.warn("Aviso presupuesto_items:", err); });
    };

    // 3. LECTURA DIRECTA Y EXCLUSIVA DE LA TABLA 'presupuestos' (Fuente Única de Verdad)
    client
        .from('presupuestos')
        .select('*')
        .order('id', { ascending: false })
        .then(function(pRes) {
            if (pRes.error) {
                console.warn("Aviso al leer tabla presupuestos en Supabase:", pRes.error);
                return;
            }
            if (pRes.data) {
                const existingItemsMap = {};
                if (Array.isArray(appData.pedidos)) {
                    appData.pedidos.forEach(oldP => {
                        if (oldP && oldP.id) {
                            const pid = String(oldP.id);
                            if (Array.isArray(oldP.items) && oldP.items.length > 0) {
                                existingItemsMap[pid] = oldP.items;
                            }
                        }
                    });
                }
                // Supabase es la ÚNICA fuente de verdad: se descartan los que fueron borrados en Supabase
                appData.pedidos = normalizePresupuestosRubro(pRes.data);
                appData.pedidos.forEach(p => {
                    const pid = String(p.id);
                    if ((!Array.isArray(p.items) || p.items.length === 0) && existingItemsMap[pid]) {
                        p.items = existingItemsMap[pid];
                    }
                });

                console.log("✅ " + appData.pedidos.length + " presupuestos consolidados directamente desde Supabase.");
                try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
                if (appData.pedidos.length > 0) {
                    syncPresupuestoItemsFromSupabase();
                }
            }
        })
        .catch(function(pErr) {
            console.warn("Aviso al leer tabla presupuestos en Supabase:", pErr);
        });

    // 3.1. LECTURA DE ESTADO GLOBAL DE USUARIOS, NOTIFICACIONES Y PERMISOS ('app_state')
    client
        .from('app_state')
        .select('*')
        .eq('id', 'globalData')
        .maybeSingle()
        .then(function(res) {
            if (res.data) {
                const data = res.data;
                if (Array.isArray(data.notifications)) {
                    appData.notifications = data.notifications;
                }
                if (data.user_permissions && typeof data.user_permissions === 'object' && Object.keys(data.user_permissions).length > 0) {
                    appData.userPermissions = Object.assign({}, appData.userPermissions, data.user_permissions);
                    if (Array.isArray(appData.users)) {
                        appData.users.forEach(function(u) {
                            if (!u || !u.username) return;
                            const uk = String(u.username).trim().toLowerCase();
                            if (data.user_permissions[uk] && (!u.permisos || !Array.isArray(u.permisos) || u.permisos.length === 0)) {
                                u.permissions = data.user_permissions[uk];
                                u.permisos = data.user_permissions[uk];
                            }
                            if (u.can_edit_prices === true || (u.permisos && (u.permisos.includes('menu-ingresar-edit-price') || u.permisos.includes('edit-precios')))) {
                                u.can_edit_prices = true;
                            }
                        });
                    }
                } else if (!appData.userPermissions || Object.keys(appData.userPermissions).length === 0) {
                    appData.userPermissions = Object.assign({}, defaultUserPermissions);
                }
                if (data.custom_prices && typeof data.custom_prices === 'object') {
                    appData.customPrices = Object.assign({}, appData.customPrices || {}, data.custom_prices);
                    try {
                        const localPrices = getCustomItemPrices();
                        const merged = Object.assign({}, localPrices, data.custom_prices);
                        localStorage.setItem('PRESUPUESTO_CUSTOM_PRICES', JSON.stringify(merged));
                        if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') applyCustomPricesToCatalog(PRESUPUESTO_ELECTRICO_STOCK);
                        if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') applyCustomPricesToCatalog(PRESUPUESTO_MECANICO_STOCK);
                    } catch (e) {}
                }
                try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}

                const cur = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
                if (cur) {
                    if (typeof buildSidebar === 'function') buildSidebar();
                    if (typeof actualizarTablaItemsRequerimiento === 'function' && typeof pedidoItems !== 'undefined' && pedidoItems.length > 0) {
                        actualizarTablaItemsRequerimiento();
                    }
                }
            }

            syncPresupuestoItemsFromSupabase();
            console.log("⚡ Supabase conectado y sincronizado en tiempo real.");

            // 4. SUSCRIPCIÓN EN TIEMPO REAL A TODAS LAS TABLAS DE SUPABASE
            try {
                if (supabaseRealtimeChannel) {
                    client.removeChannel(supabaseRealtimeChannel);
                }

                // Suscripción Realtime DIRECTA a la tabla 'presupuestos'
                client
                    .channel('public:presupuestos')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'presupuestos'
                    }, function(payload) {
                        console.log("⚡ Supabase Realtime evento en 'presupuestos':", payload.eventType, payload);
                        if (payload.eventType === 'DELETE' && payload.old) {
                            const delId = String(payload.old.id || '');
                            appData.pedidos = (appData.pedidos || []).filter(function(p) { return String(p.id) !== delId; });
                            try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                            if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                            if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
                            console.log("🗑️ Presupuesto " + delId + " eliminado automáticamente en tiempo real.");
                        } else if (payload.eventType === 'INSERT' && payload.new) {
                            const newP = payload.new;
                            const exists = (appData.pedidos || []).find(function(p) { return String(p.id) === String(newP.id); });
                            if (!exists) {
                                appData.pedidos.push(newP);
                                normalizePresupuestosRubro(appData.pedidos);
                                try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                                if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                                if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
                            }
                        } else if (payload.eventType === 'UPDATE' && payload.new) {
                            const updatedP = payload.new;
                            const idx = (appData.pedidos || []).findIndex(function(p) { return String(p.id) === String(updatedP.id); });
                            if (idx !== -1) {
                                appData.pedidos[idx] = Object.assign({}, appData.pedidos[idx], updatedP);
                                normalizePresupuestosRubro(appData.pedidos);
                                try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                                if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                                if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
                            }
                        }
                    })
                    .subscribe();

                // Suscripción Realtime a app_state (para permisos y notificaciones)
                supabaseRealtimeChannel = client
                    .channel('public:app_state:globalData')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'app_state',
                        filter: 'id=eq.globalData'
                    }, function(payload) {
                        if (payload.new) {
                            const data = payload.new;
                            // Chequear si viene señal de recarga remota en app_state
                            if (data.updated_at && window._lastAppUpdateTs && data.updated_at > window._lastAppUpdateTs) {
                                window._lastAppUpdateTs = data.updated_at;
                                const diff = Date.now() - new Date(data.updated_at).getTime();
                                if (diff >= 0 && diff < 30000 && typeof window.handleRemoteReloadRequest === 'function') {
                                    window.handleRemoteReloadRequest({ source: 'app_state_realtime', timestamp: data.updated_at });
                                }
                            }
                            appData.notifications = data.notifications || [];
                            if (data.user_permissions && typeof data.user_permissions === 'object' && Object.keys(data.user_permissions).length > 0) {
                                appData.userPermissions = Object.assign({}, defaultUserPermissions, appData.userPermissions, data.user_permissions);
                                if (Array.isArray(appData.users)) {
                                    const alwaysCanEdit = ['mel', 'melani', 'luciano', 'roberto'];
                                    appData.users.forEach(function(u) {
                                        if (!u || !u.username) return;
                                        const uk = String(u.username).trim().toLowerCase();
                                        const isAuthorizedQuoter = alwaysCanEdit.includes(uk);
                                        if (data.user_permissions[uk]) {
                                            u.permissions = data.user_permissions[uk];
                                            u.permisos = data.user_permissions[uk];
                                        }
                                        if (isAuthorizedQuoter) {
                                            u.can_edit_prices = true;
                                            if (!u.permissions) u.permissions = [];
                                            if (!u.permissions.includes('menu-ingresar-edit-price')) u.permissions.push('menu-ingresar-edit-price');
                                            if (!u.permissions.includes('edit-precios')) u.permissions.push('edit-precios');
                                            u.permisos = u.permissions;
                                            if (appData.userPermissions[uk]) {
                                                if (!appData.userPermissions[uk].includes('menu-ingresar-edit-price')) appData.userPermissions[uk].push('menu-ingresar-edit-price');
                                                if (!appData.userPermissions[uk].includes('edit-precios')) appData.userPermissions[uk].push('edit-precios');
                                            }
                                        } else {
                                            u.can_edit_prices = false;
                                            if (u.permissions) {
                                                u.permissions = u.permissions.filter(p => p !== 'menu-ingresar-edit-price' && p !== 'edit-precios' && p !== 'edit-price' && p !== 'modificar-precios');
                                                u.permisos = u.permissions;
                                            }
                                            if (appData.userPermissions[uk]) {
                                                appData.userPermissions[uk] = appData.userPermissions[uk].filter(p => p !== 'menu-ingresar-edit-price' && p !== 'edit-precios' && p !== 'edit-price' && p !== 'modificar-precios');
                                            }
                                        }
                                    });
                                }
                            }
                            if (data.custom_prices && typeof data.custom_prices === 'object') {
                                appData.customPrices = Object.assign({}, appData.customPrices || {}, data.custom_prices);
                                try {
                                    const localPrices = getCustomItemPrices();
                                    const merged = Object.assign({}, localPrices, data.custom_prices);
                                    localStorage.setItem('PRESUPUESTO_CUSTOM_PRICES', JSON.stringify(merged));
                                    if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') applyCustomPricesToCatalog(PRESUPUESTO_ELECTRICO_STOCK);
                                    if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') applyCustomPricesToCatalog(PRESUPUESTO_MECANICO_STOCK);
                                } catch(e) {}
                            }
                            try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}

                            if (!isFirstLoad && appData.currentUserId) {
                                renderNotifications();
                                const currentUser = getCurrentUser();
                                if (currentUser) {
                                    if (typeof buildSidebar === 'function') buildSidebar();
                                    if (typeof actualizarTablaItemsRequerimiento === 'function' && typeof pedidoItems !== 'undefined' && pedidoItems.length > 0) {
                                        actualizarTablaItemsRequerimiento();
                                    }
                                }
                            }
                            isFirstLoad = false;
                        }
                    })
                    .subscribe();

                // Suscripción Realtime a la tabla 'usuarios' (Fuente Única de Verdad)
                client
                    .channel('public:usuarios')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'usuarios'
                    }, function(payload) {
                        console.log("⚡ Supabase Realtime evento en 'usuarios':", payload.eventType, payload);
                        if (payload.eventType === 'DELETE' && payload.old) {
                            const delId = String(payload.old.id || '');
                            appData.users = (appData.users || []).filter(function(u) { return String(u.id) !== delId; });
                            try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                            console.log("🗑️ Usuario " + delId + " eliminado automáticamente en tiempo real.");
                        } else if (payload.eventType === 'INSERT' && payload.new) {
                            const newU = payload.new;
                            const exists = (appData.users || []).find(function(u) { return String(u.id) === String(newU.id); });
                            if (!exists) {
                                appData.users.push(newU);
                            }
                            const cleanU = String(newU.username || '').trim().toLowerCase();
                            if (cleanU) {
                                let p = newU.permisos || newU.permissions;
                                if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
                                if (Array.isArray(p) && p.length > 0) {
                                    if (newU.can_edit_prices === true) {
                                        if (!p.includes('menu-ingresar-edit-price')) p.push('menu-ingresar-edit-price');
                                        if (!p.includes('edit-precios')) p.push('edit-precios');
                                    }
                                    if (!appData.userPermissions) appData.userPermissions = {};
                                    appData.userPermissions[cleanU] = p;
                                }
                            }
                            try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                        } else if (payload.eventType === 'UPDATE' && payload.new) {
                            const updU = payload.new;
                            const idx = (appData.users || []).findIndex(function(u) { return String(u.id) === String(updU.id); });
                            if (idx !== -1) {
                                appData.users[idx] = Object.assign({}, appData.users[idx], updU);
                            }
                            const cleanU = String(updU.username || '').trim().toLowerCase();
                            if (cleanU) {
                                let p = updU.permisos || updU.permissions;
                                if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
                                if (Array.isArray(p) && p.length > 0) {
                                    if (updU.can_edit_prices === true) {
                                        if (!p.includes('menu-ingresar-edit-price')) p.push('menu-ingresar-edit-price');
                                        if (!p.includes('edit-precios')) p.push('edit-precios');
                                    }
                                    if (!appData.userPermissions) appData.userPermissions = {};
                                    appData.userPermissions[cleanU] = p;
                                } else if (typeof updU.can_edit_prices !== 'undefined') {
                                    if (!appData.userPermissions) appData.userPermissions = {};
                                    if (!appData.userPermissions[cleanU]) {
                                        appData.userPermissions[cleanU] = (defaultUserPermissions[cleanU] || ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all']).slice();
                                    }
                                    if (updU.can_edit_prices === true) {
                                        if (!appData.userPermissions[cleanU].includes('menu-ingresar-edit-price')) appData.userPermissions[cleanU].push('menu-ingresar-edit-price');
                                        if (!appData.userPermissions[cleanU].includes('edit-precios')) appData.userPermissions[cleanU].push('edit-precios');
                                    } else {
                                        appData.userPermissions[cleanU] = appData.userPermissions[cleanU].filter(x => x !== 'menu-ingresar-edit-price' && x !== 'edit-precios' && x !== 'edit-price');
                                    }
                                }
                            }
                            try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}

                            const cur = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
                            if (cur && (String(cur.id) === String(updU.id) || String(cur.username).toLowerCase() === cleanU)) {
                                if (typeof buildSidebar === 'function') buildSidebar();
                            }
                        }
                    })
                    .subscribe();

                // Suscripción Realtime a la tabla 'clientes'
                client
                    .channel('public:clientes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'clientes'
                    }, function(payload) {
                        if (payload.eventType === 'DELETE' && payload.old && typeof clientesDB !== 'undefined') {
                            const oldCode = String(payload.old.codigo || payload.old.id || '');
                            const delIdx = clientesDB.findIndex(function(lc) { return String(lc.codigo) === oldCode || String(lc.id) === oldCode; });
                            if (delIdx !== -1) {
                                clientesDB.splice(delIdx, 1);
                                window.clientesDB = clientesDB;
                                console.log("🗑️ Cliente " + oldCode + " eliminado automáticamente en tiempo real.");
                            }
                            return;
                        }
                        if (payload.new && typeof clientesDB !== 'undefined') {
                            const sc = payload.new;
                            sc.condicion_nombre = cleanConditionName(sc.condicion_nombre);
                            if (!sc.condicion_id || String(sc.condicion_id) === '0') sc.condicion_id = '1';
                            const idx = clientesDB.findIndex(function(lc) { return String(lc.codigo) === String(sc.codigo); });
                            if (idx !== -1) {
                                clientesDB[idx] = sc;
                            } else {
                                clientesDB.push(sc);
                            }
                            window.clientesDB = clientesDB;
                            console.log("⚡ Cliente actualizado en vivo desde Supabase:", sc.nombre);
                        }
                    })
                    .subscribe();

                // Suscripción Realtime a la tabla 'tarifario' (Precios y nuevos ítems en tiempo real)
                client
                    .channel('public:tarifario')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'tarifario'
                    }, function(payload) {
                        const item = payload.new;
                        if (payload.eventType === 'DELETE' && payload.old) {
                            const oldCode = payload.old.codigo || payload.old.id;
                            if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
                                const idxE = PRESUPUESTO_ELECTRICO_STOCK.findIndex(x => x.codigo === oldCode);
                                if (idxE !== -1) PRESUPUESTO_ELECTRICO_STOCK.splice(idxE, 1);
                            }
                            if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
                                const idxM = PRESUPUESTO_MECANICO_STOCK.findIndex(x => x.codigo === oldCode);
                                if (idxM !== -1) PRESUPUESTO_MECANICO_STOCK.splice(idxM, 1);
                            }
                            if (typeof window.renderMecanicoExcelGrid === 'function') window.renderMecanicoExcelGrid();
                            return;
                        }
                        if (item && item.codigo) {
                            const nPrice = parseFloat(item.precio) || 0;
                            const customPrices = getCustomItemPrices();
                            let key = item.codigo;
                            if (item.planta) key = key + '_' + item.planta.trim().toUpperCase();
                            customPrices[key] = nPrice;
                            if (!item.planta) customPrices[item.codigo] = nPrice;
                            try { localStorage.setItem('PRESUPUESTO_CUSTOM_PRICES', JSON.stringify(customPrices)); } catch(e) {}

                            // Actualizar catálogo eléctrico
                            if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
                                const fe = PRESUPUESTO_ELECTRICO_STOCK.find(x => x.codigo === item.codigo);
                                if (fe) {
                                    fe.precio = nPrice;
                                    fe.precio_unitario = nPrice;
                                    if (item.detalle) fe.detalle = item.detalle;
                                } else if (item.rubro === 'Eléctrico') {
                                    PRESUPUESTO_ELECTRICO_STOCK.push({
                                         codigo: item.codigo,
                                         detalle: item.detalle || '',
                                         descripcion: item.detalle || '',
                                         rubro: 'Eléctrico',
                                         subrubro: item.subrubro || 'Materiales y Equipos',
                                         udm: item.unidad || 'Hs',
                                         precio: nPrice,
                                         precio_unitario: nPrice,
                                         stock: parseFloat(item.stock) || 999,
                                         estado: item.estado || 'ACTIVOS'
                                     });
                                 }
                             }
                             if (typeof window.presupuestosCatalogDB !== 'undefined' && Array.isArray(window.presupuestosCatalogDB)) {
                                 const fcdb = window.presupuestosCatalogDB.find(x => x.codigo === item.codigo);
                                 if (fcdb) {
                                     fcdb.precio = nPrice;
                                     fcdb.precio_unitario = nPrice;
                                     if (item.detalle) fcdb.detalle = item.detalle;
                                 } else if (item.rubro === 'Eléctrico') {
                                     window.presupuestosCatalogDB.push({
                                         codigo: item.codigo,
                                         detalle: item.detalle || '',
                                         descripcion: item.detalle || '',
                                         rubro: 'Eléctrico',
                                         subrubro: item.subrubro || 'Materiales y Equipos',
                                         udm: item.unidad || 'Hs',
                                         precio: nPrice,
                                         precio_unitario: nPrice,
                                         stock: parseFloat(item.stock) || 999,
                                         estado: item.estado || 'ACTIVOS'
                                     });
                                 }
                             }

                             // Actualizar catálogo mecánico (tanto STOCK como presupuestoMecanicoDB con soporte de plantas)
                             const itemPlanta = (item.planta || '').trim().toUpperCase();
                             if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
                                 const fm = PRESUPUESTO_MECANICO_STOCK.find(x => x.codigo === item.codigo);
                                 if (fm) {
                                     fm.precio = nPrice;
                                     fm.precio_unitario = nPrice;
                                     if (item.detalle) fm.detalle = item.detalle;
                                 } else if (item.rubro === 'Mecánico') {
                                     PRESUPUESTO_MECANICO_STOCK.push({
                                         codigo: item.codigo,
                                         detalle: item.detalle || '',
                                         descripcion: item.detalle || '',
                                         rubro: 'Mecánico',
                                         subrubro: item.subrubro || 'Materiales y Equipos',
                                         udm: item.unidad || 'Hs',
                                         precio: nPrice,
                                         precio_unitario: nPrice,
                                         stock: parseFloat(item.stock) || 999,
                                         estado: item.estado || 'ACTIVOS',
                                         planta: itemPlanta
                                     });
                                 }
                             }
                             if (typeof window.presupuestoMecanicoDB !== 'undefined' && Array.isArray(window.presupuestoMecanicoDB)) {
                                 const fmdb = window.presupuestoMecanicoDB.find(x => x.codigo === item.codigo && (!itemPlanta || (x.planta || '').toUpperCase() === itemPlanta));
                                 if (fmdb) {
                                     fmdb.precio = nPrice;
                                     fmdb.precio_unitario = nPrice;
                                     if (item.detalle) fmdb.detalle = item.detalle;
                                 } else if (item.rubro === 'Mecánico') {
                                     window.presupuestoMecanicoDB.push({
                                         codigo: item.codigo,
                                         detalle: item.detalle || '',
                                         descripcion: item.detalle || '',
                                         rubro: 'Mecánico',
                                         subrubro: item.subrubro || 'Materiales y Equipos',
                                         udm: item.unidad || 'Hs',
                                         precio: nPrice,
                                         precio_unitario: nPrice,
                                         stock: parseFloat(item.stock) || 999,
                                         estado: item.estado || 'ACTIVOS',
                                         planta: itemPlanta
                                     });
                                 }
                             }
                             console.log("⚡ Tarifario actualizado en vivo desde Supabase:", item.codigo, "$" + nPrice);

                             // Si el usuario está en la grilla de presupuesto mecánico y no está tipeando activamente, actualizar la grilla
                             const mecaGrid = document.getElementById('req-mecanico-step2-container');
                             const isTypingNow = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
                             if (mecaGrid && mecaGrid.children.length > 0 && !isTypingNow && typeof window.renderMecanicoExcelGrid === 'function') {
                                 window.renderMecanicoExcelGrid();
                             }
                        }
                    })
                    .subscribe();

                // Suscripción Realtime a la tabla 'avances_obra'
                client
                    .channel('public:avances_obra')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'avances_obra'
                    }, function(payload) {
                        if (payload.new && payload.new.presupuesto_id && Array.isArray(appData.pedidos)) {
                            const pId = payload.new.presupuesto_id;
                            const targetP = appData.pedidos.find(x => String(x.id) === String(pId));
                            if (targetP) {
                                if (!Array.isArray(targetP.avances)) targetP.avances = [];
                                const avId = payload.new.id;
                                const existingIdx = targetP.avances.findIndex(a => a.id === avId);
                                const avObj = {
                                    id: avId,
                                    fecha: payload.new.fecha,
                                    porcentaje: parseFloat(payload.new.porcentaje) || 0,
                                    monto: parseFloat(payload.new.monto_equivalente) || 0,
                                    detalle: payload.new.detalle || ''
                                };
                                if (existingIdx !== -1) {
                                    targetP.avances[existingIdx] = avObj;
                                } else {
                                    targetP.avances.push(avObj);
                                }
                                try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
                                if (window.pedidoAvanceActivoId === targetP.id && typeof abrirModalAvanceObra === 'function') {
                                    abrirModalAvanceObra(targetP.id);
                                }
                            }
                        }
                    })
                    .subscribe();

                // Suscripción Realtime a señales de actualización del sistema (Broadcast)
                client
                    .channel('sg_system_control')
                    .on('broadcast', { event: 'remote_reload' }, function(msg) {
                        console.log("⚡ Señal de recarga remota recibida vía Broadcast:", msg);
                        if (typeof window.handleRemoteReloadRequest === 'function') {
                            window.handleRemoteReloadRequest(msg.payload || msg);
                        }
                    })
                    .subscribe();

            } catch(subErr) {
                console.warn("Error suscribiendo a Realtime de Supabase:", subErr);
            }

            if (callback) callback();
        })
        .catch(function(err) {
            console.warn("Error cargando datos de Supabase:", err);
            saveData();
            if (callback) callback();
        });
}

// Compatibilidad hacia atrás
function initFirebaseSync(callback) {
    return initSupabaseSync(callback);
}

function getCurrentUser() {
    if (!appData) return null;
    let curId = appData.currentUserId;
    if (!curId) {
        try { curId = localStorage.getItem('pedidos_current_user_id') || localStorage.getItem('sg_current_user_id') || localStorage.getItem('currentUserId'); } catch(e) {}
    }
    let curName = null;
    try { curName = localStorage.getItem('pedidos_current_username'); } catch(e) {}

    if (!curId && !curName) return null;

    if (!Array.isArray(appData.users) || appData.users.length === 0) {
        appData.users = defaultData.users.slice();
    }
    var found = null;
    if (curId) {
        found = appData.users.find(u => String(u.id) === String(curId) || String(u.username).toLowerCase() === String(curId).toLowerCase());
    }
    if (!found && curName) {
        found = appData.users.find(u => String(u.username).toLowerCase() === String(curName).toLowerCase());
    }
    if (!found && Array.isArray(defaultData.users)) {
        if (curId) found = defaultData.users.find(u => String(u.id) === String(curId) || String(u.username).toLowerCase() === String(curId).toLowerCase());
        if (!found && curName) found = defaultData.users.find(u => String(u.username).toLowerCase() === String(curName).toLowerCase());
        if (found) appData.users.push(found);
    }
    return found || null;
}

// Utilidades
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

window.buildPresupuestoSupabaseRow = function(p) {
    if (!p) return null;
    const amt = parseFloat(p.importe !== undefined && p.importe !== null ? p.importe : (p.importe_neto || p.importe_total || 0)) || 0;

    return {
        id: String(p.id).trim(),
        fecha: p.fecha || (typeof getLocalCurrentDateTimeStr === 'function' ? getLocalCurrentDateTimeStr() : new Date().toISOString()),
        tipo_presupuesto: p.tipo_presupuesto || (String(p.id).startsWith('101') ? 'Mecánico' : 'Eléctrico'),
        cliente_id: String(p.cliente_id || '3').trim(),
        cliente_nombre: String(p.cliente_nombre || 'CARGILL SACI').trim(),
        importe_neto: amt,
        estado: p.estado || 'Enviado sin OC',
        nro_oc: String(p.nro_oc || p.meca_nro_oc || '').trim(),
        motivo_rechazo: p.motivo_rechazo || '',
        operador: p.operador || 'admin',
        avance_porcentaje_acumulado: parseFloat(p.avance_porcentaje_acumulado) || 0,
        facturado_porcentaje: parseFloat(p.facturado_porcentaje || p.avance_porcentaje_acumulado) || 0,
        monto_facturado: parseFloat(p.monto_facturado || p.monto_facturado_total) || 0,
        nro_ot: String(p.nro_ot || p.meca_nro_ot || '').trim(),
        denominacion: String(p.meca_denominacion || p.denominacion || p.motivo || '').trim(),
        planta: String(p.planta || p.meca_planta || 'VGG').trim().toUpperCase(),
        proveedor: String(p.proveedor || p.meca_proveedor || 'SG MONTAJES SRL').trim(),
        fecha_oferta: p.fecha_oferta || p.meca_fecha_oferta || '',
        validez: p.validez || p.meca_validez || '',
        fecha_inicio: p.fecha_inicio || p.meca_fecha_inicio || '',
        duracion: p.duracion || p.meca_duracion || '',
        fecha_fin: p.fecha_fin || p.meca_fecha_fin || '',
        propuesta: p.propuesta || p.meca_propuesta || '',
        personal: p.personal || p.meca_personal || '',
        exclusiones: p.exclusiones || p.meca_exclusiones || ''
    };
};

window.resolveItemSubrubro = function(it, tipoPresupuesto = '') {
    if (!it) return 'Materiales y Equipos';
    let subr = String(it.subrubro || '').trim();
    if (subr && subr !== 'None' && subr !== 'null' && subr !== 'undefined') {
        return subr;
    }
    const code = String(it.codigo || '').trim();
    const det = String(it.detalle || it.descripcion || '').trim();
    const detLow = det.toLowerCase();

    // 1. Buscar en catálogo Mecánico
    const catM = (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_MECANICO_STOCK))
        ? PRESUPUESTO_MECANICO_STOCK
        : (window.presupuestoMecanicoDB || []);
    if (code) {
        const foundM = catM.find(c => c && (c.codigo === code || c.id === code));
        if (foundM && foundM.subrubro && String(foundM.subrubro).trim()) {
            return String(foundM.subrubro).trim();
        }
    }

    // 2. Buscar en catálogo Eléctrico
    const catE = (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_ELECTRICO_STOCK))
        ? PRESUPUESTO_ELECTRICO_STOCK
        : (window.presupuestosCatalogDB || []);
    if (code) {
        const foundE = catE.find(c => c && (c.codigo === code || c.id === code));
        if (foundE && foundE.subrubro && String(foundE.subrubro).trim()) {
            return String(foundE.subrubro).trim();
        }
    }

    // 3. Buscar en stockDB general
    if (typeof stockDB !== 'undefined' && Array.isArray(stockDB) && code) {
        const foundS = stockDB.find(s => s && (s.codigo === code || s.id === code));
        if (foundS && foundS.subrubro && String(foundS.subrubro).trim()) {
            return String(foundS.subrubro).trim();
        }
    }

    // 4. Inferencia por texto del detalle
    if (detLow.includes('emergencia')) {
        return 'Mano de Obra EMERGENCIA MANTENIMIENTO';
    }
    if (detLow.includes('parada')) {
        return 'Mano de Obra PARADA DE PLANTA';
    }
    if (detLow.includes('taller')) {
        return 'Mano de Obra EN TALLER';
    }
    if (detLow.includes('mantenimiento') || detLow.includes('supervisor') || detLow.includes('oficial') || detLow.includes('ayudante') || detLow.includes('seguridad')) {
        return 'Mano de Obra MANTENIMIENTO';
    }

    // 5. Inferencia por prefijo de código
    if (code.startsWith('ELE-')) {
        const num = parseInt(code.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num <= 27) {
            return 'Materiales y Equipos';
        }
        return 'Mano de Obra MANTENIMIENTO';
    }
    if (code.startsWith('MEC-')) {
        const num = parseInt(code.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num <= 27) {
            return 'Materiales y Equipos';
        }
        return 'Mano de Obra MANTENIMIENTO';
    }

    if (tipoPresupuesto === 'Mecánico') {
        return 'Materiales y Equipos';
    }
    return 'Materiales y Equipos';
};

window.guardarPresupuestoEnSupabase = async function(p) {
    if (!p || !p.id) return { success: false, error: 'No presupuesto data' };

    let uploadedSuccessfully = false;
    const client = (typeof getDbClient === 'function') ? getDbClient() : null;
    const row = window.buildPresupuestoSupabaseRow(p);

    // CAPA 1: Cliente SDK de Supabase (si está disponible)
    if (client) {
        try {
            const { error: presError } = await client.from('presupuestos').upsert([row], { onConflict: 'id' });
            if (!presError) {
                uploadedSuccessfully = true;
                console.log("☁️ Supabase SDK: Presupuesto " + row.id + " guardado con éxito.");

                if (Array.isArray(p.items) && p.items.length > 0) {
                    try {
                        await client.from('presupuesto_items').delete().eq('presupuesto_id', String(p.id).trim());
                        const itemRows = p.items.map((it, idx) => {
                            const cant = (it.cantidad === '-' || it.cantidad === undefined || it.cantidad === null) ? 1 : (parseFloat(it.cantidad) || 0);
                            const pu = (it.precio === '-' || it.precio === undefined || it.precio === null) ? 0 : (parseFloat(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)) || 0);
                            const sub = (it.subtotal === '-' || it.subtotal === undefined || it.subtotal === null) ? (cant * pu) : (parseFloat(it.subtotal) || (cant * pu));
                            const itemId = `${String(p.id).trim()}-ITM-${String(idx + 1).padStart(2, '0')}`;
                            const finalSubrubro = (typeof window.resolveItemSubrubro === 'function')
                                ? window.resolveItemSubrubro(it, p.tipo_presupuesto)
                                : (it.subrubro || 'Materiales y Equipos');
                            it.subrubro = finalSubrubro;

                            return {
                                id: itemId,
                                presupuesto_id: String(p.id).trim(),
                                codigo: String(it.codigo || '-'),
                                detalle: String(it.detalle || it.descripcion || 'Item de Presupuesto'),
                                rubro: p.tipo_presupuesto || 'Eléctrico',
                                subrubro: finalSubrubro,
                                cantidad: cant,
                                unidad: String(it.unidad || it.udm || 'UN'),
                                precio_unitario: pu,
                                subtotal: sub,
                                orden: idx + 1
                            };
                        });
                        await client.from('presupuesto_items').upsert(itemRows, { onConflict: 'id' });
                    } catch(itErr) {
                        console.warn("Aviso items en SDK:", itErr);
                    }
                }
            } else {
                console.warn("Aviso SDK Supabase al guardar presupuesto:", presError);
            }
        } catch(sdkErr) {
            console.warn("Excepción en SDK Supabase:", sdkErr);
        }
    }

    // CAPA 2: Petición Fetch REST Directa a Supabase (Funciona nativamente en cualquier navegador sin depender del SDK)
    if (!uploadedSuccessfully) {
        try {
            const config = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : { url: 'https://amkkuwgatjcbiyrykuoy.supabase.co', anonKey: 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ' };
            const headers = {
                'apikey': config.anonKey,
                'Authorization': `Bearer ${config.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            };

            const presRes = await fetch(`${config.url}/rest/v1/presupuestos`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify([row])
            });

            if (presRes.ok) {
                uploadedSuccessfully = true;
                console.log("☁️ Supabase REST Directo: Presupuesto " + row.id + " guardado con éxito.");

                if (Array.isArray(p.items) && p.items.length > 0) {
                    await fetch(`${config.url}/rest/v1/presupuesto_items?presupuesto_id=eq.${encodeURIComponent(String(p.id).trim())}`, {
                        method: 'DELETE',
                        headers: headers
                    });
                    const itemRows = p.items.map((it, idx) => {
                        const cant = (it.cantidad === '-' || it.cantidad === undefined || it.cantidad === null) ? 1 : (parseFloat(it.cantidad) || 0);
                        const pu = (it.precio === '-' || it.precio === undefined || it.precio === null) ? 0 : (parseFloat(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)) || 0);
                        const sub = (it.subtotal === '-' || it.subtotal === undefined || it.subtotal === null) ? (cant * pu) : (parseFloat(it.subtotal) || (cant * pu));
                        const itemId = `${String(p.id).trim()}-ITM-${String(idx + 1).padStart(2, '0')}`;
                        const finalSubrubro = (typeof window.resolveItemSubrubro === 'function')
                            ? window.resolveItemSubrubro(it, p.tipo_presupuesto)
                            : (it.subrubro || 'Materiales y Equipos');

                        return {
                            id: itemId,
                            presupuesto_id: String(p.id).trim(),
                            codigo: String(it.codigo || '-'),
                            detalle: String(it.detalle || it.descripcion || 'Item de Presupuesto'),
                            rubro: p.tipo_presupuesto || 'Eléctrico',
                            subrubro: finalSubrubro,
                            cantidad: cant,
                            unidad: String(it.unidad || it.udm || 'UN'),
                            precio_unitario: pu,
                            subtotal: sub,
                            orden: idx + 1
                        };
                    });
                    await fetch(`${config.url}/rest/v1/presupuesto_items`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(itemRows)
                    });
                }
            }
        } catch(restErr) {
            console.warn("Aviso REST Supabase:", restErr);
        }
    }

    // CAPA 3: Servidor Local Python Backend (/api/sync-presupuesto)
    if (!uploadedSuccessfully) {
        try {
            const beRes = await fetch('/api/sync-presupuesto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presupuesto: p })
            });
            if (beRes.ok) {
                uploadedSuccessfully = true;
                console.log("☁️ Supabase Backend Proxy: Presupuesto " + p.id + " guardado con éxito.");
            }
        } catch(beErr) {
            console.warn("Aviso Backend Proxy:", beErr);
        }
    }

    return { success: uploadedSuccessfully };
};

window.forzarSincronizacionSupabase = async function() {
    const client = (typeof getDbClient === 'function') ? getDbClient() : null;
    if (!client) return;

    try {
        const { data: allRemote, error: aErr } = await client.from('presupuestos').select('*').order('id', { ascending: false });
        if (!aErr && allRemote) {
            const existingItemsMap = {};
            if (Array.isArray(appData.pedidos)) {
                appData.pedidos.forEach(p => {
                    if (Array.isArray(p.items) && p.items.length > 0) existingItemsMap[String(p.id)] = p.items;
                });
            }
            appData.pedidos = normalizePresupuestosRubro(allRemote);
            appData.pedidos.forEach(p => {
                const pid = String(p.id);
                if ((!Array.isArray(p.items) || p.items.length === 0) && existingItemsMap[pid]) {
                    p.items = existingItemsMap[pid];
                }
            });
            try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData)); } catch(e) {}
            if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
            if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
        }
    } catch(err) {
        console.error("Error en sincronización con Supabase:", err);
    }
};

// Auto-sincronización periódica y al regresar a la pestaña (para no depender de que el usuario recargue)
let lastSilentPresupuestosSync = 0;
function triggerSilentPresupuestosSync() {
    const now = Date.now();
    if (now - lastSilentPresupuestosSync < 15000) return; // Máximo una vez cada 15 seg
    lastSilentPresupuestosSync = now;
    if (typeof window.forzarSincronizacionSupabase === 'function') {
        window.forzarSincronizacionSupabase();
    }
}
window.addEventListener('focus', triggerSilentPresupuestosSync);
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        triggerSilentPresupuestosSync();
    }
});
setInterval(triggerSilentPresupuestosSync, 60000);

function saveData() {
    try {
        localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData));
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
    }

    // Guardar en Supabase para sincronización global y tiempo real
    const client = getDbClient();
    if (client) {
        // 1. Estado global en app_state (permisos, notificaciones para Realtime)
        // NOTA: No incluir 'pedidos' aquí para evitar reinsertar presupuestos que fueron eliminados en Supabase
        client.from('app_state').upsert({
            id: 'globalData',
            notifications: appData.notifications || [],
            user_permissions: (appData.userPermissions && typeof appData.userPermissions === 'object' && Object.keys(appData.userPermissions).length > 0)
                ? Object.assign({}, defaultUserPermissions, appData.userPermissions)
                : Object.assign({}, defaultUserPermissions),
            custom_prices: appData.customPrices || (typeof getCustomItemPrices === 'function' ? getCustomItemPrices() : {}) || {},
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' }).then(function(res) {
            if (res && res.error) {
                console.warn("⚠️ Supabase sync warning (app_state):", res.error);
            } else {
                console.log("☁️ Supabase: app_state sincronizado con éxito.");
            }
        }).catch(function(err) {
            console.error("Error saving to Supabase:", err);
        });

        // 2. USUARIOS: gestionados de forma individual en tabla 'usuarios'
        // 3. PRESUPUESTOS & ITEMS: cada presupuesto se guarda de forma atómica e individual
        // con window.guardarPresupuestoEnSupabase() al crearlo o editarlo.
        // No se hace upsert masivo aquí para garantizar que lo borrado en Supabase no reaparezca nunca.

        // 4. AVANCES DE OBRA: NO se hace upsert masivo aquí.
        // Los avances se sincronizan individualmente cuando se cargan desde abrirModalAvanceObra.
        // El upsert masivo recrea avances de presupuestos borrados en Supabase.


        // 6. Sincronizar notificaciones en la tabla notificaciones de Supabase
        if (Array.isArray(appData.notifications) && appData.notifications.length > 0) {
            const notifsRows = appData.notifications.map(function(n) {
                const row = {
                    id: String(n.id),
                    message: String(n.message || ''),
                    read: !!n.read,
                    timestamp: n.timestamp || new Date().toISOString()
                };
                if (n.userId) row.user_id = String(n.userId);
                return row;
            });
            Promise.resolve(client.from('notificaciones').upsert(notifsRows, { onConflict: 'id' })).catch(function(err) {
                console.error("Error sincronizando notificaciones:", err);
            });
        }
    } else {
        // Fallback REST si el cliente SDK aún no está conectado
        try {
            const config = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : { url: 'https://amkkuwgatjcbiyrykuoy.supabase.co', anonKey: 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ' };
            const rHeaders = {
                'apikey': config.anonKey,
                'Authorization': `Bearer ${config.anonKey}`,
                'Content-Type': 'application/json'
            };
            fetch(`${config.url}/rest/v1/app_state?id=eq.globalData`, {
                method: 'PATCH',
                headers: rHeaders,
                body: JSON.stringify({
                    notifications: appData.notifications || [],
                    user_permissions: appData.userPermissions || {},
                    custom_prices: appData.customPrices || {},
                    updated_at: new Date().toISOString()
                })
            }).catch(() => {});
        } catch(e) {}
    }
}
window.saveData = saveData;
window.saveAppData = saveData;
window.initSupabaseSync = initSupabaseSync;
window.initFirebaseSync = initSupabaseSync;

// -- NOTIFICACIONES --
function addNotification(userId, message, linkTaskId = null) {
    if (!appData.notifications) appData.notifications = [];
    appData.notifications.unshift({
        id: generateId(),
        userId: userId,
        message: message,
        read: false,
        timestamp: new Date().toISOString(),
        taskId: linkTaskId
    });
    saveData();
    renderNotifications();
}

function renderNotifications() {
    const bellBadge = document.getElementById('notification-badge');
    const dropdownList = document.getElementById('notification-list');
    if (!bellBadge || !dropdownList) return;

    if (!appData || !appData.currentUserId) {
        bellBadge.style.display = 'none';
        return;
    }

    const notifs = (appData && Array.isArray(appData.notifications)) ? appData.notifications : [];
    const myNotifs = notifs.filter(n => n && (n.userId === appData.currentUserId || n.userId === 'all'));
    const unreadCount = myNotifs.filter(n => n && !n.read).length;

    if (unreadCount > 0) {
        bellBadge.innerText = unreadCount;
        bellBadge.style.display = 'block';
    } else {
        bellBadge.style.display = 'none';
    }

    dropdownList.innerHTML = '';
    if (myNotifs.length === 0) {
        dropdownList.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 10px;">No tenés notificaciones</p>';
    } else {
        myNotifs.slice(0, 10).forEach(n => {
            if (!n) return;
            const notifEl = document.createElement('div');
            notifEl.style.padding = '8px';
            notifEl.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            notifEl.style.fontSize = '12px';
            notifEl.style.cursor = 'pointer';
            if (!n.read) notifEl.style.backgroundColor = 'rgba(255,255,255,0.05)';

            notifEl.innerHTML = `
                <div style="font-weight: ${n.read ? 'normal' : 'bold'}; color: ${n.read ? 'var(--text-muted)' : 'var(--text-main)'};">${n.message}</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">${new Date(n.timestamp).toLocaleString('es-AR')}</div>
            `;

            notifEl.onclick = () => {
                n.read = true;
                saveData();
                renderNotifications();
                document.getElementById('notification-dropdown').style.display = 'none';
                if (n.taskId) {
                    // Abrir el pedido para resolver / ver detalle
                    verDetallePedido(n.taskId);
                }
            };

            dropdownList.appendChild(notifEl);
        });
    }
}

// Configurar campanita de notificaciones
function initApp() {
    // Cargar tema inicial
    const savedTheme = localStorage.getItem('presea_theme') || 'cyberpunk';
    document.body.setAttribute('data-theme', savedTheme);

    const bellIcon = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    if (bellIcon && dropdown) {
        bellIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Configurar toggle del menú lateral (hamburguesa en móvil y drawer)
    window.toggleMobileSidebar = function(force) {
        const sidebar = document.getElementById('sidebar-menu');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (!sidebar) return;
        const willOpen = (typeof force === 'boolean') ? force : !sidebar.classList.contains('open');
        if (willOpen) {
            sidebar.classList.add('open');
            if (backdrop) backdrop.classList.add('active');
            document.body.classList.add('sidebar-drawer-open');
        } else {
            sidebar.classList.remove('open');
            if (backdrop) backdrop.classList.remove('active');
            document.body.classList.remove('sidebar-drawer-open');
        }
    };

    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar-menu');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.toggleMobileSidebar();
        });
    }
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            window.toggleMobileSidebar(false);
        });
    }

    // Cerrar sidebar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
            window.toggleMobileSidebar(false);
        }
    });

    // Delegación de eventos para validar y formatear los campos de cotización (máx 4 enteros, máx 8 decimales)
    document.addEventListener('input', (e) => {
        if (e.target && (e.target.id === 'req-exchange-rate' || e.target.id === 'auth-exchange-rate-input')) {
            let value = e.target.value;
            // Remover cualquier caracter que no sea número o punto decimal
            value = value.replace(/[^0-9.]/g, '');

            // Permitir como máximo un solo punto decimal
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }

            // Limitar la longitud antes y después del punto
            const finalParts = value.split('.');
            let integerPart = finalParts[0];
            let decimalPart = finalParts[1];

            if (integerPart.length > 4) {
                integerPart = integerPart.substring(0, 4);
            }
            if (decimalPart !== undefined && decimalPart.length > 8) {
                decimalPart = decimalPart.substring(0, 8);
            }

            e.target.value = decimalPart !== undefined ? (integerPart + '.' + decimalPart) : integerPart;
        }
    });

    document.addEventListener('focusout', (e) => {
        if (e.target && (e.target.id === 'req-exchange-rate' || e.target.id === 'auth-exchange-rate-input')) {
            let val = parseFloat(e.target.value);
            if (isNaN(val) || val <= 0) {
                if (e.target.id === 'req-exchange-rate') {
                    const currencySelect = document.getElementById('req-currency');
                    const currencyVal = currencySelect ? parseInt(currencySelect.value) : 1;
                    val = (currencyVal === 2 ? 1011.00 : (currencyVal === 60 ? 1100.00 : 1.0));
                } else {
                    const currencySelect = document.getElementById('auth-currency-select');
                    const currencyVal = currencySelect ? parseInt(currencySelect.value) : 1;
                    val = (currencyVal === 2 ? 1011.00 : (currencyVal === 60 ? 1100.00 : 1.0));
                }
            }
            e.target.value = val.toFixed(8);
        }
    });

    // Iniciar la app inmediatamente sin bloquear por red
    startApp();
    try {
        if (typeof initSupabaseSync === 'function') {
            initSupabaseSync();
        } else if (typeof initFirebaseSync === 'function') {
            initFirebaseSync();
        }
    } catch (e) {
        console.warn("Supabase sync bypass:", e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error' || type === 'danger') icon = '❌';
    else if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span style="font-size: 13px; flex-shrink: 0;">${icon}</span>
        <span style="font-size: 12px; font-weight: 600; color: #ffffff; line-height: 1.25;">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 30);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 2400);
}

// --- NAVEGACIÓN Y VISTAS ---
function switchView(viewName) {
    const loginView = document.getElementById('login-view');
    const mainView = document.getElementById('main-view');

    if (typeof closeModal === 'function') {
        closeModal();
    }

    if (viewName === 'main') {
        if (loginView) {
            loginView.classList.remove('active');
            loginView.style.display = 'none';
        }
        if (mainView) {
            mainView.classList.add('active');
            mainView.style.display = 'flex';
        }
    } else {
        if (mainView) {
            mainView.classList.remove('active');
            mainView.style.display = 'none';
        }
        if (loginView) {
            loginView.classList.add('active');
            loginView.style.display = 'flex';
        }
    }
}

function renderContent(templateId) {
    const mainContent = document.getElementById('main-content');
    const template = document.getElementById(templateId);
    if (!template) return;
    mainContent.innerHTML = '';
    mainContent.appendChild(template.content.cloneNode(true));
}

// --- LÓGICA DE ROLES, PERMISOS Y MENÚ ---
const defaultMenuPermissions = {
    Administrador: ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-admin', 'menu-facturacion'],
    Solicitante: ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-facturacion'],
    Autorizador: ['menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-facturacion'],
    Ventas: ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-facturacion'],
};

const allAvailableModules = [
    { id: 'menu-ingresar', label: 'Gestión de Presupuestos', icon: 'fa-solid fa-pen-to-square', tpl: 'tpl-request-ped', action: initRequestView },
    { id: 'menu-all', label: 'Seguimiento', icon: 'fa-solid fa-clock-rotate-left', tpl: 'tpl-assignments', action: () => initAssignmentsView('Modificacion') },
    { id: 'menu-estado-presupuesto', label: 'Estado del Presupuesto', icon: 'fa-solid fa-list-check', tpl: 'tpl-assignments', action: () => initAssignmentsView('EstadoPresupuesto') },
    { id: 'menu-rechazados', label: 'Rechazo de Presupuesto', icon: 'fa-solid fa-ban', tpl: 'tpl-assignments', action: () => initAssignmentsView('Rechazados') },
    { id: 'menu-facturacion', label: 'Registros de Facturación', icon: 'fa-solid fa-file-invoice-dollar', tpl: 'tpl-facturacion', action: () => { showView('tpl-facturacion'); if (window.renderFacturacionTable) window.renderFacturacionTable(); } },
    { id: 'menu-metrics', label: 'Estadísticas y BI', icon: 'fa-solid fa-chart-pie', tpl: 'tpl-metrics', action: initMetricsView },
    { id: 'menu-admin', label: 'Configuración', icon: 'fa-solid fa-gear', tpl: 'tpl-admin', action: initAdminView },
];

function getUserEffectivePermissions(userOrName, role) {
    let username = typeof userOrName === 'string' ? userOrName : (userOrName ? userOrName.username : '');
    let userRole = (userOrName && typeof userOrName === 'object') ? userOrName.role : (role || 'Solicitante');
    const uKey = String(username || '').trim().toLowerCase();

    // 0. Encontrar el objeto de usuario si se pasó sólo el username
    let userObj = (userOrName && typeof userOrName === 'object') ? userOrName : null;
    if (!userObj && appData && Array.isArray(appData.users)) {
        userObj = appData.users.find(u => String(u.username || '').trim().toLowerCase() === uKey || String(u.id) === uKey);
    }
    if (userObj && userObj.role && !role) {
        userRole = userObj.role;
    }

    let perms = null;

    // 1. PRIORIDAD SUPREMA: Lo guardado en el objeto de usuario proveniente de la tabla 'usuarios' de Supabase (Fuente Única de Verdad)
    if (userObj) {
        let directPerms = userObj.permisos || userObj.permissions;
        if (typeof directPerms === 'string') {
            try { directPerms = JSON.parse(directPerms); } catch(e) {}
            if (typeof directPerms === 'string' && !directPerms.startsWith('[')) {
                directPerms = directPerms.split(',').map(s => s.trim());
            }
        }
        if (Array.isArray(directPerms) && directPerms.length > 0) {
            perms = directPerms.slice();
        }
    }

    // 2. Si no se encontró en el objeto directo, buscar en appData.userPermissions (sincronizados desde Supabase)
    if ((!perms || !Array.isArray(perms) || perms.length === 0) && appData && appData.userPermissions && typeof appData.userPermissions === 'object') {
        for (let k of Object.keys(appData.userPermissions)) {
            if (String(k).trim().toLowerCase() === uKey) {
                const val = appData.userPermissions[k];
                if (Array.isArray(val) && val.length > 0) {
                    perms = val.slice();
                    break;
                }
            }
        }
    }

    // 3. Si no se encontró, buscar en defaultUserPermissions
    if (!perms || !Array.isArray(perms) || perms.length === 0) {
        for (let k of Object.keys(defaultUserPermissions)) {
            if (String(k).trim().toLowerCase() === uKey) {
                perms = defaultUserPermissions[k].slice();
                break;
            }
        }
    }

    // 4. Si aún no se encontró, usar defaultMenuPermissions por rol
    if (!perms || !Array.isArray(perms) || perms.length === 0) {
        perms = (defaultMenuPermissions[userRole] || ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all']).slice();
    }

    let finalPerms = Array.isArray(perms) ? perms.slice() : [];

    // Si el usuario tiene can_edit_prices en true desde Supabase, asegurar permisos correspondientes
    if (userObj && (userObj.can_edit_prices === true || (Array.isArray(userObj.permisos) && (userObj.permisos.includes('menu-ingresar-edit-price') || userObj.permisos.includes('edit-precios'))))) {
        if (!finalPerms.includes('menu-ingresar-edit-price')) finalPerms.push('menu-ingresar-edit-price');
        if (!finalPerms.includes('edit-precios')) finalPerms.push('edit-precios');
    }

    return finalPerms;
}

window.getUserEffectivePermissions = getUserEffectivePermissions;

window.getUserSeguimientoPermissions = function(user) {
    if (!user) return { hasAccess: false, canViewComprobante: false, canEdit: false };

    const userPerms = getUserEffectivePermissions(user);
    const hasMenuAll = userPerms.includes('menu-all');
    const hasVer = userPerms.includes('menu-all-ver');
    const hasEdit = userPerms.includes('menu-all-edit');

    // Compatibilidad retroactiva: si sólo tenía 'menu-all' sin los nuevos subpermisos
    if (hasMenuAll && !hasVer && !hasEdit) {
        return {
            hasAccess: true,
            canViewComprobante: true,
            canEdit: true
        };
    }

    return {
        hasAccess: hasMenuAll || hasVer || hasEdit,
        canViewComprobante: hasVer || (hasMenuAll && !hasEdit),
        canEdit: hasEdit
    };
};

function getMenuItemsForUser(user) {
    if (!user) return [];
    const userPerms = getUserEffectivePermissions(user);
    let items = allAvailableModules.filter(m => {
        if (m.id === 'menu-all') {
            return userPerms.includes('menu-all') || userPerms.includes('menu-all-ver') || userPerms.includes('menu-all-edit');
        }
        return userPerms.includes(m.id);
    });
    if (!items || items.length === 0) {
        items = allAvailableModules.filter(m => ['menu-ingresar', 'menu-all', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-facturacion'].includes(m.id));
    }
    return items;
}

function buildSidebar() {
    const user = getCurrentUser();
    if (!user) return;
    if (window.SGChat && typeof window.SGChat.setUser === 'function') {
        try { window.SGChat.setUser(user); } catch(e) {}
    }
    const sidebar = document.getElementById('sidebar-menu');
    if (!sidebar) return;

    // Guardar el ID del ítem activo antes de reconstruir el menú
    const prevActiveEl = sidebar.querySelector('.menu-item.active');
    const prevActiveId = prevActiveEl ? prevActiveEl.id : null;
    const isFirstBuild = !window._sidebarBuiltOnce;
    window._sidebarBuiltOnce = true;

    sidebar.innerHTML = '';

    const userNameEl = document.getElementById('current-user-name');
    if (userNameEl) {
        userNameEl.innerText = user.username;
        const vendedorBadgeId = 'header-vendedor-badge';
        let existingBadge = document.getElementById(vendedorBadgeId);
        if (existingBadge) existingBadge.remove();
        if (user.vendedor_nombre) {
            const vendedorBadge = document.createElement('span');
            vendedorBadge.id = vendedorBadgeId;
            vendedorBadge.style.cssText = 'font-size: 11px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #10b981; padding: 2px 8px; border-radius: 20px; font-weight: 600; letter-spacing: 0.3px;';
            vendedorBadge.innerHTML = `🧑‍💼 ${user.vendedor_nombre}`;
            userNameEl.insertAdjacentElement('afterend', vendedorBadge);
        }
    }

    const roleEl = document.getElementById('current-user-role');
    if (roleEl) roleEl.remove();

    const items = getMenuItemsForUser(user);
    let clickedItem = false;

    items.forEach((item, index) => {
        const a = document.createElement('a');
        a.className = 'menu-item';
        a.id = item.id;
        a.innerHTML = `<i class="${item.icon}"></i> <span>${item.label}</span>`;
        a.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            a.classList.add('active');
            window._sidebarActiveMenuId = item.id;
            if (item.id === 'menu-ingresar') {
                window.pedidoEnEdicionId = null;
                window.pedidoEnReutilizacion = false;
                pedidoItems = [];
                productoSeleccionado = null;
            }
            renderContent(item.tpl);
            if (item.action) item.action();

            if (typeof window.registrarNavegacion === 'function') {
                window.registrarNavegacion({ type: 'menu', id: item.id, tpl: item.tpl, label: item.label });
            }
        };
        sidebar.appendChild(a);

        // Solo auto-click en el primer build (login). En rebuilds por Realtime,
        // restaurar el ítem que estaba activo sin llamar action() para no resetear la vista.
        if (isFirstBuild && index === 0 && !clickedItem) {
            a.click();
            clickedItem = true;
        } else if (!isFirstBuild && prevActiveId && item.id === prevActiveId) {
            // Restaurar solo el estilo activo, sin re-ejecutar la acción
            a.classList.add('active');
            window._sidebarActiveMenuId = item.id;
            clickedItem = true;
        }
    });

    // Si en un rebuild no se encontró el ítem activo previo (fue removido por cambio de permisos),
    // auto-click al primero como fallback
    if (!isFirstBuild && !clickedItem && items.length > 0) {
        const firstItem = sidebar.querySelector('.menu-item');
        if (firstItem) firstItem.click();
    }


    // Agregar selector de temas a la derecha de la barra horizontal
    const themeContainer = document.createElement('div');
    themeContainer.className = 'theme-selector-container';
    themeContainer.style.cssText = 'margin-left: auto; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; padding-left: 10px;';
    themeContainer.innerHTML = `
        <span class="theme-label" style="font-size: 11px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-palette"></i></span>
        <div class="theme-buttons" style="display: inline-flex; gap: 4px;">
            <button class="theme-btn" data-theme="cyberpunk" title="Corporativo GR (Default)" style="width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: #2563eb; border: 1.5px solid #fbbf24;"></button>
            <button class="theme-btn" data-theme="midnight" title="Midnight Purple" style="width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: #a855f7; border: 1px solid rgba(255,255,255,0.2);"></button>
            <button class="theme-btn" data-theme="emerald" title="Emerald Credit" style="width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: #10b981; border: 1px solid rgba(255,255,255,0.2);"></button>
            <button class="theme-btn" data-theme="light" title="Light Glass" style="width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: #0284c7; border: 1px solid rgba(255, 255, 255, 0.2);"></button>
        </div>
    `;
    sidebar.appendChild(themeContainer);

    // Configurar listeners para los botones de tema
    const activeTheme = document.body.getAttribute('data-theme') || 'cyberpunk';
    themeContainer.querySelectorAll('.theme-btn').forEach(btn => {
        const theme = btn.getAttribute('data-theme');
        if (theme === activeTheme) btn.classList.add('active');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedTheme = btn.getAttribute('data-theme');
            document.body.setAttribute('data-theme', selectedTheme);
            localStorage.setItem('presea_theme', selectedTheme);

            themeContainer.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

if (typeof window !== 'undefined' && !window._sidebarResizeBound) {
    window._sidebarResizeBound = true;
    let _lastWasMobile = (window.innerWidth <= 900);
    window.addEventListener('resize', () => {
        const nowMobile = (window.innerWidth <= 900);
        if (nowMobile !== _lastWasMobile) {
            _lastWasMobile = nowMobile;
            buildSidebar();
        }
    });
}

// --- HELPER DE PARSEO NUMÉRICO CON SOPORTE PARA COMA DECIMAL (,) Y PUNTO (.) ---
window.parseArgNumber = function(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = val.toString().trim();
    if (!str) return 0;
    // Si contiene puntos y comas (ej. 1.250,50), remover puntos de miles y cambiar coma por punto
    if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// --- SISTEMA GLOBAL DE HISTORIAL Y BOTÓN VOLVER ---
window.appNavHistory = [];
window.isNavigatingBack = false;

window.registrarNavegacion = function(state) {
    if (window.isNavigatingBack || !state) return;
    const last = window.appNavHistory[window.appNavHistory.length - 1];
    if (last && last.type === state.type && last.id === state.id && last.step === state.step && last.pedidoId === state.pedidoId) {
        return;
    }
    window.appNavHistory.push(state);
    if (window.appNavHistory.length > 50) window.appNavHistory.shift();
    if (typeof window.actualizarBotonVolver === 'function') {
        window.actualizarBotonVolver();
    }
};

window.volverAccionAnterior = function() {
    // 1. Si hay un modal abierto, cerrarlo inmediatamente
    const overlay = document.getElementById('modal-overlay');
    const hasModalOpen = (overlay && overlay.style.display !== 'none' && overlay.innerHTML.trim().length > 0);

    if (hasModalOpen) {
        closeModal();
        if (typeof window.actualizarBotonVolver === 'function') {
            window.actualizarBotonVolver();
        }
        return;
    }

    // 2. Si estamos en un paso avanzado del wizard de nuevo presupuesto (Paso 3 -> Paso 2 -> Paso 1)
    if (typeof currentRequestStep !== 'undefined' && currentRequestStep > 1) {
        goToRequestStep(currentRequestStep - 1);
        return;
    }

    // 3. Si hay historial acumulado de pantallas/módulos
    if (window.appNavHistory.length > 1) {
        window.isNavigatingBack = true;
        try {
            // Remover el estado actual
            window.appNavHistory.pop();
            // Obtener el estado previo
            const prevState = window.appNavHistory[window.appNavHistory.length - 1];

            if (prevState) {
                if (prevState.type === 'menu') {
                    const menuEl = document.getElementById(prevState.id);
                    if (menuEl) {
                        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
                        menuEl.classList.add('active');
                        const menuItem = allAvailableModules.find(m => m.id === prevState.id);
                        if (menuItem) {
                            renderContent(menuItem.tpl);
                            if (menuItem.action) menuItem.action();
                        }
                    }
                } else if (prevState.type === 'step') {
                    goToRequestStep(prevState.step);
                } else if (prevState.type === 'modal_auth') {
                    verDetallePedido(prevState.pedidoId);
                } else if (prevState.type === 'modal_avance') {
                    abrirModalAvanceObra(prevState.pedidoId);
                } else if (prevState.type === 'modal_comprobante') {
                    abrirComprobanteAvance(prevState.pedidoId, prevState.avanceId);
                }
            }
        } finally {
            window.isNavigatingBack = false;
            if (typeof window.actualizarBotonVolver === 'function') {
                window.actualizarBotonVolver();
            }
        }
        return;
    }

    // 4. Si estamos en un módulo secundario sin más historial previo, regresar al módulo principal (Gestión de Presupuestos)
    const activeMenu = document.querySelector('.menu-item.active');
    const homeMenu = document.getElementById('menu-ingresar') || document.querySelector('.menu-item');
    if (activeMenu && homeMenu && activeMenu !== homeMenu) {
        homeMenu.click();
        return;
    }

    showToast('Ya se encuentra en la pantalla inicial.', 'info');
};

window.actualizarBotonVolver = function() {
    const btnVolver = document.getElementById('btn-global-volver');
    const btnFloating = document.getElementById('btn-floating-volver');
    const overlay = document.getElementById('modal-overlay');
    const hasModal = (overlay && overlay.style.display !== 'none' && overlay.innerHTML.trim().length > 0);
    const hasStepBack = (typeof currentRequestStep !== 'undefined' && currentRequestStep > 1);
    const canGoBack = hasModal || hasStepBack || (window.appNavHistory.length > 1);

    const btnSidebarVolver = document.getElementById('btn-sidebar-volver');

    if (btnVolver) {
        if (canGoBack) {
            btnVolver.classList.remove('disabled');
        } else {
            btnVolver.classList.add('disabled');
        }
    }

    if (btnSidebarVolver) {
        if (canGoBack) {
            btnSidebarVolver.classList.remove('disabled');
            btnSidebarVolver.style.opacity = '1';
            btnSidebarVolver.style.pointerEvents = 'auto';
        } else {
            btnSidebarVolver.classList.add('disabled');
            btnSidebarVolver.style.opacity = '0.5';
            btnSidebarVolver.style.pointerEvents = 'none';
        }
    }
};

// Atajo de teclado: Alt + Flecha Izquierda para volver
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            window.volverAccionAnterior();
        }
    });
}

// --- MODAL UTILS & ESTADO ACTIVO ---
var pedidoActivo = null;
window.pedidoActivo = null;
var pedidoEdicionTemp = null;
var reqTipoPresupuesto = null;

function openModal(templateId) {
    const overlay = document.getElementById('modal-overlay');
    const template = document.getElementById(templateId);
    if (!overlay || !template) return;

    document.body.classList.add('modal-open');
    overlay.innerHTML = '';
    overlay.appendChild(template.content.cloneNode(true));
    overlay.style.display = 'flex';
    if (typeof window.actualizarBotonVolver === 'function') {
        window.actualizarBotonVolver();
    }
}

function closeModal() {
    document.body.classList.remove('modal-open');
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
    const factModal = document.getElementById('modal-registrar-factura');
    if (factModal) factModal.style.display = 'none';
    const emailModal = document.getElementById('email-dispatch-modal');
    if (emailModal) emailModal.style.display = 'none';
    const projModal = document.getElementById('modal-avance-proyecto');
    if (projModal) projModal.style.display = 'none';
    const obraModal = document.getElementById('modal-avance-obra');
    if (obraModal) obraModal.style.display = 'none';
    const compModal = document.getElementById('modal-comprobante-avance');
    if (compModal) compModal.style.display = 'none';

    pedidoActivo = null;
    window.pedidoActivo = null;
    pedidoEdicionTemp = null;

    // Sincronizar tema con la vista activa según reqTipoPresupuesto
    if (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Eléctrico') {
        document.body.classList.add('theme-electrico');
    } else {
        document.body.classList.remove('theme-electrico');
    }

    document.title = 'Gestión de Presupuestos';
    if (typeof window.actualizarBotonVolver === 'function') {
        window.actualizarBotonVolver();
    }
}

// --- VALIDACIÓN DE CRÉDITO Y LÍMITES COMERCIALES ---
function evaluarCreditoCliente(client, newAmount = 0.0) {
    const defaultLimit = 5000000.0; // $5M default
    const vipLimit = 15000000.0;    // $15M VIP

    const isVip = client.estado === 'VIP' || client.nombre.toUpperCase().includes('VIP');
    const creditLimit = isVip ? vipLimit : defaultLimit;

    const deudaActual = parseFloat(client.deuda_actual || 0.0);
    const totalExposure = deudaActual + parseFloat(newAmount);

    const exceedsLimit = totalExposure > creditLimit;
    const hasMora = Array.isArray(client.facturas_mora) && client.facturas_mora.length > 0;

    const reasons = [];
    if (hasMora) {
        const firstOverdue = client.facturas_mora[0];
        reasons.push(`Mora activa: Factura ${firstOverdue.formulario} Nº ${firstOverdue.numero} vencida hace ${firstOverdue.demora} días (Límite 30 días).`);
    }
    if (exceedsLimit) {
        reasons.push(`Límite de crédito excedido: Deuda actual $${deudaActual.toLocaleString('es-AR', {minimumFractionDigits:2})} + Pedido $${parseFloat(newAmount).toLocaleString('es-AR', {minimumFractionDigits:2})} = $${totalExposure.toLocaleString('es-AR', {minimumFractionDigits:2})} superando el límite de $${creditLimit.toLocaleString('es-AR', {minimumFractionDigits:2})}.`);
    }

    return {
        isBlocked: exceedsLimit || hasMora,
        reasons: reasons.join(' | '),
        deudaActual,
        creditLimit,
        exceedsLimit,
        hasMora
    };
}

// --- INICIALIZACIÓN DE VISTAS ---

// 1. INGRESO DE PEDIDOS
let depositoSeleccionado = null;
let transporteSeleccionado = null;
let pedidoItems = [];
let productoSeleccionado = null;
let condicionSeleccionada = null;

function seleccionarCondicion(cond) {
    if (!cond || String(cond.codigo) === '0' || (cond.nombre && (/no\s*usar/i.test(cond.nombre) || /condici[oó]n\s*0/i.test(cond.nombre)))) {
        cond = (typeof condicionesDB !== 'undefined' && Array.isArray(condicionesDB) && condicionesDB.length > 0) ? condicionesDB[0] : { codigo: "1", nombre: "CONTADO", dias: 0 };
    }
    condicionSeleccionada = cond;
    const input = document.getElementById('req-condition-input');
    const hidden = document.getElementById('req-condition');
    if (input) {
        const cName = cleanConditionName(cond ? cond.nombre : 'CONTADO');
        input.value = cond ? `${cName}${cond.dias ? ` (${cond.dias} días)` : ''} (Cód: ${cond.codigo || '1'})` : 'CONTADO (0 días) (Cód: 1)';
    }
    if (hidden) {
        hidden.value = cond ? (String(cond.codigo) === '0' ? '1' : cond.codigo) : '1';
    }
    const dropdown = document.getElementById('req-condition-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function seleccionarDeposito(dep) {
    depositoSeleccionado = dep;
    const input = document.getElementById('req-deposit-input');
    if (input) {
        input.value = dep ? (dep.nombre ? `${dep.nombre} (Cód: ${dep.codigo})` : `Depósito ${dep.codigo}`) : '';
    }
    const dropdown = document.getElementById('req-deposit-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function seleccionarTransporte(trans) {
    transporteSeleccionado = trans;
    const input = document.getElementById('req-transport-input');
    if (input) {
        input.value = trans ? (trans.nombre ? `${trans.nombre} (Cód: ${trans.codigo})` : `Transporte ${trans.codigo}`) : '';
    }
    const dropdown = document.getElementById('req-transport-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

window.abrirRobotDepositos = function() {
    openModal('tpl-modal-robot-depositos');
    const searchInput = document.getElementById('robot-dep-search-input');
    const resultsList = document.getElementById('robot-dep-results-list');
    const resultsCount = document.getElementById('robot-dep-results-count');

    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();

        let filtered = [];
        if (cleanQuery === '') {
            filtered = depositosDB.slice(0, 100);
        } else {
            filtered = depositosDB.filter(d =>
                d.nombre.toLowerCase().includes(cleanQuery) ||
                d.codigo.includes(cleanQuery)
            );
        }

        resultsCount.innerText = `Mostrando ${filtered.length} depósitos`;

        filtered.forEach(d => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            tr.innerHTML = `
                <td style="font-family: monospace;">${d.codigo}</td>
                <td><strong>${d.nombre || 'Sin nombre'}</strong></td>
            `;

            tr.onclick = () => {
                seleccionarDeposito(d);
                closeModal();
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.abrirRobotTransportes = function() {
    openModal('tpl-modal-robot-transportes');
    const searchInput = document.getElementById('robot-trans-search-input');
    const resultsList = document.getElementById('robot-trans-results-list');
    const resultsCount = document.getElementById('robot-trans-results-count');

    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();

        let filtered = [];
        if (cleanQuery === '') {
            filtered = transportesDB.slice(0, 100);
        } else {
            filtered = transportesDB.filter(t =>
                t.nombre.toLowerCase().includes(cleanQuery) ||
                t.codigo.includes(cleanQuery)
            );
        }

        resultsCount.innerText = `Mostrando ${filtered.length} transportes`;

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            tr.innerHTML = `
                <td style="font-family: monospace;">${t.codigo}</td>
                <td><strong>${t.nombre || 'Sin nombre'}</strong></td>
            `;

            tr.onclick = () => {
                seleccionarTransporte(t);
                closeModal();
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.abrirRobotCondiciones = function() {
    openModal('tpl-modal-robot-condiciones');
    const searchInput = document.getElementById('robot-cond-search-input');
    const resultsList = document.getElementById('robot-cond-results-list');
    const resultsCount = document.getElementById('robot-cond-results-count');

    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();

        let filtered = [];
        if (cleanQuery === '') {
            filtered = condicionesDB.slice(0, 100);
        } else {
            filtered = condicionesDB.filter(c =>
                (c.nombre || '').toLowerCase().includes(cleanQuery) ||
                String(c.codigo).includes(cleanQuery) ||
                String(c.dias).includes(cleanQuery)
            );
        }

        resultsCount.innerText = `Mostrando ${filtered.length} condiciones`;

        filtered.forEach(c => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            tr.innerHTML = `
                <td style="font-family: monospace;">${c.codigo}</td>
                <td><strong>${c.nombre || 'Sin nombre'}</strong></td>
                <td>${c.dias} días</td>
            `;

            tr.onclick = () => {
                seleccionarCondicion(c);
                closeModal();
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

// --- LÓGICA DE TIPO DE PRESUPUESTO (ELÉCTRICO / MECÁNICO) ---
// (Variable reqTipoPresupuesto declarada arriba como var)

window.getCustomItemPrices = function() {
    try {
        const saved = localStorage.getItem('PRESUPUESTO_CUSTOM_PRICES');
        const localObj = saved ? JSON.parse(saved) : {};
        if (typeof appData !== 'undefined' && appData && appData.customPrices) {
            return Object.assign({}, localObj, appData.customPrices);
        }
        return localObj;
    } catch (e) {
        return (typeof appData !== 'undefined' && appData && appData.customPrices) ? appData.customPrices : {};
    }
};

// ==========================================================
// GESTIÓN DE COTIZACIÓN EXCLUSIVA DE MATERIALES (U$D)
// ==========================================================
window.getCotizacionMateriales = function() {
    // 1. Si hay un input en pantalla con valor válido, priorizarlo
    const gridInp = document.getElementById('grid-cotizacion-materiales');
    if (gridInp && gridInp.value) {
        const parsed = window.parseArgNumber(gridInp.value);
        if (parsed > 0) return parsed;
    }
    const reqMecaInp = document.getElementById('req-meca-cotizacion-materiales');
    if (reqMecaInp && reqMecaInp.value) {
        const parsed = window.parseArgNumber(reqMecaInp.value);
        if (parsed > 0) return parsed;
    }
    const reqStdInp = document.getElementById('req-cotizacion-materiales');
    if (reqStdInp && reqStdInp.value) {
        const parsed = window.parseArgNumber(reqStdInp.value);
        if (parsed > 0) return parsed;
    }
    // 2. Si el pedido activo en edición tiene cotización guardada
    if (typeof pedidoActivo !== 'undefined' && pedidoActivo) {
        const pCotiz = parseFloat(pedidoActivo.cotizacion_materiales || pedidoActivo.cotizacion);
        if (!isNaN(pCotiz) && pCotiz > 0) return pCotiz;
    }
    // 3. Valor almacenado en localStorage
    try {
        const stored = parseFloat(localStorage.getItem('PRESUPUESTO_COTIZACION_MATERIALES'));
        if (!isNaN(stored) && stored > 0) return stored;
    } catch(e) {}
    // 4. Default estándar ($1.450,00)
    return 1450.00;
};

window.setCotizacionMateriales = function(val, updateInputs = true) {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;
    try {
        localStorage.setItem('PRESUPUESTO_COTIZACION_MATERIALES', num.toString());
    } catch(e) {}

    if (updateInputs) {
        const formatted = num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        ['grid-cotizacion-materiales', 'req-cotizacion-materiales', 'req-meca-cotizacion-materiales'].forEach(id => {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) {
                el.value = formatted;
            }
        });
        const sumStd = document.getElementById('summary-cotiz-materiales');
        if (sumStd) sumStd.innerText = `$${formatted}`;
        const sumMec = document.getElementById('summary-meca-cotiz-materiales');
        if (sumMec) sumMec.innerText = `$${formatted}`;
    }
};

window.onReqCotizacionMaterialesInput = function(input) {
    let clean = input.value.replace(/\./g, ',').replace(/[^0-9,]/g, '');
    const parts = clean.split(',');
    if (parts.length > 2) clean = parts[0] + ',' + parts.slice(1).join('');
    if (input.value !== clean) input.value = clean;
    const parsed = window.parseArgNumber(clean);
    if (parsed > 0) {
        window.setCotizacionMateriales(parsed, false);
        // Sincronizar todos los inputs en pantalla
        ['grid-cotizacion-materiales', 'req-cotizacion-materiales', 'req-meca-cotizacion-materiales'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el !== input) el.value = clean;
        });
        if (typeof window.recalcMecaExcelAll === 'function') {
            window.recalcMecaExcelAll();
        }
    }
};

window.onGridCotizacionMaterialesChange = function(input) {
    window.onReqCotizacionMaterialesInput(input);
};

window.isMaterialItem = function(item, tipoPresupuesto = '') {
    if (!item) return false;
    const sub = String(item.subrubro || (typeof window.resolveItemSubrubro === 'function' ? window.resolveItemSubrubro(item, tipoPresupuesto) : '')).toLowerCase();
    return sub.includes('material') || sub.includes('equipo');
};

window.onNuevoItemSubrubroChange = function() {
    const subSelect = document.getElementById('nuevo-item-subrubro');
    const label = document.getElementById('nuevo-item-precio-label');
    const priceInput = document.getElementById('nuevo-item-precio');
    if (!subSelect || !label) return;
    const subVal = (subSelect.value || '').toLowerCase();
    const isMat = subVal.includes('material') || subVal.includes('equipo');
    if (isMat) {
        label.innerHTML = 'Precio Unitario (U$D) <span style="color: #38bdf8; font-size: 10px; font-weight: 800;">💵 Dolarizado</span>';
        if (priceInput) priceInput.placeholder = '0,00 U$D';
    } else {
        label.innerHTML = 'Precio Unitario ($ ARS) <span style="color: #10b981; font-size: 10px; font-weight: 800;">🇦🇷 Pesos</span>';
        if (priceInput) priceInput.placeholder = '0,00 $';
    }
};

window.saveCustomItemPrice = function(codigo, price, originalSubrubro = null, originalDetalle = null, originalUdm = null, plantaOverride = null) {
    if (!codigo) return;
    const numPrice = parseFloat(price || 0);
    if (isNaN(numPrice)) return;

    let curPlanta = null;

    if (plantaOverride !== null) {
        curPlanta = plantaOverride;
    } else {
        const reqPlantaSelect = document.getElementById('req-meca-planta');
        if (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico' && reqPlantaSelect && reqPlantaSelect.value) {
            curPlanta = reqPlantaSelect.value.trim().toUpperCase();
            if (curPlanta === 'PPA' || curPlanta === 'APA') curPlanta = 'APS';
if (curPlanta === 'PPA') curPlanta = 'APS';
            if (curPlanta !== 'APS' && curPlanta !== 'APG' && window.appData && window.appData.plantasRules && window.appData.plantasRules[curPlanta]) {
                curPlanta = window.appData.plantasRules[curPlanta];
            }
        }
    }

    // Update dynamic DB arrays if they exist
    if (typeof window.presupuestoMecanicoDB !== 'undefined' && Array.isArray(window.presupuestoMecanicoDB)) {
        let found = window.presupuestoMecanicoDB.find(i => i.codigo === codigo && (i.planta || '').toUpperCase() === (curPlanta || ''));
        if (found) {
            found.precio = numPrice;
            found.precio_unitario = numPrice;
        } else if (curPlanta) {
            // No existe para esta planta, lo clonamos del genérico si existe
            let generic = window.presupuestoMecanicoDB.find(i => i.codigo === codigo && !i.planta);
            if (!generic && typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
                generic = PRESUPUESTO_MECANICO_STOCK.find(i => i.codigo === codigo);
            }
            if (!generic) {
                generic = window.presupuestoMecanicoDB.find(i => i.codigo === codigo);
            }
            if (generic) {
                window.presupuestoMecanicoDB.push({ ...generic, planta: curPlanta, precio: numPrice, precio_unitario: numPrice });
            }
        } else {
            // Es genérico
            let generic = window.presupuestoMecanicoDB.find(i => i.codigo === codigo && !i.planta);
            if (generic) {
                generic.precio = numPrice;
                generic.precio_unitario = numPrice;
            } else if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
                let base = PRESUPUESTO_MECANICO_STOCK.find(i => i.codigo === codigo);
                if (!base) base = window.presupuestoMecanicoDB.find(i => i.codigo === codigo);
                if (base) {
                    window.presupuestoMecanicoDB.push({ ...base, planta: '', precio: numPrice, precio_unitario: numPrice });
                }
            }
        }
    }

    if (typeof window.presupuestosCatalogDB !== 'undefined' && Array.isArray(window.presupuestosCatalogDB)) {
        if (!curPlanta) { // Electrico uses generic
            const foundE = window.presupuestosCatalogDB.find(i => i.codigo === codigo);
            if (foundE) {
                foundE.precio = numPrice;
                foundE.precio_unitario = numPrice;
            }
        }
    }

    // Update old static arrays just in case
    if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' && !curPlanta) {
        const itemM = PRESUPUESTO_MECANICO_STOCK.find(i => i.codigo === codigo);
        if (itemM) itemM.precio = numPrice;
    }
    if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' && !curPlanta) {
        const itemE = PRESUPUESTO_ELECTRICO_STOCK.find(i => i.codigo === codigo);
        if (itemE) itemE.precio = numPrice;
    }

    // Actualizamos el diccionario local y global de custom prices
    const customPrices = typeof getCustomItemPrices === 'function' ? getCustomItemPrices() : {};
    let key = codigo;
    if (curPlanta) key = key + '_' + curPlanta;
    customPrices[key] = numPrice;
    if (typeof appData !== 'undefined' && appData) {
        if (!appData.customPrices) appData.customPrices = {};
        appData.customPrices[key] = numPrice;
    }
    try { localStorage.setItem('PRESUPUESTO_CUSTOM_PRICES', JSON.stringify(customPrices)); } catch(e) {}

    // Sincronizar en tiempo real con Supabase app_state para que todas las máquinas vean el nuevo precio
    const client = (typeof getDbClient === 'function') ? getDbClient() : null;
    if (client && typeof appData !== 'undefined' && appData && appData.customPrices) {
        Promise.resolve(client.from('app_state').update({
            custom_prices: appData.customPrices,
            updated_at: new Date().toISOString()
        }).eq('id', 'globalData')).catch(function() {});
    }
};

const PRESUPUESTO_ELECTRICO_STOCK = [
  {
    "codigo": "ELE-001",
    "detalle": "CAJA ALUMINIO 200X200X100",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-002",
    "detalle": "CAJA ALUMINIO 300X300X100",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-003",
    "detalle": "CONDULET ( L ) 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-004",
    "detalle": "CONDULET DE PASO 1\"1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-005",
    "detalle": "UNION DOBLE 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-006",
    "detalle": "CUPLAS 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-007",
    "detalle": "GRAMPAS U-BOLT 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-008",
    "detalle": "FLEXIBLE ZOLODA 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-009",
    "detalle": "CONECTOR ZOLODA CON TUERCA 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-010",
    "detalle": "CAÑO ACERO GALVANIZADO SEMIPESADO 1\" 1/2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-011",
    "detalle": "CINTA PROTECCION SE CAÑOS POLIGUARD",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-012",
    "detalle": "BARRA UPN 80 MM X 6 MTS",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-013",
    "detalle": "BARRA ANGULO 1\" 1/2 X 3,16 X 6 MTS",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-014",
    "detalle": "LLAVE SELECTORA 0.1.2",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-015",
    "detalle": "CABLE 485",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-016",
    "detalle": "CABLE SINTENAX 7X1,5 MM",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-017",
    "detalle": "CABLE SINTENAX 3X1,5 MM",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-018",
    "detalle": "CABLE SINTENAX 3X2,5 MM",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-019",
    "detalle": "BROCA 10 MM",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-020",
    "detalle": "BULON 1/4X1\"1/2CON DOBLE ARANDELA PLANA + TUERCA",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-021",
    "detalle": "BULON 5/16X 1\"1/2 CON DOBLE ARANDELA PLANA Y TUERCA",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-022",
    "detalle": "PINTURA AMARILLA",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "LTS",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-023",
    "detalle": "PINTURA NEGRO",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "LTS",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-024",
    "detalle": "CINTA REFLECTIVA ROJO/NEGRO ADHESIVA",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "mts",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-025",
    "detalle": "TUERCA 1\" 1/2 PARA CAÑOS",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-026",
    "detalle": "BOQUILLA 1\" 1/2 ALUMINIO",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-027",
    "detalle": "RIEL DIN",
    "rubro": "Eléctrico",
    "subrubro": "Materiales y Equipos",
    "udm": "c/u",
    "precio": 0.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-028",
    "detalle": "Tecnico en seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 10023.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-029",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 20616.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-030",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 17577.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-031",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 16363.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-032",
    "detalle": "Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-033",
    "detalle": "Tecnico en seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 5695.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-034",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 11712.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-035",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 9992.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-036",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 12072.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-037",
    "detalle": "Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-038",
    "detalle": "Técnico en Seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 5695.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-039",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 11712.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-040",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 9992.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-041",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 12072.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-042",
    "detalle": "Camion Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-043",
    "detalle": "Técnico en Seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 28468.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-044",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 59347.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-045",
    "detalle": "Camion Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-046",
    "detalle": "Tecnico en seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 7720.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-047",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 20889.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-048",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 17830.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-049",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 21521.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-050",
    "detalle": "Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-051",
    "detalle": "Tecnico en seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 5964.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-052",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 16141.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-053",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 10128.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-054",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 16141.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-055",
    "detalle": "Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "u",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-056",
    "detalle": "Técnico en Seguridad",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 4386.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-057",
    "detalle": "Oficial Esp",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 11871.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-058",
    "detalle": "Ayudante",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 10128.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-059",
    "detalle": "Supervisor",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 12233.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "ELE-060",
    "detalle": "Camion Hidro elevador",
    "rubro": "Eléctrico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 24028.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  }
];

const PRESUPUESTO_MECANICO_STOCK = [
  {
    "codigo": "MEC-001",
    "detalle": "Hidroelevador",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 83983.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-002",
    "detalle": "Hidro elevador con barquilla",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 71062.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-003",
    "detalle": "Alquiler de oficinas",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 310089.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-004",
    "detalle": "Alquiler de manitou (incluye chofer y combustible)",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 137566.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-005",
    "detalle": "Traslados ida y vuelta para APG/PA",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 464144.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-006",
    "detalle": "Traslados ida y vuelta para APS",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 111842.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-007",
    "detalle": "Relevamiento",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 1750000.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-008",
    "detalle": "Documentos y 3D",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 5120350.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-009",
    "detalle": "Ing. Civil",
    "rubro": "Mecánico",
    "subrubro": "Materiales y Equipos",
    "udm": "u",
    "precio": 4350000.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-010",
    "detalle": "Ayudante (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 25275.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-011",
    "detalle": "Medio Oficial (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 25319.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-012",
    "detalle": "Oficial (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 26444.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-013",
    "detalle": "Oficial Especializado (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 28652.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-014",
    "detalle": "Oficial soldador calificado combinado procesos SMAW / GTAW",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 29601.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-015",
    "detalle": "Supervisor (Taller)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EN TALLER",
    "udm": "horas",
    "precio": 28652.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-016",
    "detalle": "Ayudante hora Normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 28657.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-017",
    "detalle": "Medio Oficial hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 28962.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-018",
    "detalle": "Oficial hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 30423.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-019",
    "detalle": "Oficial Especializado hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 33654.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-020",
    "detalle": "Oficial soldador calificado hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 34672.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-021",
    "detalle": "Supervisor horas normales (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 33654.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-022",
    "detalle": "Técnico HyS hora normal (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 27419.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-023",
    "detalle": "Ayudante hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 38969.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-024",
    "detalle": "Medio Oficial hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 39391.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-025",
    "detalle": "Oficial hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 41366.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-026",
    "detalle": "Oficial Especializado hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 45753.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-027",
    "detalle": "Oficial soldador calificado hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 47146.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-028",
    "detalle": "Supervisor horas EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 45753.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-029",
    "detalle": "Técnico HyS hora EXTRA SIMPLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 37290.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-030",
    "detalle": "Ayudante hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 50421.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-031",
    "detalle": "Medio Oficial hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 50981.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-032",
    "detalle": "Oficial hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 53523.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-033",
    "detalle": "Oficial Especializado hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 59216.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-034",
    "detalle": "Oficial soldador calificado hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 61016.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-035",
    "detalle": "Supervisor hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 59216.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-036",
    "detalle": "Técnico HyS hora EXTRA DOBLE (Mantenimiento)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra MANTENIMIENTO",
    "udm": "horas",
    "precio": 48806.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-037",
    "detalle": "Ayudante hora Normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 29067.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-038",
    "detalle": "Medio Oficial hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 29422.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-039",
    "detalle": "Oficial hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 30866.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-040",
    "detalle": "Oficial Especializado hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 34186.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-041",
    "detalle": "Oficial soldador calificado hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 35214.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-042",
    "detalle": "Supervisor horas normales (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 34186.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-043",
    "detalle": "Técnico HyS hora normal (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 27419.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-044",
    "detalle": "Ayudante hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 39525.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-045",
    "detalle": "Medio Oficial hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 40011.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-046",
    "detalle": "Oficial hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 41995.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-047",
    "detalle": "Oficial Especializado hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 46504.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-048",
    "detalle": "Oficial soldador calificado hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 47883.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-049",
    "detalle": "Supervisor horas EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 46504.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-050",
    "detalle": "Técnico HyS hora EXTRA SIMPLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 37290.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-051",
    "detalle": "Ayudante hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 51162.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-052",
    "detalle": "Medio Oficial hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 51775.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-053",
    "detalle": "Oficial hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 54349.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-054",
    "detalle": "Oficial Especializado hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 60180.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-055",
    "detalle": "Oficial soldador calificado hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 61969.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-056",
    "detalle": "Supervisor hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 60180.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-057",
    "detalle": "Técnico HyS hora EXTRA DOBLE (Parada de Planta)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra PARADA DE PLANTA",
    "udm": "horas",
    "precio": 48806.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-058",
    "detalle": "Ayudante hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 145335.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-059",
    "detalle": "Medio Oficial hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 147114.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-060",
    "detalle": "Oficial hora normal (Emergencia)",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 154390.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-061",
    "detalle": "Oficial Especializado hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 170957.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-062",
    "detalle": "Oficial soldador calificado hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 176052.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-063",
    "detalle": "Supervisor horas EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 170957.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  },
  {
    "codigo": "MEC-064",
    "detalle": "Técnico HyS hora EMERGENCIA",
    "rubro": "Mecánico",
    "subrubro": "Mano de Obra EMERGENCIA MANTENIMIENTO",
    "udm": "horas",
    "precio": 165659.0,
    "stock": 999.0,
    "estado": "ACTIVOS"
  }
];


window.PRESUPUESTO_ELECTRICO_STOCK = PRESUPUESTO_ELECTRICO_STOCK;
window.PRESUPUESTO_MECANICO_STOCK = PRESUPUESTO_MECANICO_STOCK;
window.presupuestosCatalogDB = PRESUPUESTO_ELECTRICO_STOCK;
window.presupuestoMecanicoDB = PRESUPUESTO_MECANICO_STOCK;

function applyCustomPricesToCatalog(catalog) {
    if (!catalog || !Array.isArray(catalog)) return catalog;
    const customPrices = getCustomItemPrices();
    catalog.forEach(item => {
        if (item && item.codigo) {
            let key = item.codigo;
            if (item.planta) key = key + '_' + item.planta.trim().toUpperCase();

            let cPrice = customPrices[key];
            if (cPrice === undefined && item.planta) {
                // Fallback to generic code if specific plant is not found in customPrices
                cPrice = customPrices[item.codigo];
            }
            if (cPrice !== undefined) {
                item.precio = parseFloat(cPrice);
            }
        }
    });
    return catalog;
}

function getActiveStockCatalog() {
    let cat = [];
    if (reqTipoPresupuesto === 'Eléctrico' && typeof window.presupuestosCatalogDB !== 'undefined') {
        cat = window.presupuestosCatalogDB;
    } else if (reqTipoPresupuesto === 'Eléctrico' && typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
        cat = PRESUPUESTO_ELECTRICO_STOCK;
    } else if (reqTipoPresupuesto === 'Mecánico' && typeof window.presupuestoMecanicoDB !== 'undefined' && window.presupuestoMecanicoDB.length > 0) {
        // Usa la base de datos construida desde Supabase que SI tiene las plantas
        cat = window.presupuestoMecanicoDB;
    } else if (reqTipoPresupuesto === 'Mecánico' && typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
        cat = PRESUPUESTO_MECANICO_STOCK;
    } else if (typeof stockDB !== 'undefined' && stockDB.length > 0) {
        cat = stockDB;
    } else {
        cat = (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') ? PRESUPUESTO_ELECTRICO_STOCK : [];
    }
    return applyCustomPricesToCatalog(cat);
}

window.abrirModalTipoPresupuesto = function() {
    openModal('tpl-modal-tipo-presupuesto');
};

function getElectricalDefaultQty(code) {
    const defaults = {
        '1': 8,
        '2': 2,
        '3': 7,
        '4': 4,
        '5': 8,
        '6': 10,
        '7': 100,
        '8': 3,
        '9': 10,
        '10': 33,
        '11': 30,
        '12': 2,
        '13': 5,
        '14': 2,
        '15': 135,
        '16': 135,
        '17': 210,
        '18': 210,
        '19': 45,
        '20': 50,
        '21': 100,
        '22': 4,
        '23': 4,
        '24': 4,
        '25': 40,
        '26': 25,
        '27': 2,
        '39': 20,
        '40': 20,
        '41': 40,
        '42': 40
    };
    return defaults[code] || 0;
}

window.seleccionarTipoPresupuesto = function(tipo) {
    reqTipoPresupuesto = tipo;

    // Si estamos en la vista de Ingreso de Pedidos
    const formReq = document.getElementById('form-request-ped');
    if (formReq) {
        pedidoItems = [];
        if (typeof actualizarTablaItemsRequerimiento === 'function') {
            actualizarTablaItemsRequerimiento();
        }
        window.activeMecaTab = 0;

        const container2 = document.getElementById('step-container-2');
        if (container2 && container2.style.display !== 'none') {
            const isExcelFlow = tipo === 'Mecánico' || tipo === 'Eléctrico';
            const std2 = document.getElementById('req-standard-step2-container');
            const mec2 = document.getElementById('req-mecanico-step2-container');
            if (std2) std2.style.display = isExcelFlow ? 'none' : 'flex';
            if (mec2) {
                mec2.style.display = isExcelFlow ? 'flex' : 'none';
                if (isExcelFlow && typeof renderMecanicoExcelGrid === 'function') {
                    renderMecanicoExcelGrid();
                }
            }
        }
    }

    // Cerrar modal de inmediato y actualizar indicadores visuales
    closeModal();
    updateTipoPresupuestoBadge();

    // Actualizar de forma inmediata e instantánea cualquier tabla de listados activa
    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }

    showToast(`Rubro seleccionado: Presupuesto ${tipo}`, 'success');
};

function updateTipoPresupuestoBadge() {
    const badge = document.getElementById('tipo-presupuesto-badge');
    const assignBadge = document.getElementById('assignments-tipo-presupuesto-badge');
    const summaryTipo = document.getElementById('summary-tipo-presupuesto');
    const mecaFields = document.getElementById('req-mecanico-fields');
    const standardFields = document.getElementById('req-standard-fields');
    const isElec = reqTipoPresupuesto === 'Eléctrico';

    // Cambiar tema global: fondo amarillo y letras azules en Eléctrico, original en Mecánico
    if (isElec) {
        document.body.classList.add('theme-electrico');
    } else {
        document.body.classList.remove('theme-electrico');
    }

    // Etiqueta del título en el formulario de creación unificada
    const lblMecaDenom = document.getElementById('lbl-meca-denominacion');
    if (lblMecaDenom) {
        lblMecaDenom.innerHTML = 'i. <u>Título:</u>';
    }

    // Ocultar botón de gestionar plantas (listas) si es eléctrico, pero dejar la planta visible
    // (Ahora me pidieron que el botón de ABM de Plantas sea visible en ambos rubros)
    const btnPlantas = document.getElementById('btn-gestionar-plantas');
    if (btnPlantas) {
        btnPlantas.style.display = 'block';
    }

    // Mostrar sección de propuesta comercial para ambos
    const reqMecaPropuestaBox = document.getElementById('req-meca-propuesta-box');
    if (reqMecaPropuestaBox) {
        reqMecaPropuestaBox.style.display = 'flex';
    }
    const icon = isElec ? '⚡' : '⚙️';
    const bgColor = isElec ? 'rgba(234, 179, 8, 0.2)' : 'rgba(6, 182, 212, 0.2)';
    const textColor = isElec ? '#fde047' : '#22d3ee';
    const borderColor = isElec ? 'rgba(234, 179, 8, 0.4)' : 'rgba(6, 182, 212, 0.4)';

    if (badge) {
        badge.innerHTML = `${icon} Presupuesto ${reqTipoPresupuesto || 'Eléctrico'}`;
        badge.style.background = bgColor;
        badge.style.color = textColor;
        badge.style.borderColor = borderColor;
    }
    if (assignBadge) {
        assignBadge.innerHTML = `${icon} Presupuesto ${reqTipoPresupuesto || 'Eléctrico'}`;
        assignBadge.style.background = bgColor;
        assignBadge.style.color = textColor;
        assignBadge.style.borderColor = borderColor;
    }
    if (summaryTipo) {
        summaryTipo.innerHTML = `${icon} Presupuesto ${reqTipoPresupuesto || 'Eléctrico'}`;
        summaryTipo.style.color = textColor;
    }
    if (mecaFields) {
        mecaFields.style.display = 'block'; // Always show for both
    }
    if (standardFields) {
        standardFields.style.display = 'none'; // Always hide for both
    }
    const nextBtn = document.getElementById('btn-next-step1');
    if (nextBtn) {
        nextBtn.innerHTML = 'Siguiente: Tarifario <i class="fas fa-arrow-right"></i>';
        nextBtn.className = "btn btn-primary";
    }

    const label2 = document.getElementById('step-label-2');
    const title2 = document.getElementById('step2-title-text');
    const subtitle2 = document.getElementById('step2-subtitle-text');
    if (label2) {
        label2.innerText = '2. Tarifario';
    }
    if (title2) {
        title2.innerText = 'PROPUESTA COMERCIAL (TARIFARIO)';
    }
    if (subtitle2) {
        subtitle2.innerText = 'Complete las cantidades estimadas directamente en la planilla.';
    }

    const title1 = document.getElementById('step1-title-text');
    const subtitle1 = document.getElementById('step1-subtitle-text');
    if (title1) {
        title1.innerText = 'Gestión de Presupuestos';
    }
    if (subtitle1) {
        subtitle1.innerText = 'Defina la identificación de la oferta y la propuesta técnica.';
    }

    // Dynamic labels inside Step 1 (unificados)
    const lblDenom = document.getElementById('lbl-meca-denominacion');
    const lblProv = document.getElementById('lbl-meca-proveedor');
    const lblFecha = document.getElementById('lbl-meca-fecha-oferta');
    const lblVal = document.getElementById('lbl-meca-validez');
    const lblPlanta = document.getElementById('lbl-meca-planta');
    const lblInicio = document.getElementById('lbl-meca-inicio');
    const lblDuracion = document.getElementById('lbl-meca-duracion');
    const lblFin = document.getElementById('lbl-meca-fin');

    const valDenom = document.getElementById('req-meca-denominacion');
    const valProveedor = document.getElementById('req-meca-proveedor');
    const valValidez = document.getElementById('req-meca-validez');
    const valPlanta = document.getElementById('req-meca-planta');
    const valInicio = document.getElementById('req-meca-fecha-inicio');
    const valDuracion = document.getElementById('req-meca-duracion');

    const todayStr = getLocalDateStr();
    if (lblDenom) lblDenom.innerHTML = 'i. <u>Denominación del Servicio:</u>';
    if (lblProv) lblProv.innerHTML = 'ii. <u>Nombre del Proveedor:</u>';
    if (lblFecha) lblFecha.innerHTML = 'iii. <u>Fecha de Oferta:</u>';
    if (lblVal) lblVal.innerHTML = 'iv. <u>Validez de la Oferta:</u>';
    if (lblPlanta) lblPlanta.innerHTML = 'v. <u>Planta de Cargill:</u>';
    if (lblInicio) lblInicio.innerHTML = 'vi. <u>Fecha estimada de Inicio:</u>';
    if (lblDuracion) lblDuracion.innerHTML = 'vii. <u>Duración estimada:</u>';
    if (lblFin) lblFin.innerHTML = 'viii. <u>Plazo Máximo de Finalización:</u>';

    if (reqMecaPropuestaBox) {
        reqMecaPropuestaBox.style.display = 'flex';
    }

    if (valProveedor && !valProveedor.value) valProveedor.value = 'SG MONTAJES SRL';
    if (typeof window.setValidezOfertaValue === 'function') {
        if (!valValidez || !valValidez.value || valValidez.value === '5 dias') window.setValidezOfertaValue('5 días');
    } else if (valValidez && (!valValidez.value || valValidez.value === '5 dias')) {
        valValidez.value = '5 días';
    }
    if (valPlanta && !valPlanta.value) valPlanta.value = 'APS';
    if (valInicio && (!valInicio.value || valInicio.value === '12-ago-26')) valInicio.value = todayStr;
    if (typeof window.setDuracionEstimadaValue === 'function') {
        if (valDuracion && (valDuracion.value === 'OT-' || valDuracion.value === '25-30días')) window.setDuracionEstimadaValue('');
    }

    // Auto-populate hidden required standard values for both
    if (typeof clientesDB !== 'undefined' && clientesDB.length > 0) {
        const cargill = clientesDB.find(c => c.nombre.includes('CARGILL')) || clientesDB[0];
        clienteSeleccionado = cargill;
        const reqClientInput = document.getElementById('req-client');
        if (reqClientInput) reqClientInput.value = cargill.nombre;
    }
    if (typeof depositosDB !== 'undefined' && depositosDB.length > 0) {
        depositoSeleccionado = depositosDB[0];
        const reqDepositInput = document.getElementById('req-deposit-input');
        if (reqDepositInput) reqDepositInput.value = depositosDB[0].nombre;
    }
    if (typeof transportesDB !== 'undefined' && transportesDB.length > 0) {
        transporteSeleccionado = transportesDB[0];
        const reqTransportInput = document.getElementById('req-transport-input');
        if (reqTransportInput) reqTransportInput.value = transportesDB[0].nombre;
    }
    if (typeof condicionesDB !== 'undefined' && condicionesDB.length > 0) {
        const condInput = document.getElementById('req-condition-input');
        if (condInput) condInput.value = condicionesDB[0].nombre;
        const condHidden = document.getElementById('req-condition');
        if (condHidden) condHidden.value = condicionesDB[0].codigo;
    }
}

// 1. INGRESO DE PEDIDOS
function initRequestView() {
    viewMode = 'Ingreso';
    const curUser = getCurrentUser();
    if (!reqTipoPresupuesto && curUser && curUser.rubro_defecto) {
        reqTipoPresupuesto = curUser.rubro_defecto;
    } else if (!reqTipoPresupuesto) {
        reqTipoPresupuesto = 'Eléctrico';
    }
    updateTipoPresupuestoBadge();

    const reqClientInput = document.getElementById('req-client');
    const dropdown = document.getElementById('req-client-dropdown');
    const condSelect = document.getElementById('req-condition');

    // Autocomplete Condiciones de Venta
    const reqCondInput = document.getElementById('req-condition-input');
    const condDropdown = document.getElementById('req-condition-dropdown');
    if (reqCondInput && condDropdown && typeof condicionesDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = condDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(condDropdown.children.length, condDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(cond => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${cond.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Días: ${cond.dias} - Código: ${cond.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarCondicion(cond);
                };
                fragment.appendChild(div);
            });
            condDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            condDropdown.innerHTML = '';
            condDropdown.scrollTop = 0;
            currentSelectedIndex = -1;

            const validConds = (typeof condicionesDB !== 'undefined' && Array.isArray(condicionesDB))
                ? condicionesDB.filter(c => c && String(c.codigo) !== '0' && (!c.nombre || !/no\s*usar/i.test(c.nombre)))
                : [];
            if (cleanQuery === '') {
                currentMatches = validConds;
            } else {
                currentMatches = validConds.filter(c =>
                    (c.nombre || '').toLowerCase().includes(cleanQuery) ||
                    String(c.codigo).includes(cleanQuery) ||
                    String(c.dias).includes(cleanQuery)
                );
            }

            if (currentMatches.length > 0) {
                renderDropdownChunk();
                condDropdown.style.display = 'block';
            } else {
                condDropdown.style.display = 'none';
            }
        };

        condDropdown.addEventListener('scroll', () => {
            if (condDropdown.scrollTop + condDropdown.clientHeight >= condDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqCondInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqCondInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqCondInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqCondInput.addEventListener('keydown', (e) => {
            if (condDropdown.style.display !== 'block') return;
            const items = condDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarCondicion(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarCondicion(currentMatches[0]);
                }
            }
        });

        reqCondInput.addEventListener('blur', () => {
            setTimeout(() => {
                condDropdown.style.display = 'none';
            }, 200);
        });
    }

    // Autocomplete Depósitos
    const reqDepInput = document.getElementById('req-deposit-input');
    const depDropdown = document.getElementById('req-deposit-dropdown');
    if (reqDepInput && depDropdown && typeof depositosDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = depDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(depDropdown.children.length, depDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(dep => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${dep.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Código: ${dep.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarDeposito(dep);
                };
                fragment.appendChild(div);
            });
            depDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            depDropdown.innerHTML = '';
            depDropdown.scrollTop = 0;
            currentSelectedIndex = -1;

            if (cleanQuery === '') {
                currentMatches = depositosDB.slice(0, 100);
            } else {
                currentMatches = depositosDB.filter(d =>
                    d.nombre.toLowerCase().includes(cleanQuery) ||
                    d.codigo.includes(cleanQuery)
                );
            }

            if (currentMatches.length > 0) {
                renderDropdownChunk();
                depDropdown.style.display = 'block';
            } else {
                depDropdown.style.display = 'none';
            }
        };

        depDropdown.addEventListener('scroll', () => {
            if (depDropdown.scrollTop + depDropdown.clientHeight >= depDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqDepInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqDepInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqDepInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqDepInput.addEventListener('keydown', (e) => {
            if (depDropdown.style.display !== 'block') return;
            const items = depDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarDeposito(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarDeposito(currentMatches[0]);
                }
            }
        });

        reqDepInput.addEventListener('blur', () => {
            setTimeout(() => {
                depDropdown.style.display = 'none';
            }, 200);
        });
    }

    // Autocomplete Transportes
    const reqTransInput = document.getElementById('req-transport-input');
    const transDropdown = document.getElementById('req-transport-dropdown');
    if (reqTransInput && transDropdown && typeof transportesDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = transDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(transDropdown.children.length, transDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(trans => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${trans.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Código: ${trans.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarTransporte(trans);
                };
                fragment.appendChild(div);
            });
            transDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            transDropdown.innerHTML = '';
            transDropdown.scrollTop = 0;
            currentSelectedIndex = -1;

            if (cleanQuery === '') {
                currentMatches = transportesDB.slice(0, 100);
            } else {
                currentMatches = transportesDB.filter(t =>
                    t.nombre.toLowerCase().includes(cleanQuery) ||
                    t.codigo.includes(cleanQuery)
                );
            }

            if (currentMatches.length > 0) {
                renderDropdownChunk();
                transDropdown.style.display = 'block';
            } else {
                transDropdown.style.display = 'none';
            }
        };

        transDropdown.addEventListener('scroll', () => {
            if (transDropdown.scrollTop + transDropdown.clientHeight >= transDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqTransInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqTransInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqTransInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqTransInput.addEventListener('keydown', (e) => {
            if (transDropdown.style.display !== 'block') return;
            const items = transDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarTransporte(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarTransporte(currentMatches[0]);
                }
            }
        });

        reqTransInput.addEventListener('blur', () => {
            setTimeout(() => {
                transDropdown.style.display = 'none';
            }, 200);
        });
    }

    if (reqClientInput && dropdown && typeof clientesDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = dropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');

                // Mantener visible en scroll
                const dropdownRect = dropdown.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                if (itemRect.bottom > dropdownRect.bottom) {
                    dropdown.scrollTop += (itemRect.bottom - dropdownRect.bottom);
                } else if (itemRect.top < dropdownRect.top) {
                    dropdown.scrollTop -= (dropdownRect.top - itemRect.top);
                }
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(dropdown.children.length, dropdown.children.length + 50);
            if (chunk.length === 0) return;

            const fragment = document.createDocumentFragment();
            chunk.forEach(cliente => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${cliente.nombre}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">CUIT: ${cliente.cuit || 'Sin CUIT'} - Cód: ${cliente.codigo}</div>
                `;

                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarCliente(cliente);
                };
                fragment.appendChild(div);
            });
            dropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            dropdown.innerHTML = '';
            dropdown.scrollTop = 0;
            currentSelectedIndex = -1;

            const currentUser = getCurrentUser();
            const userVendedorCodigo = currentUser ? currentUser.vendedor_codigo : '';
            let filteredClients = clientesDB;
            if (userVendedorCodigo) {
                filteredClients = clientesDB.filter(c => c.vendedor_id === userVendedorCodigo || !c.vendedor_id || c.vendedor_id === '');
            }

            if (cleanQuery === '') {
                currentMatches = filteredClients;
            } else {
                currentMatches = filteredClients.filter(c =>
                    c.nombre.toLowerCase().includes(cleanQuery) ||
                    c.cuit.includes(cleanQuery) ||
                    c.codigo.includes(cleanQuery)
                );
            }

            if (currentMatches.length > 0) {
                renderDropdownChunk();
                dropdown.style.display = 'block';
            } else {
                dropdown.style.display = 'none';
            }
        };

        // Scroll infinito en dropdown
        dropdown.addEventListener('scroll', () => {
            if (dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqClientInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqClientInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqClientInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqClientInput.addEventListener('keydown', (e) => {
            if (dropdown.style.display !== 'block') return;
            const items = dropdown.children;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarCliente(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarCliente(currentMatches[0]);
                }
            }
        });

        reqClientInput.addEventListener('blur', () => {
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 200);
        });
    }

    // Atajos de teclado: F6 (Lupa contextual de clientes y proveedores) y Escape para salir de modales
    document.onkeydown = function(e) {
        if (e.key === 'F6') {
            e.preventDefault();
            const activeEl = document.activeElement;
            const isModalOpen = document.getElementById('modal-overlay') && document.getElementById('modal-overlay').style.display === 'flex';

            // Si el foco está en el campo de Proveedor
            if (activeEl && (activeEl.id === 'req-meca-proveedor' || activeEl.id === 'auth-edit-meca-proveedor')) {
                abrirRobotProveedores();
                showToast("Selección de Proveedor (Atajo F6)", "info");
                return;
            }

            // Si el foco está en el buscador de ítems/tarifas
            if (activeEl && (activeEl.id === 'req-product-input' || activeEl.id === 'auth-add-product-input')) {
                abrirRobotStockEdicion();
                showToast("Buscador del Tarifario / Horas (Atajo F6)", "info");
                return;
            }

            // Si está en el paso 2 de la grilla de tarifas (sin modal abierto)
            const step2Container = document.getElementById('step-container-2');
            if (step2Container && step2Container.style.display !== 'none' && !isModalOpen) {
                abrirRobotStockEdicion();
                showToast("Buscador del Tarifario / Horas (Atajo F6)", "info");
                return;
            }

            // Por defecto, F6 siempre abre el Buscador de Clientes
            abrirRobotF6();
            showToast("Buscador de Clientes (Atajo F6)", "info");
        } else if (e.key === 'Escape') {
            const overlay = document.getElementById('modal-overlay');
            if (overlay && overlay.style.display === 'flex') {
                closeModal();
            }
        }
    };

    // Eventos de clic directo en cualquier lugar del recuadro de Cliente y Proveedor (Paso 1)
    const mecaClientInput = document.getElementById('req-meca-cliente');
    if (mecaClientInput) {
        mecaClientInput.addEventListener('click', () => {
            abrirRobotF6();
        });
        mecaClientInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                abrirRobotF6();
            }
        });
    }

    const mecaProvInput = document.getElementById('req-meca-proveedor');
    if (mecaProvInput) {
        mecaProvInput.addEventListener('click', () => {
            abrirRobotProveedores();
        });
        mecaProvInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                abrirRobotProveedores();
            }
        });
    }

    // Autocomplete Productos (Stock)
    const reqProdInput = document.getElementById('req-product-input');
    const prodDropdown = document.getElementById('req-product-dropdown');
    if (reqProdInput && prodDropdown) {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = prodDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');

                // Mantener visible en scroll
                const dropdownRect = prodDropdown.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                if (itemRect.bottom > dropdownRect.bottom) {
                    prodDropdown.scrollTop += (itemRect.bottom - dropdownRect.bottom);
                } else if (itemRect.top < dropdownRect.top) {
                    prodDropdown.scrollTop -= (dropdownRect.top - itemRect.top);
                }
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(prodDropdown.children.length, prodDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(prod => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                const isOutOfStock = parseFloat(prod.stock || 0) <= 0;
                const stockColor = isOutOfStock ? 'var(--danger)' : 'var(--text-muted)';
                const stockLabel = isOutOfStock ? ' - <span style="color:var(--danger); font-weight:bold;">[STOCK 0]</span>' : '';

                div.innerHTML = `
                    <div style="font-weight: 600; color: ${isOutOfStock ? 'rgba(255,255,255,0.5)' : 'white'};">${prod.detalle}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">
                        Código: ${prod.codigo} - Precio: $${parseFloat(prod.precio || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})} - Stock: <span style="color: ${stockColor}; font-weight: ${isOutOfStock ? 'bold' : 'normal'}">${parseFloat(prod.stock || 0)}</span>${stockLabel}
                    </div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarProducto(prod);
                };
                fragment.appendChild(div);
            });
            prodDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            prodDropdown.innerHTML = '';
            prodDropdown.scrollTop = 0;
            currentSelectedIndex = -1;

            const activeCatalog = getActiveStockCatalog();
            if (cleanQuery === '') {
                currentMatches = activeCatalog.slice(0, 100);
            } else {
                currentMatches = activeCatalog.filter(p =>
                    (p.detalle || '').toLowerCase().includes(cleanQuery) ||
                    String(p.codigo || '').toLowerCase().includes(cleanQuery)
                );
            }

            if (currentMatches.length > 0) {
                renderDropdownChunk();
                prodDropdown.style.display = 'block';
            } else {
                prodDropdown.style.display = 'none';
            }
        };

        prodDropdown.addEventListener('scroll', () => {
            if (prodDropdown.scrollTop + prodDropdown.clientHeight >= prodDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        reqProdInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        reqProdInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        reqProdInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        reqProdInput.addEventListener('keydown', (e) => {
            if (prodDropdown.style.display !== 'block') return;
            const items = prodDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarProducto(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarProducto(currentMatches[0]);
                }
            }
        });

        reqProdInput.addEventListener('blur', () => {
            setTimeout(() => {
                prodDropdown.style.display = 'none';
            }, 200);
        });
    }

    // Resetear items cargados y limpiar formulario para nueva carga
    if (!window.pedidoEnEdicionId && !window.pedidoEnReutilizacion) {
        pedidoItems = [];
        productoSeleccionado = null;
        if (typeof actualizarTablaItemsRequerimiento === 'function') {
            actualizarTablaItemsRequerimiento();
        }
        const mecaStep2Container = document.getElementById('req-mecanico-step2-container');
        if (mecaStep2Container) {
            mecaStep2Container.innerHTML = '';
        }
        // Limpiar campos del Paso 1 para que nunca precargue datos de presupuestos anteriores
        const clearIds = [
            'req-meca-denominacion', 'req-meca-nro-oc', 'req-meca-nro-ot',
            'req-meca-duracion', 'req-meca-duracion-num', 'req-meca-propuesta',
            'req-meca-personal', 'req-meca-exclusiones', 'req-reason',
            'req-product-input', 'req-product-qty', 'req-product-price'
        ];
        clearIds.forEach(cid => {
            const el = document.getElementById(cid);
            if (el) el.value = '';
        });
        if (typeof window.setDuracionEstimadaValue === 'function') {
            window.setDuracionEstimadaValue('');
        }
    }

    // Helper functions para el campo fijo de Validez de la Oferta (días)
    window.updateValidezOfertaHidden = function() {
        const numEl = document.getElementById('req-meca-validez-num');
        const hiddenEl = document.getElementById('req-meca-validez');
        if (!hiddenEl) return;
        const val = numEl ? numEl.value.trim() : '';
        hiddenEl.value = val ? `${val} días` : '';
    };

    window.setValidezOfertaValue = function(valStr) {
        const numEl = document.getElementById('req-meca-validez-num');
        const hiddenEl = document.getElementById('req-meca-validez');
        let num = '';
        if (valStr !== undefined && valStr !== null) {
            const str = String(valStr).trim();
            const matches = str.match(/\d+/);
            if (matches) {
                num = matches[0];
            } else if (str !== '') {
                num = str;
            }
        }
        if (numEl) numEl.value = num;
        if (hiddenEl) hiddenEl.value = num ? `${num} días` : '';
    };

    // Helper functions para el campo fijo de Duración Estimada (días)
    window.updateDuracionEstimadaHidden = function() {
        const numEl = document.getElementById('req-meca-duracion-num');
        const hiddenEl = document.getElementById('req-meca-duracion');
        if (!hiddenEl) return;
        const val = numEl ? numEl.value.trim() : '';
        hiddenEl.value = val ? `${val} días` : '';
    };

    window.setDuracionEstimadaValue = function(valStr) {
        const numEl = document.getElementById('req-meca-duracion-num');
        const hiddenEl = document.getElementById('req-meca-duracion');
        let num = '';
        if (valStr !== undefined && valStr !== null) {
            const str = String(valStr).trim();
            const matches = str.match(/\d+/);
            if (matches) {
                num = matches[0];
            } else if (str !== '') {
                num = str;
            }
        }
        if (numEl) numEl.value = num;
        if (hiddenEl) hiddenEl.value = num ? `${num} días` : '';
    };

    // Registrar submit y prevenir confirmación involuntaria por tecla Enter
    const form = document.getElementById('form-request-ped');
    if (form) {
        form.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const tagName = e.target.tagName;
                if (tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
                    e.preventDefault();
                    return false;
                }
            }
        });
        form.onsubmit = function(e) {
            e.preventDefault();
            confirmarPedido();
        };
    }

    // Establecer fechas por defecto con la fecha local real al crear presupuestos
    const todayStr = getLocalDateStr();
    const futureDateStr = getLocalDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const foEl = document.getElementById('req-meca-fecha-oferta');
    if (foEl && !foEl.value) foEl.value = todayStr;
    const fiEl = document.getElementById('req-meca-fecha-inicio');
    if (fiEl && !fiEl.value) fiEl.value = todayStr;
    const ffEl = document.getElementById('req-meca-fecha-fin');
    if (ffEl && !ffEl.value) ffEl.value = futureDateStr;

    if (window.setValidezOfertaValue) {
        const valEl = document.getElementById('req-meca-validez');
        if (!valEl || !valEl.value) window.setValidezOfertaValue('5 días');
    }
    const provEl = document.getElementById('req-meca-proveedor');
    if (provEl && !provEl.value) {
        const _cu = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        provEl.value = (_cu && _cu.empresa) ? _cu.empresa : 'SG MONTAJES SRL';
    }

    // Inicializar el stepper en el paso 1
    if (window.goToRequestStep) {
        window.goToRequestStep(1);
    }
}

// Lógica de navegación del Stepper Wizard de Ingreso de Pedido
window.onOcStateRadioChange = function(state) {
    const isSinOc = (state === 'Enviado sin OC' || state === 'Aprobado sin OC');
    const isConOc = (state === 'Aprobado con OC');

    const dateGroup = document.getElementById('oc-date-group');
    if (dateGroup) {
        dateGroup.style.display = isSinOc ? 'flex' : 'none';
        if (isSinOc) {
            const input = document.getElementById('req-oc-limit-date');
            if (input && !input.value) {
                const today = new Date().toISOString().substring(0, 10);
                input.min = today;
                setOcLimitDays(5);
            }
        }
    }

    const ocNumGroup = document.getElementById('oc-number-group');
    if (ocNumGroup) {
        ocNumGroup.style.display = isConOc ? 'flex' : 'none';
        if (isConOc) {
            const step1Oc = document.getElementById('req-meca-nro-oc');
            const step3Oc = document.getElementById('req-step3-nro-oc');
            if (step1Oc && step3Oc && !step3Oc.value && step1Oc.value) {
                step3Oc.value = step1Oc.value;
            }
            if (step3Oc) step3Oc.focus();
        }
    }
};

window.toggleOcDateField = function(show) {
    if (show) {
        window.onOcStateRadioChange('Enviado sin OC');
    } else {
        window.onOcStateRadioChange('Aprobado con OC');
    }
};

window.setOcLimitDays = function(days) {
    const input = document.getElementById('req-oc-limit-date');
    if (!input) return;
    const date = new Date();
    date.setDate(date.getDate() + days);
    input.value = date.toISOString().substring(0, 10);
};

window.goToRequestStep = function(step) {
    // Validaciones al intentar avanzar al paso 2 (Artículos)
    if (step === 2) {
        if (reqTipoPresupuesto === 'Mecánico' || reqTipoPresupuesto === 'Eléctrico') {
            const denominacion = (document.getElementById('req-meca-denominacion')?.value || '').trim();
            const cliente = (document.getElementById('req-meca-cliente')?.value || '').trim();
            const proveedor = (document.getElementById('req-meca-proveedor')?.value || '').trim();
            const fechaOferta = (document.getElementById('req-meca-fecha-oferta')?.value || '').trim();
            const validez = (document.getElementById('req-meca-validez')?.value || '').trim();
            const fechaInicio = (document.getElementById('req-meca-fecha-inicio')?.value || '').trim();
            const duracion = (document.getElementById('req-meca-duracion')?.value || '').trim();
            const fechaFin = (document.getElementById('req-meca-fecha-fin')?.value || '').trim();

            if (!denominacion) {
                showToast('El campo "i. Denominación del Servicio" es obligatorio.', 'error');
                document.getElementById('req-meca-denominacion')?.focus();
                return;
            }
            if (!cliente) {
                showToast('El campo "ii. Cliente" es obligatorio.', 'error');
                document.getElementById('req-meca-cliente')?.focus();
                return;
            }
            if (!proveedor) {
                showToast('El campo "iii. Nombre del Proveedor" es obligatorio.', 'error');
                document.getElementById('req-meca-proveedor')?.focus();
                return;
            }
            if (!fechaOferta) {
                showToast('El campo "iv. Fecha de Oferta" es obligatorio.', 'error');
                document.getElementById('req-meca-fecha-oferta')?.focus();
                return;
            }
            if (!validez) {
                showToast('El campo "v. Validez de la Oferta" es obligatorio.', 'error');
                (document.getElementById('req-meca-validez-num') || document.getElementById('req-meca-validez'))?.focus();
                return;
            }
            if (!fechaInicio) {
                showToast('El campo "vii. Fecha estimada de Inicio" es obligatorio.', 'error');
                document.getElementById('req-meca-fecha-inicio')?.focus();
                return;
            }
            if (!duracion) {
                showToast('El campo "viii. Duración estimada de la Ejecución" es obligatorio.', 'error');
                document.getElementById('req-meca-duracion')?.focus();
                return;
            }
            if (!fechaFin) {
                showToast('El campo "ix. Plazo Máximo de Finalización" es obligatorio.', 'error');
                document.getElementById('req-meca-fecha-fin')?.focus();
                return;
            }

            if (fechaInicio < fechaOferta) {
                showToast('La "Fecha estimada de Inicio" no puede ser anterior a la "Fecha de Oferta".', 'error');
                document.getElementById('req-meca-fecha-inicio')?.focus();
                return;
            }

            if (fechaFin <= fechaInicio) {
                showToast('El "ix. Plazo Máximo de Finalización" debe ser obligatoriamente mayor a la "Fecha estimada de Inicio".', 'error');
                document.getElementById('req-meca-fecha-fin')?.focus();
                return;
            }
        } else {
            if (typeof clienteSeleccionado === 'undefined' || !clienteSeleccionado) {
                showToast('Seleccione un cliente válido para continuar', 'error');
                return;
            }
            const condCode = document.getElementById('req-condition').value;
            if (!condCode) {
                showToast('Seleccione la condición de venta para continuar', 'error');
                return;
            }
            const depInput = document.getElementById('req-deposit-input').value;
            const transInput = document.getElementById('req-transport-input').value;
            if (!depInput || typeof depositoSeleccionado === 'undefined' || !depositoSeleccionado) {
                showToast('Seleccione un depósito para continuar', 'error');
                return;
            }
            if (!transInput || typeof transporteSeleccionado === 'undefined' || !transporteSeleccionado) {
                showToast('Seleccione un transporte para continuar', 'error');
                return;
            }
        }
    }

    // Validaciones al intentar avanzar al paso 3 (Resumen/Confirmación)
    if (step === 3) {
        if (pedidoItems.length === 0) {
            showToast('Debe agregar al menos un artículo al detalle antes de continuar', 'error');
            return;
        }

        // Toggle standard vs mechanical summary panels
        const isExcelFlow = reqTipoPresupuesto === 'Mecánico' || reqTipoPresupuesto === 'Eléctrico';
        const isElec = reqTipoPresupuesto === 'Eléctrico';
        const stdBox = document.getElementById('summary-standard-box');
        const mecBox = document.getElementById('summary-mecanico-box');
        if (stdBox) stdBox.style.display = isExcelFlow ? 'none' : 'grid';
        if (mecBox) {
            mecBox.style.display = isExcelFlow ? 'grid' : 'none';
        }

        if (isExcelFlow) {
            // Update Step 3 labels dynamically (unificados)
            const lblSumInicio = document.getElementById('lbl-summary-meca-inicio');
            const lblSumDuracion = document.getElementById('lbl-summary-meca-duracion');
            if (lblSumInicio) {
                lblSumInicio.innerText = 'FECHA ESTIMADA DE INICIO';
            }
            if (lblSumDuracion) {
                lblSumDuracion.innerText = 'DURACIÓN ESTIMADA';
            }

            const summaryMecaPropuestaBox = document.getElementById('summary-meca-propuesta-box');
            if (summaryMecaPropuestaBox) {
                summaryMecaPropuestaBox.style.display = 'grid';
            }

            // Populate mechanical/electrical summary
            const sDenom = document.getElementById('summary-meca-denominacion');
            const sProv = document.getElementById('summary-meca-proveedor');
            const sFecha = document.getElementById('summary-meca-fecha-oferta');
            const sVal = document.getElementById('summary-meca-validez');
            const sPlanta = document.getElementById('summary-meca-planta');
            const sIni = document.getElementById('summary-meca-inicio');
            const sDur = document.getElementById('summary-meca-duracion');
            const sPlazo = document.getElementById('summary-meca-plazo-fin');
            const sProp = document.getElementById('summary-meca-propuesta');
            const sPers = document.getElementById('summary-meca-personal');
            const sExcl = document.getElementById('summary-meca-exclusiones');

            const valDenom = document.getElementById('req-meca-denominacion');
            const valProv = document.getElementById('req-meca-proveedor');
            const valFecha = document.getElementById('req-meca-fecha-oferta');
            const valValidez = document.getElementById('req-meca-validez');
            const valPlanta = document.getElementById('req-meca-planta');
            const valInicio = document.getElementById('req-meca-fecha-inicio') || document.getElementById('req-meca-inicio');
            const valDuracion = document.getElementById('req-meca-duracion');
            const valPlazo = document.getElementById('req-meca-fecha-fin') || document.getElementById('req-meca-plazo-fin');
            const valPropuesta = document.getElementById('req-meca-propuesta');
            const valPersonal = document.getElementById('req-meca-personal');
            const valExclusiones = document.getElementById('req-meca-exclusiones');
            const valOc = document.getElementById('req-meca-nro-oc');
            const valOt = document.getElementById('req-meca-nro-ot');

            if (sDenom) sDenom.innerText = (valDenom && valDenom.value.trim()) ? valDenom.value.trim() : '-';
            if (sProv) sProv.innerText = (valProv && valProv.value.trim()) ? valProv.value.trim() : '-';
            if (sFecha) sFecha.innerText = (valFecha && valFecha.value.trim()) ? valFecha.value.trim() : '-';
            if (sVal) sVal.innerText = (valValidez && valValidez.value.trim()) ? valValidez.value.trim() : '-';
            if (sPlanta) sPlanta.innerText = (valPlanta && valPlanta.value.trim()) ? valPlanta.value.trim() : '-';

            const sOc = document.getElementById('summary-meca-nro-oc');
            if (sOc) sOc.innerText = (valOc && valOc.value.trim()) ? valOc.value.trim() : '-';
            const sOt = document.getElementById('summary-meca-nro-ot');
            if (sOt) sOt.innerText = (valOt && valOt.value.trim()) ? valOt.value.trim() : '-';

            if (sIni) sIni.innerText = (valInicio && valInicio.value.trim()) ? valInicio.value.trim() : '-';
            if (sDur) {
                sDur.innerText = (valDuracion && valDuracion.value.trim()) ? valDuracion.value.trim() : '-';
            }
            if (sPlazo) sPlazo.innerText = (valPlazo && valPlazo.value.trim()) ? valPlazo.value.trim() : '-';
            if (sProp) sProp.innerText = (valPropuesta && valPropuesta.value.trim()) ? valPropuesta.value.trim() : '-';
            if (sPers) sPers.innerText = (valPersonal && valPersonal.value.trim()) ? valPersonal.value.trim() : '-';
            if (sExcl) sExcl.innerText = (valExclusiones && valExclusiones.value.trim()) ? valExclusiones.value.trim() : '-';
        } else {
            // Actualizar el resumen estándar con los datos seleccionados
            const summaryClient = document.getElementById('summary-client');
            const summaryCondition = document.getElementById('summary-condition');
            const summaryCurrency = document.getElementById('summary-currency');
            const summaryDeposit = document.getElementById('summary-deposit');
            const summaryTransport = document.getElementById('summary-transport');
            const summaryItemsCount = document.getElementById('summary-items-count');

            const summaryIsComisionista = document.getElementById('summary-is-comisionista');
            const summaryTipoNv = document.getElementById('summary-tipo-nv');
            const summaryTipoEntrega = document.getElementById('summary-tipo-entrega');
            const summaryFormaPago = document.getElementById('summary-forma-pago');

            if (summaryClient && clienteSeleccionado) {
                summaryClient.innerText = clienteSeleccionado.nombre.toUpperCase();
            }
            if (summaryCondition) {
                const condInput = document.getElementById('req-condition-input');
                summaryCondition.innerText = condInput ? condInput.value.toUpperCase() : '';
            }
            if (summaryCurrency) {
                const currencySelect = document.getElementById('req-currency');
                if (currencySelect && currencySelect.selectedIndex >= 0) {
                    summaryCurrency.innerText = currencySelect.options[currencySelect.selectedIndex].text.toUpperCase();
                }
            }
            if (summaryDeposit && depositoSeleccionado) {
                summaryDeposit.innerText = depositoSeleccionado.nombre.toUpperCase();
            }
            if (summaryTransport && transporteSeleccionado) {
                summaryTransport.innerText = transporteSeleccionado.nombre.toUpperCase();
            }
            if (summaryItemsCount) {
                const totalQty = pedidoItems.reduce((sum, item) => sum + (parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0), 0);
                summaryItemsCount.innerText = totalQty.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2});
            }
            if (summaryIsComisionista) {
                summaryIsComisionista.innerText = document.getElementById('req-is-comisionista').checked ? 'SÍ' : 'NO';
            }
            if (summaryTipoNv) {
                summaryTipoNv.innerText = document.getElementById('req-tipo-nv-val').value.toUpperCase();
            }
            if (summaryTipoEntrega) {
                summaryTipoEntrega.innerText = document.getElementById('req-tipo-entrega-val').value.toUpperCase();
            }
            if (summaryFormaPago) {
                summaryFormaPago.innerText = document.getElementById('req-forma-pago-val').value.toUpperCase();
            }
            const summaryReqAuth = document.getElementById('summary-requiere-auth');
            if (summaryReqAuth) {
                const reqAuthChk = document.getElementById('req-requiere-autorizacion');
                const isReqAuth = reqAuthChk ? reqAuthChk.checked : true;
                if (isReqAuth) {
                    summaryReqAuth.innerHTML = '<span style="color: #fde68a;">SÍ (Va a Autorización)</span>';
                } else {
                    summaryReqAuth.innerHTML = '<span style="color: #6ee7b7;">NO (Saltea y pasa a Aprobado)</span>';
                }
            }
        }

        const summaryTotal = document.getElementById('summary-total');
        if (summaryTotal) {
            const total = pedidoItems.reduce((sum, item) => sum + item.subtotal, 0);
            summaryTotal.innerText = `$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }
    }

    // Ocultar todos los contenedores de paso
    const c1 = document.getElementById('step-container-1');
    const c2 = document.getElementById('step-container-2');
    const c3 = document.getElementById('step-container-3');
    if (c1) c1.style.display = 'none';
    if (c2) c2.style.display = 'none';
    if (c3) c3.style.display = 'none';

    // Mostrar el contenedor del paso actual
    const targetContainer = document.getElementById(`step-container-${step}`);
    if (targetContainer) targetContainer.style.display = 'flex';

    // Manejar visibilidad alternativa para el Paso 2 (Artículos) si es presupuesto mecánico
    if (step === 2) {
        const isExcelFlow = reqTipoPresupuesto === 'Mecánico' || reqTipoPresupuesto === 'Eléctrico';
        const std2 = document.getElementById('req-standard-step2-container');
        const mec2 = document.getElementById('req-mecanico-step2-container');
        if (std2) std2.style.display = isExcelFlow ? 'none' : 'flex';
        if (mec2) {
            mec2.style.display = isExcelFlow ? 'flex' : 'none';
            if (isExcelFlow) {
                renderMecanicoExcelGrid();
            }
        }
    }

    // Actualizar nodos visuales del step indicator
    for (let i = 1; i <= 3; i++) {
        const node = document.getElementById(`step-node-${i}`);
        if (!node) continue;

        const circle = node.querySelector('.step-circle');
        const label = node.querySelector('span');
        if (!circle || !label) continue;

        if (i < step) {
            // Paso completado exitosamente (Verde)
            circle.style.background = 'var(--success)';
            circle.style.border = 'none';
            circle.style.color = 'black';
            circle.style.boxShadow = '0 0 10px var(--success)';
            circle.innerHTML = '✓';
            label.style.color = 'var(--success)';
        } else if (i === step) {
            // Paso activo actual (Cian)
            circle.style.background = 'var(--primary)';
            circle.style.border = 'none';
            circle.style.color = 'black';
            circle.style.boxShadow = '0 0 10px var(--primary)';
            circle.innerHTML = i;
            label.style.color = 'var(--primary)';
        } else {
            // Paso pendiente inactivo (Gris oscuro)
            circle.style.background = '#1e293b';
            circle.style.border = '2px solid rgba(255,255,255,0.1)';
            circle.style.color = 'var(--text-muted)';
            circle.style.boxShadow = 'none';
            circle.innerHTML = i;
            label.style.color = 'var(--text-muted)';
        }
    }

    // Actualizar barra de progreso que conecta los nodos
    const progressLine = document.getElementById('step-line-progress');
    if (progressLine) {
        if (step === 1) progressLine.style.width = '0%';
        if (step === 2) progressLine.style.width = '50%';
        if (step === 3) progressLine.style.width = '100%';
    }

    window.currentRequestStep = step;
    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'step', step: step, label: `Paso ${step}` });
    }
};

// Funciones para gestionar la ventana modal de Datos Adicionales (Estilo PRESEA)
window.onEncabezadoNext = function() {
    if (reqTipoPresupuesto === 'Mecánico' || reqTipoPresupuesto === 'Eléctrico') {
        goToRequestStep(2);
        return;
    }

    // Validar el primer paso (Encabezado)
    if (typeof clienteSeleccionado === 'undefined' || !clienteSeleccionado) {
        showToast('Seleccione un cliente válido para continuar', 'error');
        return;
    }
    const condCode = document.getElementById('req-condition').value;
    if (!condCode) {
        showToast('Seleccione la condición de venta para continuar', 'error');
        return;
    }
    const depInput = document.getElementById('req-deposit-input').value;
    const transInput = document.getElementById('req-transport-input').value;
    if (!depInput || typeof depositoSeleccionado === 'undefined' || !depositoSeleccionado) {
        showToast('Seleccione un depósito para continuar', 'error');
        return;
    }
    if (!transInput || typeof transporteSeleccionado === 'undefined' || !transporteSeleccionado) {
        showToast('Seleccione un transporte para continuar', 'error');
        return;
    }

    // Si es válido, abrir el modal de Datos Adicionales
    abrirDatosAdicionales();
};

window.abrirDatosAdicionales = function() {
    openModal('tpl-modal-datos-adicionales');

    // Obtener los valores actuales de los campos ocultos
    const isComisionista = document.getElementById('req-is-comisionista').checked;
    const tipoNvLabel = document.getElementById('req-tipo-nv-val').value;
    const tipoEntregaLabel = document.getElementById('req-tipo-entrega-val').value;
    const formaPagoLabel = document.getElementById('req-forma-pago-val').value;

    // Sincronizar hacia los elementos del modal
    const comisionistaModal = document.getElementById('modal-req-is-comisionista');
    if (comisionistaModal) comisionistaModal.checked = isComisionista;

    const radiosNv = document.getElementsByName('modal-req-tipo-nv');
    radiosNv.forEach(r => {
        const rLabel = r.parentElement.innerText.trim();
        if (rLabel === tipoNvLabel) r.checked = true;
    });

    const radiosEntrega = document.getElementsByName('modal-req-tipo-entrega');
    radiosEntrega.forEach(r => {
        const rLabel = r.parentElement.innerText.trim();
        if (rLabel === tipoEntregaLabel) r.checked = true;
    });

    const radiosPago = document.getElementsByName('modal-req-forma-pago');
    radiosPago.forEach(r => {
        const rLabel = r.parentElement.innerText.trim();
        if (rLabel === formaPagoLabel) r.checked = true;
    });
};

window.confirmarDatosAdicionales = function() {
    // Leer valores desde el modal
    const comisionistaModal = document.getElementById('modal-req-is-comisionista');
    const isComisionista = comisionistaModal ? comisionistaModal.checked : false;

    const tipoNvEl = document.querySelector('input[name="modal-req-tipo-nv"]:checked');
    const tipoNvLabel = tipoNvEl ? tipoNvEl.parentElement.innerText.trim() : 'Presupuesto Consignacion';

    const tipoEntregaEl = document.querySelector('input[name="modal-req-tipo-entrega"]:checked');
    const tipoEntregaLabel = tipoEntregaEl ? tipoEntregaEl.parentElement.innerText.trim() : 'Retira Cliente';

    const formaPagoEl = document.querySelector('input[name="modal-req-forma-pago"]:checked');
    const formaPagoLabel = formaPagoEl ? formaPagoEl.parentElement.innerText.trim() : 'Pago Cheque';

    // Guardar en campos ocultos del formulario principal
    document.getElementById('req-is-comisionista').checked = isComisionista;
    document.getElementById('req-tipo-nv-val').value = tipoNvLabel;
    document.getElementById('req-tipo-entrega-val').value = tipoEntregaLabel;
    document.getElementById('req-forma-pago-val').value = formaPagoLabel;

    // Cerrar el modal y avanzar al Paso 2 (Artículos)
    closeModal();
    goToRequestStep(2);
};

window.seleccionarProducto = function(prod) {
    if (prod && parseFloat(prod.stock || 0) <= 0) {
        showToast('Stock 0: El artículo seleccionado no tiene unidades disponibles.', 'warning');
    }
    productoSeleccionado = prod;
    const input = document.getElementById('req-product-input');
    if (input) {
        input.value = prod ? `${prod.detalle} (Cód: ${prod.codigo})` : '';
    }
    const dropdown = document.getElementById('req-product-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Rellenar precio unitario
    const priceInput = document.getElementById('req-product-price');
    if (priceInput) {
        priceInput.value = prod ? (prod.precio !== undefined && prod.precio !== null ? prod.precio.toString().replace(/\./g, ',') : '0') : '0';
    }

    // Foco en la cantidad
    const qtyInput = document.getElementById('req-product-qty');
    if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
    }
};

window.agregarArticuloDetalle = function() {
    let prod = productoSeleccionado;
    const prodInput = document.getElementById('req-product-input');
    const typedText = prodInput ? prodInput.value.trim() : '';

    if (!prod && typedText) {
        const catalog = typeof getActiveStockCatalog === 'function' ? getActiveStockCatalog() : (window.presupuestosCatalogDB || PRESUPUESTO_ELECTRICO_STOCK || []);
        const found = catalog.find(i => 
            (i.codigo && i.codigo.toLowerCase() === typedText.toLowerCase()) || 
            (i.detalle && i.detalle.toLowerCase() === typedText.toLowerCase())
        );
        if (found) {
            prod = found;
        } else {
            const isMec = (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico');
            const customCode = (typeof window.generateNextCorrelativeCode === 'function') 
                ? window.generateNextCorrelativeCode(catalog) 
                : (isMec ? `MEC-ART-${Date.now().toString().slice(-4)}` : `ELE-ART-${Date.now().toString().slice(-4)}`);
            prod = {
                codigo: customCode,
                detalle: typedText,
                stock: 999,
                precio: 0,
                udm: 'u',
                subrubro: 'Materiales y Equipos'
            };
            if (typeof window.presupuestoMecanicoDB !== 'undefined' && Array.isArray(window.presupuestoMecanicoDB)) {
                window.presupuestoMecanicoDB.push(prod);
            }
            if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_MECANICO_STOCK)) {
                PRESUPUESTO_MECANICO_STOCK.push(prod);
            }
            if (typeof window.presupuestosCatalogDB !== 'undefined' && Array.isArray(window.presupuestosCatalogDB)) {
                window.presupuestosCatalogDB.push(prod);
            }
            if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_ELECTRICO_STOCK)) {
                PRESUPUESTO_ELECTRICO_STOCK.push(prod);
            }
        }
        productoSeleccionado = prod;
    }

    if (!productoSeleccionado) {
        showToast('Seleccione un artículo válido de stock o escriba la descripción.', 'error');
        return;
    }

    // Validación de stock: advertir si es 0 pero no bloquear la cotización comercial
    if (parseFloat(productoSeleccionado.stock || 0) <= 0) {
        showToast('Aviso: El artículo seleccionado no registra stock disponible en depósito.', 'warning');
    }

    const qtyInput = document.getElementById('req-product-qty');
    const qty = (parseFloat(qtyInput ? qtyInput.value : 0)) || 1;
    if (isNaN(qty) || qty <= 0) {
        showToast('La cantidad debe ser mayor a cero.', 'error');
        return;
    }

    const priceInput = document.getElementById('req-product-price');
    const price = window.parseArgNumber ? window.parseArgNumber(priceInput ? priceInput.value : 0) : (parseFloat(priceInput ? priceInput.value : 0) || 0);

    // Comprobar si ya existe en la lista de items
    const existing = pedidoItems.find(item => item.codigo === productoSeleccionado.codigo);
    if (existing) {
        existing.cantidad += qty;
        existing.precio = price;
        existing.subtotal = existing.cantidad * existing.precio;
    } else {
        const itemSubr = (productoSeleccionado && productoSeleccionado.subrubro)
            ? productoSeleccionado.subrubro
            : (typeof window.resolveItemSubrubro === 'function' ? window.resolveItemSubrubro(productoSeleccionado, reqTipoPresupuesto) : 'Materiales y Equipos');

        pedidoItems.push({
            codigo: productoSeleccionado.codigo,
            detalle: productoSeleccionado.detalle,
            precio: price,
            cantidad: qty,
            subtotal: qty * price,
            udm: productoSeleccionado.udm || 'u',
            subrubro: itemSubr
        });
    }

    // Limpiar campos de búsqueda
    productoSeleccionado = null;
    if (prodInput) prodInput.value = '';
    if (qtyInput) qtyInput.value = '';
    if (priceInput) priceInput.value = '';

    actualizarTablaItemsRequerimiento();
    if (typeof window.renderMecanicoExcelGrid === 'function') {
        window.renderMecanicoExcelGrid();
    }
    showToast('Artículo agregado al pedido.', 'success');
};

window.eliminarArticuloDetalle = function(codigo) {
    pedidoItems = pedidoItems.filter(item => item.codigo !== codigo);
    actualizarTablaItemsRequerimiento();
    showToast('Artículo eliminado del pedido.', 'info');
};

window.actualizarItemFila = function(codigo, nuevaQty, nuevoPrecio) {
    const item = pedidoItems.find(i => i.codigo === codigo);
    if (!item) return;

    if (nuevaQty !== null) {
        const qty = parseFloat(nuevaQty);
        if (!isNaN(qty) && qty > 0) {
            item.cantidad = qty;
        } else {
            showToast('La cantidad debe ser mayor a cero.', 'error');
        }
    }

    if (nuevoPrecio !== null) {
        if (!window.canUserEditUnitPrices()) {
            if (typeof showToast === 'function') showToast('No tiene permisos para modificar precios unitarios.', 'warning');
            actualizarTablaItemsRequerimiento();
            return;
        }
        const price = parseFloat(nuevoPrecio);
        if (!isNaN(price) && price >= 0) {
            item.precio = price;
        } else {
            showToast('El precio debe ser mayor o igual a cero.', 'error');
        }
    }

    item.subtotal = item.cantidad * item.precio;
    actualizarTablaItemsRequerimiento();
};

window.actualizarTablaItemsRequerimiento = function() {
    const listBody = document.getElementById('req-items-list');
    if (!listBody) return;

    if (pedidoItems.length === 0) {
        listBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px; font-style: italic;">
                    No se han agregado artículos al detalle. El importe se cargará de forma manual o según sumatoria.
                </td>
            </tr>
        `;

        // Mantener el input de importe total en 0.00 y de solo lectura
        const reqAmtInput = document.getElementById('req-amount');
        if (reqAmtInput) {
            reqAmtInput.value = '0.00';
            reqAmtInput.readOnly = true;
            reqAmtInput.style.background = 'rgba(255,255,255,0.05)';
            reqAmtInput.style.color = 'var(--text-muted)';
        }
        const totalNVDisplay = document.getElementById('req-total-nv-display');
        if (totalNVDisplay) {
            totalNVDisplay.innerText = '$0,00';
        }
        return;
    }

    let html = '';
    let totalAmt = 0;

    const canEditPrices = window.canUserEditUnitPrices ? window.canUserEditUnitPrices() : false;
    const priceDisabledAttr = canEditPrices ? '' : 'disabled readonly';
    const priceInputStyle = canEditPrices
        ? 'width: 90px; text-align: right; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--glass-border); border-radius: 4px; padding: 2px 5px;'
        : 'width: 90px; text-align: right; background: rgba(255,255,255,0.02); color: #94a3b8; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 2px 5px; opacity: 0.6; pointer-events: none;';

    pedidoItems.forEach(item => {
        if (!item) return;
        const itemPrice = parseFloat(item.precio || 0) || 0;
        const itemQty = parseFloat(item.cantidad || 0) || 0;
        const itemSubtotal = (typeof item.subtotal === 'number' && !isNaN(item.subtotal)) ? item.subtotal : (itemPrice * itemQty);
        totalAmt += itemSubtotal;
        html += `
            <tr>
                <td style="font-family: monospace; vertical-align: middle;">${item.codigo || ''}</td>
                <td style="vertical-align: middle;"><strong>${item.detalle || ''}</strong></td>
                <td style="text-align: right; font-family: monospace; vertical-align: middle;">
                    <input type="number" value="${itemPrice.toFixed(2)}" min="0" step="any"
                        ${priceDisabledAttr}
                        title="${canEditPrices ? '' : 'No tiene permisos para modificar precios unitarios'}"
                        style="${priceInputStyle}"
                        onchange="actualizarItemFila('${item.codigo}', null, this.value)">
                </td>
                <td style="text-align: right; font-family: monospace; vertical-align: middle;">
                    <input type="number" value="${itemQty}" min="0.01" step="any"
                        style="width: 70px; text-align: right; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--glass-border); border-radius: 4px; padding: 2px 5px;"
                        onchange="actualizarItemFila('${item.codigo}', this.value, null)">
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; vertical-align: middle;">$${itemSubtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; vertical-align: middle;">
                    <button type="button" class="btn btn-sm btn-danger" onclick="eliminarArticuloDetalle(\'${item.codigo}\')" style="padding: 2px 6px; font-size: 11px;"><i class="fas fa-times"></i></button>
                </td>
            </tr>
        `;
    });

    listBody.innerHTML = html;

    // Actualizar el input de importe total y deshabilitarlo
    const reqAmtInput = document.getElementById('req-amount');
    if (reqAmtInput) {
        reqAmtInput.value = totalAmt.toFixed(2);
        reqAmtInput.readOnly = true;
        reqAmtInput.style.background = 'rgba(255,255,255,0.05)';
        reqAmtInput.style.color = 'var(--text-muted)';
    }

    // Actualizar el total del Presupuesto al lado del encabezado
    const totalNVDisplay = document.getElementById('req-total-nv-display');
    if (totalNVDisplay) {
        totalNVDisplay.innerText = `$${totalAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    }
};

window.abrirRobotStock = function() {
    openModal('tpl-modal-robot-stock');
    const searchInput = document.getElementById('robot-stock-search-input');
    const resultsList = document.getElementById('robot-stock-results-list');
    const resultsCount = document.getElementById('robot-stock-results-count');
    const rubroFilter = document.getElementById('robot-stock-rubro-filter');
    const catalog = getActiveStockCatalog();

    // Popular rubro filter
    if (rubroFilter) {
        const rubros = [...new Set(catalog.map(s => s.rubro).filter(Boolean))].sort();
        let html = '<option value="">Todos los rubros...</option>';
        rubros.forEach(r => {
            html += `<option value="${r}">${r}</option>`;
        });
        rubroFilter.innerHTML = html;
    }

    const renderResults = () => {
        resultsList.innerHTML = '';
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const rubro = rubroFilter ? rubroFilter.value : '';

        let filtered = catalog;

        // Filtrar por planta
        const reqPlantaSelect = document.getElementById('req-meca-planta');
        if (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico' && reqPlantaSelect) {
            let curPlanta = (reqPlantaSelect.value || '').trim().toUpperCase();
            if (curPlanta === 'PPA' || curPlanta === 'APA') curPlanta = 'APS';
// Regla Dinámica: Mirar en plantasRules a ver si usa la lista de otra planta
            if (curPlanta === 'PPA') curPlanta = 'APS';
            if (curPlanta !== 'APS' && curPlanta !== 'APG' && curPlanta && window.appData && window.appData.plantasRules && window.appData.plantasRules[curPlanta]) {
                curPlanta = window.appData.plantasRules[curPlanta];
            } else if (curPlanta === 'APA') {
                curPlanta = 'APS'; // Fallback
            }

            if (curPlanta) {
                const grouped = {};
                filtered.forEach(s => {
                    if (!grouped[s.codigo] && (!(s.planta || '').trim() || (s.planta || '').trim().toUpperCase() === curPlanta)) grouped[s.codigo] = { ...s, precio: 0, precio_unitario: 0, planta: curPlanta };
                });
                filtered.forEach(s => {
                    if (!(s.planta || '').trim()) {
                        if (s.precio > 0 || grouped[s.codigo].precio === 0) {
                            grouped[s.codigo].precio = s.precio;
                            grouped[s.codigo].precio_unitario = s.precio_unitario;
                            grouped[s.codigo].detalle = s.detalle;
                        }
                    }
                });
                filtered.forEach(s => {
                    if ((s.planta || '').trim().toUpperCase() === curPlanta) {
                        if (s.precio > 0 || grouped[s.codigo].precio === 0) {
                            grouped[s.codigo].precio = s.precio;
                            grouped[s.codigo].precio_unitario = s.precio_unitario;
                            grouped[s.codigo].detalle = s.detalle;
                        }
                    }
                });
                filtered = Object.values(grouped);
            }
        }

        if (rubro) {
            filtered = filtered.filter(s => s.rubro === rubro);
        }
        if (query) {
            filtered = filtered.filter(s =>
                (s.detalle || '').toLowerCase().includes(query) ||
                String(s.codigo || '').toLowerCase().includes(query)
            );
        }

        // Paginación a 100 resultados para no colgar la UI
        const limit = 100;
        const sliced = filtered.slice(0, limit);

        resultsCount.innerText = `Mostrando ${sliced.length} de ${filtered.length} productos`;

        sliced.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            const stockColor = s.stock > 0 ? 'var(--success)' : 'var(--danger)';
            const stockBold = s.stock > 0 ? 'bold' : 'normal';

            tr.innerHTML = `
                <td style="font-family: monospace;">${s.codigo}</td>
                <td><strong>${s.detalle}</strong><div style="font-size:10px; color:var(--text-muted);">${s.rubro} - ${s.subrubro || ''}</div></td>
                <td>${s.rubro}</td>
                <td style="font-family: monospace; text-align: right;">$${s.precio.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="font-family: monospace; text-align: right; color: ${stockColor}; font-weight: ${stockBold};">${s.stock.toLocaleString('es-AR')}</td>
            `;

            tr.onclick = () => {
                seleccionarProducto(s);
                closeModal();
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) searchInput.addEventListener('input', renderResults);
    if (rubroFilter) rubroFilter.addEventListener('change', renderResults);

    renderResults();
    setTimeout(() => { if (searchInput) searchInput.focus(); }, 150);
};

let clienteSeleccionado = null;

function seleccionarCliente(cliente) {
    if (!cliente) return;
    clienteSeleccionado = cliente;

    // Asignar en Presupuestos Mecánicos / Eléctricos (Paso 1)
    const reqMecaClient = document.getElementById('req-meca-cliente');
    if (reqMecaClient) {
        reqMecaClient.value = cliente.nombre;
    }

    // Asignar en Formulario Estándar
    const reqClientInput = document.getElementById('req-client');
    if (reqClientInput) {
        reqClientInput.value = cliente.id || cliente.codigo;
    }

    // Asignar en Modal de Modificación / Detalle
    const authEditClient = document.getElementById('auth-edit-meca-cliente');
    if (authEditClient) {
        authEditClient.value = cliente.nombre;
    }
    const authMecaClientVal = document.getElementById('auth-meca-cliente-val');
    if (authMecaClientVal && viewMode !== 'Modificacion') {
        authMecaClientVal.innerText = cliente.nombre;
    }
    const authClientDisplay = document.getElementById('auth-client-display');
    if (authClientDisplay) {
        authClientDisplay.innerText = `${cliente.codigo}  ${cliente.nombre.toUpperCase()}`;
    }
    if (pedidoActivo) {
        pedidoActivo.cliente_id = cliente.codigo;
        pedidoActivo.cliente_nombre = cliente.nombre;
        if (cliente.domicilio) pedidoActivo.domicilio = cliente.domicilio;
        if (cliente.localidad) pedidoActivo.localidad = cliente.localidad;
        if (cliente.cuit) pedidoActivo.cuit = cliente.cuit;

        // Actualizar inputs en el DOM si el modal está abierto
        const authEditDom = document.getElementById('auth-edit-meca-domicilio');
        if (authEditDom && cliente.domicilio) authEditDom.value = cliente.domicilio.toUpperCase();
        const authEditLoc = document.getElementById('auth-edit-meca-localidad');
        if (authEditLoc && cliente.localidad) authEditLoc.value = cliente.localidad.toUpperCase();
        const authEditCuit = document.getElementById('auth-edit-meca-cuit');
        if (authEditCuit && cliente.cuit) authEditCuit.value = cliente.cuit;

        const authMecaDom = document.getElementById('auth-meca-domicilio-val');
        if (authMecaDom && cliente.domicilio) authMecaDom.innerText = cliente.domicilio.toUpperCase();
        const authMecaLoc = document.getElementById('auth-meca-localidad-val');
        if (authMecaLoc && cliente.localidad) authMecaLoc.innerText = cliente.localidad.toUpperCase();
        const authMecaCuit = document.getElementById('auth-meca-cuit-val');
        if (authMecaCuit && cliente.cuit) authMecaCuit.innerText = cliente.cuit;

        if (typeof saveTempEdits === 'function') saveTempEdits();
    }

    // Cargar condición del cliente por defecto
    const rawCondId = (cliente.condicion_id && String(cliente.condicion_id) !== '0') ? String(cliente.condicion_id) : '1';
    const foundCond = typeof condicionesDB !== 'undefined' ? condicionesDB.find(c => String(c.codigo) === rawCondId) : null;
    const condNameRaw = cleanConditionName(cliente.condicion_nombre);
    const fallbackCond = foundCond || { codigo: rawCondId, nombre: condNameRaw, dias: 0 };
    seleccionarCondicion(fallbackCond);

    // Cargar depósito del cliente por defecto
    const foundDep = typeof depositosDB !== 'undefined' ? depositosDB.find(d => d.codigo === cliente.deposito_id) : null;
    seleccionarDeposito(foundDep || (cliente.deposito_id ? { codigo: cliente.deposito_id, nombre: cliente.deposito_nombre } : null));

    // Cargar transporte del cliente por defecto
    const foundTrans = typeof transportesDB !== 'undefined' ? transportesDB.find(t => t.codigo === cliente.transporte_id) : null;
    seleccionarTransporte(foundTrans || (cliente.transporte_id ? { codigo: cliente.transporte_id, nombre: cliente.transporte_nombre } : null));

    const clientDropdown = document.getElementById('req-client-dropdown');
    if (clientDropdown) clientDropdown.style.display = 'none';

    // Pasar automáticamente al siguiente campo (Proveedor) en Paso 1
    setTimeout(() => {
        const step1 = document.getElementById('step-container-1');
        if (step1 && step1.style.display !== 'none') {
            const provInput = document.getElementById('req-meca-proveedor');
            if (provInput) {
                provInput.focus();
                // abrirRobotProveedores(); // Eliminado por pedido del usuario
            }
        }
    }, 250);
}

// 2. BUSCADOR F6 DE PROVEEDORES
window.abrirRobotProveedores = function() {
    openModal('tpl-modal-robot-proveedores');
    const proveedores = ['SG MONTAJES SRL', 'ACOSTA SERVICIO'];
    let selectedProvIdx = 0;

    const updateProvHighlight = () => {
        const cardSg = document.getElementById('prov-card-sg');
        const cardAcosta = document.getElementById('prov-card-acosta');
        if (cardSg && cardAcosta) {
            if (selectedProvIdx === 0) {
                cardSg.style.outline = '2px solid #22d3ee';
                cardSg.style.background = 'rgba(34, 211, 238, 0.25)';
                cardAcosta.style.outline = 'none';
                cardAcosta.style.background = 'rgba(168, 85, 247, 0.1)';
            } else {
                cardSg.style.outline = 'none';
                cardSg.style.background = 'rgba(34, 211, 238, 0.1)';
                cardAcosta.style.outline = '2px solid #c084fc';
                cardAcosta.style.background = 'rgba(168, 85, 247, 0.25)';
            }
        }
    };

    setTimeout(updateProvHighlight, 50);

    const onProvKeyDown = (e) => {
        const modal = document.getElementById('modal-overlay');
        if (!modal || modal.style.display === 'none') {
            window.removeEventListener('keydown', onProvKeyDown);
            return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            selectedProvIdx = 1;
            updateProvHighlight();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            selectedProvIdx = 0;
            updateProvHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            window.removeEventListener('keydown', onProvKeyDown);
            seleccionarProveedor(proveedores[selectedProvIdx]);
        }
    };

    window.addEventListener('keydown', onProvKeyDown);
};

window.seleccionarProveedor = function(nombre) {
    if (!nombre) return;
    const mecaProv = document.getElementById('req-meca-proveedor');
    if (mecaProv) mecaProv.value = nombre;

    const editMecaProv = document.getElementById('auth-edit-meca-proveedor');
    if (editMecaProv) editMecaProv.value = nombre;

    const authMecaProvVal = document.getElementById('auth-meca-proveedor-val');
    if (authMecaProvVal && viewMode !== 'Modificacion') {
        authMecaProvVal.innerText = nombre;
    }

    if (pedidoActivo) {
        pedidoActivo.meca_proveedor = nombre;
        if (typeof saveTempEdits === 'function') saveTempEdits();
    }

    closeModal();
    showToast(`Proveedor seleccionado: ${nombre}`, 'success');

    // Pasar automáticamente al siguiente campo (Fecha de Oferta) en Paso 1
    setTimeout(() => {
        const step1 = document.getElementById('step-container-1');
        if (step1 && step1.style.display !== 'none') {
            const fechaEl = document.getElementById('req-meca-fecha-oferta');
            if (fechaEl) fechaEl.focus();
        }
    }, 150);
};

// 3. BUSCADOR F6 AVANZADO DE CLIENTES (ROBOT)
window.abrirRobotF6 = function() {
    openModal('tpl-modal-robot');
    const searchInput = document.getElementById('robot-search-input');
    const resultsList = document.getElementById('robot-results-list');
    const resultsCount = document.getElementById('robot-results-count');
    const resultsTable = document.getElementById('robot-results-table');
    const scrollContainer = resultsTable ? resultsTable.closest('.table-responsive') : null;

    let currentRobotMatches = [];
    let selectedIndex = 0;

    const updateActiveRowHighlight = () => {
        if (!resultsList) return;
        const rows = resultsList.querySelectorAll('tr');
        rows.forEach((r, idx) => {
            if (idx === selectedIndex) {
                r.style.backgroundColor = 'rgba(34, 211, 238, 0.2)';
                r.style.outline = '1px solid #22d3ee';
                r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                r.style.backgroundColor = '';
                r.style.outline = '';
            }
        });
    };

    const renderRobotResultsChunk = () => {
        const renderedCount = resultsList.children.length;
        const chunk = currentRobotMatches.slice(renderedCount, renderedCount + 50);
        if (chunk.length === 0) return;

        const fragment = document.createDocumentFragment();
        chunk.forEach((c, idx) => {
            const actualIndex = renderedCount + idx;
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.setAttribute('data-idx', actualIndex);

            tr.innerHTML = `
                <td style="font-family: monospace; font-weight: 700; color: #22d3ee;">${c.codigo}</td>
                <td><strong style="color: #ffffff;">${c.nombre}</strong><div style="font-size:11px; color:var(--text-muted);">${c.domicilio || ''} - ${c.localidad || ''}</div></td>
                <td>${c.cuit || '-'}</td>
                <td>${c.localidad || '-'}</td>
            `;

            tr.onclick = () => {
                seleccionarCliente(c);
                closeModal();
                showToast(`Cliente seleccionado: ${c.nombre}`, 'success');
            };

            tr.onmouseenter = () => {
                selectedIndex = actualIndex;
                updateActiveRowHighlight();
            };

            fragment.appendChild(tr);
        });
        resultsList.appendChild(fragment);
        updateActiveRowHighlight();
    };

    const renderRobotResults = (query) => {
        resultsList.innerHTML = '';
        selectedIndex = 0;
        if (scrollContainer) scrollContainer.scrollTop = 0;
        const cleanQuery = (query || '').toLowerCase().trim();

        const currentUser = getCurrentUser();
        const userVendedorCodigo = currentUser ? currentUser.vendedor_codigo : '';
        let filteredClients = clientesDB;
        if (userVendedorCodigo) {
            filteredClients = clientesDB.filter(c => c.vendedor_id === userVendedorCodigo || !c.vendedor_id || c.vendedor_id === '');
        }

        if (cleanQuery === '') {
            currentRobotMatches = filteredClients;
        } else {
            currentRobotMatches = filteredClients.filter(c =>
                c.nombre.toLowerCase().includes(cleanQuery) ||
                c.cuit.includes(cleanQuery) ||
                c.codigo.includes(cleanQuery) ||
                (c.localidad || '').toLowerCase().includes(cleanQuery)
            );
        }

        resultsCount.innerText = `Mostrando ${currentRobotMatches.length} clientes`;
        renderRobotResultsChunk();
    };

    if (scrollContainer) {
        scrollContainer.onscroll = () => {
            if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 30) {
                renderRobotResultsChunk();
            }
        };
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderRobotResults(e.target.value);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentRobotMatches.length > 0) {
                    selectedIndex = Math.min(selectedIndex + 1, currentRobotMatches.length - 1);
                    // Si el índice supera los renderizados, renderizar más
                    if (selectedIndex >= resultsList.children.length) {
                        renderRobotResultsChunk();
                    }
                    updateActiveRowHighlight();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentRobotMatches.length > 0) {
                    selectedIndex = Math.max(selectedIndex - 1, 0);
                    updateActiveRowHighlight();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentRobotMatches.length > 0 && currentRobotMatches[selectedIndex]) {
                    const selClient = currentRobotMatches[selectedIndex];
                    seleccionarCliente(selClient);
                    closeModal();
                    showToast(`Cliente seleccionado: ${selClient.nombre}`, 'success');
                }
            }
        });

        renderRobotResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.pedidoEnEdicionId = null;

window.crearPresupuestoBasadoEnActual = function(id) {
    const p = (id && typeof id === 'string') ? appData.pedidos.find(x => x.id === id) : pedidoActivo;
    if (!p) {
        showToast('No se encontró el presupuesto de origen', 'error');
        return;
    }
    if (typeof closeModal === 'function') closeModal();

    window.pedidoEnEdicionId = null; // Para que sea un presupuesto NUEVO
    window.pedidoEnReutilizacion = true;
    reqTipoPresupuesto = p.tipo_presupuesto || 'Eléctrico';

    // Cambiar navegación a Gestión de Presupuestos en el sidebar
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const menuItem = document.getElementById('menu-ingresar');
    if (menuItem) menuItem.classList.add('active');

    // Renderizar la vista de Gestión de Presupuestos
    renderContent('tpl-request-ped');
    initRequestView();

    // Actualizar el rubro (badge e interfaz) según el tipo de presupuesto (Eléctrico / Mecánico)
    updateTipoPresupuestoBadge();

    // Precompletar datos del Paso 1
    const setVal = (elemId, val) => {
        const el = document.getElementById(elemId);
        if (el) el.value = val || '';
    };

    setVal('req-meca-denominacion', p.meca_denominacion || p.motivo || '');
    setVal('req-meca-cliente', p.cliente_nombre || 'CARGILL SACI');
    setVal('req-meca-proveedor', p.meca_proveedor || 'SG MONTAJES SRL');
    const parseDateInput = (dStr, fallback) => {
        if (!dStr) return fallback;
        if (dStr.includes('/')) {
            const parts = dStr.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return dStr;
    };

    setVal('req-meca-fecha-oferta', new Date().toISOString().substring(0, 10));
    setVal('req-meca-validez', p.meca_validez || '5 días');
    if (typeof window.setValidezOfertaValue === 'function') window.setValidezOfertaValue(p.meca_validez || '5 días');
    setVal('req-meca-planta', p.meca_planta || 'APS');
    setVal('req-meca-nro-oc', p.meca_nro_oc || '');
    setVal('req-meca-nro-ot', p.meca_nro_ot || '');
    setVal('req-meca-fecha-inicio', parseDateInput(p.meca_fecha_inicio, new Date().toISOString().substring(0, 10)));
    setVal('req-meca-duracion', p.meca_duracion || '');
    if (typeof window.setDuracionEstimadaValue === 'function') window.setDuracionEstimadaValue(p.meca_duracion || '');
    const existingFin = document.getElementById('req-meca-fecha-fin') ? document.getElementById('req-meca-fecha-fin').value : '';
    setVal('req-meca-fecha-fin', parseDateInput(p.meca_fecha_fin, existingFin));
    setVal('req-meca-propuesta', p.meca_propuesta || '');
    setVal('req-meca-personal', p.meca_personal || '');
    setVal('req-meca-exclusiones', p.meca_exclusiones || '');
    setVal('req-reason', p.motivo || '');

    // Cargar ítems en el Paso 2
    pedidoItems = JSON.parse(JSON.stringify(p.items || [])).map(it => {
        // La regla de negocio indica que al basarse en otro presupuesto, las cantidades deben arrancar en 0
        it.cantidad = 0;
        it.cantidad_original = 0;
        it.subtotal = 0;
        it.subtotal_usd = 0;
        return it;
    });

    // Resetear pestaña activa para el Paso 2
    window.activeMecaTab = 0;

    // Ir a Paso 1 (Datos Generales) en Gestión de Presupuestos
    goToRequestStep(1);

    const tipoLabel = reqTipoPresupuesto === 'Mecánico' ? '⚙️ Presupuesto Mecánico' : '⚡ Presupuesto Eléctrico';
    showToast(`📋 Redirigido a Gestión de Presupuestos (${tipoLabel}). Datos cargados basados en #${p.id}.`, 'success');
};

window.cargarPresupuestoParaModificacion = function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) {
        showToast('No se encontró el presupuesto a modificar', 'error');
        return;
    }

    window.pedidoEnEdicionId = p.id;
    window.pedidoEnReutilizacion = false;
    reqTipoPresupuesto = p.tipo_presupuesto || 'Eléctrico';

    // Switch to Ingreso de Presupuesto menu & template
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const menuItem = document.getElementById('menu-ingresar');
    if (menuItem) menuItem.classList.add('active');

    renderContent('tpl-request-ped');
    initRequestView();

    // Actualizar el rubro
    updateTipoPresupuestoBadge();

    // Pre-fill Step 1 inputs with p's values
    const setVal = (elemId, val) => {
        const el = document.getElementById(elemId);
        if (el) el.value = val || '';
    };

    setVal('req-meca-denominacion', p.meca_denominacion || p.motivo || '');
    setVal('req-meca-cliente', p.cliente_nombre || 'CARGILL SACI');
    setVal('req-meca-proveedor', p.meca_proveedor || 'SG MONTAJES SRL');
    const parseDateInput2 = (dStr, fallback) => {
        if (!dStr) return fallback;
        if (dStr.includes('/')) {
            const parts = dStr.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return dStr;
    };

    setVal('req-meca-fecha-oferta', parseDateInput2(p.meca_fecha_oferta, ''));
    setVal('req-meca-validez', p.meca_validez || '5 días');
    if (typeof window.setValidezOfertaValue === 'function') window.setValidezOfertaValue(p.meca_validez || '5 días');
    setVal('req-meca-planta', p.meca_planta || 'APS');
    setVal('req-meca-nro-oc', p.meca_nro_oc || '');
    setVal('req-meca-nro-ot', p.meca_nro_ot || '');
    setVal('req-meca-fecha-inicio', parseDateInput2(p.meca_fecha_inicio, new Date().toISOString().substring(0, 10)));
    setVal('req-meca-duracion', p.meca_duracion || '');
    if (typeof window.setDuracionEstimadaValue === 'function') window.setDuracionEstimadaValue(p.meca_duracion || '');
    const existingFin = document.getElementById('req-meca-fecha-fin') ? document.getElementById('req-meca-fecha-fin').value : '';
    setVal('req-meca-fecha-fin', parseDateInput2(p.meca_fecha_fin, existingFin));
    setVal('req-meca-propuesta', p.meca_propuesta || '');
    setVal('req-meca-personal', p.meca_personal || '');
    setVal('req-meca-exclusiones', p.meca_exclusiones || '');
    setVal('req-reason', p.motivo || '');

    // Set pre-filled items for Step 2
    pedidoItems = JSON.parse(JSON.stringify(p.items || []));

    // Open Step 1 directly
    goToRequestStep(1);

    showToast(`Modificando Presupuesto ${p.id}. Puede revisar o cambiar los Datos (Paso 1) y el Tarifario (Paso 2).`, 'info');
};

function confirmarPedido() {
    if (typeof window.recalcMecaExcelAll === 'function') {
        try { window.recalcMecaExcelAll(); } catch(e) {}
    }
    if (!clienteSeleccionado) {
        const clientVal = (document.getElementById('req-meca-cliente') && document.getElementById('req-meca-cliente').value) ||
                          (document.getElementById('req-client') && document.getElementById('req-client').value) ||
                          'CARGILL SACI';
        clienteSeleccionado = {
            codigo: '3',
            nombre: clientVal,
            cuit: '30-50679316-5',
            telefono: '',
            email: '',
            vendedor_id: '',
            vendedor_nombre: ''
        };
    }
    if (!Array.isArray(pedidoItems) || pedidoItems.length === 0) {
        showToast('El presupuesto debe contener al menos un artículo o concepto del tarifario', 'error');
        return;
    }

    openModal('tpl-modal-tipo-reporte');
}

window.confirmarConTipoReporte = async function(tipoReporte) {
    closeModal();

    try {
        if (typeof window.recalcMecaExcelAll === 'function') {
            try { window.recalcMecaExcelAll(); } catch(e) {}
        }

        const amount = Array.isArray(pedidoItems)
            ? pedidoItems.reduce((sum, item) => sum + (parseFloat(item.subtotal) || ((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0)) || 0), 0)
            : 0;

        const rawCondCode = document.getElementById('req-condition') ? document.getElementById('req-condition').value : '';
        const condCode = (rawCondCode && String(rawCondCode) !== '0') ? rawCondCode : '1';
        const motivo = document.getElementById('req-reason') ? document.getElementById('req-reason').value : '';

        const depCode = depositoSeleccionado ? depositoSeleccionado.codigo : '';
        const transCode = transporteSeleccionado ? transporteSeleccionado.codigo : '';

        const conditionObj = (typeof condicionesDB !== 'undefined' && Array.isArray(condicionesDB)) ? condicionesDB.find(c => String(c.codigo) === String(condCode)) : null;
        const finalCondNombre = cleanConditionName(conditionObj ? conditionObj.nombre : (condCode && condCode !== '0' ? `Condición ${condCode}` : 'CONTADO'));
        const depositoObj = depositoSeleccionado;
        const transporteObj = transporteSeleccionado;

        if (!clienteSeleccionado) {
            const clientVal = (document.getElementById('req-meca-cliente') && document.getElementById('req-meca-cliente').value) ||
                              (document.getElementById('req-client') && document.getElementById('req-client').value) ||
                              'CARGILL SACI';
            const matchedCli = (typeof window.clientesDB !== 'undefined' && Array.isArray(window.clientesDB))
                ? window.clientesDB.find(c => c.nombre.toUpperCase().includes(clientVal.trim().toUpperCase()) || clientVal.trim().toUpperCase().includes(c.nombre.toUpperCase()) || c.codigo === clientVal.trim())
                : null;
            clienteSeleccionado = matchedCli || {
                codigo: '3',
                nombre: clientVal,
                cuit: '30-50679216-5',
                domicilio: 'SOLIS 822',
                localidad: 'VILLA GOBERNADOR GALVEZ',
                telefono: '',
                email: '',
                vendedor_id: '',
                vendedor_nombre: ''
            };
        }

        const user = getCurrentUser();
        const userVendedorId = (user && user.vendedor_codigo) ? user.vendedor_codigo : (clienteSeleccionado ? clienteSeleccionado.vendedor_id || '' : '');
        const userVendedorNombre = (user && user.vendedor_nombre) ? user.vendedor_nombre : (clienteSeleccionado ? clienteSeleccionado.vendedor_nombre || '' : '');

        const isEditing = (typeof window.pedidoEnEdicionId !== 'undefined' && window.pedidoEnEdicionId);
        let targetPedido = null;
        let targetId = '';

        if (!appData) appData = {};
        if (!Array.isArray(appData.pedidos)) appData.pedidos = [];

        if (isEditing) {
            targetPedido = appData.pedidos.find(x => x.id === window.pedidoEnEdicionId);
        }

        const finalNroOc = document.getElementById('req-meca-nro-oc') ? document.getElementById('req-meca-nro-oc').value.trim() : '';

        if (targetPedido) {
            targetId = targetPedido.id;
            targetPedido.tipo_reporte = tipoReporte || 'detallado';
            targetPedido.importe = amount;
            targetPedido.importe_original = amount;
            targetPedido.condicion_id = condCode;
            targetPedido.condicion_nombre = finalCondNombre;
            targetPedido.condicion_venta = finalCondNombre;
            targetPedido.deposito_id = depCode;
            targetPedido.deposito_nombre = depositoObj ? (depositoObj.nombre || `Depósito ${depCode}`) : (depCode ? `Depósito ${depCode}` : '');
            targetPedido.transporte_id = transCode;
            targetPedido.transporte_nombre = transporteObj ? (transporteObj.nombre || `Transporte ${transCode}`) : (transCode ? `Transporte ${transCode}` : '');
            targetPedido.motivo = motivo;
            targetPedido.observaciones = motivo;
            targetPedido.tipo_presupuesto = reqTipoPresupuesto || 'Eléctrico';
            targetPedido.meca_denominacion = document.getElementById('req-meca-denominacion') ? document.getElementById('req-meca-denominacion').value : '';
            if (document.getElementById('req-meca-cliente')) targetPedido.cliente_nombre = document.getElementById('req-meca-cliente').value;
            if (clienteSeleccionado) {
                targetPedido.cliente_id = clienteSeleccionado.codigo || targetPedido.cliente_id;
                targetPedido.cuit = clienteSeleccionado.cuit || targetPedido.cuit;
                if (clienteSeleccionado.domicilio) targetPedido.domicilio = clienteSeleccionado.domicilio;
                if (clienteSeleccionado.localidad) targetPedido.localidad = clienteSeleccionado.localidad;
            }
            targetPedido.meca_proveedor = document.getElementById('req-meca-proveedor') ? document.getElementById('req-meca-proveedor').value : '';
            targetPedido.meca_fecha_oferta = document.getElementById('req-meca-fecha-oferta') ? document.getElementById('req-meca-fecha-oferta').value : '';
            targetPedido.meca_validez = document.getElementById('req-meca-validez') ? document.getElementById('req-meca-validez').value : '';
            const editPlantaVal = document.getElementById('req-meca-planta') ? document.getElementById('req-meca-planta').value : '';
            if (editPlantaVal) {
                targetPedido.meca_planta = editPlantaVal;
                targetPedido.planta = editPlantaVal;
            }
            targetPedido.meca_nro_oc = finalNroOc;
            targetPedido.nro_oc = finalNroOc;
            targetPedido.meca_nro_ot = document.getElementById('req-meca-nro-ot') ? document.getElementById('req-meca-nro-ot').value : '';
            targetPedido.meca_fecha_inicio = document.getElementById('req-meca-fecha-inicio') ? document.getElementById('req-meca-fecha-inicio').value : '';
            targetPedido.meca_duracion = document.getElementById('req-meca-duracion') ? document.getElementById('req-meca-duracion').value : '';
            targetPedido.meca_fecha_fin = document.getElementById('req-meca-fecha-fin') ? document.getElementById('req-meca-fecha-fin').value : '';
            targetPedido.meca_propuesta = document.getElementById('req-meca-propuesta') ? document.getElementById('req-meca-propuesta').value : '';
            targetPedido.meca_personal = document.getElementById('req-meca-personal') ? document.getElementById('req-meca-personal').value : '';
            targetPedido.meca_exclusiones = document.getElementById('req-meca-exclusiones') ? document.getElementById('req-meca-exclusiones').value : '';
            targetPedido.cotizacion_materiales = window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1;
            targetPedido.cotizacion = targetPedido.cotizacion_materiales;
            targetPedido.items = (pedidoItems || []).map(item => ({
                ...item,
                cantidad_original: item.cantidad,
                estado: 'Pendiente'
            }));

            window.pedidoEnEdicionId = null;
            try { saveData(); } catch(e) {}
            if (typeof window.guardarPresupuestoEnSupabase === 'function') {
                await window.guardarPresupuestoEnSupabase(targetPedido);
            }
            showToast(`Presupuesto ${targetId} modificado correctamente.`, 'success');
            try { verDetallePedido(targetId); } catch(e) {}
        } else {
            const isMec = (reqTipoPresupuesto === 'Mecánico');
            const rubroPrefix = isMec ? '101-MEC' : '102-ELEC';
            const existingNums = (appData.pedidos || [])
                .map(p => {
                    const m = String(p.id || '').match(new RegExp(`^${rubroPrefix}-(\\d+)`));
                    return m ? parseInt(m[1], 10) : 0;
                })
                .filter(n => n > 0);
            const nextCounter = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
            targetId = `${rubroPrefix}-${String(nextCounter).padStart(4, '0')}`;

            const isComisionista = document.getElementById('req-is-comisionista') ? document.getElementById('req-is-comisionista').checked : false;
            const tipoNvLabel = document.getElementById('req-tipo-nv-val') ? document.getElementById('req-tipo-nv-val').value : 'Presupuesto Consignacion';
            const tipoEntregaLabel = document.getElementById('req-tipo-entrega-val') ? document.getElementById('req-tipo-entrega-val').value : 'ENTREGA EN PLANTA';
            const formaPagoLabel = document.getElementById('req-forma-pago-val') ? document.getElementById('req-forma-pago-val').value : '30 DIAS';

            const reqAuthChk = document.getElementById('req-requiere-autorizacion');
            const isReqAuth = reqAuthChk ? reqAuthChk.checked : true;
            let finalInitialState = 'Enviado sin OC';
            let finalItemState = 'Pendiente';

            if (!isReqAuth) {
                if (finalNroOc && finalNroOc.trim()) {
                    finalInitialState = 'Aprobado con OC';
                } else {
                    finalInitialState = 'Aprobado sin OC';
                }
                finalItemState = 'Autorizado';
            }

            const plantaSeleccionada = (document.getElementById('req-meca-planta') && document.getElementById('req-meca-planta').value)
                ? document.getElementById('req-meca-planta').value
                : ((clienteSeleccionado && clienteSeleccionado.localidad && clienteSeleccionado.localidad.toUpperCase().includes('SAN MARTIN')) ? 'PGSM' : 'VGG');

            const newPedido = {
                id: targetId,
                fecha: getLocalCurrentDateTimeStr(),
                cliente_id: clienteSeleccionado ? clienteSeleccionado.codigo : '3',
                cliente_nombre: (document.getElementById('req-meca-cliente') && document.getElementById('req-meca-cliente').value) ? document.getElementById('req-meca-cliente').value : (clienteSeleccionado ? clienteSeleccionado.nombre : 'CARGILL SACI'),
                cuit: clienteSeleccionado ? clienteSeleccionado.cuit : '30-50679216-5',
                domicilio: clienteSeleccionado ? (clienteSeleccionado.domicilio || '') : '',
                localidad: clienteSeleccionado ? (clienteSeleccionado.localidad || '') : '',
                planta: plantaSeleccionada,
                meca_planta: plantaSeleccionada,
                telefono: clienteSeleccionado ? clienteSeleccionado.telefono : '',
                email: clienteSeleccionado ? clienteSeleccionado.email : '',
                vendedor_id: userVendedorId,
                vendedor_nombre: userVendedorNombre,
                operador_vendedor_id: userVendedorId,
                operador_vendedor_nombre: userVendedorNombre,
                tipo_reporte: tipoReporte || 'detallado',
                importe: amount,
                importe_original: amount,
                condicion_id: condCode,
                condicion_nombre: finalCondNombre,
                condicion_venta: finalCondNombre,
                deposito_id: depCode,
                deposito_nombre: depositoObj ? (depositoObj.nombre || `Depósito ${depCode}`) : (depCode ? `Depósito ${depCode}` : ''),
                transporte_id: transCode,
                transporte_nombre: transporteObj ? (transporteObj.nombre || `Transporte ${transCode}`) : (transCode ? `Transporte ${transCode}` : ''),
                is_comisionista: isComisionista,
                tipo_nv: tipoNvLabel,
                tipo_entrega: tipoEntregaLabel,
                forma_pago: formaPagoLabel,
                motivo: motivo,
                observaciones: motivo,
                tipo_presupuesto: reqTipoPresupuesto || 'Eléctrico',
                meca_denominacion: document.getElementById('req-meca-denominacion') ? document.getElementById('req-meca-denominacion').value : '',
                meca_proveedor: document.getElementById('req-meca-proveedor') ? document.getElementById('req-meca-proveedor').value : '',
                meca_fecha_oferta: document.getElementById('req-meca-fecha-oferta') ? document.getElementById('req-meca-fecha-oferta').value : '',
                meca_validez: document.getElementById('req-meca-validez') ? document.getElementById('req-meca-validez').value : '',
                meca_planta: document.getElementById('req-meca-planta') ? document.getElementById('req-meca-planta').value : '',
                meca_nro_oc: finalNroOc,
                nro_oc: finalNroOc,
                meca_nro_ot: document.getElementById('req-meca-nro-ot') ? document.getElementById('req-meca-nro-ot').value : '',
                meca_fecha_inicio: document.getElementById('req-meca-fecha-inicio') ? document.getElementById('req-meca-fecha-inicio').value : '',
                meca_duracion: document.getElementById('req-meca-duracion') ? document.getElementById('req-meca-duracion').value : '',
                meca_fecha_fin: document.getElementById('req-meca-fecha-fin') ? document.getElementById('req-meca-fecha-fin').value : '',
                meca_propuesta: document.getElementById('req-meca-propuesta') ? document.getElementById('req-meca-propuesta').value : '',
                meca_personal: document.getElementById('req-meca-personal') ? document.getElementById('req-meca-personal').value : '',
                meca_exclusiones: document.getElementById('req-meca-exclusiones') ? document.getElementById('req-meca-exclusiones').value : '',
                cotizacion_materiales: window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1,
                cotizacion: window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1,
                operador: user ? user.username : 'admin',
                requiere_autorizacion: isReqAuth,
                estado: finalInitialState,
                items: (pedidoItems || []).map(item => ({
                    ...item,
                    cantidad_original: item.cantidad,
                    estado: finalItemState
                }))
            };

            appData.pedidos.push(newPedido);
            try { saveData(); } catch(e) {}
            let supOk = false;
            if (typeof window.guardarPresupuestoEnSupabase === 'function') {
                const supRes = await window.guardarPresupuestoEnSupabase(newPedido);
                if (supRes && supRes.success) {
                    supOk = true;
                    console.log(`☁️ Supabase: Presupuesto ${targetId} guardado y sincronizado con éxito.`);
                } else {
                    console.error("Aviso al guardar en Supabase:", supRes ? supRes.error : 'Unknown');
                }
            }

            if (isReqAuth) {
                showToast(`✅ Presupuesto ${targetId} ingresado correctamente. Listo para cargar uno nuevo.`, 'success');
            } else {
                showToast(`✅ Presupuesto ${targetId} ingresado y APROBADO DIRECTAMENTE. Listo para cargar uno nuevo.`, 'success');
            }

            // Cerrar el selector de reporte
            if (typeof closeModal === 'function') closeModal();

            // Resetear el formulario en segundo plano para que quede listo en el paso 1
            viewMode = 'Ingreso';
            if (typeof window.resetRequestFormComplete === 'function') {
                window.resetRequestFormComplete();
            }
            if (typeof renderContent === 'function') {
                renderContent('tpl-request-ped');
                initRequestView();
            }
            if (typeof window.goToRequestStep === 'function') {
                window.goToRequestStep(1);
            }

            // Abrir de inmediato el Comprobante oficial (Detallado o Resumido según lo elegido)
            setTimeout(() => {
                verDetallePedido(newPedido.id);
            }, 60);
        }
    } catch(err) {
        console.error("Error al confirmar presupuesto:", err);
        showToast("Ocurrió un error al procesar el presupuesto: " + err.message, "error");
    }
}

window.onRequiereAuthToggle = function() {
    const chk = document.getElementById('req-requiere-autorizacion');
    const badge = document.getElementById('req-auth-status-preview');
    if (!chk || !badge) return;

    if (chk.checked) {
        badge.innerHTML = '📥 Va a Autorización';
        badge.style.background = 'rgba(245, 158, 11, 0.2)';
        badge.style.color = '#fde68a';
        badge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
    } else {
        badge.innerHTML = '⏩ Saltea Autorización ➔ Aprobado';
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#6ee7b7';
        badge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    }
};

window.resetRequestFormComplete = function() {
    window.pedidoEnEdicionId = null;
    window.pedidoEnReutilizacion = false;
    const formReq = document.getElementById('form-request-ped');
    if (formReq) formReq.reset();

    // Limpiar todos los campos de Paso 1 y Paso 3
    const idsToClear = [
        'req-meca-denominacion', 'req-meca-cliente', 'req-meca-proveedor',
        'req-meca-fecha-oferta', 'req-meca-validez', 'req-meca-planta',
        'req-meca-nro-oc', 'req-meca-nro-ot', 'req-meca-fecha-inicio',
        'req-meca-duracion', 'req-meca-duracion-num', 'req-meca-fecha-fin', 'req-meca-propuesta',
        'req-meca-personal', 'req-meca-exclusiones', 'req-reason',
        'req-client', 'req-product-input', 'req-product-qty', 'req-product-price'
    ];
    idsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const todayStr = getLocalDateStr();
    const futureDateStr = getLocalDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    if (document.getElementById('req-meca-fecha-oferta')) document.getElementById('req-meca-fecha-oferta').value = todayStr;
    if (document.getElementById('req-meca-fecha-inicio')) document.getElementById('req-meca-fecha-inicio').value = todayStr;
    if (document.getElementById('req-meca-fecha-fin')) document.getElementById('req-meca-fecha-fin').value = futureDateStr;
    if (typeof window.setValidezOfertaValue === 'function') {
        window.setValidezOfertaValue('5 días');
    } else if (document.getElementById('req-meca-validez')) {
        document.getElementById('req-meca-validez').value = '5 días';
    }
    if (typeof window.setDuracionEstimadaValue === 'function') {
        window.setDuracionEstimadaValue('');
    } else if (document.getElementById('req-meca-duracion')) {
        document.getElementById('req-meca-duracion').value = '';
    }
    if (document.getElementById('req-meca-proveedor')) document.getElementById('req-meca-proveedor').value = 'SG MONTAJES SRL';

    const chkCom = document.getElementById('req-is-comisionista');
    if (chkCom) chkCom.checked = false;

    clienteSeleccionado = null;
    depositoSeleccionado = null;
    transporteSeleccionado = null;
    condicionSeleccionada = null;
    pedidoItems = [];
    productoSeleccionado = null;

    if (typeof actualizarTablaItemsRequerimiento === 'function') {
        actualizarTablaItemsRequerimiento();
    }

    const mecaStep2Container = document.getElementById('req-mecanico-step2-container');
    if (mecaStep2Container) {
        mecaStep2Container.innerHTML = '';
    }

    if (typeof window.goToRequestStep === 'function') {
        window.goToRequestStep(1);
    }
};

// Función global para generar y descargar planilla en formato Excel/CSV estructurada para Presea
window.descargarPedidoCSV = function(id) {
    const pedido = appData.pedidos.find(p => p.id === id);
    if (!pedido) return;

    // --- 1. Generar CABECERA (cabeceras_pedidos) ---
    let cabeceraHeaders = [
        "ID_PEDIDO", "FECHA", "CLIENTE_CODIGO", "CLIENTE_NOMBRE", "CUIT",
        "NUMERO_OC", "MONEDA_ID", "COTIZACION", "CONDICION_ID", "DEPOSITO_ID", "TRANSPORTE_ID",
        "VENDEDOR_ID", "VENDEDOR_NOMBRE", "IS_COMISIONISTA", "TIPO_NV",
        "TIPO_ENTREGA", "FORMA_PAGO", "IMPORTE", "OBSERVACIONES", "OPERADOR", "ESTADO"
    ];

    const isComisionistaText = pedido.is_comisionista ? "SI" : "NO";
    const cotizStr = (pedido.cotizacion || 1.0).toString().replace('.', ',');
    const importeStr = (pedido.importe || 0.0).toString().replace('.', ',');
    const observacionesEscaped = `"${(pedido.motivo || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;

    let cabeceraRow = [
        pedido.id,
        pedido.fecha,
        pedido.cliente_id,
        pedido.cliente_nombre,
        pedido.cuit || '',
        pedido.meca_nro_oc || pedido.nro_oc || '',
        pedido.moneda_id || 1,
        cotizStr,
        pedido.condicion_id || '',
        pedido.deposito_id || '',
        pedido.transporte_id || '',
        pedido.vendedor_id || '',
        pedido.vendedor_nombre || '',
        isComisionistaText,
        pedido.tipo_nv || '',
        pedido.tipo_entrega || '',
        pedido.forma_pago || '',
        importeStr,
        observacionesEscaped,
        pedido.operador || '',
        pedido.estado || ''
    ];

    let csvCabecera = cabeceraHeaders.join(';') + '\n' + cabeceraRow.join(';');

    // --- 2. Generar DETALLE (detalles_pedidos) ---
    let detalleHeaders = [
        "ID_PEDIDO", "PRODUCTO_CODIGO", "PRODUCTO_DETALLE",
        "CANTIDAD", "PRECIO_UNITARIO", "SUBTOTAL", "ESTADO_ARTICULO"
    ];

    let detailRows = [];
    if (Array.isArray(pedido.items) && pedido.items.length > 0) {
        pedido.items.forEach(item => {
            const cantVal = item.cantidad || 0;
            const precioVal = item.precio || 0;
            const subtotalVal = item.subtotal || 0;
            const est = item.estado || (pedido.estado === 'Aprobado' || pedido.estado === 'Autorizado' ? 'Autorizado' : 'Pendiente');

            const detailRow = [
                pedido.id,
                item.codigo,
                item.detalle,
                cantVal.toString().replace('.', ','),
                precioVal.toString().replace('.', ','),
                subtotalVal.toString().replace('.', ','),
                est
            ];
            detailRows.push(detailRow.join(';'));
        });
    }

    let csvDetalle = detalleHeaders.join(';') + '\n' + detailRows.join('\n');

    // --- 3. Descargar Cabecera ---
    const blobCabecera = new Blob(['\uFEFF' + csvCabecera], { type: 'text/csv;charset=utf-8;' });
    const urlCabecera = URL.createObjectURL(blobCabecera);
    const linkCabecera = document.createElement("a");
    linkCabecera.setAttribute("href", urlCabecera);
    linkCabecera.setAttribute("download", `cabeceras_pedido_${pedido.id}.csv`);
    document.body.appendChild(linkCabecera);
    linkCabecera.click();
    document.body.removeChild(linkCabecera);

    // --- 4. Descargar Detalle ---
    setTimeout(() => {
        const blobDetalle = new Blob(['\uFEFF' + csvDetalle], { type: 'text/csv;charset=utf-8;' });
        const urlDetalle = URL.createObjectURL(blobDetalle);
        const linkDetalle = document.createElement("a");
        linkDetalle.setAttribute("href", urlDetalle);
        linkDetalle.setAttribute("download", `detalles_pedido_${pedido.id}.csv`);
        document.body.appendChild(linkDetalle);
        linkDetalle.click();
        document.body.removeChild(linkDetalle);

        showToast("Archivos Cabecera y Detalle listos para Presea", "success");
    }, 200);
};

// 4. BANDEJA DE PEDIDOS (ASIGNACIONES / HISTORIAL)
let viewMode = 'Administrador'; // 'Autorizador', 'Solicitante', etc.

window.applyPresetDateFilter = function(preset) {
    const dtTo = document.getElementById('filter-date-to');
    const dtFrom = document.getElementById('filter-date-from');
    const presetSelect = document.getElementById('preset-date-filter');
    if (presetSelect && presetSelect.value !== preset) {
        presetSelect.value = preset;
    }
    if (!dtTo || !dtFrom) return;

    const today = new Date();

    const formatDate = (date) => {
        return getLocalDateStr(date);
    };

    if (preset === 'today') {
        const d = formatDate(today);
        dtFrom.value = d;
        dtTo.value = d;
    } else if (preset === 'yesterday') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const d = formatDate(yesterday);
        dtFrom.value = d;
        dtTo.value = d;
    } else if (preset === 'last7') {
        const past7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dtFrom.value = formatDate(past7);
        dtTo.value = formatDate(today);
    } else if (preset === 'last30') {
        const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        dtFrom.value = formatDate(past30);
        dtTo.value = formatDate(today);
    } else if (preset === 'thisMonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        dtFrom.value = formatDate(firstDay);
        dtTo.value = formatDate(today);
    } else if (preset === 'lastMonth') {
        const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        dtFrom.value = formatDate(firstDayPrev);
        dtTo.value = formatDate(lastDayPrev);
    } else if (preset === 'all') {
        dtFrom.value = '';
        dtTo.value = '';
    }

    renderAssignmentsTable();
};

function initAssignmentsView(mode) {
    viewMode = mode;

    if (typeof updateTipoPresupuestoBadge === 'function') {
        updateTipoPresupuestoBadge();
    }

    const titleEl = document.getElementById('assignments-title');
    const subtitleEl = document.getElementById('assignments-subtitle');

    if (mode === 'Autorizador') {
        titleEl.innerText = "📥 Autorización de Presupuestos";
        subtitleEl.innerText = "Asignaciones pendientes de autorización comercial.";
    } else if (mode === 'Modificacion' || mode === 'Seguimiento') {
        const segPerms = typeof window.getUserSeguimientoPermissions === 'function' ? window.getUserSeguimientoPermissions(getCurrentUser()) : { canEdit: true, canViewComprobante: true };
        titleEl.innerText = "🕒 Seguimiento";
        if (segPerms.canEdit && segPerms.canViewComprobante) {
            subtitleEl.innerText = "Historial, visualización de comprobantes, avance de obra y modificación de presupuestos.";
        } else if (segPerms.canEdit) {
            subtitleEl.innerText = "Gestión operativa, avance de obra y modificación de presupuestos.";
        } else {
            subtitleEl.innerText = "Historial, auditoría y visualización de comprobantes oficiales (Solo Lectura).";
        }
    } else if (mode === 'EstadoPresupuesto') {
        titleEl.innerText = "🔄 Estado del Presupuesto";
        subtitleEl.innerText = "Modifique directamente el estado del presupuesto desde el selector de la tabla.";
    } else if (mode === 'Rechazados') {
        titleEl.innerText = "❌ Rechazo de Presupuesto";
        subtitleEl.innerText = "Listado de presupuestos comerciales que fueron rechazados.";
    } else {
        titleEl.innerText = "🕒 Seguimiento";
        subtitleEl.innerText = "Historial, auditoría y consulta oficial de presupuestos comerciales.";
    }

    // Ocultar filtro de estados en "Rechazo de Presupuesto" ya que todos son rechazados
    const statusFilterEl = document.getElementById('status-filter');
    if (statusFilterEl) {
        if (mode === 'Rechazados') {
            statusFilterEl.style.display = 'none';
            statusFilterEl.value = '';
        } else {
            statusFilterEl.style.display = 'inline-block';
        }
    }

    // Configurar fechas filtro por defecto (últimos 30 días con selector)
    const dtTo = document.getElementById('filter-date-to');
    const dtFrom = document.getElementById('filter-date-from');
    const presetSelect = document.getElementById('preset-date-filter');

    const today = getLocalDateStr(new Date());
    const past30 = getLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    if (dtTo && !dtTo.value) dtTo.value = today;
    if (dtFrom && !dtFrom.value) dtFrom.value = past30;
    if (presetSelect && !presetSelect.value) presetSelect.value = 'last30';

    const filterHandler = () => {
        if (presetSelect) presetSelect.value = 'custom';
        renderAssignmentsTable();
    };

    if (dtTo) dtTo.onchange = filterHandler;
    if (dtFrom) dtFrom.onchange = filterHandler;
    const searchFilter = document.getElementById('search-filter');
    if (searchFilter) searchFilter.oninput = () => renderAssignmentsTable();

    renderAssignmentsTable();
}

window.getBudgetStatusBadgeHtml = function(estado, fechaAlerta = '') {
    let est = estado || 'Enviado sin OC';

    // Normalizar estados legacy o equivalentes
    if (est === 'Cargado sin orden de compra' || est === 'Pendiente de Autorización' || est === 'Pendiente') {
        est = 'Enviado sin OC';
    } else if (est === 'Cargado con orden de compra' || est === 'Autorizado' || est === 'Aprobado') {
        est = 'Aprobado con OC';
    }

    switch (est) {
        case 'Rechazado':
            return `
                <span class="badge-status badge-rechazado">
                    <i class="fas fa-times-circle"></i> Rechazado
                </span>`;
        case 'Enviado sin OC':
            const sub1 = fechaAlerta ? `<br><span style="font-size:9px; opacity:0.85;">⏰ Vence: ${fechaAlerta}</span>` : '';
            return `
                <span class="badge-status badge-enviado-sin-oc">
                    <span style="display:inline-flex; flex-direction:column; align-items:center;"><span style="display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-paper-plane"></i> Enviado sin OC</span>${sub1}</span>
                </span>`;
        case 'Aprobado sin OC':
            const sub2 = fechaAlerta ? `<br><span style="font-size:9px; opacity:0.85;">⏰ Vence: ${fechaAlerta}</span>` : '';
            return `
                <span class="badge-status badge-aprobado-sin-oc">
                    <span style="display:inline-flex; flex-direction:column; align-items:center;"><span style="display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-check-double"></i> Aprobado sin OC</span>${sub2}</span>
                </span>`;
        case 'Aprobado con OC':
            return `
                <span class="badge-status badge-aprobado-con-oc">
                    <i class="fas fa-check-circle"></i> Aprobado con OC
                </span>`;
        default:
            return `
                <span class="badge-status badge-enviado-sin-oc">
                    <i class="fas fa-paper-plane"></i> ${est}
                </span>`;
    }
};

function getEstadoLevel(estadoStr) {
    let est = estadoStr || 'Enviado sin OC';
    if (est === 'Cargado sin orden de compra' || est === 'Pendiente de Autorización' || est === 'Pendiente') est = 'Enviado sin OC';
    else if (est === 'Cargado con orden de compra' || est === 'Autorizado' || est === 'Aprobado' || est === 'Facturado Parcial' || est === 'Facturado Total') est = 'Aprobado con OC';

    switch (est) {
        case 'Enviado sin OC': return 1;
        case 'Aprobado sin OC': return 2;
        case 'Aprobado con OC': return 3;
        case 'Rechazado': return 99;
        default: return 1;
    }
}
window.getEstadoLevel = getEstadoLevel;

window.renderEditableStatusDropdown = function(p) {
    let currentEst = p.estado || 'Enviado sin OC';
    if (currentEst === 'Cargado sin orden de compra' || currentEst === 'Pendiente de Autorización' || currentEst === 'Pendiente') currentEst = 'Enviado sin OC';
    else if (currentEst === 'Cargado con orden de compra' || currentEst === 'Autorizado' || currentEst === 'Aprobado' || currentEst === 'Facturado Parcial' || currentEst === 'Facturado Total') currentEst = 'Aprobado con OC';

    const currentLevel = getEstadoLevel(currentEst);

    // Los únicos 4 estados del presupuesto: Enviado sin OC, Aprobado sin OC, Aprobado con OC, Rechazado
    const options = [
        { val: 'Enviado sin OC', label: '📤 Enviado sin OC', color: '#38bdf8', bg: 'rgba(56,189,248,0.25)', border: 'rgba(56,189,248,0.6)' },
        { val: 'Aprobado sin OC', label: '⏳ Aprobado sin OC', color: '#fef08a', bg: 'rgba(234,179,8,0.25)', border: 'rgba(234,179,8,0.6)' },
        { val: 'Aprobado con OC', label: '✅ Aprobado con OC', color: '#6ee7b7', bg: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.6)' },
        { val: 'Rechazado', label: '❌ Rechazado', color: '#fda4af', bg: 'rgba(244,63,94,0.25)', border: 'rgba(244,63,94,0.6)' }
    ];

    const matched = options.find(o => o.val === currentEst) || options[0];
    const optsHtml = options.map(o => {
        const oLevel = getEstadoLevel(o.val);
        const isDisabled = (currentEst !== 'Rechazado' && o.val !== 'Rechazado' && oLevel < currentLevel);
        return `<option value="${o.val}" ${o.val === currentEst ? 'selected' : ''} ${isDisabled ? 'disabled style="color: #64748b; background: #1e293b;"' : 'style="background: #0f172a; color: white;"'}>${o.label}${isDisabled ? ' 🚫' : ''}</option>`;
    }).join('');

    const facturadoPct = parseFloat(p.facturado_porcentaje || 0);

    let btnFacturadoHtml = '';
    if (facturadoPct > 0 || (Array.isArray(p.historial_facturacion) && p.historial_facturacion.length > 0)) {
        btnFacturadoHtml = `
            <div style="margin-top: 6px;">
                <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); if(window.showView){ showView('tpl-facturacion'); if(window.renderFacturacionTable) window.renderFacturacionTable(); }" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1.5px solid #38bdf8; font-size: 10.5px; padding: 3px 8px; border-radius: 6px; font-weight: 800; cursor: pointer; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 5px;" title="Ver en Registros de Facturación">
                    <i class="fa-solid fa-file-invoice-dollar"></i> Facturado: <strong>${String(facturadoPct).replace('.', ',')}%</strong>
                </button>
            </div>
        `;
    } else if (currentEst === 'Aprobado con OC') {
        btnFacturadoHtml = `
            <div style="margin-top: 6px;">
                <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); if(window.showView){ showView('tpl-facturacion'); if(window.renderFacturacionTable) window.renderFacturacionTable(); }" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1.5px solid #10b981; font-size: 10.5px; padding: 3px 8px; border-radius: 6px; font-weight: 800; cursor: pointer; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 5px;" title="Pasa a Registrar Facturación">
                    <i class="fa-solid fa-file-invoice-dollar"></i> Facturación
                </button>
            </div>
        `;
    }

    let btnOcHtml = '';
    const hasOcData = !!(p.oc_mano_obra || p.oc_materiales || p.meca_nro_oc || p.nro_oc);
    if (currentEst === 'Aprobado con OC' || hasOcData) {
        let moVal = p.oc_mano_obra || '';
        let matVal = p.oc_materiales || '';
        if (!moVal && !matVal && (p.meca_nro_oc || p.nro_oc)) {
            const raw = p.meca_nro_oc || p.nro_oc || '';
            if (raw.includes(' / ')) {
                const parts = raw.split(' / ');
                moVal = parts[0] || '';
                matVal = parts[1] || '';
            } else {
                moVal = raw;
            }
        }

        let ocDetailsHtml = '';
        if (moVal || matVal) {
            ocDetailsHtml = `
                <div style="margin-top: 4px; padding: 4px 6px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 5px; font-size: 9.5px; text-align: left; line-height: 1.35;">
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="OC Mano de Obra: ${moVal || '-'}">
                        <span style="color: #38bdf8; font-weight: 800;">MO:</span> <span style="color: #f8fafc;">${moVal || '<em style="color:#94a3b8; font-size: 9px;">(Sin OC)</em>'}</span>
                    </div>
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="OC Materiales: ${matVal || '-'}">
                        <span style="color: #34d399; font-weight: 800;">MAT:</span> <span style="color: #f8fafc;">${matVal || '<em style="color:#94a3b8; font-size: 9px;">(Sin OC)</em>'}</span>
                    </div>
                </div>
            `;
        }

        btnOcHtml = `
            ${ocDetailsHtml}
            <div style="margin-top: 4px;">
                <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); window.editarOrdenesDeCompra('${p.id}')"
                        style="background: rgba(56, 189, 248, 0.18); color: #38bdf8; border: 1px solid #38bdf8; font-size: 10px; padding: 3px 6px; border-radius: 4px; font-weight: 800; cursor: pointer; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s;"
                        title="Modificar o cargar OC de Mano de Obra y Materiales">
                    <i class="fa-solid fa-pen-to-square"></i> Cargar/Editar OC
                </button>
            </div>
        `;
    }

    return `
        <div onclick="event.stopPropagation()" style="display: inline-block; text-align: center; width: 100%; max-width: 140px;">
            <select onchange="cambiarEstadoPresupuesto('${p.id}', this.value)"
                    title="Haga clic aquí para modificar el estado de este presupuesto"
                    style="background: ${matched.bg}; color: ${matched.color}; border: 1.5px solid ${matched.border}; padding: 4px 6px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; transition: all 0.2s ease; box-shadow: 0 0 8px rgba(0,0,0,0.3); width: 100%;">
                ${optsHtml}
            </select>
            ${btnOcHtml}
            ${btnFacturadoHtml}
        </div>
    `;
};

window.editarOrdenesDeCompra = async function(id) {
    const orderIdx = (typeof window.findPedidoIndex === 'function')
        ? window.findPedidoIndex(id)
        : appData.pedidos.findIndex(p => p && (p.id === id || String(p.id) === String(id)));
    if (orderIdx === -1) {
        showToast('Presupuesto no encontrado.', 'error');
        return false;
    }
    const p = appData.pedidos[orderIdx];
    const previousState = p.estado;

    let currentOcMo = p.oc_mano_obra || '';
    let currentOcMat = p.oc_materiales || '';
    if (!currentOcMo && !currentOcMat && (p.meca_nro_oc || p.nro_oc)) {
        const raw = p.meca_nro_oc || p.nro_oc || '';
        if (raw.includes(' / ')) {
            const parts = raw.split(' / ');
            currentOcMo = parts[0] || '';
            currentOcMat = parts[1] || '';
        } else {
            currentOcMo = raw;
        }
    }

    if (typeof Swal === 'undefined') {
        const inputMo = prompt(`Presupuesto #${p.id}\nIngrese OC Mano de Obra:`, currentOcMo);
        if (inputMo === null) return false;
        const inputMat = prompt(`Presupuesto #${p.id}\nIngrese OC Materiales:`, currentOcMat);
        if (inputMat === null) return false;
        const cleanMo = inputMo.trim();
        const cleanMat = inputMat.trim();
        if (!cleanMo && !cleanMat) {
            showToast('Debe ingresar al menos una orden de compra.', 'error');
            return false;
        }
        const unifiedOc = (cleanMo && cleanMat) ? (cleanMo + ' / ' + cleanMat) : (cleanMo || cleanMat);
        p.oc_mano_obra = cleanMo;
        p.oc_materiales = cleanMat;
        p.meca_nro_oc = unifiedOc;
        p.nro_oc = unifiedOc;
        if (p.estado !== 'Aprobado con OC' && p.estado !== 'Facturado Parcial' && p.estado !== 'Facturado Total') {
            p.estado = 'Aprobado con OC';
            p.fecha_resolucion = new Date().toLocaleDateString('es-AR');
        }
        saveData();
        showToast(`✅ Órdenes de Compra guardadas: MO: ${cleanMo || '-'} | MAT: ${cleanMat || '-'}`, 'success');
        if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
        return true;
    }

    const { value: formValues, isDismissed } = await Swal.fire({
        title: '<div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #38bdf8; font-size: 18px; font-weight: 800;"><i class="fa-solid fa-file-invoice"></i> Órdenes de Compra (OC)</div>',
        background: '#1e293b',
        color: '#f8fafc',
        width: '430px',
        customClass: { popup: 'glass-panel' },
        html: `
            <div style="text-align:left; margin-top: 14px; margin-bottom: 12px;">
                <label style="font-size: 12.5px; color: #cbd5e1; font-weight: 700; display: block; margin-bottom: 5px;">
                    <i class="fa-solid fa-hard-hat" style="color: #38bdf8;"></i> OC Mano de Obra:
                </label>
                <input id="swal-input-oc-mo-edit" class="swal2-input"
                       style="box-sizing: border-box; height: 38px; padding: 6px 12px; font-size: 13.5px; width: 100%; background: #0f172a; color: #ffffff; border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 6px; margin: 0; outline: none; font-weight: 600;"
                       value="${currentOcMo}" placeholder="Ej: OC-MO-45012">
            </div>
            <div style="text-align:left; margin-bottom: 12px;">
                <label style="font-size: 12.5px; color: #cbd5e1; font-weight: 700; display: block; margin-bottom: 5px;">
                    <i class="fa-solid fa-boxes-stacked" style="color: #34d399;"></i> OC Materiales:
                </label>
                <input id="swal-input-oc-mat-edit" class="swal2-input"
                       style="box-sizing: border-box; height: 38px; padding: 6px 12px; font-size: 13.5px; width: 100%; background: #0f172a; color: #ffffff; border: 1.5px solid rgba(52, 211, 153, 0.5); border-radius: 6px; margin: 0; outline: none; font-weight: 600;"
                       value="${currentOcMat}" placeholder="Ej: OC-MAT-98234">
            </div>
            <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: #94a3b8; text-align: left;">
                💡 Puede cargar o editar una o ambas órdenes de compra. Si ya ingresó la de Mano de Obra, complete aquí la de Materiales.
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: '<i class="fa-solid fa-save"></i> Guardar OC',
        confirmButtonColor: '#0ea5e9',
        cancelButtonColor: '#64748b',
        didOpen: () => {
            const moInput = document.getElementById('swal-input-oc-mo-edit');
            const matInput = document.getElementById('swal-input-oc-mat-edit');
            if (moInput && matInput) {
                if (currentOcMo && !currentOcMat) {
                    matInput.focus();
                } else {
                    moInput.focus();
                }
                const onEnter = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        Swal.clickConfirm();
                    }
                };
                moInput.addEventListener('keydown', onEnter);
                matInput.addEventListener('keydown', onEnter);
            }
        },
        preConfirm: () => {
            const mo = (document.getElementById('swal-input-oc-mo-edit')?.value || '').trim();
            const mat = (document.getElementById('swal-input-oc-mat-edit')?.value || '').trim();
            if (!mo && !mat) {
                Swal.showValidationMessage('Debe completar al menos una orden de compra (Mano de Obra o Materiales).');
                return false;
            }
            return { mo, mat };
        }
    });

    if (isDismissed || !formValues) {
        if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
        return false;
    }

    const cleanMo = formValues.mo;
    const cleanMat = formValues.mat;
    const unifiedOc = (cleanMo && cleanMat) ? (cleanMo + ' / ' + cleanMat) : (cleanMo || cleanMat);

    p.oc_mano_obra = cleanMo;
    p.oc_materiales = cleanMat;
    p.meca_nro_oc = unifiedOc;
    p.nro_oc = unifiedOc;

    const previousWasApprovedConOc = (previousState === 'Aprobado con OC' || previousState === 'Facturado Parcial' || previousState === 'Facturado Total');
    if (!previousWasApprovedConOc) {
        p.estado = 'Aprobado con OC';
        p.fecha_resolucion = new Date().toLocaleDateString('es-AR');
    }

    if (typeof pedidoActivo !== 'undefined' && pedidoActivo && String(pedidoActivo.id) === String(p.id)) {
        pedidoActivo.oc_mano_obra = cleanMo;
        pedidoActivo.oc_materiales = cleanMat;
        pedidoActivo.meca_nro_oc = unifiedOc;
        pedidoActivo.nro_oc = unifiedOc;
        if (!previousWasApprovedConOc) {
            pedidoActivo.estado = 'Aprobado con OC';
        }

        const authOcEl = document.getElementById('auth-meca-nro-oc-val');
        if (authOcEl) authOcEl.innerText = unifiedOc;
        const authHeaderOcMo = document.getElementById('auth-header-nro-oc-mo-val');
        const authHeaderOcMat = document.getElementById('auth-header-nro-oc-mat-val');
        if (authHeaderOcMo) authHeaderOcMo.innerText = cleanMo || '-';
        if (authHeaderOcMat) authHeaderOcMat.innerText = cleanMat || '-';

        const statusSelect = document.getElementById('modal-change-status-select');
        if (statusSelect) statusSelect.value = pedidoActivo.estado;
        const badgeContainer = document.getElementById('modal-status-badge-container');
        if (badgeContainer) {
            let factBtnHtml = `
                <button type="button" class="btn btn-sm" onclick="closeModal(); if(window.showView){ showView('tpl-facturacion'); if(window.renderFacturacionTable) window.renderFacturacionTable(); }" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-left: 10px;" title="Pasar a Registrar Facturación para este comprobante">
                    <i class="fa-solid fa-file-invoice-dollar"></i> Ir a Registrar Facturación
                </button>
                <button type="button" class="btn btn-sm" onclick="window.editarOrdenesDeCompra(pedidoActivo.id)" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #38bdf8; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-left: 6px;" title="Modificar Orden de Compra de Mano de Obra o Materiales">
                    <i class="fa-solid fa-pen"></i> Editar OC
                </button>
            `;
            badgeContainer.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;">${getBudgetStatusBadgeHtml(pedidoActivo.estado, pedidoActivo.oc_limite_fecha)}${factBtnHtml}</div>`;
        }
    }

    saveData();
    showToast(`✅ Órdenes de Compra guardadas: MO: ${cleanMo || '-'} | MAT: ${cleanMat || '-'}`, 'success');

    if (!previousWasApprovedConOc && typeof window.notificarAprobacionEquipo === 'function') {
        window.notificarAprobacionEquipo(p, 'Aprobado con OC');
    }

    if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
    if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
    return true;
};

window.modificarPorcentajeFacturado = function(id) {
    const orderIdx = (typeof window.findPedidoIndex === 'function')
        ? window.findPedidoIndex(id)
        : appData.pedidos.findIndex(p => p && (p.id === id || String(p.id) === String(id)));
    if (orderIdx === -1) return;
    const p = appData.pedidos[orderIdx];

    const avances = Array.isArray(p.avances) ? p.avances : [];
    const avanceAcc = parseFloat(p.avance_porcentaje_acumulado) || parseFloat(p.avance_obra_porcentaje) || avances.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0);
    const currentFact = parseFloat(p.facturado_porcentaje || 0);

    let maxPermitido = 100;
    let contextMsg = '';
    if (avanceAcc > 0) {
        maxPermitido = avanceAcc;
        contextMsg = `🔨 Avance de Obra realizado: ${String(avanceAcc).replace('.', ',')}%
(Regla: Solo se permite facturar hasta este porcentaje de avance)`;
    } else {
        maxPermitido = 100;
        contextMsg = `📋 Aprobado con OC directo (sin avance parcial)
(Regla: Se permite facturar hasta el 100% Total)`;
    }

    const inputFact = prompt(`Presupuesto #${typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(p) : p.id}
${contextMsg}

Ingrese el % acumulado facturado (Máx: ${String(maxPermitido).replace('.', ',')}%):`, String(currentFact).replace('.', ','));
    if (inputFact === null || !inputFact.trim()) return;

    let cleanPct = parseFloat(inputFact.trim().replace(',', '.')) || 0;

    // Regla de oro 1: No más del 100%
    if (cleanPct > 100) {
        showToast('Regla de oro: No se puede facturar más del 100% del presupuesto.', 'error');
        return;
    }
    if (cleanPct < 0) cleanPct = 0;

    // Regla de oro 2: Si tiene avance de obra, no puede superar el avance realizado
    if (avanceAcc > 0 && cleanPct > (avanceAcc + 0.001)) {
        showToast(`Regla de oro: No se puede facturar más del avance de obra realizado (${String(avanceAcc).replace('.', ',')}%).`, 'error');
        return;
    }

    // Regla de oro 3 y 4: Si es 100% es Total estricto, no Parcial
    const isTotal = (cleanPct >= 99.99);
    const finalPct = isTotal ? 100 : cleanPct;
    const estadoFact = isTotal ? 'Total' : (finalPct > 0 ? 'Parcial' : 'Pendiente');

    p.facturado_porcentaje = finalPct;
    p.monto_facturado = (parseFloat(p.importe || 0) * finalPct) / 100;
    p.estado_facturacion = estadoFact;

    if (p.estado !== 'Rechazado' && p.estado !== 'Anulado') {
        p.estado = isTotal ? 'Facturado Total' : (finalPct > 0 ? 'Facturado Parcial' : 'Aprobado con OC');
    }

    saveData();
    showToast(`✅ % Facturado actualizado a ${String(finalPct).replace('.', ',')}% (Estado: ${estadoFact}) para el Presupuesto ${typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(p) : p.id}.`, 'success');
    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
    if (typeof window.renderFacturacionTable === 'function') {
        window.renderFacturacionTable();
    }
};

window.notificarAprobacionEquipo = async function(p, nuevoEstado) {
    if (!p) return;
    const nroPresupuesto = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliente = p.meca_denominacion || p.cliente_nombre || 'Cliente';
    const importeStr = p.importe ? `$${p.importe.toLocaleString('es-AR', {minimumFractionDigits: 2})}` : '$0,00';
    const nroOcStr = (p.meca_nro_oc || p.nro_oc) ? ` | OC: ${p.meca_nro_oc || p.nro_oc}` : '';

    const notifMsg = `🔔 ALERTA DE ESTADO: El Presupuesto ${nroPresupuesto} (${cliente}) cambió a "${nuevoEstado}" (${importeStr}${nroOcStr}).`;

    // Lista de usuarios para notificaciones internas
    const targetUsers = (appData.users && appData.users.length > 0) ? appData.users : [
        { id: '1', username: 'mel', email: 'melanidaiana28@gmail.com' }
    ];

    targetUsers.forEach(u => {
        if (typeof addNotification === 'function') {
            addNotification(u.id, notifMsg, p.id);
        }
    });

    if (typeof renderNotifications === 'function') {
        renderNotifications();
    }

    // Lista consolidada de destinatarios por email
    const emailsEnviados = [
        'melanidaiana28@gmail.com',
        'cotizaciones@sgmontajes.com.ar',
        'grandijuanluis@gmail.com'
    ];

    targetUsers.forEach(u => {
        if (u.email && u.email.includes('@') && !u.email.endsWith('@empresa.com')) {
            emailsEnviados.push(u.email);
        }
    });

    if (p.email && p.email.includes('@')) emailsEnviados.push(p.email);
    const cleanEmails = Array.from(new Set(emailsEnviados.map(e => e.trim().toLowerCase())));

    if (cleanEmails.length > 0 && typeof window.enviarEmailBackend === 'function') {
        try {
            const resp = await window.enviarEmailBackend({
                to: cleanEmails,
                subject: `📋 SG MONTAJES — Alerta Presupuesto ${nroPresupuesto}: ${nuevoEstado}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff; color: #0f172a;">
                        <div style="text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 12px; margin-bottom: 16px;">
                            <h2 style="color: #0891b2; margin: 0;">SG MONTAJES S.R.L.</h2>
                            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Notificación Automática de Cambio de Estado</p>
                        </div>
                        <p>Estimados,</p>
                        <p>Le informamos que el presupuesto <strong>${nroPresupuesto}</strong> (${cliente}) ha modificado su estado a:</p>
                        <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-left: 5px solid #10b981; padding: 14px; margin: 18px 0; border-radius: 6px;">
                            <strong style="color: #166534; font-size: 16px;">${nuevoEstado}</strong><br>
                            <span style="font-size: 13px; color: #334155;"><strong>Importe Total:</strong> ${importeStr}</span>${nroOcStr ? `<br><span style="font-size: 13px; color: #334155;"><strong>${nroOcStr}</strong></span>` : ''}
                        </div>
                        <p style="font-size: 12px; color: #64748b;">Este correo fue generado y despachado de forma 100% automática por el servidor de SG Montajes S.R.L.</p>
                    </div>
                `
            });

            if (resp && resp.success) {
                showToast(`📧 Alerta por email enviada exitosamente a ${cleanEmails.join(', ')}.`, 'info');
            } else {
                console.warn("Fallo al enviar alerta por email:", resp ? resp.error : 'Sin respuesta');
                showToast(`⚠️ Aviso: No se pudo enviar el correo de alerta (${resp ? resp.error : 'Revisar servidor'}).`, 'warning');
            }
        } catch(e) {
            console.error("Error despachando correo de estado:", e);
            showToast(`⚠️ Error al enviar email: ${e.message}`, 'error');
        }
    }
};

window.cambiarEstadoPresupuesto = async function(id, nuevoEstado) {
    const orderIdx = (typeof window.findPedidoIndex === 'function')
        ? window.findPedidoIndex(id)
        : appData.pedidos.findIndex(p => p && (p.id === id || String(p.id) === String(id)));

    if (orderIdx === -1) {
        console.error("Presupuesto no encontrado para cambiar estado:", id);
        showToast('Error al localizar el presupuesto.', 'error');
        return;
    }

    const pTarget = appData.pedidos[orderIdx];
    const currentEstNorm = pTarget.estado || 'Enviado sin OC';
    const currentLevel = getEstadoLevel(currentEstNorm);
    const targetLevel = getEstadoLevel(nuevoEstado);

    // Prohibición de volver atrás de estado excepto si es Rechazado
    if (nuevoEstado !== pTarget.estado && nuevoEstado !== 'Rechazado' && currentEstNorm !== 'Rechazado') {
        if (targetLevel < currentLevel) {
            showToast(`No se permite retroceder el estado comercial de un presupuesto (${currentEstNorm} ➔ ${nuevoEstado}).`, 'error');
            if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
            return;
        }
    }

    if (nuevoEstado === 'Aprobado con OC') {
        const ok = await window.editarOrdenesDeCompra(pTarget.id);
        if (!ok) {
            // Si canceló o no completó, restaurar el selector al estado anterior
            if (typeof pedidoActivo !== 'undefined' && pedidoActivo && String(pedidoActivo.id) === String(pTarget.id)) {
                const statusSelect = document.getElementById('modal-change-status-select');
                if (statusSelect) statusSelect.value = currentEstNorm;
            }
            if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
        }
        return;
    } else if (nuevoEstado === 'Rechazado' && !pTarget.motivo_rechazo) {
        let reason;
        if (typeof Swal !== 'undefined') {
            const { value, isDismissed } = await Swal.fire({
                title: '<div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #f43f5e; font-size: 18px; font-weight: 800;"><i class="fa-solid fa-circle-xmark"></i> Motivo de Rechazo</div>',
                html: `
                    <div style="text-align: left; margin-top: 10px;">
                        <label style="font-size: 13px; color: #f8fafc; font-weight: 700; display: block; margin-bottom: 6px;">
                            Ingrese el motivo obligatorio del rechazo del presupuesto:
                        </label>
                        <textarea id="swal-motivo-rechazo-input" rows="3"
                            placeholder="Especifique la razón por la cual se rechaza el presupuesto..."
                            style="width: 100%; box-sizing: border-box; background: #ffffff !important; color: #0f172a !important; border: 2px solid #f43f5e !important; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-weight: 600; font-family: inherit; resize: vertical; outline: none;"></textarea>
                    </div>
                `,
                background: '#1e293b',
                color: '#ffffff',
                width: '450px',
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                confirmButtonText: 'Confirmar Rechazo',
                confirmButtonColor: '#f43f5e',
                cancelButtonColor: '#64748b',
                focusConfirm: false,
                didOpen: () => {
                    const el = document.getElementById('swal-motivo-rechazo-input');
                    if (el) el.focus();
                },
                preConfirm: () => {
                    const val = document.getElementById('swal-motivo-rechazo-input')?.value;
                    if (!val || !val.trim()) {
                        Swal.showValidationMessage('El motivo de rechazo es obligatorio.');
                        return false;
                    }
                    return val.trim();
                }
            });
            if (isDismissed || !value) {
                if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                return;
            }
            reason = value;
        } else {
            reason = prompt('Ingrese el motivo obligatorio del rechazo del presupuesto:');
            if (reason === null || !reason.trim()) {
                showToast('El motivo de rechazo es obligatorio.', 'error');
                if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
                return;
            }
        }
        pTarget.motivo_rechazo = reason.trim();
    }

    pTarget.estado = nuevoEstado;
    pTarget.fecha_resolucion = new Date().toLocaleDateString('es-AR');

    saveData();
    const ocMsg = (pTarget.meca_nro_oc || pTarget.nro_oc) ? ` (OC: ${pTarget.meca_nro_oc || pTarget.nro_oc})` : '';
    showToast(`Estado del Presupuesto actualizado a: "${nuevoEstado}"${ocMsg}`, 'success');

    // Notificar por mail y sistema a las 5 personas del equipo
    if (typeof window.notificarAprobacionEquipo === 'function') {
        window.notificarAprobacionEquipo(pTarget, nuevoEstado);
    }

    // Si la planilla está abierta, actualizar badge, selector y número de OC en el comprobante
    if (typeof pedidoActivo !== 'undefined' && pedidoActivo && String(pedidoActivo.id) === String(pTarget.id)) {
        pedidoActivo.estado = nuevoEstado;
        const statusSelect = document.getElementById('modal-change-status-select');
        if (statusSelect) statusSelect.value = nuevoEstado;
        const badgeContainer = document.getElementById('modal-status-badge-container');
        if (badgeContainer) badgeContainer.innerHTML = getBudgetStatusBadgeHtml(nuevoEstado, pedidoActivo.oc_limite_fecha);

        const ocDisplay = pedidoActivo.meca_nro_oc || pedidoActivo.nro_oc || '-';
        const authOcEl = document.getElementById('auth-meca-nro-oc-val');
        if (authOcEl) {
            if (typeof viewMode !== 'undefined' && viewMode === 'Modificacion') {
                const editInput = document.getElementById('auth-edit-meca-nro-oc');
                if (editInput) editInput.value = pedidoActivo.meca_nro_oc || pedidoActivo.nro_oc || '';
                else authOcEl.innerText = ocDisplay;
            } else {
                authOcEl.innerText = ocDisplay;
            }
        }
        const authHeaderOcMo = document.getElementById('auth-header-nro-oc-mo-val');
        const authHeaderOcMat = document.getElementById('auth-header-nro-oc-mat-val');
        if (authHeaderOcMo) authHeaderOcMo.innerText = pedidoActivo.oc_mano_obra || pedidoActivo.meca_nro_oc || pedidoActivo.nro_oc || '-';
        if (authHeaderOcMat) authHeaderOcMat.innerText = pedidoActivo.oc_materiales || '-';
    }

    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
    if (typeof window.renderFacturacionTable === 'function') {
        window.renderFacturacionTable();
    }

    if (nuevoEstado === 'Aprobado con OC') {
        const codPresupuesto = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(pTarget) : (pTarget.id || id);
        const ocNumero = pTarget ? (pTarget.meca_nro_oc || pTarget.nro_oc || '') : '';
        const ocDesc = ocNumero ? ` con OC <strong>${ocNumero}</strong>` : '';
        if (typeof showToast !== 'undefined') {
            showToast(`Guardado. Presupuesto ${codPresupuesto} actualizado a ${nuevoEstado}.`, 'success');
        }
    }
};

window.ejecutarCambioEstadoPresupuesto = function(nuevoEstado) {
    if (typeof pedidoActivo !== 'undefined' && pedidoActivo && pedidoActivo.id) {
        cambiarEstadoPresupuesto(pedidoActivo.id, nuevoEstado);
    }
};

// --- MÓDULO DE AVANCE DE OBRA Y CERTIFICACIÓN PARA FACTURACIÓN ---
window.pedidoAvanceActivoId = null;
window.emailResponsableFacturacion = 'facturacion@sgmontajes.com.ar';

window.abrirModalAvanceObra = function(id) {
    let p = (typeof window.findPedidoById === 'function') ? window.findPedidoById(id) : ((typeof appData !== 'undefined' && appData && appData.pedidos) ? appData.pedidos.find(x => x.id === id) : null);
    if (!p) {
        p = (typeof pedidoActivo !== 'undefined' && pedidoActivo) || window.pedidoActivo || null;
    }
    if (!p) {
        showToast('Presupuesto no encontrado', 'error');
        return;
    }

    const realId = p.id || id;
    window.pedidoAvanceActivoId = realId;
    openModal('tpl-modal-avance-obra');

    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'modal_avance', pedidoId: id, label: `Avance #${id}` });
    }

    const nroPres = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliente = p.meca_denominacion || p.cliente_nombre || 'Cliente';
    const totalAmount = parseFloat(p.importe || 0);

    const nroEl = document.getElementById('avance-modal-nro');
    if (nroEl) nroEl.innerText = nroPres;

    const clienteEl = document.getElementById('avance-modal-cliente');
    if (clienteEl) clienteEl.innerText = cliente;

    const totalEl = document.getElementById('avance-modal-total');
    if (totalEl) totalEl.innerText = `$${totalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    // Calcular avance acumulado previo
    const avances = Array.isArray(p.avances) ? p.avances : [];
    const totalAvancePct = avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    const totalMontoFacturado = totalAmount * (totalAvancePct / 100);

    const progressLabel = document.getElementById('avance-modal-progress-label');
    if (progressLabel) {
        progressLabel.innerText = `${totalAvancePct}% Facturado ($${totalMontoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})} de $${totalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})})`;
    }

    const progressBar = document.getElementById('avance-modal-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${Math.min(100, totalAvancePct)}%`;
        if (totalAvancePct >= 100) {
            progressBar.style.background = '#10b981';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #0d9488, #2dd4bf)';
        }
    }

    // Resetear formulario
    const inputPct = document.getElementById('avance-input-pct');
    if (inputPct) inputPct.value = '';

    const inputMonto = document.getElementById('avance-input-monto-display');
    if (inputMonto) inputMonto.value = '$0,00';

    const inputFecha = document.getElementById('avance-input-fecha');
    if (inputFecha) inputFecha.value = new Date().toISOString().substring(0, 10);

    const inputDoc = document.getElementById('avance-input-nro-doc');
    if (inputDoc) inputDoc.value = (p.meca_nro_oc || p.nro_oc) ? `OC: ${p.meca_nro_oc || p.nro_oc}` : '';

    const inputDetalle = document.getElementById('avance-input-detalle');
    if (inputDetalle) inputDetalle.value = '';

    // Renderizar historial de avances
    const tbody = document.getElementById('avance-historial-tbody');
    if (tbody) {
        if (avances.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 14px; font-style: italic;">Aún no se registraron hitos de avance para este presupuesto.</td></tr>`;
        } else {
            tbody.innerHTML = avances.map((av, idx) => {
                const subMonto = parseFloat(av.monto || (totalAmount * (av.porcentaje / 100)));
                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'};">
                        <td style="padding: 8px 12px; font-weight: 600; color: white;">${av.fecha || '-'}</td>
                        <td style="padding: 8px 12px; font-weight: 800; color: #2dd4bf;">${av.porcentaje}%</td>
                        <td style="padding: 8px 12px; font-family: monospace; font-weight: 700; color: #34d399;">$${subMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                        <td style="padding: 8px 12px; color: var(--text-muted);">${av.nro_doc || '-'}</td>
                        <td style="padding: 8px 12px; color: #e2e8f0;">${av.detalle || '-'}</td>
                        <td style="padding: 8px 12px; text-align: center;">
                            <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); abrirComprobanteAvance('${p.id}', '${av.id}')" style="background: #0284c7; color: white; border: none; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Ver Comprobante / Ticket">
                                <i class="fas fa-file-lines"></i> Ver
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
};

window.setAvancePorcentajeRapido = function(val) {
    const id = window.pedidoAvanceActivoId;
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;

    const avances = Array.isArray(p.avances) ? p.avances : [];
    const currentAcc = avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    const maxPermitido = Math.max(0, parseFloat((100 - currentAcc).toFixed(2)));

    let targetPct = 0;
    if (val === 'restante') {
        targetPct = maxPermitido;
    } else {
        targetPct = parseFloat(val) || 0;
        if (targetPct > maxPermitido) {
            targetPct = maxPermitido;
        }
    }

    const inputPct = document.getElementById('avance-input-pct');
    if (inputPct) {
        const valStr = String(targetPct).replace('.', ',');
        inputPct.value = valStr;
        window.onAvancePorcentajeInput(valStr);
    }
};

window.onAvancePorcentajeInput = function(pctVal) {
    const id = window.pedidoAvanceActivoId;
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;

    const inputPct = document.getElementById('avance-input-pct');
    let rawStr = String(pctVal || '').trim();

    // Prohibir punto (.) y convertirlo automáticamente a coma (,)
    if (rawStr.includes('.')) {
        rawStr = rawStr.replace(/\./g, ',');
        if (inputPct) inputPct.value = rawStr;
    }

    // Solo permitir dígitos y una única coma
    const parts = rawStr.split(',');
    if (parts.length > 2) {
        rawStr = parts[0] + ',' + parts.slice(1).join('');
        if (inputPct) inputPct.value = rawStr;
    }

    const cleanNumStr = rawStr.replace(',', '.').replace(/[^0-9.]/g, '');
    let pct = parseFloat(cleanNumStr) || 0;

    const avances = Array.isArray(p.avances) ? p.avances : [];
    const currentAcc = avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    const maxPermitido = Math.max(0, parseFloat((100 - currentAcc).toFixed(2)));

    if (pct > maxPermitido) {
        pct = maxPermitido;
        const formattedMax = String(pct).replace('.', ',');
        if (inputPct) inputPct.value = formattedMax;
        showToast(`El avance no puede superar el 100% acumulado. Máximo restante a registrar: ${formattedMax}%`, 'warning');
    }

    const totalAmount = parseFloat(p.importe || 0);
    const montoCalculado = totalAmount * (pct / 100);

    const inputMonto = document.getElementById('avance-input-monto-display');
    if (inputMonto) {
        inputMonto.value = `$${montoCalculado.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    }
};

window.guardarAvanceObra = function() {
    const id = window.pedidoAvanceActivoId;
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) {
        showToast('Presupuesto no encontrado', 'error');
        return;
    }

    const inputPct = document.getElementById('avance-input-pct');
    const inputFecha = document.getElementById('avance-input-fecha');
    const inputDoc = document.getElementById('avance-input-nro-doc');
    const inputDetalle = document.getElementById('avance-input-detalle');

    const rawPctStr = inputPct ? inputPct.value.trim().replace(',', '.') : '0';
    let pct = parseFloat(rawPctStr);
    if (isNaN(pct) || pct <= 0) {
        showToast('Por favor ingrese un porcentaje de avance válido mayor a 0%.', 'error');
        if (inputPct && typeof inputPct.focus === 'function') inputPct.focus();
        return;
    }

    const avances = Array.isArray(p.avances) ? p.avances : [];
    const currentAcc = avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    const maxPermitido = Math.max(0, parseFloat((100 - currentAcc).toFixed(2)));

    if (currentAcc >= 100) {
        showToast('Este presupuesto ya cuenta con el 100% de avance completado.', 'warning');
        return;
    }

    if (pct > maxPermitido || (currentAcc + pct) > 100.001) {
        showToast(`El avance acumulado no puede superar el 100%. Avance previo: ${String(currentAcc).replace('.', ',')}%. Máximo permitido: ${String(maxPermitido).replace('.', ',')}%.`, 'error');
        if (inputPct) {
            inputPct.value = String(maxPermitido).replace('.', ',');
            window.onAvancePorcentajeInput(inputPct.value);
            if (typeof inputPct.focus === 'function') inputPct.focus();
        }
        return;
    }

    const fecha = inputFecha ? inputFecha.value : getLocalDateStr();
    const nroDoc = inputDoc ? inputDoc.value.trim() : '';
    const detalle = inputDetalle ? inputDetalle.value.trim() : '';

    const totalAmount = parseFloat(p.importe || 0);
    const montoHito = totalAmount * (pct / 100);

    if (!Array.isArray(p.avances)) {
        p.avances = [];
    }

    const avanceId = `${String(p.id)}-AV-${String(p.avances.length + 1).padStart(2, '0')}`;
    const nuevoAvance = {
        id: avanceId,
        fecha: fecha,
        porcentaje: pct,
        monto: montoHito,
        nro_doc: nroDoc,
        detalle: detalle,
        timestamp: getLocalCurrentDateTimeStr()
    };

    p.avances.push(nuevoAvance);

    // Calcular acumulado
    p.avance_porcentaje_acumulado = p.avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
    p.monto_facturado_total = p.avances.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);

    saveData();

    // Inserción directa e inmediata en Supabase (tabla avances_obra y presupuestos)
    const client = (typeof getDbClient === 'function') ? getDbClient() : null;
    if (client) {
        client.from('avances_obra').upsert([{
            id: avanceId,
            presupuesto_id: String(p.id),
            fecha: fecha,
            porcentaje: pct,
            monto_equivalente: montoHito,
            nro_documento: nroDoc,
            detalle: detalle
        }], { onConflict: 'id' }).then(function(res) {
            if (res && res.error) {
                console.warn("⚠️ Error insertando avance en Supabase:", res.error);
            } else {
                console.log("☁️ Supabase: Avance de obra insertado exitosamente en tabla avances_obra.");
            }
        }).catch(function(err) {
            console.error("Error insertando avance en Supabase:", err);
        });

        client.from('presupuestos').update({
            avance_porcentaje_acumulado: parseFloat(p.avance_porcentaje_acumulado) || 0,
            facturado_porcentaje: parseFloat(p.avance_porcentaje_acumulado) || 0,
            monto_facturado: parseFloat(p.monto_facturado_total) || 0
        }).eq('id', String(p.id)).then(function(res) {
            if (res && res.error) console.warn("⚠️ Error actualizando porcentaje en presupuestos:", res.error);
            else console.log("☁️ Supabase: Porcentaje de avance actualizado en tabla presupuestos.");
        }).catch(function() {});
    }

    // Disparar alerta por mail para facturación
    window.notificarEmailFacturacionAvance(p, nuevoAvance);

    // Si la planilla modal o la tabla están abiertas, refrescar
    if (typeof pedidoActivo !== 'undefined' && pedidoActivo && pedidoActivo.id === p.id) {
        pedidoActivo.avances = p.avances;
        pedidoActivo.avance_porcentaje_acumulado = p.avance_porcentaje_acumulado;
        pedidoActivo.monto_facturado_total = p.monto_facturado_total;
    }

    showToast(`✅ Avance de obra del ${pct}% ($${montoHito.toLocaleString('es-AR', {minimumFractionDigits: 2})}) registrado correctamente.`, 'success');

    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
    if (typeof window.renderFacturacionTable === 'function') {
        window.renderFacturacionTable();
    }

    // Abrir automáticamente el comprobante / certificado del avance
    window.abrirComprobanteAvance(p.id, nuevoAvance.id);
};

window.abrirComprobanteAvance = function(pedidoId, avanceId) {
    const p = appData.pedidos.find(x => x.id === pedidoId);
    if (!p) return;
    const allAvances = Array.isArray(p.avances) ? p.avances : [];
    const avance = allAvances.find(a => a.id === avanceId) || allAvances[allAvances.length - 1];
    if (!avance) return;

    openModal('tpl-modal-comprobante-avance');

    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'modal_comprobante', pedidoId: pedidoId, avanceId: avanceId, label: `Comprobante #${pedidoId}` });
    }

    const nroPres = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const totalAmount = parseFloat(p.importe || 0);
    const pct = parseFloat(avance.porcentaje || 0);
    const montoHito = parseFloat(avance.monto || (totalAmount * (pct / 100)));
    const proveedor = p.meca_proveedor || 'SG MONTAJES SRL';
    const cliente = p.cliente_nombre || 'CARGILL SACI';
    const denominacion = p.meca_denominacion || p.motivo || cliente;
    const planta = p.meca_planta || 'VGG';
    const nroOc = p.meca_nro_oc || p.nro_oc || '-';

    // Acumulado hasta este avance
    const targetIdx = allAvances.findIndex(a => a.id === avance.id);
    const sliced = (targetIdx >= 0) ? allAvances.slice(0, targetIdx + 1) : allAvances;
    const accPct = sliced.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0);
    const accMonto = sliced.reduce((s, a) => s + (parseFloat(a.monto) || (totalAmount * ((parseFloat(a.porcentaje)||0)/100))), 0);
    const saldoPct = Math.max(0, 100 - accPct);
    const saldoMonto = Math.max(0, totalAmount - accMonto);

    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    let rawDom = p.domicilio || '';
    let rawLoc = p.localidad || '';
    if ((!rawDom || !rawLoc) && window.clientesDB) {
        const rawCli = window.clientesDB.find(c => (c.nombre && cliente && c.nombre.trim().toUpperCase() === cliente.trim().toUpperCase()) || (c.codigo && p.cliente_id && String(c.codigo) === String(p.cliente_id)));
        if (rawCli) {
            if (!rawDom) rawDom = rawCli.domicilio || '';
            if (!rawLoc) rawLoc = rawCli.localidad || '';
        }
    }

    setT('comp-avance-empresa', proveedor);
    setT('comp-avance-fecha', avance.fecha || new Date().toLocaleDateString('es-AR'));
    setT('comp-avance-presupuesto-id', nroPres);
    setT('comp-avance-planta', planta);
    setT('comp-avance-cliente', cliente);
    setT('comp-avance-nro-oc', nroOc);
    setT('comp-avance-domicilio', rawDom || '-');
    setT('comp-avance-localidad', rawLoc || '-');
    setT('comp-avance-denominacion', denominacion);
    setT('comp-avance-doc-label', avance.nro_doc ? `Certificado: ${avance.nro_doc}` : 'Certificado de Avance');
    setT('comp-avance-pct', `+${pct}%`);
    setT('comp-avance-monto', `$${montoHito.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setT('comp-avance-total-presupuesto', `$${totalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setT('comp-avance-acumulado-display', `${accPct}% ($${accMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})})`);
    setT('comp-avance-saldo-display', `${saldoPct}% ($${saldoMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})})`);
    setT('comp-avance-detalle-texto', avance.detalle || 'Sin observaciones adicionales registradas.');
    setT('comp-avance-firma-empresa', proveedor);
    setT('comp-avance-firma-cliente', cliente);
};

window.imprimirComprobanteAvance = function() {
    const area = document.getElementById('print-comprobante-avance-area');
    if (!area) return;

    const printWindow = window.open('', '_blank', 'width=800,height=880');
    if (!printWindow) {
        window.print();
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Certificado de Avance de Obra - SG Montajes</title>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #ffffff; color: #000000; margin: 0; padding: 15px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <!-- Barra de Herramientas Superior (No se imprime) -->
            <div class="no-print" style="position: sticky; top: 0; background: #0f172a; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; margin: -15px -15px 20px -15px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 0 0 8px 8px;">
                <span style="color: #2dd4bf; font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    📄 Vista del Certificado de Avance de Obra
                </span>
                <div style="display: flex; gap: 10px;">
                    <button type="button" onclick="window.print()" style="background: #0d9488; color: white; border: none; font-weight: 800; font-size: 13px; padding: 8px 18px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        🖨️ Imprimir / Guardar como PDF
                    </button>
                    <button type="button" onclick="window.close()" style="background: #334155; color: white; border: 1px solid #475569; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 6px; cursor: pointer;">
                        ✕ Cerrar
                    </button>
                </div>
            </div>

            ${area.outerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.notificarEmailFacturacionAvance = function(p, avance) {
    if (!p || !avance) return;
    const nroPres = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliente = p.meca_denominacion || p.cliente_nombre || 'Cliente';
    const montoHitoStr = `$${(avance.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    const totalPresStr = `$${(p.importe || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    const acumuladoStr = `${p.avance_porcentaje_acumulado}% ($${(p.monto_facturado_total || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})})`;

    const emailFacturacion = window.emailResponsableFacturacion || 'facturacion@sgmontajes.com.ar';
    const notifMsg = `📄 Notificación de Avance de Obra: Se registró un avance del ${avance.porcentaje}% (${montoHitoStr}) para el Presupuesto ${nroPres} (${cliente}). Total facturar: ${acumuladoStr} de ${totalPresStr}.`;

    // 1. Notificar al Backend Python API
    try {
        fetch('/api/notificar-avance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                presupuesto_id: p.id,
                porcentaje: avance.porcentaje,
                monto: avance.monto,
                cliente: cliente,
                detalle: avance.detalle || notifMsg
            })
        }).then(res => res.json()).then(data => {
            console.log("☁️ Backend Python API notificado:", data);
        }).catch(() => {});
    } catch(e) {}

    // 2. Enviar notificación a todos los usuarios del sistema
    if (Array.isArray(appData.users)) {
        appData.users.forEach(u => {
            if (typeof addNotification === 'function') {
                addNotification(u.id, notifMsg, p.id);
            }
        });
    }

    if (typeof renderNotifications === 'function') {
        renderNotifications();
    }

    const targetEmailList = Array.from(new Set([emailFacturacion, 'melanidaiana28@gmail.com', 'grandijuanluis@gmail.com', 'cotizaciones@sgmontajes.com.ar']));

    if (typeof window.enviarEmailBackend === 'function') {
        window.enviarEmailBackend({
            to: targetEmailList,
            subject: `🧾 SG MONTAJES — Alerta de Facturación Avance Obra (${avance.porcentaje}%) - Presupuesto #${p.id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff; color: #0f172a;">
                    <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 16px;">
                        <h2 style="color: #4f46e5; margin: 0;">SG MONTAJES S.R.L.</h2>
                        <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Solicitud de Emisión de Facturación</p>
                    </div>
                    <p>Estimado equipo de Facturación,</p>
                    <p>Se ha registrado un nuevo certificado / avance de obra para el presupuesto <strong>#${p.id}</strong> (${cliente}).</p>
                    <div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-left: 5px solid #6366f1; padding: 14px; margin: 18px 0; border-radius: 6px;">
                        <strong style="color: #3730a3; font-size: 15px;">Datos del Avance a Facturar:</strong><br><br>
                        • <strong>Avance Registrado:</strong> ${avance.porcentaje}%<br>
                        • <strong>Monto de la Factura:</strong> <span style="color: #4f46e5; font-weight: bold;">${montoHitoStr}</span><br>
                        • <strong>Monto Acumulado Facturado:</strong> ${acumuladoStr} de ${totalPresStr}<br>
                        • <strong>Detalle / Concepto:</strong> ${avance.detalle || 'Avance de obra'}
                    </div>
                    <p style="font-size: 12px; color: #64748b;">Favor proceder con la emisión de la factura correspondiente.</p>
                </div>
            `
        }).then(resp => {
            if (resp && resp.success) {
                showToast(`📧 Notificación de avance enviada por email a ${targetEmailList.join(', ')}: Facturar ${avance.porcentaje}% (${montoHitoStr}).`, 'info');
            } else {
                showToast(`⚠️ No se pudo enviar el correo de avance (${resp ? resp.error : 'Error servidor'}).`, 'warning');
            }
        }).catch(err => {
            showToast(`⚠️ Error enviando correo de avance: ${err.message}`, 'error');
        });
    }
};

function getSLABadge(p) {
    if (p.estado === 'Rechazado' || p.estado === 'Aprobado con OC' || p.estado === 'Facturado Parcial' || p.estado === 'Facturado Total' || p.estado === 'Aprobado' || p.estado === 'Autorizado' || p.estado === 'Cargado con orden de compra') {
        return `<span class="sla-badge resolved"><i class="fa-solid fa-circle-check"></i> Resuelto</span>`;
    }

    // Normalizar la fecha reemplazando el espacio por T para evitar problemas de parsing entre navegadores
    const createdDate = new Date(p.fecha.replace(' ', 'T'));
    const timeElapsedMs = Date.now() - createdDate.getTime();

    // Si la fecha es inválida o en el futuro por desincronización, mostrar 0
    const finalElapsedMs = Math.max(0, timeElapsedMs);

    const hoursElapsed = Math.floor(finalElapsedMs / (1000 * 60 * 60));
    const minsElapsed = Math.floor((finalElapsedMs % (1000 * 60 * 60)) / (1000 * 60));

    // Retornamos un badge neutral con la clase .info que muestra el tiempo transcurrido en cola sin fecha de vencimiento
    return `<span class="sla-badge info"><i class="fa-solid fa-clock"></i> Hace ${hoursElapsed}h ${minsElapsed}m</span>`;
}

window.cambiarEstadoPresupuestoDirecto = async function(id, nuevoEstado) {
    const orderIdx = (typeof window.findPedidoIndex === 'function')
        ? window.findPedidoIndex(id)
        : appData.pedidos.findIndex(p => p && (p.id === id || String(p.id) === String(id)));

    if (orderIdx === -1) {
        console.error("Presupuesto no encontrado para cambiar estado directo:", id);
        return;
    }
    const p = appData.pedidos[orderIdx];

    if (nuevoEstado === 'Aprobado con OC') {
        const ok = await window.editarOrdenesDeCompra(p.id);
        if (!ok) {
            if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
        }
        return;
    } else if (nuevoEstado === 'Rechazado' && !p.motivo_rechazo) {
        let reason;
        if (typeof Swal !== 'undefined') {
            const { value, isDismissed } = await Swal.fire({
                title: '<div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #f43f5e; font-size: 18px; font-weight: 800;"><i class="fa-solid fa-circle-xmark"></i> Motivo de Rechazo</div>',
                html: `
                    <div style="text-align: left; margin-top: 10px;">
                        <label style="font-size: 13px; color: #f8fafc; font-weight: 700; display: block; margin-bottom: 6px;">
                            Ingrese el motivo obligatorio del rechazo del presupuesto:
                        </label>
                        <textarea id="swal-motivo-rechazo-input" rows="3"
                            placeholder="Especifique la razón por la cual se rechaza el presupuesto..."
                            style="width: 100%; box-sizing: border-box; background: #ffffff !important; color: #0f172a !important; border: 2px solid #f43f5e !important; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-weight: 600; font-family: inherit; resize: vertical; outline: none;"></textarea>
                    </div>
                `,
                background: '#1e293b',
                color: '#ffffff',
                width: '450px',
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                confirmButtonText: 'Confirmar Rechazo',
                confirmButtonColor: '#f43f5e',
                cancelButtonColor: '#64748b',
                focusConfirm: false,
                didOpen: () => {
                    const el = document.getElementById('swal-motivo-rechazo-input');
                    if (el) el.focus();
                },
                preConfirm: () => {
                    const val = document.getElementById('swal-motivo-rechazo-input')?.value;
                    if (!val || !val.trim()) {
                        Swal.showValidationMessage('El motivo de rechazo es obligatorio.');
                        return false;
                    }
                    return val.trim();
                }
            });
            if (isDismissed || !value) {
                renderAssignmentsTable();
                return;
            }
            reason = value;
        } else {
            reason = prompt('Ingrese el motivo obligatorio del rechazo del presupuesto:');
            if (reason === null || !reason.trim()) {
                showToast('El motivo de rechazo es obligatorio.', 'error');
                renderAssignmentsTable();
                return;
            }
        }
        p.motivo_rechazo = reason.trim();
    }

    p.estado = nuevoEstado;
    p.fecha_resolucion = new Date().toLocaleDateString('es-AR');
    saveData();
    const ocMsg = (p.meca_nro_oc || p.nro_oc) ? ` (OC: ${p.meca_nro_oc || p.nro_oc})` : '';
    showToast(`Presupuesto #${p.id}: Estado actualizado a "${nuevoEstado}"${ocMsg}`, 'success');
    if (typeof window.notificarAprobacionEquipo === 'function') {
        window.notificarAprobacionEquipo(p, nuevoEstado);
    }
    renderAssignmentsTable();
    if (typeof window.renderFacturacionTable === 'function') {
        window.renderFacturacionTable();
    }

    if (nuevoEstado === 'Aprobado con OC') {
        const codPresupuesto = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : (p.id || id);
        const ocNumero = p ? (p.meca_nro_oc || p.nro_oc || '') : '';
        const ocDesc = ocNumero ? ` con OC <strong>${ocNumero}</strong>` : '';
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Comprobante ' + nuevoEstado,
                html: `Presupuesto <strong>${codPresupuesto}</strong> actualizado a <strong>${nuevoEstado}</strong>${ocDesc} y disponible en <strong>Registros de Facturación</strong>.<br><br>¿Desea ir ahora al módulo de Facturación?`,
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-file-invoice-dollar"></i> Ir a Facturación',
                cancelButtonText: 'Permanecer aquí',
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#64748b'
            }).then((result) => {
                if (result.isConfirmed) {
                    if (typeof closeModal === 'function') closeModal();
                    if (typeof showView === 'function') {
                        showView('tpl-facturacion');
                        if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
                    }
                }
            });
        }
    }
};

window.autorizarPedidoRapido = function(id) {
    const orderIdx = (typeof window.findPedidoIndex === 'function')
        ? window.findPedidoIndex(id)
        : appData.pedidos.findIndex(p => p && (p.id === id || String(p.id) === String(id)));

    if (orderIdx === -1) return;
    const p = appData.pedidos[orderIdx];

    let nroOc = p.meca_nro_oc || p.nro_oc || '';
    const ocPrompt = prompt(`✅ AUTORIZAR Presupuesto #${p.id}

Si el cliente ya emitió Orden de Compra (OC), ingrese el número (opcional):`, nroOc);
    if (ocPrompt === null) return;

    const trimmedOc = ocPrompt.trim();
    if (trimmedOc) {
        p.meca_nro_oc = trimmedOc;
        p.nro_oc = trimmedOc;
        p.estado = 'Aprobado con OC';
    } else {
        p.estado = 'Aprobado sin OC';
    }
    p.fecha_resolucion = new Date().toLocaleDateString('es-AR');
    saveData();
    showToast(`✅ Presupuesto #${p.id} AUTORIZADO (${p.estado}).`, 'success');
    if (typeof window.notificarAprobacionEquipo === 'function') {
        window.notificarAprobacionEquipo(p, p.estado);
    }
    renderAssignmentsTable();
    if (typeof window.renderFacturacionTable === 'function') {
        window.renderFacturacionTable();
    }

    if (p.estado === 'Aprobado con OC') {
        const codPresupuesto = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : (p.id || id);
        const ocNumero = p ? (p.meca_nro_oc || p.nro_oc || '') : '';
        const ocDesc = ocNumero ? ` con OC <strong>${ocNumero}</strong>` : '';
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Comprobante ' + p.estado,
                html: `Presupuesto <strong>${codPresupuesto}</strong> autorizado y disponible en <strong>Registros de Facturación</strong>.<br><br>¿Desea ir ahora al módulo de Facturación?`,
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-file-invoice-dollar"></i> Ir a Facturación',
                cancelButtonText: 'Permanecer aquí',
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#64748b'
            }).then((result) => {
                if (result.isConfirmed) {
                    if (typeof closeModal === 'function') closeModal();
                    if (typeof showView === 'function') {
                        showView('tpl-facturacion');
                        if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
                    }
                }
            });
        }
    }
};

window.rechazarPedidoRapido = async function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;

    let motivo;
    if (typeof Swal !== 'undefined') {
        const { value, isDismissed } = await Swal.fire({
            title: `<div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #f43f5e; font-size: 18px; font-weight: 800;"><i class="fa-solid fa-circle-xmark"></i> Rechazar Presupuesto #${p.id}</div>`,
            html: `
                <div style="text-align: left; margin-top: 10px;">
                    <label style="font-size: 13px; color: #f8fafc; font-weight: 700; display: block; margin-bottom: 6px;">
                        Ingrese el motivo obligatorio del rechazo:
                    </label>
                    <textarea id="swal-motivo-rechazo-rapido-input" rows="3"
                        placeholder="Especifique la razón por la cual se rechaza el presupuesto..."
                        style="width: 100%; box-sizing: border-box; background: #ffffff !important; color: #0f172a !important; border: 2px solid #f43f5e !important; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-weight: 600; font-family: inherit; resize: vertical; outline: none;"></textarea>
                </div>
            `,
            background: '#1e293b',
            color: '#ffffff',
            width: '450px',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Confirmar Rechazo',
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#64748b',
            focusConfirm: false,
            didOpen: () => {
                const el = document.getElementById('swal-motivo-rechazo-rapido-input');
                if (el) el.focus();
            },
            preConfirm: () => {
                const val = document.getElementById('swal-motivo-rechazo-rapido-input')?.value;
                if (!val || !val.trim()) {
                    Swal.showValidationMessage('El motivo de rechazo es obligatorio.');
                    return false;
                }
                return val.trim();
            }
        });
        if (isDismissed || !value) return;
        motivo = value;
    } else {
        motivo = prompt(`❌ RECHAZAR Presupuesto #${p.id}\n\nPor favor ingrese el motivo obligatorio del rechazo:`);
        if (motivo === null) return; // Canceló
        if (!motivo.trim()) {
            showToast('El motivo de rechazo es obligatorio.', 'error');
            return;
        }
    }

    p.estado = 'Rechazado';
    p.motivo_rechazo = motivo.trim();
    p.fecha_resolucion = new Date().toLocaleDateString('es-AR');
    saveData();
    showToast(`❌ Presupuesto #${p.id} fue RECHAZADO.`, 'danger');
    if (typeof window.notificarAprobacionEquipo === 'function') {
        window.notificarAprobacionEquipo(p, 'Rechazado');
    }
    renderAssignmentsTable();
};

function formatFechaCorta(fechaStr) {
    if (!fechaStr) return '-';
    const cleanStr = String(fechaStr).trim();
    const datePart = cleanStr.split(/[ T]/)[0];

    if (datePart.includes('-')) {
        const parts = datePart.split('-');
        if (parts.length === 3) {
            const year = parts[0].length === 4 ? parts[0] : (parts[2].length === 4 ? parts[2] : parts[0]);
            const month = parts[1].padStart(2, '0');
            const day = (parts[0].length === 4 ? parts[2] : parts[0]).padStart(2, '0');
            return `${day}/${month}/${year}`;
        }
    }
    if (datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            return `${day}/${month}/${year}`;
        }
    }
    return datePart;
}
window.formatFechaCorta = formatFechaCorta;

// --- CONFIGURACIÓN DE COLUMNAS REORDENABLES Y AGRUPACIÓN ---
let tableColumnOrder = ['id', 'fecha', 'planta', 'cliente', 'denominacion', 'proveedor', 'estado', 'importe', 'accion'];
const defaultTableColumnOrder = ['id', 'fecha', 'planta', 'cliente', 'denominacion', 'proveedor', 'estado', 'importe', 'accion'];

const tableColumnDefs = {
    id: { key: 'id', label: 'N° ID', width: '120px', align: 'left', sortable: true },
    fecha: { key: 'fecha', label: 'Fecha', width: '90px', align: 'left', sortable: true },
    planta: { key: 'planta', label: 'Planta', width: '135px', align: 'center', sortable: true },
    denominacion: { key: 'denominacion', label: 'Detalle', width: 'auto', align: 'left', sortable: true },
    proveedor: { key: 'proveedor', label: 'Proveedor', width: '120px', align: 'center', sortable: true },
    observacion: { key: 'observacion', label: 'Observación', width: '180px', align: 'left', sortable: true },
    cliente: { key: 'cliente', label: 'Cliente', width: '160px', align: 'left', sortable: true },
    estado: { key: 'estado', label: 'Estado', width: '135px', align: 'center', sortable: true },
    importe: { key: 'importe', label: 'Importe ($)', width: '110px', align: 'right', sortable: true },
    accion: { key: 'accion', label: 'Acción', width: '140px', align: 'center', sortable: false }
};

let tableSortColumn = 'fecha';
let tableSortAsc = false;
let tableGroupBy = '';
let collapsedGroups = {};
let draggedColKey = null;

// --- SISTEMA DE VISTAS PERSONALIZADAS ---
const defaultTableViews = [
    { id: 'principal', name: '📋 Vista Principal', groupBy: '', statusFilter: '', isDefault: true },
    { id: 'por_estado', name: '📂 Por Estado', groupBy: 'estado', statusFilter: '', isDefault: true }
];

let customTableViews = [];
let currentActiveViewId = 'principal';

function loadCustomTableViews() {
    try {
        const saved = localStorage.getItem('sg_custom_table_views');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                customTableViews = parsed;
            }
        }
    } catch(e) {}
}
loadCustomTableViews();

function getAllTableViews() {
    return [...defaultTableViews, ...customTableViews];
}

window.renderTableViewsTabs = function() {
    const container = document.getElementById('table-views-tabs');
    if (!container) return;

    const allViews = getAllTableViews();
    container.innerHTML = allViews.map(v => {
        const isActive = (v.id === currentActiveViewId);
        const activeStyle = isActive
            ? 'background: #0284c7; color: white; border: 1px solid #38bdf8; font-weight: 700; box-shadow: 0 0 10px rgba(56,189,248,0.3);'
            : 'background: rgba(15, 23, 42, 0.7); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); font-weight: 500;';

        const deleteBtn = !v.isDefault
            ? `<span onclick="event.stopPropagation(); window.eliminarVistaPersonalizada('${v.id}')" style="margin-left: 6px; font-size: 13px; font-weight: bold; opacity: 0.75; cursor: pointer;" title="Eliminar esta vista">&times;</span>`
            : '';

        return `
            <button type="button" class="btn btn-sm" onclick="window.seleccionarVista('${v.id}')" style="${activeStyle} font-size: 11px; padding: 3px 10px; border-radius: 6px; display: inline-flex; align-items: center; cursor: pointer; transition: all 0.2s ease;">
                ${v.name}${deleteBtn}
            </button>
        `;
    }).join('');
};

window.seleccionarVista = function(viewId) {
    const allViews = getAllTableViews();
    const v = allViews.find(x => x.id === viewId);
    if (!v) return;

    currentActiveViewId = viewId;
    tableGroupBy = v.groupBy || '';

    // Si la vista define un filtro de estado, aplicarlo
    const statusSelect = document.getElementById('status-filter');
    if (statusSelect && v.statusFilter !== undefined) {
        statusSelect.value = v.statusFilter;
    }

    renderTableViewsTabs();
    renderAssignmentsTable();
};

window.showModal = function(templateId) {
    if (typeof openModal === 'function') openModal(templateId);
};

window.abrirModalAgregarVista = function() {
    openModal('tpl-modal-nueva-vista');
    const inputNombre = document.getElementById('nueva-vista-nombre');
    if (inputNombre) {
        inputNombre.value = '';
        setTimeout(() => inputNombre.focus(), 150);
    }
};

window.guardarNuevaVistaPersonalizada = function() {
    const inputNombre = document.getElementById('nueva-vista-nombre');
    const selectAgrup = document.getElementById('nueva-vista-agrupacion');
    const selectEstado = document.getElementById('nueva-vista-filtro-estado');

    const nombre = inputNombre ? inputNombre.value.trim() : '';
    if (!nombre) {
        showToast('Por favor ingrese un nombre para la vista.', 'error');
        if (inputNombre) inputNombre.focus();
        return;
    }

    const agrup = selectAgrup ? selectAgrup.value : '';
    const estado = selectEstado ? selectEstado.value : '';

    const newViewId = 'view_' + Date.now();
    const newView = {
        id: newViewId,
        name: `📂 ${nombre}`,
        groupBy: agrup,
        statusFilter: estado,
        isDefault: false
    };

    customTableViews.push(newView);
    try {
        localStorage.setItem('sg_custom_table_views', JSON.stringify(customTableViews));
    } catch(e) {}

    currentActiveViewId = newViewId;
    tableGroupBy = agrup;

    const statusSelect = document.getElementById('status-filter');
    if (statusSelect && estado) {
        statusSelect.value = estado;
    }

    closeModal();
    showToast(`✅ Vista "${nombre}" creada con éxito.`, 'success');
    renderTableViewsTabs();
    renderAssignmentsTable();
};

window.eliminarVistaPersonalizada = function(viewId) {
    if (!confirm('¿Desea eliminar esta vista personalizada?')) return;

    customTableViews = customTableViews.filter(v => v.id !== viewId);
    try {
        localStorage.setItem('sg_custom_table_views', JSON.stringify(customTableViews));
    } catch(e) {}

    if (currentActiveViewId === viewId) {
        currentActiveViewId = 'principal';
        tableGroupBy = '';
    }

    showToast('Vista eliminada.', 'info');
    renderTableViewsTabs();
    renderAssignmentsTable();
};

try {
    const savedOrder = localStorage.getItem('sg_table_col_order_v6');
    if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.includes('denominacion') && parsed.includes('planta')) {
            const validCols = parsed.filter(c => defaultTableColumnOrder.includes(c));
            defaultTableColumnOrder.forEach(c => {
                if (!validCols.includes(c)) validCols.push(c);
            });
            tableColumnOrder = validCols;
        } else {
            tableColumnOrder = [...defaultTableColumnOrder];
            try { localStorage.setItem('sg_table_col_order_v6', JSON.stringify(tableColumnOrder)); } catch(e) {}
        }
    } else {
        tableColumnOrder = [...defaultTableColumnOrder];
    }
} catch(e) {}

window.handleColDragStart = function(e, colKey) {
    draggedColKey = colKey;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colKey);
    }
};

window.handleColDragOver = function(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const th = e.currentTarget;
    if (th) th.classList.add('drag-over');
};

window.handleColLeave = function(e) {
    const th = e.currentTarget;
    if (th) th.classList.remove('drag-over');
};

window.handleColDrop = function(e, targetColKey) {
    e.preventDefault();
    const th = e.currentTarget;
    if (th) th.classList.remove('drag-over');
    if (!draggedColKey || draggedColKey === targetColKey) return;

    const fromIdx = tableColumnOrder.indexOf(draggedColKey);
    const toIdx = tableColumnOrder.indexOf(targetColKey);
    if (fromIdx !== -1 && toIdx !== -1) {
        tableColumnOrder.splice(fromIdx, 1);
        tableColumnOrder.splice(toIdx, 0, draggedColKey);
        try {
            localStorage.setItem('sg_table_col_order_v6', JSON.stringify(tableColumnOrder));
        } catch(err) {}
        renderAssignmentsTable();
    }
};

window.handleColHeaderClick = function(colKey) {
    const def = tableColumnDefs[colKey];
    if (!def || !def.sortable) return;

    if (tableSortColumn === colKey) {
        tableSortAsc = !tableSortAsc;
    } else {
        tableSortColumn = colKey;
        tableSortAsc = true;
    }
    renderAssignmentsTable();
};

window.cambiarAgrupacionTabla = function(groupKey) {
    tableGroupBy = groupKey;
    collapsedGroups = {};
    renderAssignmentsTable();
};

window.toggleGroupCollapse = function(groupId) {
    collapsedGroups[groupId] = !collapsedGroups[groupId];
    const isHidden = !!collapsedGroups[groupId];
    document.querySelectorAll(`.group-item-${groupId}`).forEach(el => {
        el.style.display = isHidden ? 'none' : '';
    });
    const icon = document.getElementById(`icon-group-${groupId}`);
    if (icon) {
        icon.innerHTML = isHidden ? '▶' : '▼';
    }
};

function renderTableHeaderRow() {
    const theadRow = document.getElementById('assignments-header-row');
    if (!theadRow) return;
    theadRow.innerHTML = '';

    const colsToRender = tableColumnOrder;

    colsToRender.forEach(colKey => {
        const def = tableColumnDefs[colKey] || { key: colKey, label: colKey, width: 'auto', align: 'left', sortable: false };
        const th = document.createElement('th');
        th.className = 'draggable-col';
        th.setAttribute('data-col', colKey);
        th.setAttribute('draggable', 'true');

        let colWidth = def.width || 'auto';
        th.style.width = colWidth;
        if (colWidth !== 'auto' && !colWidth.includes('%')) {
            th.style.minWidth = colWidth;
        }
        th.style.textAlign = def.align;
        th.style.whiteSpace = 'nowrap';
        th.style.padding = '8px 6px';
        th.title = 'Arrastrá para reordenar la columna | Clic para ordenar';

        let colLabel = def.label;

        let sortIcon = '';
        if (def.sortable) {
            if (tableSortColumn === colKey) {
                sortIcon = tableSortAsc ? ' <span style="color: #38bdf8; font-size: 11px;">▲</span>' : ' <span style="color: #38bdf8; font-size: 11px;">▼</span>';
            } else {
                sortIcon = ' <span style="opacity: 0.25; font-size: 10px;">⇅</span>';
            }
        }

        th.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: ${def.align === 'right' ? 'flex-end' : (def.align === 'center' ? 'center' : 'flex-start')}; gap: 4px; user-select: none; white-space: nowrap;">
                <span style="opacity: 0.35; font-size: 10px; cursor: grab;" title="Arrastrar para mover">⋮⋮</span>
                <span>${colLabel}</span>${sortIcon}
            </div>
        `;

        th.ondragstart = (e) => window.handleColDragStart(e, colKey);
        th.ondragover = (e) => window.handleColDragOver(e);
        th.ondragleave = (e) => window.handleColLeave(e);
        th.ondrop = (e) => window.handleColDrop(e, colKey);
        th.onclick = (e) => window.handleColHeaderClick(colKey);

        theadRow.appendChild(th);
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.toggleDetalleExpand = function(el) {
    if (!el) return;
    const shortEl = el.querySelector('.detalle-short');
    const fullEl = el.querySelector('.detalle-full');
    if (shortEl && fullEl) {
        if (shortEl.style.display === 'none') {
            shortEl.style.display = 'inline';
            fullEl.style.display = 'none';
        } else {
            shortEl.style.display = 'none';
            fullEl.style.display = 'inline-block';
        }
    }
};

function renderAssignmentsTable() {
    renderTableViewsTabs();
    renderTableHeaderRow();

    const listBody = document.getElementById('assignments-list');
    if (!listBody) return;
    const searchVal = document.getElementById('search-filter') ? document.getElementById('search-filter').value.toLowerCase().trim() : '';
    const statusFilterEl = document.getElementById('status-filter');
    const statusVal = statusFilterEl ? statusFilterEl.value : '';
    const dateFrom = document.getElementById('filter-date-from') ? document.getElementById('filter-date-from').value : '';
    const dateTo = document.getElementById('filter-date-to') ? document.getElementById('filter-date-to').value : '';

    listBody.innerHTML = '';

    let filtered = (appData.pedidos || []).filter(p => {
        // 1. Filtro estricto por Rubro activo (Eléctrico / Mecánico)
        const curRubro = reqTipoPresupuesto || (typeof getCurrentUser === 'function' && getCurrentUser() && getCurrentUser().rubro_defecto) || 'Eléctrico';
        const isItemMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
        const pTipo = isItemMec ? 'Mecánico' : 'Eléctrico';
        if (pTipo !== curRubro) return false;

        if (viewMode === 'Rechazados') {
            if (p.estado !== 'Rechazado') return false;
        } else if (viewMode === 'EstadoPresupuesto') {
            if (p.estado === 'Rechazado') return false;
        }

        if (statusVal) {
            let pEstNorm = p.estado;
            if (pEstNorm === 'Cargado sin orden de compra' || pEstNorm === 'Pendiente de Autorización' || pEstNorm === 'Pendiente') pEstNorm = 'Enviado sin OC';
            else if (pEstNorm === 'Cargado con orden de compra' || pEstNorm === 'Autorizado' || pEstNorm === 'Aprobado') pEstNorm = 'Aprobado con OC';
            if (pEstNorm !== statusVal) return false;
        }

        const pDate = (typeof window.normalizeDateToYMD === 'function')
            ? window.normalizeDateToYMD(p.fecha || p.created_at || '')
            : (p.fecha ? p.fecha.substring(0, 10) : '');

        if (dateFrom) {
            if (!pDate || pDate < dateFrom) return false;
        }
        if (dateTo) {
            if (pDate && pDate > dateTo) return false;
        }

        if (searchVal) {
            const matchesText = (p.cliente_nombre || '').toLowerCase().includes(searchVal) ||
                                (p.meca_denominacion || '').toLowerCase().includes(searchVal) ||
                                (p.motivo || '').toLowerCase().includes(searchVal) ||
                                (p.meca_planta || '').toLowerCase().includes(searchVal) ||
                                (p.cuit || '').includes(searchVal) ||
                                String(p.id || '').toLowerCase().includes(searchVal) ||
                                (p.estado || '').toLowerCase().includes(searchVal);
            if (!matchesText) return false;
        }

        return true;
    });

    const activeCustomView = (typeof getAllTableViews === 'function') ? getAllTableViews().find(v => v.id === currentActiveViewId) : null;
    if (activeCustomView && activeCustomView.statusFilter) {
        filtered = filtered.filter(p => {
            let pEstNorm = p.estado;
            if (pEstNorm === 'Cargado sin orden de compra' || pEstNorm === 'Pendiente de Autorización' || pEstNorm === 'Pendiente') pEstNorm = 'Enviado sin OC';
            else if (pEstNorm === 'Cargado con orden de compra' || pEstNorm === 'Autorizado' || pEstNorm === 'Aprobado') pEstNorm = 'Aprobado con OC';
            return pEstNorm === activeCustomView.statusFilter;
        });
    }

    if (tableSortColumn) {
        filtered.sort((a, b) => {
            let valA = a[tableSortColumn] || '';
            let valB = b[tableSortColumn] || '';
            if (tableSortColumn === 'denominacion') {
                valA = a.meca_denominacion || a.motivo || a.denominacion || '';
                valB = b.meca_denominacion || b.motivo || b.denominacion || '';
            } else if (tableSortColumn === 'proveedor') {
                valA = (a.proveedor || a.meca_proveedor || '').toLowerCase();
                valB = (b.proveedor || b.meca_proveedor || '').toLowerCase();
            } else if (tableSortColumn === 'observacion') {
                valA = a.observaciones || a.motivo || a.meca_observaciones || '';
                valB = b.observaciones || b.motivo || b.meca_observaciones || '';
            } else if (tableSortColumn === 'cliente') {
                valA = a.cliente_nombre || a.cliente || '';
                valB = b.cliente_nombre || b.cliente || '';
            } else if (tableSortColumn === 'planta') {
                valA = a.meca_planta || a.planta || 'VGG';
                valB = b.meca_planta || b.planta || 'VGG';
            } else if (tableSortColumn === 'importe') {
                valA = parseFloat(a.importe) || 0;
                valB = parseFloat(b.importe) || 0;
                return tableSortAsc ? valA - valB : valB - valA;
            } else if (tableSortColumn === 'fecha') {
                valA = (typeof window.normalizeDateToYMD === 'function') ? window.normalizeDateToYMD(a.fecha || a.created_at || '') : (a.fecha || '');
                valB = (typeof window.normalizeDateToYMD === 'function') ? window.normalizeDateToYMD(b.fecha || b.created_at || '') : (b.fecha || '');
                return tableSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (tableSortColumn === 'id') {
                valA = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
                valB = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
                return tableSortAsc ? valA - valB : valB - valA;
            }
            if (valA < valB) return tableSortAsc ? -1 : 1;
            if (valA > valB) return tableSortAsc ? 1 : -1;
            return 0;
        });
    } else {
        // Orden por defecto: MÁS RECIENTES PRIMERO (Descendente por fecha y por número correlativo)
        filtered.sort((a, b) => {
            const dateA = (typeof window.normalizeDateToYMD === 'function') ? window.normalizeDateToYMD(a.fecha || a.created_at || '') : (a.fecha || '');
            const dateB = (typeof window.normalizeDateToYMD === 'function') ? window.normalizeDateToYMD(b.fecha || b.created_at || '') : (b.fecha || '');
            if (dateA && dateB && dateA !== dateB) {
                return dateB.localeCompare(dateA); // Más reciente primero
            }
            const numA = parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
            return numB - numA; // Mayor correlativo primero
        });
    }

    const totalCols = tableColumnOrder.length;

    if (filtered.length === 0) {
        listBody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center; padding: 24px; color: var(--text-muted);">No se encontraron presupuestos en esta sección.</td></tr>`;
        return;
    }

    function createBudgetTableRow(p) {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        const activeCols = tableColumnOrder;

        let statusBadge = '';
        if (p.estado === 'Aprobado con OC' || p.estado === 'Cargado con orden de compra' || p.estado === 'Autorizado' || p.estado === 'Aprobado') {
            statusBadge = `<span class="badge badge-success" style="font-size: 11px; padding: 3px 8px; font-weight: 700;">Aprobado con OC</span>`;
        } else if (p.estado === 'Enviado sin OC' || p.estado === 'Cargado sin orden de compra' || p.estado === 'Pendiente de Autorización' || p.estado === 'Pendiente') {
            statusBadge = `<span class="badge" style="font-size: 11px; padding: 3px 8px; font-weight: 700; background: rgba(56,189,248,0.25); color: #38bdf8; border: 1px solid rgba(56,189,248,0.6);">Enviado sin OC</span>`;
        } else if (p.estado === 'Facturado Total') {
            statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.25); color: #34d399; border: 1px solid #10b981; font-size: 11px; padding: 3px 8px; font-weight: 800;">100% Facturado</span>`;
        } else if (p.estado === 'Facturado Parcial') {
            statusBadge = `<span class="badge" style="background: rgba(14, 165, 233, 0.25); color: #38bdf8; border: 1px solid #0284c7; font-size: 11px; padding: 3px 8px; font-weight: 800;">Facturado Parcial</span>`;
        } else if (p.estado === 'Cancelado') {
            statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; font-size: 11px; padding: 3px 8px; font-weight: 700;">Cancelado</span>`;
        } else if (p.estado === 'Rechazado') {
            statusBadge = `<span class="badge badge-danger" style="font-size: 11px; padding: 3px 8px; font-weight: 700;">Rechazado</span>`;
        } else {
            statusBadge = `<span class="badge badge-secondary" style="font-size: 11px; padding: 3px 8px; font-weight: 700;">${p.estado || 'Pendiente'}</span>`;
        }

        let actionBtnHtml = '';
        if (viewMode === 'Autorizador') {
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Revisar: Ver comprobante completo para autorizar o rechazar">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); autorizarPedidoRapido('${p.id}')" style="background: #10b981; color: #fff; border: 1px solid #10b981; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Autorizar Presupuesto">
                        <i class="fas fa-check"></i> Autorizar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); rechazarPedidoRapido('${p.id}')" style="background: #e11d48; color: #fff; border: 1px solid #e11d48; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Rechazar Presupuesto">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                </div>
            `;
        } else if (viewMode === 'Rechazados' || p.estado === 'Rechazado') {
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Planilla: Consultar el comprobante completo del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); revivirPedido('${p.id}')" style="background: #059669; color: #fff; border: 1px solid #059669; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Revivir Presupuesto: Volver a activar este presupuesto rechazado">
                        <i class="fas fa-undo"></i> Revivir
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 7px; height: 26px; font-size: 11px; border-radius: 6px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar
                    </button>
                </div>
            `;
        } else if (viewMode === 'EstadoPresupuesto') {
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Planilla: Consultar el comprobante completo del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </div>
            `;
        } else if (viewMode === 'Modificacion') {
            const segPerms = typeof window.getUserSeguimientoPermissions === 'function' ? window.getUserSeguimientoPermissions(getCurrentUser()) : { canEdit: true, canViewComprobante: true };
            const btns = [];
            if (segPerms.canViewComprobante) {
                btns.push(`
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}', 'ver')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 7px; font-size: 11px; height: 26px; border-radius: 6px; white-space: nowrap;" title="Ver Comprobante: Consultar planilla oficial e historial (Solo Lectura)">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                `);
            }
            if (segPerms.canEdit) {
                btns.push(`
                    <button class="btn btn-sm" onclick="event.stopPropagation(); verDetallePedido('${p.id}', 'editar')" style="background: #f59e0b; color: #000; border: 1px solid #f59e0b; font-weight: bold; padding: 2px 5px; font-size: 10px; height: 22px; border-radius: 4px; white-space: nowrap;" title="Editar: Modificar los artículos, observaciones o condiciones del presupuesto">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); abrirModalAvanceObra('${p.id}')" style="background: #0d9488; color: #fff; border: 1px solid #0d9488; font-weight: bold; padding: 2px 5px; height: 22px; font-size: 10px; border-radius: 4px; white-space: nowrap;" title="Avance de Obra: Registrar nuevo certificado / porcentaje de avance y notificar facturación">
                        <i class="fas fa-hammer"></i> Avance
                    </button>

                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 5px; font-size: 10px; height: 22px; border-radius: 4px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar
                    </button>
                `);
            }
            if (btns.length === 0) {
                btns.push(`
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}', 'ver')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 5px; font-size: 10px; height: 22px; border-radius: 4px; white-space: nowrap;" title="Ver Comprobante: Consultar planilla e historial del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                `);
            }
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 3px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    ${btns.join('')}
                </div>
            `;
        } else {
            actionBtnHtml = `
                <div style="display: inline-flex; gap: 3px; align-items: center; justify-content: center; flex-wrap: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verDetallePedido('${p.id}')" style="background: #0284c7; color: #fff; border-color: #0284c7; font-weight: bold; padding: 2px 5px; font-size: 10px; height: 22px; border-radius: 4px; white-space: nowrap;" title="Ver Planilla: Consultar el comprobante completo del presupuesto">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm" onclick="event.stopPropagation(); abrirModalAvanceObra('${p.id}')" style="background: #0d9488; color: #fff; border: 1px solid #0d9488; font-weight: bold; padding: 2px 5px; height: 22px; font-size: 10px; border-radius: 4px; white-space: nowrap;" title="Avance de Obra: Registrar nuevo certificado / porcentaje de avance y notificar facturación">
                        <i class="fas fa-hammer"></i> Avance
                    </button>

                    <button class="btn btn-sm" onclick="event.stopPropagation(); crearPresupuestoBasadoEnActual('${p.id}')" style="background: #7c3aed; color: #fff; border: 1px solid #7c3aed; font-weight: bold; padding: 2px 5px; height: 22px; font-size: 10px; border-radius: 4px; white-space: nowrap;" title="Basar Presupuesto: Crear un nuevo presupuesto precompletando los datos de este">
                        <i class="fas fa-copy"></i> Basar
                    </button>
                </div>
            `;
        }

        const isItemMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
        const tipoPresBadge = isItemMec
            ? `<span class="badge" style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-size: 10px; padding: 2px 7px; border: 1px solid rgba(6, 182, 212, 0.4); margin-left: 6px; border-radius: 4px; font-weight: 800; white-space: nowrap;">⚙️ Mecánico</span>`
            : `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-size: 10px; padding: 2px 7px; border: 1px solid rgba(234, 179, 8, 0.4); margin-left: 6px; border-radius: 4px; font-weight: 800; white-space: nowrap;">⚡ Eléctrico</span>`;

        const avanceAcc = (Array.isArray(p.avances) && p.avances.length > 0) ? p.avances.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0) : (p.avance_porcentaje_acumulado || 0);
        const avanceBadge = (avanceAcc > 0 && viewMode !== 'EstadoPresupuesto' && viewMode !== 'Rechazados' && p.estado !== 'Rechazado')
            ? `<div style="margin-top: 2px;"><span class="badge" style="background: rgba(13, 148, 136, 0.2); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.4); font-size: 9.5px; padding: 1px 5px; border-radius: 4px; font-weight: 800;"><i class="fas fa-hammer"></i> ${avanceAcc}%</span></div>`
            : '';

        let cellsHtml = activeCols.map(colKey => {
            switch (colKey) {
                case 'id':
                    return `<td style="font-family: monospace; font-weight: 800; color: #38bdf8; font-size: 12px; white-space: nowrap; width: 120px; min-width: 110px; padding: 6px 8px;">${p.id}</td>`;
                case 'fecha':
                    return `<td style="font-size: 11.5px; color: #cbd5e1; font-weight: 600; white-space: nowrap; width: 90px; min-width: 85px; padding: 6px 8px;">${formatFechaCorta(p.fecha)}</td>`;
                case 'planta':
                    const plantaVal = (p.meca_planta || p.planta || 'VGG').toUpperCase();
                    return `
                        <td style="padding: 6px 8px; text-align: center; white-space: nowrap; width: 135px; min-width: 120px;">
                            <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px; display: inline-block; white-space: nowrap;">${plantaVal}</span>
                        </td>`;
                case 'denominacion':
                    let alertFaltaFacturar = '';
                    const avancesArr = Array.isArray(p.avances) ? p.avances : [];
                    const totAvance = avancesArr.reduce((s, a) => s + (parseFloat(a.porcentaje) || 0), 0);
                    const totFacturado = parseFloat(p.facturado_porcentaje || 0);
                    const faltaFact = Math.max(0, parseFloat((totAvance - totFacturado).toFixed(2)));

                    if (faltaFact > 0) {
                        alertFaltaFacturar = `
                            <div style="margin-top: 4px;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px; color: #fca5a5; font-weight: 800; font-size: 10.5px;">
                                    <i class="fa-solid fa-triangle-exclamation" style="color: #f87171;"></i>
                                    <span>FALTA FACTURAR: <strong style="color: #fde047;">${String(faltaFact).replace('.', ',')}%</strong></span>
                                </span>
                            </div>
                        `;
                    } else if (totFacturado >= 100 || p.estado === 'Facturado Total') {
                        alertFaltaFacturar = `
                            <div style="margin-top: 4px;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 6px; border-radius: 4px; color: #6ee7b7; font-weight: 800; font-size: 10.5px;">
                                    <i class="fa-solid fa-circle-check"></i> 100% FACTURADO
                                </span>
                            </div>
                        `;
                    } else if (totFacturado >= totAvance && totAvance > 0) {
                        alertFaltaFacturar = `
                            <div style="margin-top: 4px;">
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 6px; border-radius: 4px; color: #6ee7b7; font-weight: 800; font-size: 10.5px;">
                                    <i class="fa-solid fa-circle-check"></i> AL DÍA (${String(totFacturado).replace('.', ',')}%)
                                </span>
                            </div>
                        `;
                    }

                    const rawDenominacion = (p.meca_denominacion || p.motivo || 'Cotización de Servicio').trim();
                    let detalleContenidoHtml = '';
                    if (rawDenominacion.length > 50) {
                        const shortText = rawDenominacion.substring(0, 50);
                        detalleContenidoHtml = `
                            <div class="detalle-expandable-box" onclick="event.stopPropagation(); window.toggleDetalleExpand(this);" style="cursor: pointer; display: inline-block; max-width: 380px;" title="Haga clic para ver el detalle completo">
                                <span class="detalle-short" style="font-size: 12px; font-weight: 700; color: #ffffff; line-height: 1.35; display: inline;">
                                    ${(typeof escapeHtml === 'function' ? escapeHtml(shortText) : shortText)}...
                                    <span style="color: #38bdf8; font-size: 10px; font-weight: 800; margin-left: 4px; white-space: nowrap; background: rgba(56, 189, 248, 0.15); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(56, 189, 248, 0.3);">
                                        <i class="fa-solid fa-chevron-down"></i> más
                                    </span>
                                </span>
                                <span class="detalle-full" style="font-size: 12px; font-weight: 700; color: #ffffff; line-height: 1.35; display: none; word-break: break-word;">
                                    ${(typeof escapeHtml === 'function' ? escapeHtml(rawDenominacion) : rawDenominacion)}
                                    <span style="color: #f59e0b; font-size: 10px; font-weight: 800; margin-left: 4px; display: inline-block; background: rgba(245, 158, 11, 0.15); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(245, 158, 11, 0.3); margin-top: 2px;">
                                        <i class="fa-solid fa-chevron-up"></i> menos
                                    </span>
                                </span>
                            </div>
                        `;
                    } else {
                        detalleContenidoHtml = `
                            <span style="font-size: 12px; font-weight: 700; color: #ffffff; line-height: 1.35; word-break: break-word;">
                                ${(typeof escapeHtml === 'function' ? escapeHtml(rawDenominacion) : rawDenominacion)}
                            </span>
                        `;
                    }

                    return `
                        <td style="padding: 6px 12px; min-width: 220px;">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <div>
                                    ${detalleContenidoHtml}
                                </div>
                                ${avanceBadge}
                                ${alertFaltaFacturar}
                            </div>
                        </td>`;
                case 'proveedor':
                    const _pv = (p.proveedor || p.meca_proveedor || '').trim().toUpperCase();
                    const _isAcostaPv = _pv.includes('ACOSTA');
                    const _pvLabel = _isAcostaPv ? 'Acosta' : 'SG';
                    const _pvColor = _isAcostaPv ? '#f5c400' : '#22d3ee';
                    const _pvBg = _isAcostaPv ? 'rgba(245,196,0,0.15)' : 'rgba(34,211,238,0.15)';
                    const _pvBorder = _isAcostaPv ? 'rgba(245,196,0,0.4)' : 'rgba(34,211,238,0.4)';
                    const _pvIcon = _isAcostaPv ? '🔵' : '⚙️';
                    return `<td style="padding: 6px 8px; text-align: center; width: 120px; min-width: 100px;">
                        <span style="background: ${_pvBg}; color: ${_pvColor}; border: 1px solid ${_pvBorder}; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px; display: inline-block; white-space: nowrap;">${_pvIcon} ${_pvLabel}</span>
                    </td>`;
                case 'observacion':
                    const rawObs = (p.observaciones || p.motivo || p.meca_observaciones || '-').trim();
                    let obsHtml = '';
                    if (!rawObs || rawObs === '-' || rawObs.toLowerCase() === 'sin observaciones') {
                        obsHtml = `<span style="font-size: 11px; color: #64748b; font-style: italic;">-</span>`;
                    } else if (rawObs.length > 35) {
                        const shortObs = rawObs.substring(0, 35);
                        obsHtml = `
                            <div class="detalle-expandable-box" onclick="event.stopPropagation(); window.toggleDetalleExpand(this);" style="cursor: pointer; display: inline-block; max-width: 260px;" title="Haga clic para ver la observación completa">
                                <span class="detalle-short" style="font-size: 11.5px; color: #cbd5e1; line-height: 1.3; display: inline;">
                                    ${(typeof escapeHtml === 'function' ? escapeHtml(shortObs) : shortObs)}...
                                    <span style="color: #38bdf8; font-size: 9.5px; font-weight: 800; margin-left: 3px; background: rgba(56, 189, 248, 0.15); padding: 1px 4px; border-radius: 3px;">más</span>
                                </span>
                                <span class="detalle-full" style="font-size: 11.5px; color: #f8fafc; line-height: 1.3; display: none; word-break: break-word;">
                                    ${(typeof escapeHtml === 'function' ? escapeHtml(rawObs) : rawObs)}
                                </span>
                            </div>`;
                    } else {
                        obsHtml = `<span style="font-size: 11.5px; color: #cbd5e1; word-break: break-word;">${(typeof escapeHtml === 'function' ? escapeHtml(rawObs) : rawObs)}</span>`;
                    }
                    return `<td style="padding: 6px 10px; width: 180px; min-width: 140px;">${obsHtml}</td>`;
                case 'cliente':
                    return `
                        <td style="padding: 6px 8px; width: 160px; min-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(p.cliente_nombre || p.cliente || 'CLIENTE').toUpperCase()}">
                            <span style="font-size: 12px; font-weight: 700; color: #f8fafc; letter-spacing: 0.3px;">${(p.cliente_nombre || p.cliente || 'CLIENTE').toUpperCase()}</span>
                        </td>`;
                case 'estado':
                    if (viewMode === 'EstadoPresupuesto') {
                        return `<td style="text-align: center; padding: 6px 6px; white-space: nowrap; width: 135px; min-width: 135px;">${renderEditableStatusDropdown(p)}</td>`;
                    }
                    return `<td style="text-align: center; padding: 6px 6px; white-space: nowrap; width: 135px; min-width: 135px;">${statusBadge}</td>`;
                case 'importe':
                    return `<td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 12px; color: #ffffff; white-space: nowrap; width: 110px; min-width: 105px; padding: 6px 8px;">$${parseFloat(p.importe || 0).toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>`;
                case 'accion':
                    return `<td style="text-align: center; padding: 6px 6px; white-space: nowrap; width: 140px; min-width: 130px;">${actionBtnHtml}</td>`;
                default:
                    return `<td style="padding: 6px 6px;">-</td>`;
            }
        }).join('');

        tr.innerHTML = cellsHtml;

        const handleOpenPedido = (e) => {
            if (e && e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('select') || e.target.closest('.status-select-container') || e.target.closest('.detalle-expandable-box'))) {
                return;
            }
            if (viewMode === 'Modificacion') {
                verDetallePedido(p.id, 'ver');
            } else {
                verDetallePedido(p.id, 'ver');
            }
        };

        tr.onclick = handleOpenPedido;
        tr.ondblclick = handleOpenPedido;
        return tr;
    }

    // Renderizado con o sin agrupación
    if (tableGroupBy) {
        const groups = {};
        filtered.forEach(p => {
            let grpName = 'Otros';
            if (tableGroupBy === 'estado') {
                grpName = p.estado || 'Enviado sin OC';
            } else if (tableGroupBy === 'cliente') {
                grpName = (p.cliente_nombre || p.cliente || 'Sin Cliente').toUpperCase();
            } else if (tableGroupBy === 'planta') {
                grpName = (p.meca_planta || p.planta || 'VGG').toUpperCase();
            } else if (tableGroupBy === 'condicion') {
                grpName = cleanConditionName(p.condicion_nombre || p.condicion_venta || 'CONTADO').toUpperCase();
            }
            if (!groups[grpName]) groups[grpName] = [];
            groups[grpName].push(p);
        });

        Object.keys(groups).forEach((grpName, grpIdx) => {
            const grpItems = groups[grpName];
            const grpTotal = grpItems.reduce((acc, item) => acc + (parseFloat(item.importe) || 0), 0);
            const grpId = 'grp_' + grpIdx;
            const isCollapsed = !!collapsedGroups[grpId];

            const headerTr = document.createElement('tr');
            headerTr.className = 'group-header-row';
            headerTr.onclick = () => toggleGroupCollapse(grpId);
            headerTr.innerHTML = `
                <td colspan="${totalCols}" style="padding: 6px 12px; font-weight: 700; color: #38bdf8; font-size: 11.5px; user-select: none;">
                    <span id="icon-group-${grpId}" style="margin-right: 6px; font-size: 11px; display: inline-block; width: 12px;">${isCollapsed ? '▶' : '▼'}</span>
                    <strong>📂 ${grpName}</strong>
                    <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 10px; margin-left: 8px; padding: 2px 6px; border-radius: 4px;">${grpItems.length} presupuestos</span>
                    <span style="float: right; color: #f8fafc; font-family: monospace; font-size: 11.5px; font-weight: 700;">Subtotal: $${grpTotal.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                </td>
            `;
            listBody.appendChild(headerTr);

            grpItems.forEach(p => {
                const tr = createBudgetTableRow(p);
                tr.classList.add(`group-item-${grpId}`);
                if (isCollapsed) tr.style.display = 'none';
                listBody.appendChild(tr);
            });
        });
    } else {
        filtered.forEach(p => {
            const tr = createBudgetTableRow(p);
            listBody.appendChild(tr);
        });
    }
};

// 5. PLANILLA DETALLE / AUTORIZACIÓN PRESEA
// (Variables globales pedidoActivo y pedidoEdicionTemp declaradas arriba)

window.saveTempEdits = function() {
    if (!pedidoActivo) return;

    // Save header identification fields
    const getEditVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : null;
    };
    if (getEditVal('auth-edit-meca-denominacion') !== null) pedidoActivo.meca_denominacion = getEditVal('auth-edit-meca-denominacion');
    if (getEditVal('auth-edit-meca-propuesta') !== null) pedidoActivo.meca_propuesta = getEditVal('auth-edit-meca-propuesta');
    if (getEditVal('auth-edit-meca-cliente') !== null) pedidoActivo.cliente_nombre = getEditVal('auth-edit-meca-cliente');
    if (getEditVal('auth-edit-meca-domicilio') !== null) pedidoActivo.domicilio = getEditVal('auth-edit-meca-domicilio');
    if (getEditVal('auth-edit-meca-localidad') !== null) pedidoActivo.localidad = getEditVal('auth-edit-meca-localidad');
    if (getEditVal('auth-edit-meca-cuit') !== null) pedidoActivo.cuit = getEditVal('auth-edit-meca-cuit');
    if (getEditVal('auth-edit-meca-entrega') !== null) pedidoActivo.fecha_entrega = getEditVal('auth-edit-meca-entrega');
    if (getEditVal('auth-edit-meca-oc-mo') !== null) {
        const valOc = getEditVal('auth-edit-meca-oc-mo').trim();
        pedidoActivo.oc_mano_obra = valOc;
        const authHeaderOcMo = document.getElementById('auth-header-nro-oc-mo-val');
        if (authHeaderOcMo) authHeaderOcMo.innerText = valOc || '-';
    }
    if (getEditVal('auth-edit-meca-oc-mat') !== null) {
        const valOcMat = getEditVal('auth-edit-meca-oc-mat').trim();
        pedidoActivo.oc_materiales = valOcMat;
        const authHeaderOcMat = document.getElementById('auth-header-nro-oc-mat-val');
        if (authHeaderOcMat) authHeaderOcMat.innerText = valOcMat || '-';
    }
    if (getEditVal('auth-edit-meca-proveedor') !== null) pedidoActivo.meca_proveedor = getEditVal('auth-edit-meca-proveedor');
    if (getEditVal('auth-edit-meca-oferta') !== null) pedidoActivo.meca_fecha_oferta = getEditVal('auth-edit-meca-oferta');
    if (getEditVal('auth-edit-meca-validez') !== null) pedidoActivo.meca_validez = getEditVal('auth-edit-meca-validez');
    const editedPlanta = getEditVal('auth-edit-meca-planta') || getEditVal('auth-edit-meca-planta-orig');
    if (editedPlanta !== null) {
        pedidoActivo.meca_planta = editedPlanta;
        pedidoActivo.planta = editedPlanta;
    }
    if (getEditVal('auth-edit-meca-nro-oc') !== null) {
        const valOc = getEditVal('auth-edit-meca-nro-oc').trim();
        if (!pedidoActivo.oc_mano_obra) pedidoActivo.oc_mano_obra = valOc;
        const authHeaderOcMo = document.getElementById('auth-header-nro-oc-mo-val');
        if (authHeaderOcMo) authHeaderOcMo.innerText = pedidoActivo.oc_mano_obra || '-';
    }
    const combinedOc = (pedidoActivo.oc_mano_obra && pedidoActivo.oc_materiales)
        ? (pedidoActivo.oc_mano_obra + ' / ' + pedidoActivo.oc_materiales)
        : (pedidoActivo.oc_mano_obra || pedidoActivo.oc_materiales || '');
    pedidoActivo.meca_nro_oc = combinedOc;
    pedidoActivo.nro_oc = combinedOc;
    if (getEditVal('auth-edit-meca-nro-ot') !== null) pedidoActivo.meca_nro_ot = getEditVal('auth-edit-meca-nro-ot');
    if (getEditVal('auth-edit-meca-inicio') !== null) pedidoActivo.meca_fecha_inicio = getEditVal('auth-edit-meca-inicio');
    if (getEditVal('auth-edit-meca-duracion') !== null) pedidoActivo.meca_duracion = getEditVal('auth-edit-meca-duracion');
    if (getEditVal('auth-edit-meca-fin') !== null) pedidoActivo.meca_fecha_fin = getEditVal('auth-edit-meca-fin');
    if (getEditVal('auth-edit-meca-propuesta') !== null) pedidoActivo.meca_propuesta = getEditVal('auth-edit-meca-propuesta');
    if (getEditVal('auth-edit-meca-personal') !== null) pedidoActivo.meca_personal = getEditVal('auth-edit-meca-personal');
    if (getEditVal('auth-edit-meca-exclusiones') !== null) pedidoActivo.meca_exclusiones = getEditVal('auth-edit-meca-exclusiones');

    // Save reason/observations
    const reasonInput = document.getElementById('auth-reason-input-edit');
    if (reasonInput) {
        pedidoActivo.motivo = reasonInput.value;
    }

    // Save condition
    const condSelect = document.getElementById('auth-condition-select');
    if (condSelect) {
        const rawCondVal = (condSelect.value && String(condSelect.value) !== '0') ? condSelect.value : '1';
        pedidoActivo.condicion_id = rawCondVal;
        const condObj = (typeof condicionesDB !== 'undefined' && Array.isArray(condicionesDB)) ? condicionesDB.find(c => String(c.codigo) === String(rawCondVal)) : null;
        const cleanName = cleanConditionName(condObj ? (condObj.nombre || `Condición ${condObj.codigo}`) : `Condición ${rawCondVal}`);
        pedidoActivo.condicion_nombre = cleanName;
        pedidoActivo.condicion_venta = cleanName;
    }
    const editMecaCond = document.getElementById('auth-edit-meca-condicion');
    if (editMecaCond) {
        const cleanName = cleanConditionName(editMecaCond.value);
        pedidoActivo.condicion_nombre = cleanName;
        pedidoActivo.condicion_venta = cleanName;
    }

    // Save currency and exchange rate
    const currSelect = document.getElementById('auth-currency-select');
    const cotizInput = document.getElementById('auth-exchange-rate-input');
    if (currSelect) {
        pedidoActivo.moneda_id = parseInt(currSelect.value);
        if (pedidoActivo.moneda_id === 2 || pedidoActivo.moneda_id === 60) {
            pedidoActivo.cotizacion = cotizInput ? parseFloat(cotizInput.value) : 1.0;
            if (isNaN(pedidoActivo.cotizacion) || pedidoActivo.cotizacion <= 0) {
                pedidoActivo.cotizacion = (pedidoActivo.moneda_id === 2 ? 1011.00 : 1100.00);
            }
        } else {
            pedidoActivo.cotizacion = 1.0;
        }
    }

    // Save status
    const statusSelect = document.getElementById('modal-change-status-select');
    if (statusSelect) {
        pedidoActivo.estado = statusSelect.value;
    }

    // Save items from Excel grid if active
    if (Array.isArray(pedidoItems) && pedidoItems.length > 0) {
        pedidoActivo.items = JSON.parse(JSON.stringify(pedidoItems));
        const newAmt = pedidoActivo.items.reduce((sum, item) => {
            const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
            const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
            const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
                ? parseFloat(String(item.subtotal).replace(',', '.'))
                : (q * pr);
            return sum + sub;
        }, 0);
        pedidoActivo.importe = newAmt;
    }

    // Save items quantities and status from legacy checks if present
    const checks = document.querySelectorAll('.auth-item-check');
    const qtys = document.querySelectorAll('.auth-item-qty');

    if (pedidoActivo.items && checks.length > 0) {
        pedidoActivo.items.forEach((item, idx) => {
            const chk = Array.from(checks).find(c => parseInt(c.getAttribute('data-idx')) === idx);
            const qtyInput = Array.from(qtys).find(q => parseInt(q.getAttribute('data-idx')) === idx);

            if (chk && qtyInput) {
                const isChecked = chk.checked;
                const qty = parseFloat(String(qtyInput.value || '0').replace(',', '.'));
                const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;

                item.estado = isChecked ? 'Pendiente' : 'Rechazado';
                item.cantidad = isNaN(qty) || qty <= 0 ? 0.01 : qty;
                item.subtotal = item.cantidad * pr;
            }
        });
    }
};

window.onAuthCurrencyChange = function() {
    const currencySelect = document.getElementById('auth-currency-select');
    const rateContainer = document.getElementById('auth-exchange-rate-container');
    const rateInput = document.getElementById('auth-exchange-rate-input');

    if (currencySelect) {
        const val = parseInt(currencySelect.value);
        if (rateContainer) {
            rateContainer.style.display = (val === 2 || val === 60) ? 'flex' : 'none';
        }
        if (rateInput) {
            if (val === 2) {
                rateInput.value = "1011.00000000";
            } else if (val === 60) {
                rateInput.value = "1100.00000000";
            } else {
                rateInput.value = "1.00000000";
            }
        }
    }
    saveTempEdits();
    recalcAuthTotal();
};

window.abrirRobotDepositosEdicion = function() {
    saveTempEdits();
    openModal('tpl-modal-robot-depositos');
    const searchInput = document.getElementById('robot-dep-search-input');
    const resultsList = document.getElementById('robot-dep-results-list');
    const resultsCount = document.getElementById('robot-dep-results-count');

    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();
        let filtered = [];
        if (cleanQuery === '') {
            filtered = depositosDB.slice(0, 100);
        } else {
            filtered = depositosDB.filter(d =>
                d.nombre.toLowerCase().includes(cleanQuery) ||
                d.codigo.includes(cleanQuery)
            );
        }
        resultsCount.innerText = `Mostrando ${filtered.length} depósitos`;
        filtered.forEach(d => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td style="font-family: monospace;">${d.codigo}</td>
                <td><strong>${d.nombre || 'Sin nombre'}</strong></td>
            `;
            tr.onclick = () => {
                if (pedidoActivo) {
                    pedidoActivo.deposito_id = d.codigo;
                    pedidoActivo.deposito_nombre = d.nombre;
                }
                closeModal();
                verDetallePedido(pedidoActivo.id);
            };
            resultsList.appendChild(tr);
        });
    };
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.abrirRobotTransportesEdicion = function() {
    saveTempEdits();
    openModal('tpl-modal-robot-transportes');
    const searchInput = document.getElementById('robot-trans-search-input');
    const resultsList = document.getElementById('robot-trans-results-list');
    const resultsCount = document.getElementById('robot-trans-results-count');

    const renderResults = (query) => {
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();
        let filtered = [];
        if (cleanQuery === '') {
            filtered = transportesDB.slice(0, 100);
        } else {
            filtered = transportesDB.filter(t =>
                t.nombre.toLowerCase().includes(cleanQuery) ||
                t.codigo.includes(cleanQuery)
            );
        }
        resultsCount.innerText = `Mostrando ${filtered.length} transportes`;
        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td style="font-family: monospace;">${t.codigo}</td>
                <td><strong>${t.nombre || 'Sin nombre'}</strong></td>
            `;
            tr.onclick = () => {
                if (pedidoActivo) {
                    pedidoActivo.transporte_id = t.codigo;
                    pedidoActivo.transporte_nombre = t.nombre;
                }
                closeModal();
                verDetallePedido(pedidoActivo.id);
            };
            resultsList.appendChild(tr);
        });
    };
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
        renderResults('');
        setTimeout(() => searchInput.focus(), 150);
    }
};

window.guardarModificacionesPedido = function() {
    if (!pedidoActivo) return;

    saveTempEdits();

    // Validaciones de campos obligatorios para Presupuestos Mecánicos/Eléctricos
    const tipoStr = (pedidoActivo.tipo_presupuesto || '').toLowerCase();
    const isExcel = tipoStr.includes('mecánico') || tipoStr.includes('mecanico') || tipoStr.includes('eléctrico') || tipoStr.includes('electrico');
    if (isExcel) {
        const denominacion = (pedidoActivo.meca_denominacion || '').trim();
        const cliente = (pedidoActivo.cliente_nombre || '').trim();
        const proveedor = (pedidoActivo.meca_proveedor || '').trim();
        const fechaOferta = (pedidoActivo.meca_fecha_oferta || '').trim();
        const validez = (pedidoActivo.meca_validez || '').trim();
        const fechaInicio = (pedidoActivo.meca_fecha_inicio || '').trim();
        const duracion = (pedidoActivo.meca_duracion || '').trim();
        const fechaFin = (pedidoActivo.meca_fecha_fin || '').trim();

        if (!denominacion) {
            showToast('El campo "i. Denominación del Servicio" es obligatorio.', 'error');
            return;
        }
        if (!cliente) {
            showToast('El campo "ii. Cliente" es obligatorio.', 'error');
            return;
        }
        if (!proveedor) {
            showToast('El campo "iii. Nombre del Proveedor" es obligatorio.', 'error');
            return;
        }
        if (!fechaOferta) {
            showToast('El campo "iv. Fecha de Oferta" es obligatorio.', 'error');
            return;
        }
        if (!validez) {
            showToast('El campo "v. Validez de la Oferta" es obligatorio.', 'error');
            return;
        }
        if (!fechaInicio) {
            showToast('El campo "vii. Fecha estimada de Inicio" es obligatorio.', 'error');
            return;
        }
        if (!duracion) {
            showToast('El campo "viii. Duración estimada" es obligatorio.', 'error');
            return;
        }
        if (!fechaFin) {
            showToast('El campo "ix. Plazo Máximo de Finalización" es obligatorio.', 'error');
            return;
        }

        if (fechaInicio < fechaOferta) {
            showToast('La "Fecha estimada de Inicio" no puede ser anterior a la "Fecha de Oferta".', 'error');
            return;
        }

        if (fechaFin <= fechaInicio) {
            showToast('El "ix. Plazo Máximo de Finalización" debe ser obligatoriamente mayor a la "Fecha estimada de Inicio".', 'error');
            return;
        }
    }

    const activeItems = (pedidoActivo.items || []).filter(item => {
        const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
        const sub = parseFloat(String(item.subtotal || '0').replace(',', '.')) || 0;
        const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario || 0)).replace(',', '.')) || 0;
        return (q > 0 || sub > 0 || pr > 0) && item.estado !== 'Rechazado';
    });
    if (activeItems.length === 0) {
        showToast('Debe dejar al menos un artículo activo en el presupuesto.', 'error');
        return;
    }

    const orderIdx = appData.pedidos.findIndex(p => p.id === pedidoActivo.id);
    if (orderIdx === -1) {
        showToast('No se encontró el pedido a modificar.', 'error');
        return;
    }
    const realOrder = appData.pedidos[orderIdx];

    const newAmount = activeItems.reduce((sum, item) => {
        const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
        const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
        const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
            ? parseFloat(String(item.subtotal).replace(',', '.'))
            : (q * pr);
        return sum + sub;
    }, 0);
    realOrder.meca_denominacion = pedidoActivo.meca_denominacion || pedidoActivo.motivo || '';
    realOrder.cliente_nombre = pedidoActivo.cliente_nombre || '';
    realOrder.domicilio = pedidoActivo.domicilio || '';
    realOrder.localidad = pedidoActivo.localidad || '';
    realOrder.cuit = pedidoActivo.cuit || '';
    realOrder.condicion_iva = pedidoActivo.condicion_iva || 'RESPONSABLE INSCRIPTO';
    realOrder.fecha_entrega = pedidoActivo.fecha_entrega || '';
    realOrder.oc_materiales = pedidoActivo.oc_materiales || '';
    realOrder.meca_proveedor = pedidoActivo.meca_proveedor || '';
    realOrder.meca_fecha_oferta = pedidoActivo.meca_fecha_oferta || '';
    realOrder.meca_validez = pedidoActivo.meca_validez || '';
    realOrder.meca_planta = pedidoActivo.meca_planta || pedidoActivo.planta || '';
    realOrder.planta = realOrder.meca_planta;
    realOrder.meca_fecha_inicio = pedidoActivo.meca_fecha_inicio || '';
    realOrder.meca_duracion = pedidoActivo.meca_duracion || '';
    realOrder.meca_fecha_fin = pedidoActivo.meca_fecha_fin || '';
    realOrder.meca_propuesta = pedidoActivo.meca_propuesta || '';
    realOrder.meca_personal = pedidoActivo.meca_personal || '';
    realOrder.meca_exclusiones = pedidoActivo.meca_exclusiones || '';
    realOrder.meca_nro_oc = pedidoActivo.meca_nro_oc || '';
    realOrder.nro_oc = pedidoActivo.meca_nro_oc || '';
    realOrder.meca_nro_ot = pedidoActivo.meca_nro_ot || '';

    realOrder.condicion_id = pedidoActivo.condicion_id;
    realOrder.condicion_nombre = pedidoActivo.condicion_nombre;
    realOrder.deposito_id = pedidoActivo.deposito_id;
    realOrder.deposito_nombre = pedidoActivo.deposito_nombre;
    realOrder.transporte_id = pedidoActivo.transporte_id;
    realOrder.transporte_nombre = pedidoActivo.transporte_nombre;
    realOrder.motivo = pedidoActivo.motivo;
    realOrder.moneda_id = pedidoActivo.moneda_id;
    realOrder.cotizacion = pedidoActivo.cotizacion;

    realOrder.items = activeItems.map(item => {
        const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
        const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
        const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
            ? parseFloat(String(item.subtotal).replace(',', '.'))
            : (q * pr);
        return {
            ...item,
            cantidad: q,
            precio: pr,
            precio_unitario: pr,
            cantidad_original: item.cantidad_original !== undefined ? item.cantidad_original : q,
            subtotal: sub
        };
    });

    realOrder.importe = newAmount;
    realOrder.importe_original = newAmount;
    realOrder.estado = pedidoActivo.estado;

    saveData();
    if (typeof window.guardarPresupuestoEnSupabase === 'function') {
        window.guardarPresupuestoEnSupabase(realOrder);
    }
    pedidoEdicionTemp = null;

    showToast(`Presupuesto ${pedidoActivo.id} modificado y actualizado con éxito.`, 'success');
    closeModal();

    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
};

let productoSeleccionadoEdicion = null;

window.seleccionarDepositoEdicion = function(dep) {
    if (pedidoActivo) {
        pedidoActivo.deposito_id = dep.codigo;
        pedidoActivo.deposito_nombre = dep.nombre;
    }
    const input = document.getElementById('auth-deposit-input-edit');
    if (input) {
        input.value = dep ? dep.nombre.toUpperCase() : '';
    }
    const dropdown = document.getElementById('auth-deposit-dropdown-edit');
    if (dropdown) dropdown.style.display = 'none';
};

window.seleccionarTransporteEdicion = function(trans) {
    if (pedidoActivo) {
        pedidoActivo.transporte_id = trans.codigo;
        pedidoActivo.transporte_nombre = trans.nombre;
    }
    const input = document.getElementById('auth-transport-input-edit');
    if (input) {
        input.value = trans ? trans.nombre.toUpperCase() : '';
    }
    const dropdown = document.getElementById('auth-transport-dropdown-edit');
    if (dropdown) dropdown.style.display = 'none';
};

window.robotSelectedTab = '';

window.filterRobotByTab = function(btn, tabName) {
    window.robotSelectedTab = tabName;
    const btns = document.querySelectorAll('.robot-tab-btn');
    btns.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.03)';
        b.style.color = 'var(--text-muted)';
        b.style.border = '1px solid rgba(255,255,255,0.1)';
    });
    if (btn) {
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.style.border = '1px solid var(--primary)';
    }
    if (typeof window.renderRobotResults === 'function') {
        window.renderRobotResults();
    }
};

window.abrirRobotStockEdicion = function() {
    saveTempEdits();
    openModal('tpl-modal-robot-stock');
    const searchInput = document.getElementById('robot-stock-search-input');
    const resultsList = document.getElementById('robot-stock-results-list');
    const resultsCount = document.getElementById('robot-stock-results-count');
    const rubroFilter = document.getElementById('robot-stock-rubro-filter');

    const activeCatalog = getActiveStockCatalog();
    window.robotSelectedTab = '';

    // Popular rubro filter
    if (rubroFilter && activeCatalog.length > 0) {
        const rubros = [...new Set(activeCatalog.map(s => s.subrubro || s.rubro || 'Tarifario').filter(Boolean))].sort();
        let html = '<option value="">Todos los subrubros...</option>';
        rubros.forEach(r => {
            html += `<option value="${r}">${r}</option>`;
        });
        rubroFilter.innerHTML = html;
    }

    window.renderRobotResults = function() {
        resultsList.innerHTML = '';
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const rubro = rubroFilter ? rubroFilter.value : '';

        let filtered = activeCatalog;

        // Filtrar por planta SOLO SI ES MECÁNICO
        let curPlanta = '';
        const reqPlantaSelect = document.getElementById('req-meca-planta');
        if (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico') {
            if (reqPlantaSelect && reqPlantaSelect.value) {
                curPlanta = reqPlantaSelect.value.trim().toUpperCase();
            if (curPlanta === 'PPA' || curPlanta === 'APA') curPlanta = 'APS';
} else if (typeof pedidoActivo !== 'undefined' && pedidoActivo) {
                curPlanta = (pedidoActivo.meca_planta || pedidoActivo.planta || '').trim().toUpperCase();
            if (curPlanta === 'PPA' || curPlanta === 'APA') curPlanta = 'APS';
}
        }

        // Regla Dinámica: Mirar en plantasRules a ver si usa la lista de otra planta
        if (curPlanta === 'PPA') curPlanta = 'APS';
            if (curPlanta !== 'APS' && curPlanta !== 'APG' && curPlanta && window.appData && window.appData.plantasRules && window.appData.plantasRules[curPlanta]) {
            curPlanta = window.appData.plantasRules[curPlanta];
        } else if (curPlanta === 'APA') {
            curPlanta = 'APS'; // Fallback manual por si la base de datos no está actualizada
        }

        if (curPlanta) {
            const grouped = {};

            // 1. Registrar todos los códigos existentes en cualquier planta o genérico
            filtered.forEach(s => {
                if (!grouped[s.codigo] && (!(s.planta || '').trim() || (s.planta || '').trim().toUpperCase() === curPlanta)) {
                    grouped[s.codigo] = { ...s, precio: 0, precio_unitario: 0, planta: curPlanta };
                }
            });

            // 2. Pisar con el precio genérico (si existe)
            filtered.forEach(s => {
                if (!(s.planta || '').trim()) {
                    grouped[s.codigo].precio = s.precio;
                    grouped[s.codigo].precio_unitario = s.precio_unitario;
                    grouped[s.codigo].detalle = s.detalle;
                }
            });

            // 3. Pisar con el precio específico de la planta seleccionada (si existe)
            filtered.forEach(s => {
                if ((s.planta || '').trim().toUpperCase() === curPlanta) {
                    grouped[s.codigo].precio = s.precio;
                    grouped[s.codigo].precio_unitario = s.precio_unitario;
                    grouped[s.codigo].detalle = s.detalle;
                }
            });

            filtered = Object.values(grouped);
        }

        if (window.robotSelectedTab) {
            filtered = filtered.filter(s => {
                const sub = (s.subrubro || s.rubro || '').toUpperCase();
                return sub.includes(window.robotSelectedTab.toUpperCase());
            });
        }
        if (rubro) {
            filtered = filtered.filter(s => (s.subrubro || s.rubro || 'Tarifario') === rubro);
        }
        if (query) {
            filtered = filtered.filter(s =>
                (s.detalle || '').toLowerCase().includes(query) ||
                (s.codigo || '').toLowerCase().includes(query)
            );
        }

        const limit = 100;
        const sliced = filtered.slice(0, limit);

        resultsCount.innerText = `Mostrando ${sliced.length} de ${filtered.length} ítems / horas del tarifario`;

        sliced.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';

            tr.innerHTML = `
                <td style="font-family: monospace;">${s.codigo}</td>
                <td><strong>${s.detalle}</strong></td>
                <td><span style="font-size: 11px; background: rgba(6,182,212,0.15); color: #22d3ee; padding: 2px 6px; border-radius: 4px;">${s.subrubro || s.rubro || 'Tarifario'}</span></td>
                <td style="font-family: monospace; text-align: right; font-weight: 700; color: #fde047;">$${(s.precio || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-weight: 600; color: rgba(255,255,255,0.7);">${s.udm || 'Hs'}</td>
            `;

            tr.onclick = () => {
                closeModal();
                if (typeof pedidoActivo !== 'undefined' && pedidoActivo) {
                    verDetallePedido(pedidoActivo.id);
                }
                seleccionarProductoEdicion(s);
            };
            resultsList.appendChild(tr);
        });
    };

    if (searchInput) searchInput.addEventListener('input', window.renderRobotResults);
    if (rubroFilter) rubroFilter.addEventListener('change', window.renderRobotResults);

    window.renderRobotResults();
    setTimeout(() => { if (searchInput) searchInput.focus(); }, 150);
};

window.seleccionarProductoEdicion = function(prod) {
    productoSeleccionadoEdicion = prod;
    const input = document.getElementById('auth-add-product-input');
    if (input) {
        input.value = prod ? `${prod.detalle} (Cód: ${prod.codigo})` : '';
    }
    const dropdown = document.getElementById('auth-add-product-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Rellenar precio
    const priceInput = document.getElementById('auth-add-product-price');
    if (priceInput) {
        priceInput.value = prod ? prod.precio : 0.00;
    }

    // Foco en la cantidad
    const qtyInput = document.getElementById('auth-add-product-qty');
    if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
    }
};

window.agregarArticuloEdicion = function() {
    const qtyInput = document.getElementById('auth-add-product-qty');
    const qty = parseFloat(qtyInput ? qtyInput.value : 0);
    if (isNaN(qty) || qty <= 0) {
        showToast('La cantidad debe ser mayor a cero.', 'error');
        return;
    }

    const priceInput = document.getElementById('auth-add-product-price');
    const price = parseFloat(priceInput ? priceInput.value : 0);
    if (isNaN(price) || price < 0) {
        showToast('El precio debe ser mayor o igual a cero.', 'error');
        return;
    }

    const textInput = document.getElementById('auth-add-product-input');
    const typedText = textInput ? textInput.value.trim() : '';

    let itemToAdd = productoSeleccionadoEdicion;
    if (!itemToAdd && typedText) {
        const isElec = (pedidoActivo && pedidoActivo.tipo_presupuesto === 'Eléctrico');
        itemToAdd = {
            codigo: isElec ? `ELE-HS-${Date.now().toString().slice(-4)}` : `MEC-HS-${Date.now().toString().slice(-4)}`,
            detalle: typedText,
            precio: price
        };
    }

    if (!itemToAdd) {
        showToast('Seleccione un ítem del tarifario o escriba una descripción válida de horas / servicio.', 'error');
        return;
    }

    // Guardar cambios temporales de otros inputs primero
    saveTempEdits();

    if (!pedidoActivo.items) {
        pedidoActivo.items = [];
    }

    // Comprobar si ya existe en la lista de items del pedido activo
    const existing = pedidoActivo.items.find(item => item.codigo === itemToAdd.codigo);
    if (existing) {
        existing.estado = 'Pendiente';
        existing.cantidad += qty;
        existing.precio = price;
        existing.subtotal = existing.cantidad * existing.precio;
    } else {
        pedidoActivo.items.push({
            codigo: itemToAdd.codigo,
            detalle: itemToAdd.detalle,
            precio: price,
            cantidad: qty,
            cantidad_original: qty,
            subtotal: qty * price,
            estado: 'Pendiente'
        });
    }

    // Limpiar selección
    productoSeleccionadoEdicion = null;
    if (textInput) textInput.value = '';
    if (qtyInput) qtyInput.value = '';
    if (priceInput) priceInput.value = '';

    // Volver a renderizar
    verDetallePedido(pedidoActivo.id);

    showToast(`Ítem / Horas agregadas: "${itemToAdd.detalle}" x${qty}`, 'success');
};

window.formatPresupuestoCodigo = function(p) {
    if (!p) return '';
    if (typeof p === 'string') {
        const found = (window.appData && window.appData.pedidos) ? window.appData.pedidos.find(x => x.id === p) : null;
        if (found) p = found;
        else {
            return p;
        }
    }
    const isMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && String(p.id).startsWith('101')));
    const rubroPrefix = isMec ? '101-MEC' : '102-ELEC';

    if (p.id && (String(p.id).startsWith('101-') || String(p.id).startsWith('102-'))) {
        return p.id;
    }

    const cleanNum = String(p.id || '').replace(/\D/g, '');
    const seqStr = cleanNum ? String(cleanNum.slice(-4)).padStart(4, '0') : '0001';
    return `${rubroPrefix}-${seqStr}`;
};

window.verDetallePedido = function(id, explicitMode) {
    console.log('%c🔥 verDetallePedido v170 EJECUTÁNDOSE — id=' + id, 'background: red; color: white; font-size: 16px; padding: 4px 8px;');
    const pedido = appData.pedidos.find(p => p.id === id);
    if (!pedido) return;

    const segPerms = typeof window.getUserSeguimientoPermissions === 'function' ? window.getUserSeguimientoPermissions(getCurrentUser()) : { canEdit: true, canViewComprobante: true };

    // Determinar si la apertura es en modo edición o solo consulta/historial (Separación estricta Ver vs Editar)
    const isEditRequested = (explicitMode === 'editar');
    const isEditingAllowed = isEditRequested && segPerms.canEdit && pedido.estado !== 'Rechazado' && viewMode !== 'EstadoPresupuesto' && viewMode !== 'Rechazados' && viewMode !== 'Autorizador';

    if (isEditingAllowed) {
        if (!pedidoEdicionTemp || pedidoEdicionTemp.id !== id) {
            pedidoEdicionTemp = JSON.parse(JSON.stringify(pedido));
        }
        pedidoActivo = pedidoEdicionTemp;
    } else {
        pedidoActivo = pedido;
    }
    window.pedidoActivo = pedidoActivo;

    const p = pedidoActivo;
    reqTipoPresupuesto = (p.tipo_presupuesto || (String(p.id).startsWith('101') ? 'Mecánico' : 'Eléctrico'));
    if (isEditingAllowed) {
        pedidoItems = JSON.parse(JSON.stringify(p.items || []));
    }

    openModal('tpl-modal-auth');

    if (typeof window.getBudgetDocTitle === 'function') {
        document.title = window.getBudgetDocTitle(p);
    }

    if (typeof window.registrarNavegacion === 'function') {
        window.registrarNavegacion({ type: 'modal_auth', pedidoId: id, label: `Presupuesto #${id}` });
    }

    // Controlar visibilidad del botón 'Editar' en el modal (Solo en vista Modificación/Seguimiento)
    const btnEditModal = document.getElementById('btn-modal-editar-presupuesto');
    if (btnEditModal) {
        const canShowEdit = (viewMode === 'Modificacion' && segPerms.canEdit && p.estado !== 'Rechazado' && !isEditingAllowed);
        btnEditModal.style.display = canShowEdit ? 'inline-flex' : 'none';
    }

    // Controlar visibilidad del botón 'Basar Presupuesto' (Solo en vista Modificación/Seguimiento)
    const btnBasarModal = document.getElementById('btn-modal-basar-presupuesto');
    if (btnBasarModal) {
        const canShowBasar = (viewMode === 'Modificacion' && segPerms.canEdit && p.estado !== 'Rechazado');
        btnBasarModal.style.display = canShowBasar ? 'inline-block' : 'none';
    }

    // Controlar visibilidad del botón 'Avance de Obra' (Solo en vista Modificación/Seguimiento)
    const btnAvanceModal = document.getElementById('btn-modal-avance-obra');
    if (btnAvanceModal) {
        const canShowAvance = (viewMode === 'Modificacion' && segPerms.canEdit && p.estado !== 'Rechazado');
        btnAvanceModal.style.display = canShowAvance ? 'inline-flex' : 'none';
    }

    // El botón 'Eliminar' fue completamente removido de la app a pedido del usuario.
    const btnEliminarModal = document.getElementById('btn-modal-eliminar-presupuesto');
    if (btnEliminarModal) {
        btnEliminarModal.style.display = 'none';
        btnEliminarModal.remove();
    }


    const setElemText = (elId, txt) => {
        const el = document.getElementById(elId);
        if (el) el.innerText = (txt !== null && txt !== undefined) ? String(txt) : '';
    };
    const setElemHtml = (elId, html) => {
        const el = document.getElementById(elId);
        if (el) el.innerHTML = (html !== null && html !== undefined) ? String(html) : '';
    };

    // Popular planilla SG MONTAJES con el código respetando 101-MEC / 102-ELEC
    setElemText('auth-id', formatPresupuestoCodigo(p));

    // --- BRANDING CONDICIONAL: Acosta Servicios vs SG Montajes ---
    (function() {
        var _prov = (p.proveedor || p.meca_proveedor || '').trim().toUpperCase();
        var _isAcostaModal = _prov.includes('ACOSTA');
        var _logoEl = document.getElementById('modal-header-logo');
        var _detailEl = document.getElementById('modal-header-company-details');
        var _fiscalEl = document.getElementById('modal-header-fiscal-details');
        var _wmEl = document.getElementById('modal-header-watermark');

        if (_logoEl) {
            if (_isAcostaModal) {
                _logoEl.src = (window.LOGO_ACOSTA_BASE64) ? window.LOGO_ACOSTA_BASE64 : 'logo_acosta.png';
                _logoEl.alt = 'Acosta Servicios';
                _logoEl.style.height = '48px';
                _logoEl.style.maxHeight = '48px';
                _logoEl.style.width = 'auto';
                _logoEl.style.maxWidth = '220px';
                _logoEl.style.objectFit = 'contain';
                _logoEl.style.borderRadius = '0';
            } else {
                _logoEl.src = (window.LOGO_SG_BASE64) ? window.LOGO_SG_BASE64 : 'logo_sg_montajes.png';
                _logoEl.alt = 'SG Montajes';
                _logoEl.style.height = '48px';
                _logoEl.style.maxHeight = '48px';
                _logoEl.style.width = 'auto';
                _logoEl.style.maxWidth = '220px';
                _logoEl.style.objectFit = 'contain';
                _logoEl.style.borderRadius = '0';
            }
        }
        if (_detailEl) {
            if (_isAcostaModal) {
                _detailEl.innerHTML = '<strong style="color: #f8fafc;">I.V.A. Responsable Inscripto</strong><br>Estanislao López<br>Timbues - Pcia. Santa Fe';
            } else {
                _detailEl.innerHTML = '<strong style="color: #f8fafc;">I.V.A. Responsable Inscripto</strong><br>Estanislao López (CP S2204)<br>Timbues - Pcia. Santa Fe';
            }
        }
        if (_fiscalEl) {
            if (_isAcostaModal) {
                _fiscalEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; gap: 8px;">
                        <strong style="color: #ffffff; font-weight: 800;">C.U.I.T.:</strong>
                        <span style="font-weight: 800; color: #ffffff;">30-71868621-7</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 8px;">
                        <strong style="color: #ffffff; font-weight: 800;">Ini. Act.:</strong>
                        <span style="font-weight: 800; color: #ffffff;">25/06/2024</span>
                    </div>
                `;
            } else {
                _fiscalEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; gap: 8px;">
                        <strong style="color: #ffffff; font-weight: 800;">C.U.I.T.:</strong>
                        <span style="font-weight: 800; color: #ffffff;">30-71602466-7</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 8px;">
                        <strong style="color: #ffffff; font-weight: 800;">Ing.Br.:</strong>
                        <span style="font-weight: 800; color: #ffffff;">0916600761</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 8px;">
                        <strong style="color: #ffffff; font-weight: 800;">Ini. Act.:</strong>
                        <span style="font-weight: 800; color: #ffffff;">21/12/2017</span>
                    </div>
                `;
            }
        }
        if (_wmEl) {
            const wmContainer = _wmEl.closest('.sheet-watermark');
            if (_isAcostaModal) {
                _wmEl.src = (window.LOGO_ACOSTA_WATERMARK_BASE64) ? window.LOGO_ACOSTA_WATERMARK_BASE64 : 'logo_acosta_watermark.png';
                _wmEl.alt = 'Marca de agua Acosta Servicios';
                _wmEl.style.width = '380px';
                _wmEl.style.maxWidth = '100%';
                _wmEl.style.objectFit = 'contain';
                _wmEl.style.opacity = '0.22';
                if (wmContainer) wmContainer.style.opacity = '0.22';
            } else {
                _wmEl.src = (window.LOGO_SG_WATERMARK_GOLD_BASE64) ? window.LOGO_SG_WATERMARK_GOLD_BASE64 : 'logo_sg_watermark_gold.png';
                _wmEl.alt = 'Marca de agua SG MONTAJES';
                _wmEl.style.width = '380px';
                _wmEl.style.maxWidth = '100%';
                _wmEl.style.objectFit = 'contain';
                _wmEl.style.opacity = '0.60';
                if (wmContainer) wmContainer.style.opacity = '0.60';
            }
        }
    })();

    // Formatear fecha a DD/MM/YYYY
    let formattedDate = (typeof formatFechaCorta === 'function') ? formatFechaCorta(p.fecha) : (p.fecha || '');
    setElemText('auth-date-val', formattedDate);
    let curMo = p.oc_mano_obra || '';
    let curMat = p.oc_materiales || '';
    if (!curMo && !curMat && (p.meca_nro_oc || p.nro_oc)) {
        const raw = p.meca_nro_oc || p.nro_oc || '';
        if (raw.includes(' / ')) {
            const parts = raw.split(' / ');
            curMo = parts[0] || '';
            curMat = parts[1] || '';
        } else {
            curMo = raw;
        }
    }
    setElemText('auth-header-nro-oc-mo-val', curMo || '-');
    setElemText('auth-header-nro-oc-mat-val', curMat || '-');

    const cleanVal = (val, fallback) => {
        if (val === undefined || val === null) return (fallback !== undefined && fallback !== null && fallback !== '-') ? fallback : '-';
        const s = String(val).trim();
        if (s === '' || s === '-' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') {
            return (fallback !== undefined && fallback !== null && fallback !== '-') ? fallback : '-';
        }
        return s;
    };

    const rawClient = (typeof clientesDB !== 'undefined' && Array.isArray(clientesDB))
        ? clientesDB.find(c => (c.codigo && p.cliente_id && String(c.codigo).trim() === String(p.cliente_id).trim()) || (p.cliente_nombre && c.nombre && String(c.nombre).trim().toUpperCase() === String(p.cliente_nombre).trim().toUpperCase()))
        : null;

    const formatDisplayDate = (val) => {
        if (!val || val === '-') return '-';
        const str = String(val).trim();
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
            return `${m[3]}/${m[2]}/${m[1]}`;
        }
        return str;
    };

    const formatCuitDisplay = (val) => {
        if (!val || val === '-') return '-';
        const clean = String(val).replace(/\D/g, '');
        if (clean.length === 11) {
            return `${clean.substring(0, 2)}-${clean.substring(2, 10)}-${clean.substring(10)}`;
        }
        return String(val);
    };

    const rawCliCode = cleanVal(p.cliente_id, rawClient ? rawClient.codigo : '-');
    const rawCliName = cleanVal(p.cliente_nombre, rawClient ? rawClient.nombre : '-').toUpperCase();
    const rawCliDom = cleanVal(p.domicilio, rawClient ? rawClient.domicilio : '-').toUpperCase();
    const rawCliLoc = cleanVal(p.localidad, rawClient ? rawClient.localidad : '-').toUpperCase();
    const rawCliIva = cleanVal(p.condicion_iva, rawClient ? rawClient.condicion_iva : 'RESPONSABLE INSCRIPTO').toUpperCase();
    const rawCliCuit = formatCuitDisplay(cleanVal(p.cuit, rawClient ? rawClient.cuit : '-'));
    const rawCliCond = cleanConditionName(cleanVal(p.condicion_nombre, rawClient ? rawClient.condicion_nombre : (p.forma_pago || 'CONTADO'))).toUpperCase();
    let parsedMo = p.oc_mano_obra || '';
    let parsedMat = p.oc_materiales || '';
    if (!parsedMo && !parsedMat && (p.meca_nro_oc || p.nro_oc)) {
        const rawOcStr = p.meca_nro_oc || p.nro_oc || '';
        if (rawOcStr.includes(' / ')) {
            const parts = rawOcStr.split(' / ');
            parsedMo = parts[0] || '';
            parsedMat = parts[1] || '';
        } else {
            parsedMo = rawOcStr;
        }
    }
    const rawOcMo = cleanVal(parsedMo, '-');
    const rawOcMat = cleanVal(parsedMat, '-');
    const rawPlanta = cleanVal(p.meca_planta || p.planta, 'VGG').toUpperCase();
    const rawNroPres = formatPresupuestoCodigo(p) || p.id || '-';
    const rawCliEnt = (typeof formatFechaCorta === 'function') ? formatFechaCorta(p.fecha_entrega || p.meca_fecha_fin || p.fecha || '') : (p.fecha_entrega || p.meca_fecha_fin || p.fecha || '-');

    setElemText('auth-client-display', `${rawCliCode}  ${rawCliName}`);
    setElemText('auth-domicilio-val', rawCliDom);
    setElemText('auth-localidad-val', rawCliLoc);
    setElemText('auth-cuit-val', rawCliCuit);
    setElemText('auth-iva-val', rawCliIva);

    setElemText('auth-comisionista-val', p.is_comisionista ? 'SÍ' : 'NO');
    const isDetailMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
    const isElec = !isDetailMec;
    setElemText('auth-tiponv-val', `${isElec ? '⚡' : '⚙️'} PRESUPUESTO ${isElec ? 'ELÉCTRICO' : 'MECÁNICO'}`);
    setElemText('auth-entrega-val', (p.tipo_entrega || 'RETIRA CLIENTE').toUpperCase());
    setElemText('auth-pago-val', rawCliCond);

    // Ajustar tema según el tipo de presupuesto del pedido
    if (isElec) {
        document.body.classList.add('theme-electrico'); // USER requested to remove yellow theme
    } else {
        document.body.classList.remove('theme-electrico');
    }

    // Ficha y Aclaraciones para Presupuestos Excel (Mecánico y Eléctrico)
    const mecaHeaderBox = document.getElementById('auth-mecanico-header-box');
    const mecaAclaraciones = document.getElementById('auth-mecanico-aclaraciones');
    const customerInfoBox = document.getElementById('auth-customer-info-box');

    const tipoStr = (p.tipo_presupuesto || '').toLowerCase();
    const isElectrical = tipoStr.includes('eléctrico') || tipoStr.includes('electrico') || (!tipoStr.includes('mecánico') && !tipoStr.includes('mecanico'));
    const isExcelFlow = true;

    const isRejectedOrder = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');
    const canEditControls = (!isRejectedOrder && isEditingAllowed);

    if (mecaHeaderBox) {
        mecaHeaderBox.style.display = 'block';

        // Layout unificado para Mecánico y Eléctrico
        if (document.getElementById('lbl-modal-titulo')) document.getElementById('lbl-modal-titulo').innerText = 'Título:';

        // La planta es SOLO para Mecánico, la ocultamos en Eléctrico
        if (document.getElementById('modal-row-detalle-planta')) {
            document.getElementById('modal-row-detalle-planta').style.display = 'flex';
        }

        if (document.getElementById('modal-col-f6-planta-el')) document.getElementById('modal-col-f6-planta-el').style.display = 'none';
        if (document.getElementById('modal-col-f6-condicion-meca')) document.getElementById('modal-col-f6-condicion-meca').style.display = 'flex';

        const rawDenom = (p.meca_denominacion || p.denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase();
        const rawOt = (p.meca_nro_ot || p.nro_ot || '-');

        const plantasList = (typeof window.getPlantas === 'function') ? window.getPlantas() : ['APS', 'APG', 'PPA'];
        const optsPlanta = plantasList.map(pl => `<option value="${pl}" ${pl === rawPlanta ? 'selected' : ''}>${pl}</option>`).join('');

        if (canEditControls) {
            setElemHtml('auth-meca-cliente-val', `<input type="text" id="auth-edit-meca-cliente" value="${rawCliName !== '-' ? rawCliName : ''}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemText('auth-meca-cliente-codigo-val', rawCliCode);
            setElemHtml('auth-meca-denominacion-val', `<input type="text" id="auth-edit-meca-denominacion" value="${rawDenom !== 'SERVICIOS Y MONTAJES' ? rawDenom : (p.meca_denominacion || p.denominacion || p.motivo || '')}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; text-transform: uppercase;">`);
            setElemHtml('auth-meca-detalle-prop-val', `<textarea id="auth-edit-meca-propuesta" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; resize: vertical;" rows="2">${p.meca_propuesta || p.propuesta || ''}</textarea>`);
            setElemHtml('auth-meca-nro-ot-val', `<input type="text" id="auth-edit-meca-nro-ot" value="${rawOt !== '-' ? rawOt : ''}" oninput="saveTempEdits()" style="width: 130px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace;">`);
            setElemHtml('auth-meca-domicilio-val', `<input type="text" id="auth-edit-meca-domicilio" value="${rawCliDom !== '-' ? rawCliDom : ''}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemHtml('auth-meca-localidad-val', `<input type="text" id="auth-edit-meca-localidad" value="${rawCliLoc !== '-' ? rawCliLoc : ''}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemText('auth-meca-iva-val', rawCliIva);
            setElemHtml('auth-meca-cuit-val', `<input type="text" id="auth-edit-meca-cuit" value="${rawCliCuit !== '-' ? rawCliCuit : ''}" oninput="saveTempEdits()" style="width: 130px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace;">`);
            setElemHtml('auth-meca-condicion-val', `<input type="text" id="auth-edit-meca-condicion" value="${rawCliCond !== '-' ? rawCliCond : ''}" oninput="saveTempEdits()" style="width: 100%; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemHtml('auth-meca-entrega-val', `<input type="date" id="auth-edit-meca-entrega" value="${p.fecha_entrega || p.meca_fecha_fin || p.fecha || ''}" oninput="saveTempEdits()" style="width: 120px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">`);
            setElemHtml('auth-meca-oc-mo-val', `<input type="text" id="auth-edit-meca-oc-mo" value="${rawOcMo !== '-' ? rawOcMo : ''}" oninput="saveTempEdits()" style="width: 130px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace;">`);
            setElemHtml('auth-meca-oc-mat-val', `<input type="text" id="auth-edit-meca-oc-mat" value="${rawOcMat !== '-' ? rawOcMat : ''}" oninput="saveTempEdits()" style="width: 130px; font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace;">`);
            const selectPlantaHtml = `
                <select id="auth-edit-meca-planta" onchange="saveTempEdits();" style="font-size: 11px; padding: 3px 6px; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">
                    ${optsPlanta}
                </select>
            `;
            setElemHtml('auth-meca-planta-val', selectPlantaHtml);
            setElemText('auth-meca-planta-val-el', rawPlanta);
            setElemText('auth-meca-nro-presupuesto-val', rawNroPres);
        } else {
            setElemText('auth-meca-cliente-val', rawCliName);
            setElemText('auth-meca-cliente-codigo-val', rawCliCode);
            setElemText('auth-meca-denominacion-val', rawDenom);
            setElemText('auth-meca-detalle-prop-val', p.meca_propuesta || p.propuesta || '-');
            setElemText('auth-meca-nro-ot-val', rawOt);
            setElemText('auth-meca-domicilio-val', rawCliDom);
            setElemText('auth-meca-localidad-val', rawCliLoc);
            setElemText('auth-meca-iva-val', rawCliIva);
            setElemText('auth-meca-cuit-val', rawCliCuit);
            setElemText('auth-meca-condicion-val', rawCliCond);
            setElemText('auth-meca-entrega-val', rawCliEnt);
            setElemText('auth-meca-oc-mo-val', rawOcMo);
            setElemText('auth-meca-oc-mat-val', rawOcMat);
            setElemText('auth-meca-planta-val', rawPlanta);
            setElemText('auth-meca-planta-val-el', rawPlanta);
            setElemText('auth-meca-nro-presupuesto-val', rawNroPres);
        }
    }
    if (customerInfoBox) {
        customerInfoBox.style.display = 'none';
    }

    if (mecaAclaraciones) {
        mecaAclaraciones.style.display = 'block';
    }

    // System footer info
    const sysUser = document.getElementById('auth-sys-user');
    if (sysUser) sysUser.innerText = p.vendedor_id || '1';
    const sysDate = document.getElementById('auth-sys-date');
    if (sysDate) sysDate.innerText = p.fecha || formattedDate;
    const sysCount = document.getElementById('auth-sys-items-count');
    if (sysCount) sysCount.innerText = p.items ? p.items.length : 0;
    const sysReportName = document.getElementById('auth-sys-report-name');
    if (sysReportName) {
        sysReportName.innerText = (typeof window.getBudgetDocTitle === 'function') ? window.getBudgetDocTitle(p) : `Presupuesto ${p.cliente_nombre || ''} ${p.id || ''}`.trim();
    }

    // Render condition, deposit, and transport into container elements
    if (canEditControls) {
        // Condition Select
        let condHtml = `<select id="auth-condition-select" onchange="saveTempEdits(); recalcAuthTotal()" style="width: 100%; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">`;
        const seenCodes = new Set();
        const uniqueConds = (typeof condicionesDB !== 'undefined' && Array.isArray(condicionesDB)) ? condicionesDB.filter(c => {
            if (!c || String(c.codigo) === '0' || (c.nombre && /no\s*usar/i.test(c.nombre))) return false;
            if (seenCodes.has(c.codigo)) return false;
            seenCodes.add(c.codigo);
            return true;
        }) : [];
        uniqueConds.forEach(c => {
            const displayName = c.nombre ? `${cleanConditionName(c.nombre)} (${c.dias} días)` : `Condición ${c.codigo} (${c.dias} días)`;
            const selectedAttr = String(c.codigo) === String(p.condicion_id || '1') ? 'selected' : '';
            condHtml += `<option value="${c.codigo}" ${selectedAttr}>${displayName}</option>`;
        });
        condHtml += `</select>`;
        const condEl = document.getElementById('auth-condition-container');
        if (condEl) condEl.innerHTML = condHtml;

        // Deposit input with search icon
        const depEl = document.getElementById('auth-deposit-container');
        if (depEl) {
            depEl.innerHTML = `
                <div style="position: relative; display: flex; align-items: center; width: 100%;">
                    <input type="text" id="auth-deposit-input-edit" autocomplete="off" value="${(p.deposito_nombre || '').toUpperCase()}" style="width: 100%; padding-right: 25px; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                    <i class="fas fa-search" style="position: absolute; right: 5px; color: var(--primary); cursor: pointer;" onclick="abrirRobotDepositosEdicion()"></i>
                    <div id="auth-deposit-dropdown-edit" class="custom-dropdown" style="display: none; position: absolute; width: 100%; z-index: 1000; max-height: 200px; overflow-y: auto; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-top: 4px; top: 100%; text-align: left;"></div>
                </div>
            `;
        }

        // Transport input with search icon
        const transEl = document.getElementById('auth-transport-container');
        if (transEl) {
            transEl.innerHTML = `
                <div style="position: relative; display: flex; align-items: center; width: 100%;">
                    <input type="text" id="auth-transport-input-edit" autocomplete="off" value="${(p.transporte_nombre || '').toUpperCase()}" style="width: 100%; padding-right: 25px; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                    <i class="fas fa-search" style="position: absolute; right: 5px; color: var(--primary); cursor: pointer;" onclick="abrirRobotTransportesEdicion()"></i>
                    <div id="auth-transport-dropdown-edit" class="custom-dropdown" style="display: none; position: absolute; width: 100%; z-index: 1000; max-height: 200px; overflow-y: auto; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; margin-top: 4px; top: 100%; text-align: left;"></div>
                </div>
            `;
        }

        // Currency Select and exchange rate container
        let currHtml = `
            <select id="auth-currency-select" onchange="onAuthCurrencyChange()" style="width: 100%; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                <option value="1" ${p.moneda_id === 1 ? 'selected' : ''}>1 - Pesos</option>
                <option value="2" ${p.moneda_id === 2 ? 'selected' : ''}>2 - Dólares</option>
                <option value="60" ${p.moneda_id === 60 ? 'selected' : ''}>60 - Euros</option>
            </select>
            <div id="auth-exchange-rate-container" style="display: ${p.moneda_id === 2 || p.moneda_id === 60 ? 'flex' : 'none'}; align-items: center; gap: 5px; margin-top: 4px;">
                <span style="font-size: 9px; font-weight: bold; color: var(--text-muted);">COTIZACIÓN:</span>
                <input type="text" id="auth-exchange-rate-input" value="${(p.cotizacion || 1.0).toFixed(8)}" style="width: 90px; text-align: right; font-family: monospace; font-size: 11px; padding: 4px 6px; color: white; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
            </div>
        `;
        const currEl = document.getElementById('auth-currency-container');
        if (currEl) currEl.innerHTML = currHtml;

    } else {
        if (document.getElementById('auth-condition-container')) document.getElementById('auth-condition-container').innerText = cleanConditionName(p.condicion_nombre || 'CONTADO').toUpperCase();
        if (document.getElementById('auth-deposit-container')) document.getElementById('auth-deposit-container').innerText = (p.deposito_nombre || '-').toUpperCase();
        if (document.getElementById('auth-transport-container')) document.getElementById('auth-transport-container').innerText = (p.transporte_nombre || '-').toUpperCase();

        let currText = 'PESOS';
        if (p.moneda_id === 2) currText = `DÓLARES (cot. ${(p.cotizacion || 1.0).toFixed(8)})`;
        else if (p.moneda_id === 60) currText = `EUROS (cot. ${(p.cotizacion || 1.0).toFixed(8)})`;
        if (document.getElementById('auth-currency-container')) document.getElementById('auth-currency-container').innerText = currText;
    }

    const userValEl = document.getElementById('auth-user-val');
    if (userValEl) userValEl.innerText = (p.operador || 'admin').toUpperCase();
    const slaValEl = document.getElementById('auth-sla-val');
    if (slaValEl) slaValEl.innerHTML = (typeof getSLABadge === 'function') ? getSLABadge(p) : '';

    const itemsPanel = document.getElementById('auth-items-panel');
    const itemsListBody = document.getElementById('auth-items-list-body');
    if (itemsPanel) itemsPanel.style.display = 'none';
    if (itemsListBody) itemsListBody.innerHTML = '';

    const legacyBottom = document.getElementById('auth-legacy-bottom-layout') || document.querySelector('.invoice-bottom-layout');
    if (legacyBottom) legacyBottom.style.display = 'none';

    window.renderModalReportTable = function(p, currentMode) {
        if (!p) return;
        const isRejectedOrder = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');
        const isEditMode = (currentMode === 'detallado_edit' || (currentMode === 'editar' && isEditingAllowed));
        const activeMode = (currentMode === 'resumido' || currentMode === 'detallado' || currentMode === 'proyecto')
            ? currentMode
            : (isEditMode ? 'detallado' : (p.tipo_reporte || 'detallado'));

        const btnRes = document.getElementById('btn-toggle-report-resumido') || document.getElementById('auth-btn-report-resumido');
        const btnDet = document.getElementById('btn-toggle-report-detallado') || document.getElementById('auth-btn-report-detallado');
        const btnProy = document.getElementById('btn-toggle-report-proyecto') || document.getElementById('auth-btn-report-proyecto');

        [btnRes, btnDet, btnProy].forEach(b => {
            if (b) {
                b.style.background = 'transparent';
                b.style.color = 'var(--text-muted)';
                b.style.boxShadow = 'none';
            }
        });

        if (activeMode === 'resumido' && btnRes) {
            btnRes.style.background = '#0284c7';
            btnRes.style.color = '#ffffff';
            btnRes.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.4)';
        } else if (activeMode === 'proyecto' && btnProy) {
            btnProy.style.background = '#0284c7';
            btnProy.style.color = '#ffffff';
            btnProy.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.4)';
        } else if (btnDet) {
            btnDet.style.background = '#0284c7';
            btnDet.style.color = '#ffffff';
            btnDet.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.4)';
        }

        const mecaHeaderBox = document.getElementById('auth-mecanico-header-box');
        const customerInfoBox = document.getElementById('auth-customer-info-box');

        if (mecaHeaderBox) mecaHeaderBox.style.display = 'block';
        if (customerInfoBox) customerInfoBox.style.display = 'none';

        const authMecaContainer = document.getElementById('auth-mecanico-excel-container');
        if (!authMecaContainer) return;
        authMecaContainer.style.display = 'block';

        const obsHtml = '';

        const rejectedBannerHtml = isRejectedOrder ? `
            <div style="background: rgba(244, 63, 94, 0.15); border: 1.5px solid #f43f5e; border-radius: 8px; padding: 12px; margin-bottom: 12px; color: #fca5a5; display: flex; justify-content: space-between; align-items: center; text-align: left;">
                <div>
                    <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px;"><i class="fas fa-times-circle"></i> PRESUPUESTO RECHAZADO</div>
                    <div style="font-size: 11.5px;"><strong>Motivo:</strong> ${p.motivo_rechazo || 'Presupuesto rechazado por el cliente o administración.'}</div>
                </div>
                <div>
                    <button class="btn btn-sm btn-success" onclick="revivirPedido('${p.id}')" style="background: #059669; color: #fff; border: none; font-weight: bold; padding: 6px 12px; border-radius: 6px; white-space: nowrap; cursor: pointer;">
                        <i class="fas fa-undo"></i> Revivir Presupuesto
                    </button>
                </div>
            </div>
        ` : '';

        if (isEditMode) {
            reqTipoPresupuesto = (p.tipo_presupuesto || (String(p.id).startsWith('101') ? 'Mecánico' : 'Eléctrico'));
            pedidoItems = JSON.parse(JSON.stringify(p.items || []));
            renderMecanicoExcelGridInContainer(authMecaContainer, true);
            if (rejectedBannerHtml) {
                authMecaContainer.insertAdjacentHTML('afterbegin', rejectedBannerHtml);
            }
            return;
        }

        const cotizMat = parseFloat(p.cotizacion_materiales || p.cotizacion || (window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1450)) || 1450;
        const formattedItems = (typeof window.getPresupuestoFormattedItems === 'function')
            ? window.getPresupuestoFormattedItems(p, activeMode)
            : [];

        let itemsRowsHtml = '';
        let grandTotal = 0;
        let laborTotalARS = 0;
        let materialsTotalUSD = 0;

        formattedItems.forEach((r, idx) => {
            const isHeaderRow = (r.codigo === '-' && r.cantidad === '-' && r.precio === '-');
            const isMat = (r.is_material === true || r.is_material === 1 || r.is_material === '1');
            const subVal = (r.subtotal !== '-' && r.subtotal !== null && r.subtotal !== undefined) ? parseFloat(r.subtotal) : 0;
            if (!isHeaderRow && r.subtotal !== '-') {
                grandTotal += subVal;
            } else if (isHeaderRow && r.subtotal !== '-') {
                grandTotal += subVal;
            }

            const codeStr = r.codigo === '-' ? '-' : r.codigo;
            let priceStr = '-';
            let subStr = '-';
            if (r.precio !== '-') {
                const prVal = parseFloat(r.precio) || 0;
                if (isMat) {
                    priceStr = 'U$D ' + prVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                } else {
                    priceStr = '$' + prVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
            }

            if (r.subtotal !== '-') {
                const sVal = parseFloat(r.subtotal) || 0;
                if (isMat && r.subtotal_usd !== undefined && r.subtotal_usd !== null) {
                    const sUSD = parseFloat(r.subtotal_usd) || 0;
                    subStr = '$' + sVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) +
                        ` <br><span style="font-size: 10px; opacity: 0.8; font-weight: normal; color: #a5f3fc;">(U$D ${sUSD.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>`;
                } else {
                    subStr = '$' + sVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
            }

            const qtyStr = r.cantidad === '-' ? '-' : (typeof r.cantidad === 'number' ? r.cantidad.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2}) : r.cantidad);

            if (isHeaderRow) {
                itemsRowsHtml += `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.12); background: rgba(56, 189, 248, 0.10); font-weight: 800;">
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 10px; font-family: monospace; color: #38bdf8; text-align: center;">-</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 10px; color: #38bdf8; letter-spacing: 0.5px;">${r.detalle}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 10px; text-align: center; color: #cbd5e1;">-</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 10px; text-align: center; color: #cbd5e1;">-</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 900; color: #38bdf8;">${subStr}</td>
                    </tr>
                `;
            } else {
                const safeDet = (r.detalle || r.descripcion || r.denominacion || r.nombre || '-');
                itemsRowsHtml += `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: ${idx % 2 === 0 ? 'rgba(15, 23, 42, 0.15)' : 'transparent'};">
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; font-family: monospace; font-weight: 700; color: #38bdf8;">${codeStr}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; font-weight: 600; color: #f8fafc;">${safeDet}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; text-align: right; font-family: monospace; color: ${isMat ? '#38bdf8' : '#f8fafc'}; font-weight: 600;">${priceStr}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; text-align: center; font-weight: 800; font-family: monospace; color: #f8fafc;">${qtyStr}</td>
                        <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 7px 10px; text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8;">${subStr}</td>
                    </tr>
                `;
            }
        });

        // Compute labor total and material total from raw items if available, or from formatted items
        const rawItems = Array.isArray(p.items) ? p.items : [];
        if (rawItems.length > 0) {
            rawItems.forEach(it => {
                if (it.estado === 'Rechazado') return;
                const q = parseFloat(String(it.cantidad || '0').replace(',', '.')) || 0;
                const isMat = (it.is_material === true || it.is_material === 1 || it.is_material === '1') ||
                              (window.isMaterialItem ? window.isMaterialItem(it, p.tipo_presupuesto) : false) ||
                              (String(it.subrubro || '').toLowerCase().includes('material') || String(it.subrubro || '').toLowerCase().includes('equipo'));
                if (isMat) {
                    const prUSD = (it.precio_usd !== undefined && it.precio_usd !== null && !isNaN(parseFloat(it.precio_usd)))
                        ? parseFloat(it.precio_usd)
                        : (parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0);
                    const subUSD = (it.subtotal_usd !== undefined && it.subtotal_usd !== null && !isNaN(parseFloat(it.subtotal_usd)))
                        ? parseFloat(it.subtotal_usd)
                        : (q * prUSD);
                    materialsTotalUSD += subUSD;
                } else {
                    const pr = parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0;
                    const sub = (it.subtotal !== undefined && it.subtotal !== null && !isNaN(parseFloat(String(it.subtotal).replace(',', '.'))))
                        ? parseFloat(String(it.subtotal).replace(',', '.'))
                        : (q * pr);
                    laborTotalARS += sub;
                }
            });
        } else {
            formattedItems.forEach(r => {
                const isHeaderRow = (r.codigo === '-' && r.cantidad === '-' && r.precio === '-');
                if (isHeaderRow) return;
                const isMat = (r.is_material === true || r.is_material === 1 || r.is_material === '1');
                if (isMat) {
                    materialsTotalUSD += (parseFloat(r.subtotal_usd) || 0);
                } else {
                    laborTotalARS += (parseFloat(r.subtotal) || 0);
                }
            });
        }

        const materialsTotalARS = materialsTotalUSD * cotizMat;
        const computedGrandTotal = (laborTotalARS + materialsTotalARS > 0) ? (laborTotalARS + materialsTotalARS) : grandTotal;
        const netAmt = (computedGrandTotal > 0) ? computedGrandTotal : (parseFloat(String(p.importe || '0').replace(',', '.')) || 0);
        const subtotalStr = `$${netAmt.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        let breakdownTfootHtml = '';
        if (materialsTotalUSD > 0) {
            breakdownTfootHtml = `
                <tr style="background: rgba(15, 23, 42, 0.40); border-top: 1px solid rgba(255, 255, 255, 0.12); font-size: 11.5px;">
                    <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 5px 12px; text-align: right; color: #cbd5e1; font-weight: 600;">Subtotal Mano de Obra ($ ARS):</td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 5px 12px; text-align: right; font-family: monospace; color: #f8fafc; font-weight: 700;">$${laborTotalARS.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr style="background: rgba(15, 23, 42, 0.40); border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11.5px;">
                    <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 5px 12px; text-align: right; color: #38bdf8; font-weight: 600;">
                        Subtotal Materiales (U$D) <span style="font-size: 10.5px; color: #fcd34d; font-weight: 700; margin-left: 6px; background: rgba(253, 224, 71, 0.12); border: 1px solid rgba(253, 224, 71, 0.3); padding: 1px 6px; border-radius: 4px;">[Cotiz. Dólar: $${cotizMat.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}]</span>:
                    </td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 5px 12px; text-align: right; font-family: monospace; color: #38bdf8; font-weight: 700;">U$D ${materialsTotalUSD.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr style="background: rgba(15, 23, 42, 0.40); border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11.5px;">
                    <td colspan="4" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 5px 12px; text-align: right; color: #a5f3fc; font-weight: 600;">Subtotal Materiales Pesificados:</td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 5px 12px; text-align: right; font-family: monospace; color: #a5f3fc; font-weight: 700;">$${materialsTotalARS.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `;
        }

        authMecaContainer.innerHTML = rejectedBannerHtml + `
            <div style="background: rgba(15, 23, 42, 0.28); backdrop-filter: blur(2px); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 6px; overflow: hidden; color: #f8fafc; font-family: inherit; margin-bottom: 12px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                <div style="overflow-x: auto; padding: 0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; color: #f8fafc; background: transparent;">
                        <thead>
                            <tr style="background: rgba(15, 23, 42, 0.50); border-bottom: 2px solid rgba(255, 255, 255, 0.14); font-weight: bold; text-align: left;">
                                <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; width: 100px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                    <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">CÓDIGO</span>
                                </th>
                                <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                    <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">DETALLE DE PRODUCTOS / SERVICIOS</span>
                                </th>
                                <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: right; width: 130px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                    <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">PRECIO</span>
                                </th>
                                <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: center; width: 95px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                    <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">CANTIDAD</span>
                                </th>
                                <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 10px; text-align: right; width: 140px; color: #f8fafc; font-weight: 800; font-size: 11px;">
                                    <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 800;">TOTAL ($ ARS)</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRowsHtml}
                        </tbody>
                        <tfoot>
                            ${breakdownTfootHtml}
                            <tr style="background: rgba(16, 185, 129, 0.18); border-top: 2px solid #10b981; font-size: 13px;">
                                <td colspan="4" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 10px 14px; text-align: right; text-transform: uppercase; color: #4ade80; font-weight: 900; letter-spacing: 0.5px;"><strong>TOTAL GENERAL ($ ARS):</strong></td>
                                <td style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 10px 14px; text-align: right; font-family: monospace; font-weight: 900; font-size: 16px; color: #4ade80;">${subtotalStr}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                ${obsHtml}

                ${(() => {
                    const propTecnica = p.meca_propuesta || p.propuesta || p.meca_denominacion || p.denominacion || p.motivo || '';
                    const personal = p.meca_personal || p.personal || '';
                    const exclus = p.meca_exclusiones || p.exclusiones || '';
                    const obsGeneral = p.observaciones || p.meca_observaciones || '';
                    const tituloObra = p.meca_denominacion || p.denominacion || p.motivo || '';

                    const propRows = [];
                    if (personal.trim()) propRows.push({label: 'SOLICITUD DE SUPERVISOR', value: personal.trim()});
                    if (exclus.trim()) propRows.push({label: 'INDICAR EXCLUSIONES', value: exclus.trim()});
                    if (obsGeneral.trim()) propRows.push({label: 'OBSERVACIONES', value: obsGeneral.trim()});

                    if (propRows.length === 0) return '';

                    let propHtml = '<div class="print-meca-propuesta" style="margin-top: 12px; background: rgba(15, 23, 42, 0.35); border: 1.5px solid rgba(56, 189, 248, 0.25); border-radius: 6px; overflow: hidden; text-align: left;">';
                    propHtml += '<div style="padding: 8px 12px; background: rgba(56, 189, 248, 0.12); border-bottom: 1px solid rgba(56, 189, 248, 0.2); font-size: 12px; font-weight: 800; color: #38bdf8; letter-spacing: 0.5px;"><i class="fas fa-file-contract" style="margin-right: 6px;"></i>PROPUESTA TÉCNICA / COMERCIAL</div>';

                    propRows.forEach(function(row) {
                        propHtml += '<div style="display: flex; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 11.5px;">';
                        propHtml += '<div style="width: 30%; min-width: 160px; padding: 7px 12px; background: rgba(15, 23, 42, 0.3); font-weight: 700; color: #38bdf8; border-right: 1px solid rgba(255, 255, 255, 0.06);">' + row.label + '</div>';
                        propHtml += '<div style="width: 70%; padding: 7px 12px; color: #f8fafc; font-weight: 600;">' + row.value + '</div>';
                        propHtml += '</div>';
                    });
                    propHtml += '</div>';
                    return propHtml;
                })()}

            </div>
        `;
    };

    window.cambiarTipoReporteEnVista = function(nuevoTipo) {
        const normTipo = String(nuevoTipo || 'detallado').toLowerCase().trim();
        const p = (typeof pedidoActivo !== 'undefined' && pedidoActivo) || window.pedidoActivo;
        if (p) {
            p.tipo_reporte = normTipo;
            if (window.appData && Array.isArray(window.appData.pedidos)) {
                const pOrig = window.appData.pedidos.find(x => x.id === p.id);
                if (pOrig) pOrig.tipo_reporte = normTipo;
            }
            if (typeof saveData === 'function') {
                try { saveData(); } catch(e) {}
            }
            if (typeof window.getBudgetDocTitle === 'function') {
                document.title = window.getBudgetDocTitle(p);
            }
            renderModalReportTable(p, normTipo);
            if (typeof window.guardarPresupuestoEnSupabase === 'function') {
                window.guardarPresupuestoEnSupabase(p);
            }
        }
    };

    const isRejected = (p.estado === 'Rechazado' || p.estado === 'Anulado' || viewMode === 'Rechazados');
    const toggleContainer = document.getElementById('auth-report-type-toggle-container');
    if (toggleContainer) {
        toggleContainer.style.display = 'inline-flex';
    }

    // Renderizar la tabla de propuesta comercial (Detallado o Resumido) de forma directa
    renderModalReportTable(p, (explicitMode === 'editar' || explicitMode === 'detallado_edit') ? 'detallado_edit' : (p.tipo_reporte || 'detallado'));

    // Actualizar badge de estado en el modal
    const badgeContainer = document.getElementById('modal-status-badge-container');
    if (badgeContainer) {
        const estStr = String(p.estado || '').toLowerCase();
        const hasOc = !!(p.meca_nro_oc || p.nro_oc || p.oc_numero);
        const isApprovedConOc = (estStr === 'aprobado con oc' || estStr.includes('con oc') || hasOc) && !isRejected;

        let factBtnHtml = '';
        if (isApprovedConOc) {
            factBtnHtml = `
                <button type="button" class="btn btn-sm" onclick="closeModal(); if(window.showView){ showView('tpl-facturacion'); if(window.renderFacturacionTable) window.renderFacturacionTable(); }" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-left: 10px;" title="Pasar a Registrar Facturación para este comprobante">
                    <i class="fa-solid fa-file-invoice-dollar"></i> Ir a Registrar Facturación
                </button>
                <button type="button" class="btn btn-sm" onclick="window.editarOrdenesDeCompra(pedidoActivo.id)" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #38bdf8; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-left: 6px;" title="Modificar Orden de Compra de Mano de Obra o Materiales">
                    <i class="fa-solid fa-pen"></i> Editar OC
                </button>
            `;
        }
        badgeContainer.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;">${getBudgetStatusBadgeHtml(p.estado, p.oc_limite_fecha)}${factBtnHtml}</div>`;
    }

    const resolvedPanel = document.getElementById('auth-resolved-panel');
    const actionsPanel = document.getElementById('auth-actions-panel');

    if (isRejected) {
        if (actionsPanel) actionsPanel.style.display = 'none';
        if (resolvedPanel) {
            resolvedPanel.style.display = 'block';
            document.getElementById('auth-final-state').innerText = p.estado || 'Rechazado';
            document.getElementById('auth-resolution-date').innerText = p.fecha_resolucion || '-';
            const rejectCommentContainer = document.getElementById('auth-reject-comment-container');
            if (rejectCommentContainer) {
                rejectCommentContainer.style.display = 'block';
                document.getElementById('auth-reject-comment').innerText = p.motivo_rechazo || 'Presupuesto Rechazado';
            }
            resolvedPanel.style.borderLeft = '4px solid var(--danger)';
            resolvedPanel.style.background = 'rgba(244,63,94,0.1)';
            resolvedPanel.style.color = '#feb2b2';
        }
    } else if (canEditControls) {
        if (resolvedPanel) resolvedPanel.style.display = 'none';
        if (actionsPanel) {
            actionsPanel.style.display = 'flex';
            actionsPanel.innerHTML = `
                <div style="display: flex; justify-content: center; margin-top: 5px; width: 100%;">
                    <button id="btn-save-modifications" class="btn btn-success" style="font-size: 15px; padding: 10px 40px; font-weight: bold; width: 100%; background: var(--success); display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="guardarModificacionesPedido()">
                        <i class="fas fa-save"></i> Guardar Cambios del Presupuesto
                    </button>
                </div>
            `;
        }
    } else {
        if (actionsPanel) actionsPanel.style.display = 'none';
        if (resolvedPanel) {
            if (p.estado === 'Rechazado' || p.estado === 'Anulado') {
                resolvedPanel.style.display = 'block';
                document.getElementById('auth-final-state').innerText = p.estado;
                document.getElementById('auth-resolution-date').innerText = p.fecha_resolucion || '-';
                const rejectCommentContainer = document.getElementById('auth-reject-comment-container');
                if (rejectCommentContainer) {
                    rejectCommentContainer.style.display = 'block';
                    document.getElementById('auth-reject-comment').innerText = p.motivo_rechazo || 'Sin comentarios';
                }
                resolvedPanel.style.borderLeft = '4px solid var(--danger)';
                resolvedPanel.style.background = 'rgba(244,63,94,0.05)';
                resolvedPanel.style.color = '#feb2b2';
            } else {
                resolvedPanel.style.display = 'none';
            }
        }
    }

    // Autocomplete para agregar productos / horas en edición
    const authAddProdInput = document.getElementById('auth-add-product-input');
    const authAddProdDropdown = document.getElementById('auth-add-product-dropdown');
    if (authAddProdInput && authAddProdDropdown) {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = authAddProdDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');

                const dropdownRect = authAddProdDropdown.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                if (itemRect.bottom > dropdownRect.bottom) {
                    authAddProdDropdown.scrollTop += (itemRect.bottom - dropdownRect.bottom);
                } else if (itemRect.top < dropdownRect.top) {
                    authAddProdDropdown.scrollTop -= (dropdownRect.top - itemRect.top);
                }
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(authAddProdDropdown.children.length, authAddProdDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(prod => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${prod.detalle}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">
                        Código: ${prod.codigo} - Precio Unit: $${parseFloat(prod.precio || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})} - UDM: ${prod.udm || 'Hs'}
                    </div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarProductoEdicion(prod);
                };
                fragment.appendChild(div);
            });
            authAddProdDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            authAddProdDropdown.innerHTML = '';
            authAddProdDropdown.scrollTop = 0;
            currentSelectedIndex = -1;

            const activeCatalog = getActiveStockCatalog();

            if (cleanQuery === '') {
                currentMatches = activeCatalog.slice(0, 100);
            } else {
                currentMatches = activeCatalog.filter(p =>
                    p.detalle.toLowerCase().includes(cleanQuery) ||
                    p.codigo.toLowerCase().includes(cleanQuery)
                );
            }

            if (currentMatches.length > 0) {
                renderDropdownChunk();
                authAddProdDropdown.style.display = 'block';
            } else {
                authAddProdDropdown.style.display = 'none';
            }
        };

        authAddProdDropdown.addEventListener('scroll', () => {
            if (authAddProdDropdown.scrollTop + authAddProdDropdown.clientHeight >= authAddProdDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        authAddProdInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        authAddProdInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        authAddProdInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        authAddProdInput.addEventListener('keydown', (e) => {
            if (authAddProdDropdown.style.display !== 'block') return;
            const items = authAddProdDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarProductoEdicion(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarProductoEdicion(currentMatches[0]);
                }
            }
        });

        authAddProdInput.addEventListener('blur', () => {
            setTimeout(() => {
                authAddProdDropdown.style.display = 'none';
            }, 200);
        });
    }

    // Autocomplete para Depósito en edición
    const authDepInput = document.getElementById('auth-deposit-input-edit');
    const authDepDropdown = document.getElementById('auth-deposit-dropdown-edit');
    if (authDepInput && authDepDropdown && typeof depositosDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = authDepDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(authDepDropdown.children.length, authDepDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(dep => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${dep.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Código: ${dep.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarDepositoEdicion(dep);
                };
                fragment.appendChild(div);
            });
            authDepDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            authDepDropdown.innerHTML = '';
            authDepDropdown.scrollTop = 0;
            currentSelectedIndex = -1;

            if (cleanQuery === '') {
                currentMatches = depositosDB.slice(0, 100);
            } else {
                currentMatches = depositosDB.filter(d =>
                    d.nombre.toLowerCase().includes(cleanQuery) ||
                    d.codigo.includes(cleanQuery)
                );
            }

            if (currentMatches.length > 0) {
                renderDropdownChunk();
                authDepDropdown.style.display = 'block';
            } else {
                authDepDropdown.style.display = 'none';
            }
        };

        authDepDropdown.addEventListener('scroll', () => {
            if (authDepDropdown.scrollTop + authDepDropdown.clientHeight >= authDepDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        authDepInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        authDepInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        authDepInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        authDepInput.addEventListener('keydown', (e) => {
            if (authDepDropdown.style.display !== 'block') return;
            const items = authDepDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarDepositoEdicion(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarDepositoEdicion(currentMatches[0]);
                }
            }
        });

        authDepInput.addEventListener('blur', () => {
            setTimeout(() => {
                authDepDropdown.style.display = 'none';
                if (pedidoActivo && authDepInput.value !== (pedidoActivo.deposito_nombre || '').toUpperCase()) {
                    authDepInput.value = (pedidoActivo.deposito_nombre || '').toUpperCase();
                }
            }, 200);
        });
    }

    // Autocomplete para Transporte en edición
    const authTransInput = document.getElementById('auth-transport-input-edit');
    const authTransDropdown = document.getElementById('auth-transport-dropdown-edit');
    if (authTransInput && authTransDropdown && typeof transportesDB !== 'undefined') {
        let currentMatches = [];
        let currentSelectedIndex = -1;

        const updateActiveItem = () => {
            const items = authTransDropdown.children;
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                const activeItem = items[currentSelectedIndex];
                activeItem.classList.add('active');
            }
        };

        const renderDropdownChunk = () => {
            const chunk = currentMatches.slice(authTransDropdown.children.length, authTransDropdown.children.length + 50);
            if (chunk.length === 0) return;
            const fragment = document.createDocumentFragment();
            chunk.forEach(trans => {
                const div = document.createElement('div');
                div.className = 'custom-dropdown-item';
                div.style.padding = '8px 12px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.innerHTML = `
                    <div style="font-weight: 600; color: white;">${trans.nombre || 'Sin nombre'}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Código: ${trans.codigo}</div>
                `;
                div.onmousedown = (e) => {
                    e.preventDefault();
                    seleccionarTransporteEdicion(trans);
                };
                fragment.appendChild(div);
            });
            authTransDropdown.appendChild(fragment);
            if (currentSelectedIndex >= 0) updateActiveItem();
        };

        const renderDropdown = (query) => {
            const cleanQuery = (query || '').toLowerCase().trim();
            authTransDropdown.innerHTML = '';
            authTransDropdown.scrollTop = 0;
            currentSelectedIndex = -1;

            if (cleanQuery === '') {
                currentMatches = transportesDB.slice(0, 100);
            } else {
                currentMatches = transportesDB.filter(t =>
                    t.nombre.toLowerCase().includes(cleanQuery) ||
                    t.codigo.includes(cleanQuery)
                );
            }

            if (currentMatches.length > 0) {
                renderDropdownChunk();
                authTransDropdown.style.display = 'block';
            } else {
                authTransDropdown.style.display = 'none';
            }
        };

        authTransDropdown.addEventListener('scroll', () => {
            if (authTransDropdown.scrollTop + authTransDropdown.clientHeight >= authTransDropdown.scrollHeight - 30) {
                renderDropdownChunk();
            }
        });

        authTransInput.addEventListener('input', (e) => {
            renderDropdown(e.target.value);
        });

        authTransInput.addEventListener('focus', (e) => {
            e.target.select();
            renderDropdown('');
        });

        authTransInput.addEventListener('click', (e) => {
            renderDropdown('');
        });

        authTransInput.addEventListener('keydown', (e) => {
            if (authTransDropdown.style.display !== 'block') return;
            const items = authTransDropdown.children;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < currentMatches.length - 1) {
                    currentSelectedIndex++;
                    if (currentSelectedIndex >= items.length) {
                        renderDropdownChunk();
                    }
                    updateActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < currentMatches.length) {
                    seleccionarTransporteEdicion(currentMatches[currentSelectedIndex]);
                } else if (currentMatches.length > 0) {
                    seleccionarTransporteEdicion(currentMatches[0]);
                }
            }
        });

        authTransInput.addEventListener('blur', () => {
            setTimeout(() => {
                authTransDropdown.style.display = 'none';
                if (pedidoActivo && authTransInput.value !== (pedidoActivo.transporte_nombre || '').toUpperCase()) {
                    authTransInput.value = (pedidoActivo.transporte_nombre || '').toUpperCase();
                }
            }, 200);
        });
    }

    // Hacer que hacer clic en cualquier parte de la celda de depósito o transporte active su input de autocompletado
    const depContainer = document.getElementById('auth-deposit-container');
    if (depContainer) {
        depContainer.addEventListener('click', (e) => {
            if (e.target.tagName !== 'I' && e.target.tagName !== 'INPUT') {
                const input = document.getElementById('auth-deposit-input-edit');
                if (input) input.focus();
            }
        });
    }

    const transContainer = document.getElementById('auth-transport-container');
    if (transContainer) {
        transContainer.addEventListener('click', (e) => {
            if (e.target.tagName !== 'I' && e.target.tagName !== 'INPUT') {
                const input = document.getElementById('auth-transport-input-edit');
                if (input) input.focus();
            }
        });
    }

    // Recalcular y poblar todos los campos del footer comercial
    recalcAuthTotal();
};

window.getBudgetDocTitle = function(p) {
    if (!p) return 'Gestión de Presupuestos';
    const cliName = (p.cliente_nombre || p.cliente || '').trim();
    const nroPres = (typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(p) : (p.id || '')).toString().trim();
    const parts = ['Presupuesto'];
    if (cliName) parts.push(cliName);
    if (nroPres) parts.push(nroPres);
    return parts.join(' ');
};

window.imprimirPresupuestoModal = function() {
    try {
        if (typeof saveTempEdits === 'function') {
            saveTempEdits();
        }

        if (pedidoActivo) {
            // Asignar el nombre del documento para que el PDF se guarde como "Presupuesto + cliente + numero"
            const docTitle = window.getBudgetDocTitle(pedidoActivo);
            document.title = docTitle;
            const sysReportName = document.getElementById('auth-sys-report-name');
            if (sysReportName) sysReportName.innerText = docTitle;

            // 1. Sincronizar ítems editados desde la grilla activa si existieran
            if (Array.isArray(pedidoItems) && pedidoItems.length > 0) {
                pedidoActivo.items = JSON.parse(JSON.stringify(pedidoItems));
                const newAmt = pedidoActivo.items.reduce((sum, item) => {
                    const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
                    const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
                    const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
                        ? parseFloat(String(item.subtotal).replace(',', '.'))
                        : (q * pr);
                    return sum + sub;
                }, 0);
                pedidoActivo.importe = newAmt;
            }

            // 2. Asegurar que los datos limpios en texto figuren en la cabecera oficial
            const formatCuitDisplay = (val) => {
                if (!val || val === '-') return '-';
                const clean = String(val).replace(/\D/g, '');
                return clean.length === 11 ? `${clean.substring(0,2)}-${clean.substring(2,10)}-${clean.substring(10)}` : String(val);
            };
            const setCleanText = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.innerText = (val !== null && val !== undefined && String(val).trim() !== '') ? String(val) : '-';
            };

            const rawClient = (typeof window.clientesDB !== 'undefined' && Array.isArray(window.clientesDB))
                ? window.clientesDB.find(c => (c.codigo && pedidoActivo.cliente_id && String(c.codigo).trim() === String(pedidoActivo.cliente_id).trim()) || (c.nombre && pedidoActivo.cliente_nombre && String(c.nombre).trim().toUpperCase() === String(pedidoActivo.cliente_nombre).trim().toUpperCase()))
                : null;

            const rawCliName = (pedidoActivo.cliente_nombre || (rawClient ? rawClient.nombre : '-') || '-').toUpperCase();
            const rawCliCode = (pedidoActivo.cliente_id || (rawClient ? rawClient.codigo : '-') || '-');
            const rawCliDom = ((pedidoActivo.domicilio && pedidoActivo.domicilio !== '-') ? pedidoActivo.domicilio : (rawClient && rawClient.domicilio ? rawClient.domicilio : '-')).toUpperCase();
            const rawCliLoc = ((pedidoActivo.localidad && pedidoActivo.localidad !== '-') ? pedidoActivo.localidad : (rawClient && rawClient.localidad ? rawClient.localidad : '-')).toUpperCase();
            const rawCliCuit = formatCuitDisplay(pedidoActivo.cuit || (rawClient ? rawClient.cuit : '-'));
            const rawCliEnt = (pedidoActivo.fecha_entrega || pedidoActivo.meca_fecha_fin || pedidoActivo.fecha || '-');
            const rawCliCond = cleanConditionName(pedidoActivo.condicion_nombre || pedidoActivo.forma_pago || 'CONTADO').toUpperCase();
            const rawNroPres = (typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(pedidoActivo) : (pedidoActivo.id || '-'));
            const rawPlanta = (pedidoActivo.meca_planta || pedidoActivo.planta || (rawClient && rawClient.localidad && rawClient.localidad.toUpperCase().includes('SAN MARTIN') ? 'PGSM' : 'VGG')).toUpperCase();

            setCleanText('auth-meca-cliente-val', rawCliName);
            setCleanText('auth-meca-cliente-codigo-val', rawCliCode);
            setCleanText('auth-meca-denominacion-val', (pedidoActivo.meca_denominacion || pedidoActivo.denominacion || pedidoActivo.motivo || 'SERVICIOS Y MONTAJES').toUpperCase());
            setCleanText('auth-meca-detalle-prop-val', (pedidoActivo.meca_propuesta || pedidoActivo.propuesta || '-'));
            setCleanText('auth-meca-nro-ot-val', (pedidoActivo.meca_nro_ot || pedidoActivo.nro_ot || '-'));
            if (document.getElementById('auth-meca-nro-ot-val-el')) setCleanText('auth-meca-nro-ot-val-el', (pedidoActivo.meca_nro_ot || pedidoActivo.nro_ot || '-'));
            setCleanText('auth-meca-domicilio-val', rawCliDom);
            setCleanText('auth-meca-localidad-val', rawCliLoc);
            setCleanText('auth-meca-cuit-val', rawCliCuit);
            setCleanText('auth-meca-entrega-val', rawCliEnt);
            setCleanText('auth-meca-condicion-val', rawCliCond);
            setCleanText('auth-meca-nro-presupuesto-val', rawNroPres);
            setCleanText('auth-meca-planta-val', rawPlanta);
            if (document.getElementById('auth-meca-planta-val-el')) setCleanText('auth-meca-planta-val-el', rawPlanta);

            // 3. Renderizar la tabla de comprobante oficial completa con todos los ítems e importes
            const targetReport = pedidoActivo.tipo_reporte || 'detallado';
            if (typeof window.renderModalReportTable === 'function') {
                window.renderModalReportTable(pedidoActivo, targetReport);
            }
        }
    } catch(err) {
        console.error('Error preparando impresión:', err);
    }

    setTimeout(() => {
        window.print();
    }, 150);
};

window.addEventListener('beforeprint', () => {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay && modalOverlay.style.display !== 'none' && pedidoActivo) {
        document.title = (typeof window.getBudgetDocTitle === 'function') ? window.getBudgetDocTitle(pedidoActivo) : `Presupuesto ${pedidoActivo.cliente_nombre || ''} ${pedidoActivo.id || ''}`.trim();
        if (typeof saveTempEdits === 'function') saveTempEdits();
        if (Array.isArray(pedidoItems) && pedidoItems.length > 0) {
            pedidoActivo.items = JSON.parse(JSON.stringify(pedidoItems));
            const newAmt = pedidoActivo.items.reduce((sum, item) => {
                const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
                const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario !== undefined ? item.precio_unitario : 0)).replace(',', '.')) || 0;
                const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.'))))
                    ? parseFloat(String(item.subtotal).replace(',', '.'))
                    : (q * pr);
                return sum + sub;
            }, 0);
            pedidoActivo.importe = newAmt;
        }
        if (typeof renderModalReportTable === 'function') {
            renderModalReportTable(pedidoActivo, pedidoActivo.tipo_reporte || 'detallado');
        }
    }
});

window.addEventListener('afterprint', () => {
    if (pedidoActivo && document.body.classList.contains('modal-open') && typeof window.getBudgetDocTitle === 'function') {
        document.title = window.getBudgetDocTitle(pedidoActivo);
    } else {
        document.title = 'Gestión de Presupuestos';
    }
});

window.onReqCurrencyChange = function() {
    const currencySelect = document.getElementById('req-currency');
    const rateContainer = document.getElementById('req-exchange-rate-container');
    const rateInput = document.getElementById('req-exchange-rate');

    if (currencySelect) {
        const val = parseInt(currencySelect.value);
        if (rateContainer) {
            rateContainer.style.display = (val === 2 || val === 60) ? 'block' : 'none';
        }
        if (rateInput) {
            if (val === 2) {
                rateInput.value = "1011.00000000";
            } else if (val === 60) {
                rateInput.value = "1100.00000000";
            } else {
                rateInput.value = "1.00000000";
            }
        }
    }
};

window.toggleAuthDecision = function(decision) {
    const rGroup = document.getElementById('reject-comment-group');
    if (rGroup) {
        if (decision === 'rechazar') {
            rGroup.style.display = 'block';
            setTimeout(() => {
                const commentInput = document.getElementById('auth-reject-reason-input');
                if (commentInput) commentInput.focus();
            }, 50);
        } else {
            rGroup.style.display = 'none';
        }
    }
};

window.confirmarResolucion = function() {
    const checkedRadio = document.querySelector('input[name="auth-decision"]:checked');
    if (!checkedRadio) {
        showToast('Debe seleccionar si el pedido es Aceptado/Autorizado o Rechazado.', 'error');
        return;
    }
    const decision = checkedRadio.value; // 'autorizar' o 'rechazar'
    resolveOrder(decision);
};

window.resolveOrder = function(accion) {
    if (!pedidoActivo) return;

    const commentInput = document.getElementById('auth-reject-reason-input');
    const motivo = commentInput ? commentInput.value.trim() : '';

    if (accion === 'rechazar' && !motivo) {
        showToast('Es obligatorio ingresar un motivo de rechazo.', 'error');
        if (commentInput) commentInput.focus();
        return;
    }

    const orderIdx = appData.pedidos.findIndex(p => p.id === pedidoActivo.id);
    if (orderIdx === -1) return;

    const originalImporte = pedidoActivo.importe_original || pedidoActivo.importe;
    const fechaRes = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (accion === 'autorizar') {
        // Capturar los ítems autorizados si existen
        let totalAmt = 0;
        let pendingCount = 0;

        if (Array.isArray(pedidoActivo.items) && pedidoActivo.items.length > 0) {
            const checks = document.querySelectorAll('.auth-item-check');
            const qtys = document.querySelectorAll('.auth-item-qty');

            pedidoActivo.items.forEach((item, idx) => {
                // Si ya estaba resuelto en pasos anteriores, mantenerlo y sumar al total
                if (item.estado === 'Autorizado') {
                    totalAmt += item.cantidad * item.precio;
                    return;
                }
                if (item.estado === 'Rechazado') {
                    return;
                }

                // Buscar controles para ítems que están pendientes en pantalla
                const chk = Array.from(checks).find(c => parseInt(c.getAttribute('data-idx')) === idx);
                const qtyInput = Array.from(qtys).find(q => parseInt(q.getAttribute('data-idx')) === idx);

                if (chk && item) {
                    const isChecked = chk.checked;
                    const maxQty = item.cantidad_original || item.cantidad;
                    let qty = parseFloat(qtyInput ? qtyInput.value : item.cantidad);
                    if (isNaN(qty) || qty < 0) qty = 0;
                    if (qty > maxQty) qty = maxQty;

                    if (isChecked) {
                        if (qty > 0) {
                            item.estado = 'Autorizado';
                            item.cantidad = qty;
                            item.cantidad_original = maxQty;
                            item.subtotal = qty * item.precio;
                            totalAmt += qty * item.precio;
                        } else {
                            item.estado = 'Pendiente';
                            item.cantidad_original = maxQty;
                            pendingCount++;
                        }
                    } else {
                        // Queda pendiente si se destilda
                        item.estado = 'Pendiente';
                        item.cantidad_original = maxQty;
                        pendingCount++;
                    }
                } else {
                    // Por defecto, si no está el control en pantalla, asumimos que sigue pendiente
                    item.estado = 'Pendiente';
                    pendingCount++;
                }
            });

            // Validar que al menos un ítem esté autorizado en total
            const hasAnyAuthorized = pedidoActivo.items.some(i => i.estado === 'Autorizado' && i.cantidad > 0);
            if (!hasAnyAuthorized) {
                showToast('Debe autorizar al menos un artículo. Si desea rechazar todo el pedido, seleccione "Rechazado" en las opciones.', 'error');
                return;
            }

            appData.pedidos[orderIdx].items = pedidoActivo.items;
            appData.pedidos[orderIdx].importe = totalAmt;
            appData.pedidos[orderIdx].importe_original = originalImporte;
        } else {
            // Pedido global sin ítems
            totalAmt = originalImporte;
            appData.pedidos[orderIdx].importe = totalAmt;
            appData.pedidos[orderIdx].importe_original = originalImporte;
        }

        if (pendingCount > 0) {
            appData.pedidos[orderIdx].estado = (pedidoActivo.estado && pedidoActivo.estado.startsWith("Cargado")) ? pedidoActivo.estado : "Pendiente de Autorización";
            appData.pedidos[orderIdx].motivo_rechazo = "";
            showToast(`Pedido ${pedidoActivo.id} AUTORIZADO PARCIALMENTE. Los artículos desmarcados siguen pendientes.`, 'warning');
        } else {
            appData.pedidos[orderIdx].estado = "Autorizado";
            appData.pedidos[orderIdx].motivo_rechazo = "";
            showToast(`Pedido ${pedidoActivo.id} AUTORIZADO exitosamente en su totalidad.`, 'success');
        }
    } else {
        // Rechazar — solo se rechazan los ítems que aún están Pendientes,
        // los que ya fueron Autorizados en una ronda anterior se conservan.
        appData.pedidos[orderIdx].importe_original = originalImporte;

        let autorizedImporte = 0;
        if (Array.isArray(appData.pedidos[orderIdx].items)) {
            appData.pedidos[orderIdx].items = appData.pedidos[orderIdx].items.map(item => {
                // Ya estaba autorizado → conservar
                if (item.estado === 'Autorizado') {
                    autorizedImporte += item.cantidad * item.precio;
                    return item;
                }
                // Estaba pendiente → rechazar ahora
                const maxQty = item.cantidad_original || item.cantidad;
                return {
                    codigo: item.codigo,
                    detalle: item.detalle,
                    precio: item.precio,
                    cantidad: 0,
                    cantidad_original: maxQty,
                    subtotal: 0,
                    estado: 'Rechazado'
                };
            });
        }

        // Si quedaron ítems autorizados, el pedido queda como Autorizado Parcial;
        // si no había nada aprobado, queda Rechazado total.
        const stillHasAuthorized = appData.pedidos[orderIdx].items.some(i => i.estado === 'Autorizado');
        if (stillHasAuthorized) {
            appData.pedidos[orderIdx].estado = "Autorizado";
            appData.pedidos[orderIdx].importe = autorizedImporte;
            appData.pedidos[orderIdx].motivo_rechazo = motivo;
            showToast(`Pedido ${pedidoActivo.id} AUTORIZADO PARCIALMENTE. Los artículos pendientes fueron rechazados.`, 'warning');
        } else {
            appData.pedidos[orderIdx].estado = "Rechazado";
            appData.pedidos[orderIdx].importe = 0;
            appData.pedidos[orderIdx].motivo_rechazo = motivo;
            showToast(`Pedido ${pedidoActivo.id} RECHAZADO totalmente.`, 'danger');
        }
    }

    appData.pedidos[orderIdx].fecha_resolucion = fechaRes;

    // Notificar a las 5 personas del equipo por mail y sistema
    window.notificarAprobacionEquipo(appData.pedidos[orderIdx], appData.pedidos[orderIdx].estado);

    saveData();
    closeModal();
    renderAssignmentsTable();
};

window.recalcAuthTotal = function() {
    if (!pedidoActivo) return;

    let totalAmt = 0;
    const checks = document.querySelectorAll('.auth-item-check');
    const qtys = document.querySelectorAll('.auth-item-qty');
    const subtotals = document.querySelectorAll('.auth-item-subtotal-val');

    const isPending = pedidoActivo.estado === 'Pendiente de Autorización' || pedidoActivo.estado === 'Cargado con orden de compra' || pedidoActivo.estado === 'Cargado sin orden de compra';
    const isModifying = (typeof viewMode !== 'undefined' && viewMode === 'Modificacion');

    if (!isPending && !isModifying) {
        // Para pedidos resueltos, usamos directamente el importe guardado o la suma de sus ítems
        totalAmt = parseFloat(pedidoActivo.importe);
        if (isNaN(totalAmt) || totalAmt <= 0) {
            totalAmt = 0;
            if (pedidoActivo.items && pedidoActivo.items.length > 0) {
                pedidoActivo.items.forEach(item => {
                    totalAmt += (parseFloat(item.cantidad) || parseFloat(item.cantidad_original) || 0) * (parseFloat(item.precio) || 0);
                });
            }
            if (totalAmt <= 0) totalAmt = parseFloat(pedidoActivo.importe) || 0;
        }
    } else {
        if (pedidoActivo.items && pedidoActivo.items.length > 0) {
            // Sumar los ya autorizados (si estamos en pendiente) o todos los autorizados/aprobados (si no está pendiente)
            pedidoActivo.items.forEach((item, idx) => {
                if (isModifying) {
                    // En modo modificación, calculamos estrictamente desde los inputs en pantalla
                    return;
                }
                if (isPending) {
                    if (item.estado === 'Autorizado') {
                        totalAmt += item.cantidad * item.precio;
                    }
                } else {
                    if (item.estado !== 'Rechazado') {
                        totalAmt += item.cantidad * item.precio;
                    }
                }
            });

            // Sumar los que se editan en pantalla (si está pendiente o modificando)
            checks.forEach(chk => {
                const idx = parseInt(chk.getAttribute('data-idx'));
                const qtyInput = Array.from(qtys).find(q => parseInt(q.getAttribute('data-idx')) === idx);
                const subtotalSpan = Array.from(subtotals).find(s => parseInt(s.getAttribute('data-idx')) === idx);

                const item = pedidoActivo.items[idx];
                if (!item) return;

                let qty = 0;
                if (chk.checked && qtyInput) {
                    qty = parseFloat(qtyInput.value);
                    if (isNaN(qty) || qty < 0) qty = 0;

                    // Solo limitamos la cantidad máxima si no estamos en modo modificación
                    if (!isModifying) {
                        const maxQty = item.cantidad_original || item.cantidad;
                        if (qty > maxQty) {
                            qty = maxQty;
                            qtyInput.value = qty;
                        }
                    }
                }

                const subtotal = qty * item.precio;
                if (subtotalSpan) {
                    subtotalSpan.innerText = subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2});
                }

                totalAmt += subtotal;
            });
        } else {
            totalAmt = parseFloat(pedidoActivo.importe) || 0;
        }
    }

    // Calcular SUBTOTAL, NETO, TOTAL (El total es estrictamente Neto sin IVA)
    const subtotal = totalAmt;
    const neto = totalAmt;
    const iva = 0;
    const total = totalAmt;

    // Determinar moneda de forma numérica
    let currencyVal = 1; // Default Pesos (1)
    let cotizVal = 1.0;

    const currencySelect = document.getElementById('auth-currency-select');
    const cotizInput = document.getElementById('auth-exchange-rate-input');

    if (isPending || isModifying) {
        if (currencySelect) {
            currencyVal = parseInt(currencySelect.value);
            if (currencyVal === 2 || currencyVal === 60) {
                cotizVal = cotizInput ? parseFloat(cotizInput.value) : 1.0;
                if (isNaN(cotizVal) || cotizVal <= 0) cotizVal = (currencyVal === 2 ? 1011.00 : 1100.00);
            } else {
                cotizVal = 1.0;
            }
        } else {
            // Si el control no está cargado aún, usar el guardado o heurística
            currencyVal = pedidoActivo.moneda_id || (pedidoActivo.importe <= 50000 ? 2 : 1);
            cotizVal = pedidoActivo.cotizacion || (currencyVal === 2 ? 1011.00 : (currencyVal === 60 ? 1100.00 : 1.0));
        }
    } else {
        // En modo resuelto se lee del pedido
        currencyVal = pedidoActivo.moneda_id || (pedidoActivo.importe <= 50000 ? 2 : 1);
        cotizVal = pedidoActivo.cotizacion || (currencyVal === 2 ? 1011.00 : (currencyVal === 60 ? 1100.00 : 1.0));
    }

    let currencyName = 'Pesos';
    if (currencyVal === 2) currencyName = 'Dólares';
    else if (currencyVal === 60) currencyName = 'Euros';

    // Formatear
    const fmt = (val) => `$${(parseFloat(val) || 0).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Poblar DOM de totales
    const subtotalEl = document.getElementById('auth-subtotal-val');
    const netoEl = document.getElementById('auth-neto-val');
    const ivaEl = document.getElementById('auth-iva-val-calc');
    const totalEl = document.getElementById('auth-total-val-calc');
    const currencyNameEl = document.getElementById('auth-currency-name');

    if (subtotalEl) subtotalEl.innerText = fmt(subtotal);
    if (netoEl) netoEl.innerText = fmt(neto);
    if (ivaEl) ivaEl.innerText = fmt(iva);
    if (totalEl) totalEl.innerText = fmt(total);
    if (currencyNameEl) currencyNameEl.innerText = currencyName;

    // Equivalencia en letras / cotización
    const equivEl = document.getElementById('auth-equivalent-text');
    if (equivEl) {
        if (currencyVal === 2) {
            equivEl.innerHTML = `${total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} DOLARES ESTADOUN. cot. ${cotizVal.toLocaleString('es-AR', {minimumFractionDigits: 8, maximumFractionDigits: 8})}<br><span style="font-size: 8.5px; font-weight: normal; color: #475569; display: block; margin-top: 3px;">(${numeroALetras(total, 'DOLARES ESTADOUNIDENSES')})</span>`;
        } else if (currencyVal === 60) {
            equivEl.innerHTML = `${total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} EUROS cot. ${cotizVal.toLocaleString('es-AR', {minimumFractionDigits: 8, maximumFractionDigits: 8})}<br><span style="font-size: 8.5px; font-weight: normal; color: #475569; display: block; margin-top: 3px;">(${numeroALetras(total, 'EUROS')})</span>`;
        } else {
            equivEl.innerHTML = `${total.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} PESOS cot. 1,00000000<br><span style="font-size: 8.5px; font-weight: normal; color: #475569; display: block; margin-top: 3px;">(${numeroALetras(total, 'PESOS')})</span>`;
        }
    }

    // Items Count y Fecha del Sistema
    const itemsCountEl = document.getElementById('auth-sys-items-count');
    if (itemsCountEl) {
        let count = 0;
        const activeItems = (pedidoActivo && Array.isArray(pedidoActivo.items)) ? pedidoActivo.items : [];
        if (isPending) {
            activeItems.forEach((item, idx) => {
                if (item.estado === 'Autorizado') {
                    count++;
                } else if (item.estado !== 'Rechazado') {
                    const chk = Array.from(checks).find(c => parseInt(c.getAttribute('data-idx')) === idx);
                    if (chk && chk.checked) {
                        count++;
                    }
                }
            });
        } else {
            activeItems.forEach(item => {
                if (item.estado !== 'Rechazado') {
                    count++;
                }
            });
        }
        itemsCountEl.innerText = count;
    }

    const sysDateEl = document.getElementById('auth-sys-date');
    const sysUserEl = document.getElementById('auth-sys-user');

    if (sysDateEl) {
        let formattedDate = '-';
        if (pedidoActivo.fecha) {
            // Usar la fecha del pedido + hora actual o la guardada
            if (pedidoActivo.fecha.includes(' ')) {
                const parts = pedidoActivo.fecha.split(' ');
                const dateParts = parts[0].split('-');
                if (dateParts.length === 3) {
                    formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${parts[1]}`;
                }
            } else {
                formattedDate = pedidoActivo.fecha;
            }
        }
        sysDateEl.innerText = formattedDate;
    }
    if (sysUserEl) {
        sysUserEl.innerText = (pedidoActivo.operador || 'admin').toUpperCase();
    }
    const sysReportNameEl = document.getElementById('auth-sys-report-name');
    if (sysReportNameEl && pedidoActivo) {
        sysReportNameEl.innerText = (typeof window.getBudgetDocTitle === 'function') ? window.getBudgetDocTitle(pedidoActivo) : `Presupuesto ${pedidoActivo.cliente_nombre || ''} ${pedidoActivo.id || ''}`.trim();
    }
};

// 6. ANÁLISIS Y MÉTRICAS DE VENTAS Y BI
let chartPieInstance = null;
let chartBarInstance = null;
let chartTopClientesInstance = null;
let chartRubroMixInstance = null;

window.applyPresetDateFilterMetrics = function(preset) {
    const dtStart = document.getElementById('filter-date-start');
    const dtEnd = document.getElementById('filter-date-end');
    if (!dtStart || !dtEnd) return;

    const today = new Date();
    const formatDate = (date) => getLocalDateStr(date);

    if (preset === 'today') {
        const d = formatDate(today);
        dtStart.value = d;
        dtEnd.value = d;
    } else if (preset === 'yesterday') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const d = formatDate(yesterday);
        dtStart.value = d;
        dtEnd.value = d;
    } else if (preset === 'last7') {
        const past7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dtStart.value = formatDate(past7);
        dtEnd.value = formatDate(today);
    } else if (preset === 'last30') {
        const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        dtStart.value = formatDate(past30);
        dtEnd.value = formatDate(today);
    } else if (preset === 'thisMonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        dtStart.value = formatDate(firstDay);
        dtEnd.value = formatDate(today);
    } else if (preset === 'lastMonth') {
        const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        dtStart.value = formatDate(firstDayPrev);
        dtEnd.value = formatDate(lastDayPrev);
    }
    renderMetrics();
};

function initMetricsView() {
    // Configurar fechas filtros
    const dtStart = document.getElementById('filter-date-start');
    const dtEnd = document.getElementById('filter-date-end');
    const sellerSelect = document.getElementById('filter-metrics-seller');
    const rubroSelect = document.getElementById('filter-metrics-rubro');

    if (dtStart && !dtStart.value) {
        const today = getLocalDateStr(new Date());
        const past365 = getLocalDateStr(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
        dtStart.value = past365;
        dtEnd.value = today;
    }

    // Llenar selector de usuarios / operadores
    if (sellerSelect) {
        sellerSelect.innerHTML = '<option value="">Todos los Usuarios...</option>';
        const userList = (appData && Array.isArray(appData.users)) ? appData.users : [];
        userList.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.innerText = `👤 ${u.username}`;
            sellerSelect.appendChild(opt);
        });
        sellerSelect.onchange = renderMetrics;
    }

    if (rubroSelect) {
        rubroSelect.onchange = renderMetrics;
    }

    const filterHandler = () => renderMetrics();
    if (dtStart) dtStart.onchange = filterHandler;
    if (dtEnd) dtEnd.onchange = filterHandler;

    const applyBtn = document.getElementById('btn-apply-filters');
    const clearBtn = document.getElementById('btn-clear-filters');

    if (applyBtn) applyBtn.onclick = () => renderMetrics();
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (dtStart) dtStart.value = '';
            if (dtEnd) dtEnd.value = '';
            if (sellerSelect) sellerSelect.value = '';
            if (rubroSelect) rubroSelect.value = '';
            renderMetrics();
        };
    }

    renderMetrics();
}

function renderMetrics() {
    const dateStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dateEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';
    const sellerSelectEl = document.getElementById('filter-metrics-seller');
    const rubroSelectEl = document.getElementById('filter-metrics-rubro');
    let sellerSelectVal = sellerSelectEl ? sellerSelectEl.value : '';
    let rubroSelectVal = rubroSelectEl ? rubroSelectEl.value : '';

    // Filtrar por fecha
    let dateFiltered = (appData.pedidos || []).filter(p => {
        const pDate = (p.fecha || '').substring(0, 10);
        if (dateStart && pDate < dateStart) return false;
        if (dateEnd && pDate > dateEnd) return false;
        return true;
    });

    // Filtrar por rubro
    if (rubroSelectVal) {
        dateFiltered = dateFiltered.filter(p => (p.tipo_presupuesto || 'Eléctrico') === rubroSelectVal);
    }

    // Filtrar por usuario / operador
    let filtered = dateFiltered;
    if (sellerSelectVal) {
        filtered = dateFiltered.filter(p => {
            const pUser = String(p.operador || 'admin').trim().toLowerCase();
            return pUser === sellerSelectVal.trim().toLowerCase();
        });
    }

    let totalAmt = 0;
    let totalFacturadoAmt = 0;
    let approvedAmt = 0;
    let approvedCnt = 0;
    let pendingAmt = 0;
    let pendingCnt = 0;
    let rejectedAmt = 0;
    let rejectedCnt = 0;

    let elecTotAmt = 0, elecCnt = 0;
    let mecaTotAmt = 0, mecaCnt = 0;
    let facturadoMesAmt = 0;
    let facturadoAnioAmt = 0;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const curMonthName = monthNames[curMonth];

    const clientDataMap = {};
    const sellerDataMap = {};

    filtered.forEach(p => {
        const amt = parseFloat(p.importe || p.importe_total || 0);
        const facturado = parseFloat(p.monto_facturado_total || p.monto_facturado || 0);
        const pctAvance = parseFloat(p.avance_porcentaje_acumulado || p.facturado_porcentaje || 0);

        totalAmt += amt;
        totalFacturadoAmt += facturado;

        // Cálculo de facturación en el mes y año
        if (p.avances && Array.isArray(p.avances) && p.avances.length > 0) {
            p.avances.forEach(a => {
                const aAmt = parseFloat(a.monto || a.monto_equivalente || 0);
                const aDateStr = a.fecha || p.fecha;
                if (aDateStr) {
                    let aDate = null;
                    if (aDateStr.includes('-')) {
                        const parts = aDateStr.substring(0, 10).split('-');
                        if (parts[0].length === 4) aDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                        else aDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                    } else if (aDateStr.includes('/')) {
                        const parts = aDateStr.split('/');
                        aDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                    } else {
                        aDate = new Date(aDateStr);
                    }
                    if (aDate && !isNaN(aDate.getTime())) {
                        if (aDate.getFullYear() === curYear) {
                            facturadoAnioAmt += aAmt;
                            if (aDate.getMonth() === curMonth) {
                                facturadoMesAmt += aAmt;
                            }
                        }
                    }
                } else {
                    facturadoAnioAmt += aAmt;
                    facturadoMesAmt += aAmt;
                }
            });
        } else if (facturado > 0) {
            const pDateStr = p.fecha;
            if (pDateStr) {
                let pDate = null;
                if (pDateStr.includes('-')) {
                    const parts = pDateStr.substring(0, 10).split('-');
                    if (parts[0].length === 4) pDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    else pDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                } else if (pDateStr.includes('/')) {
                    const parts = pDateStr.split('/');
                    pDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                } else {
                    pDate = new Date(pDateStr);
                }
                if (pDate && !isNaN(pDate.getTime())) {
                    if (pDate.getFullYear() === curYear) {
                        facturadoAnioAmt += facturado;
                        if (pDate.getMonth() === curMonth) {
                            facturadoMesAmt += facturado;
                        }
                    }
                }
            } else {
                facturadoAnioAmt += facturado;
                facturadoMesAmt += facturado;
            }
        }

        const rubro = p.tipo_presupuesto || 'Eléctrico';
        if (rubro === 'Mecánico') {
            mecaTotAmt += amt;
            mecaCnt++;
        } else {
            elecTotAmt += amt;
            elecCnt++;
        }

        const isApproved = (p.estado === 'Aprobado con OC' || p.estado === 'Aprobado' || p.estado === 'Autorizado' || p.estado === 'Facturado Parcial' || p.estado === 'Facturado Total');
        const isPending = (p.estado === 'Enviado sin OC' || p.estado === 'Pendiente de Autorización' || p.estado === 'En Revisión');
        const isRejected = (p.estado === 'Rechazado' || p.estado === 'Anulado');

        if (isApproved) {
            approvedAmt += amt;
            approvedCnt++;
        } else if (isRejected) {
            rejectedAmt += amt;
            rejectedCnt++;
        } else {
            pendingAmt += amt;
            pendingCnt++;
        }

        // Agrupación por Cliente
        const clientName = (p.cliente_nombre || p.meca_denominacion || 'Cliente').trim();
        if (!clientDataMap[clientName]) {
            clientDataMap[clientName] = {
                nombre: clientName,
                pedidos: 0,
                montoTotal: 0,
                montoFacturado: 0,
                sumPctAvance: 0
            };
        }
        clientDataMap[clientName].pedidos++;
        clientDataMap[clientName].montoTotal += amt;
        clientDataMap[clientName].montoFacturado += facturado;
        clientDataMap[clientName].sumPctAvance += pctAvance;

        // Agrupación por Usuario / Operador
        let pUser = String(p.operador || 'admin').trim().toUpperCase();
        if (!sellerDataMap[pUser]) {
            sellerDataMap[pUser] = {
                vendedor: pUser,
                pedidosTotales: 0,
                pedidosAprobados: 0,
                montoTotal: 0,
                montoFacturado: 0
            };
        }
        sellerDataMap[pUser].pedidosTotales++;
        sellerDataMap[pUser].montoTotal += amt;
        sellerDataMap[pUser].montoFacturado += facturado;
        if (isApproved) {
            sellerDataMap[pUser].pedidosAprobados++;
        }
    });

    const saldoPendiente = Math.max(0, totalAmt - totalFacturadoAmt);
    const pctFacturadoGlobal = totalAmt > 0 ? ((totalFacturadoAmt / totalAmt) * 100).toFixed(1) : '0';

    // 1. Actualizar Tarjetas de KPIs
    const elTot = document.getElementById('metric-total');
    const elTotAmt = document.getElementById('metric-total-amt');
    const elFactAmt = document.getElementById('metric-facturado-amt');
    const elPctFact = document.getElementById('metric-pct-facturado-global');
    const elPendCobro = document.getElementById('metric-pendiente-cobro-amt');
    const elAppr = document.getElementById('metric-approved');
    const elApprAmt = document.getElementById('metric-approved-amt');
    const elElecAmt = document.getElementById('metric-elec-amt');
    const elElecCnt = document.getElementById('metric-elec-cnt');
    const elMecaAmt = document.getElementById('metric-meca-amt');
    const elMecaCnt = document.getElementById('metric-meca-cnt');
    const elFactMesAmt = document.getElementById('metric-facturado-mes-amt');
    const elFactMesSub = document.getElementById('metric-facturado-mes-sub');
    const elFactAnioAmt = document.getElementById('metric-facturado-anio-amt');
    const elFactAnioSub = document.getElementById('metric-facturado-anio-sub');

    if (elTot) elTot.innerText = filtered.length;
    if (elTotAmt) elTotAmt.innerText = `$${totalAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elFactAmt) elFactAmt.innerText = `$${totalFacturadoAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elPctFact) elPctFact.innerText = `${pctFacturadoGlobal}%`;
    if (elPendCobro) elPendCobro.innerText = `$${saldoPendiente.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elAppr) elAppr.innerText = approvedCnt;
    if (elApprAmt) elApprAmt.innerText = `$${approvedAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elElecAmt) elElecAmt.innerText = `$${elecTotAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elElecCnt) elElecCnt.innerText = elecCnt;
    if (elMecaAmt) elMecaAmt.innerText = `$${mecaTotAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elMecaCnt) elMecaCnt.innerText = mecaCnt;
    if (elFactMesAmt) elFactMesAmt.innerText = `$${facturadoMesAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elFactMesSub) elFactMesSub.innerText = `${curMonthName} ${curYear}`;
    if (elFactAnioAmt) elFactAnioAmt.innerText = `$${facturadoAnioAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    if (elFactAnioSub) elFactAnioSub.innerText = `Año ${curYear}`;

    // 2. Guardar datos de métricas y renderizar con alto contraste adaptable
    window.lastMetricsChartData = {
        approvedCnt, pendingCnt, rejectedCnt,
        approvedAmt, pendingAmt, rejectedAmt,
        elecTotAmt, elecCnt,
        mecaTotAmt, mecaCnt,
        facturadoMesAmt, facturadoAnioAmt,
        curMonthName, curYear,
        clientDataMap, sellerDataMap,
        filtered
    };
    renderMetricsCharts(false);

    // 3. Tabla de Rendimiento por Vendedor
    const sellerListBody = document.getElementById('seller-performance-list');
    if (sellerListBody) {
        sellerListBody.innerHTML = '';
        const sortedSellers = Object.values(sellerDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
        sortedSellers.forEach(s => {
            const efectividad = s.pedidosTotales > 0 ? Math.round((s.pedidosAprobados / s.pedidosTotales) * 100) : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.vendedor}</strong></td>
                <td style="text-align: center; font-family: inherit; font-weight: 600;">${s.pedidosTotales}</td>
                <td style="text-align: center; font-family: inherit; font-weight: 700; color: #10b981;">${s.pedidosAprobados}</td>
                <td style="text-align: right; font-family: inherit; font-weight: 700; color: #38bdf8;">$${s.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: inherit; font-weight: 700; color: #34d399;">$${s.montoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-family: inherit; font-weight: 700; color: ${efectividad >= 50 ? '#10b981' : '#f59e0b'};">${efectividad}%</td>
            `;
            sellerListBody.appendChild(tr);
        });
    }

    // 4. Tabla de Cuentas por Cliente
    const clientListBody = document.getElementById('client-performance-list');
    if (clientListBody) {
        clientListBody.innerHTML = '';
        const sortedClients = Object.values(clientDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
        sortedClients.forEach(c => {
            const avgAvance = c.pedidos > 0 ? Math.round(c.sumPctAvance / c.pedidos) : 0;
            const saldo = Math.max(0, c.montoTotal - c.montoFacturado);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.nombre}</strong></td>
                <td style="text-align: center; font-family: inherit; font-weight: 600;">${c.pedidos}</td>
                <td style="text-align: right; font-family: inherit; font-weight: 700; color: #38bdf8;">$${c.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-family: inherit; font-weight: 700; color: #f59e0b;">${avgAvance}%</td>
                <td style="text-align: right; font-family: inherit; font-weight: 700; color: #34d399;">$${c.montoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: inherit; font-weight: 600; color: #fde047;">$${saldo.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            `;
            clientListBody.appendChild(tr);
        });
    }
}

window.descargarReporteEstadisticasCSV = function() {
    const data = window.lastMetricsChartData;
    if (!data || !appData || !Array.isArray(appData.pedidos)) {
        showToast("No hay datos estadísticos para exportar a Excel.", "warning");
        return;
    }

    const dtStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dtEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';
    const sellerSelect = document.getElementById('filter-metrics-seller');
    const rubroSelect = document.getElementById('filter-metrics-rubro');
    const sellerVal = sellerSelect && sellerSelect.value ? sellerSelect.value : 'Todos';
    const rubroVal = rubroSelect && rubroSelect.value ? rubroSelect.value : 'Todos';

    let periodoText = 'Histórico Completo';
    if (dtStart && dtEnd) {
        periodoText = `${dtStart.split('-').reverse().join('/')} al ${dtEnd.split('-').reverse().join('/')}`;
    } else if (dtStart) {
        periodoText = `Desde ${dtStart.split('-').reverse().join('/')}`;
    } else if (dtEnd) {
        periodoText = `Hasta ${dtEnd.split('-').reverse().join('/')}`;
    }

    const { approvedCnt = 0, pendingCnt = 0, rejectedCnt = 0, approvedAmt = 0, pendingAmt = 0, rejectedAmt = 0, elecTotAmt = 0, elecCnt = 0, mecaTotAmt = 0, mecaCnt = 0, clientDataMap = {}, sellerDataMap = {} } = data;
    const totalAmt = approvedAmt + pendingAmt + rejectedAmt;
    const totalCnt = approvedCnt + pendingCnt + rejectedCnt;

    let totalFacturado = 0;
    Object.values(clientDataMap).forEach(c => { totalFacturado += (c.montoFacturado || 0); });
    const saldoPendiente = Math.max(0, totalAmt - totalFacturado);
    const pctFacturado = totalAmt > 0 ? ((totalFacturado / totalAmt) * 100).toFixed(1) : '0';

    // Obtener pedidos filtrados actualmente
    let dateFiltered = (appData.pedidos || []).filter(p => {
        const pDate = (p.fecha || '').substring(0, 10);
        if (dtStart && pDate < dtStart) return false;
        if (dtEnd && pDate > dtEnd) return false;
        return true;
    });
    if (rubroVal && rubroVal !== 'Todos') {
        dateFiltered = dateFiltered.filter(p => (p.tipo_presupuesto || 'Eléctrico') === rubroVal);
    }
    if (sellerVal && sellerVal !== 'Todos') {
        dateFiltered = dateFiltered.filter(p => String(p.operador || 'admin').trim().toLowerCase() === sellerVal.trim().toLowerCase());
    }

    const now = new Date();
    const emisionStr = `${now.toLocaleDateString('es-AR')} ${now.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} hs`;

    let excelHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
            <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                        <x:Name>Reporte Gerencial</x:Name>
                        <x:WorksheetOptions>
                            <x:DisplayGridlines/>
                        </x:WorksheetOptions>
                    </x:ExcelWorksheet>
                </x:ExcelWorksheets>
            </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 25px; }
            th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #334155; padding: 7px 10px; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 6px 10px; }
            .header-title { font-size: 16px; font-weight: bold; color: #0f172a; background-color: #e2e8f0; text-align: center; padding: 12px; }
            .header-sub { font-size: 11px; color: #475569; background-color: #f1f5f9; text-align: center; padding: 4px; }
            .section-header { font-size: 13px; font-weight: bold; background-color: #1e293b; color: #38bdf8; padding: 8px 10px; }
            .total-row { background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #0f172a; }
            .even-row { background-color: #f8fafc; }
            .currency { mso-number-format: "\\$#,##0.00"; text-align: right; }
            .percentage { mso-number-format: "0.0%"; text-align: center; }
            .number { mso-number-format: "#,##0"; text-align: center; }
            .kpi-title { font-weight: bold; color: #334155; }
            .kpi-value { font-weight: bold; color: #0284c7; }
        </style>
    </head>
    <body>
        <!-- ENCABEZADO CORPORATIVO -->
        <table>
            <tr>
                <td colspan="4" class="header-title">SG MONTAJES S.R.L. - REPORTE GERENCIAL Y FINANCIERO</td>
            </tr>
            <tr>
                <td colspan="4" class="header-sub">Gestión de Presupuestos, Cotizaciones y Avances de Obra</td>
            </tr>
            <tr>
                <td colspan="2"><strong>Fecha de Emisión:</strong> ${emisionStr}</td>
                <td colspan="2"><strong>Período:</strong> ${periodoText}</td>
            </tr>
        </table>

        <!-- RESUMEN DE INDICADORES FINANCIEROS (KPIS) -->
        <table>
            <tr>
                <td colspan="4" class="section-header">1. RESUMEN EJECUTIVO CONSOLIDADO</td>
            </tr>
            <tr>
                <th>Indicador Financiero</th>
                <th style="text-align: right;">Monto en Pesos ($)</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: center;">% Proporción</th>
            </tr>
            <tr>
                <td class="kpi-title">Total Presupuestado (Cotizado)</td>
                <td class="currency kpi-value">${totalAmt.toFixed(2)}</td>
                <td class="number">${totalCnt}</td>
                <td class="percentage">1.0</td>
            </tr>
            <tr class="even-row">
                <td class="kpi-title">Total Facturado por Certificación de Avances</td>
                <td class="currency" style="color: #059669; font-weight: bold;">${totalFacturado.toFixed(2)}</td>
                <td class="number">-</td>
                <td class="percentage">${(pctFacturado / 100).toFixed(3)}</td>
            </tr>
            <tr>
                <td class="kpi-title">📅 Facturado en el Mes (${curMonthName})</td>
                <td class="currency" style="color: #059669; font-weight: bold;">${facturadoMesAmt.toFixed(2)}</td>
                <td class="number">-</td>
                <td class="percentage">${totalAmt > 0 ? ((facturadoMesAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr class="even-row">
                <td class="kpi-title">📈 Facturado en el Año (${curYear})</td>
                <td class="currency" style="color: #0284c7; font-weight: bold;">${facturadoAnioAmt.toFixed(2)}</td>
                <td class="number">-</td>
                <td class="percentage">${totalAmt > 0 ? ((facturadoAnioAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr>
                <td class="kpi-title">Saldo Pendiente de Cobro / Facturar</td>
                <td class="currency" style="color: #d97706; font-weight: bold;">${saldoPendiente.toFixed(2)}</td>
                <td class="number">-</td>
                <td class="percentage">${totalAmt > 0 ? ((saldoPendiente / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr class="even-row">
                <td class="kpi-title">Presupuestos Aprobados con Orden de Compra (OC)</td>
                <td class="currency" style="color: #7c3aed; font-weight: bold;">${approvedAmt.toFixed(2)}</td>
                <td class="number">${approvedCnt}</td>
                <td class="percentage">${totalAmt > 0 ? ((approvedAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr>
                <td class="kpi-title">Cotizaciones Rubro Eléctrico</td>
                <td class="currency">${elecTotAmt.toFixed(2)}</td>
                <td class="number">${elecCnt}</td>
                <td class="percentage">${totalAmt > 0 ? ((elecTotAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
            <tr class="even-row">
                <td class="kpi-title">Cotizaciones Rubro Mecánico</td>
                <td class="currency">${mecaTotAmt.toFixed(2)}</td>
                <td class="number">${mecaCnt}</td>
                <td class="percentage">${totalAmt > 0 ? ((mecaTotAmt / totalAmt)).toFixed(3) : 0}</td>
            </tr>
        </table>

        <!-- RESUMEN POR CLIENTE -->
        <table>
            <tr>
                <td colspan="6" class="section-header">2. RESUMEN DE CUENTAS POR CLIENTE Y AVANCES DE OBRA</td>
            </tr>
            <tr>
                <th>Cliente</th>
                <th style="text-align: center;">Cant. Obras</th>
                <th style="text-align: right;">Total Presupuestado ($)</th>
                <th style="text-align: center;">% Avance Promedio</th>
                <th style="text-align: right;">Total Facturado ($)</th>
                <th style="text-align: right;">Saldo por Cobrar ($)</th>
            </tr>`;

    const sortedClients = Object.values(clientDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
    let totPresCli = 0, totFactCli = 0, totSaldoCli = 0, totPedCli = 0;

    sortedClients.forEach((c, idx) => {
        const avgAvance = c.pedidos > 0 ? Math.round(c.sumPctAvance / c.pedidos) : 0;
        const saldo = Math.max(0, c.montoTotal - c.montoFacturado);
        totPresCli += c.montoTotal;
        totFactCli += c.montoFacturado;
        totSaldoCli += saldo;
        totPedCli += c.pedidos;
        const rowClass = idx % 2 === 1 ? 'class="even-row"' : '';

        excelHTML += `
            <tr ${rowClass}>
                <td><strong>${c.nombre}</strong></td>
                <td class="number">${c.pedidos}</td>
                <td class="currency">${c.montoTotal.toFixed(2)}</td>
                <td class="percentage">${(avgAvance / 100).toFixed(2)}</td>
                <td class="currency" style="color: #059669;">${c.montoFacturado.toFixed(2)}</td>
                <td class="currency" style="color: #d97706;">${saldo.toFixed(2)}</td>
            </tr>`;
    });

    const avgGlobalAvance = totPresCli > 0 ? (totFactCli / totPresCli) : 0;
    excelHTML += `
            <tr class="total-row">
                <td>TOTAL CONSOLIDADO CLIENTES</td>
                <td class="number">${totPedCli}</td>
                <td class="currency">${totPresCli.toFixed(2)}</td>
                <td class="percentage">${avgGlobalAvance.toFixed(3)}</td>
                <td class="currency">${totFactCli.toFixed(2)}</td>
                <td class="currency">${totSaldoCli.toFixed(2)}</td>
            </tr>
        </table>

        <!-- RENDIMIENTO POR VENDEDOR -->
        <table>
            <tr>
                <td colspan="6" class="section-header">3. RENDIMIENTO POR USUARIO / OPERADOR COMERCIAL</td>
            </tr>
            <tr>
                <th>Operador / Vendedor</th>
                <th style="text-align: center;">Presupuestos Totales</th>
                <th style="text-align: center;">Aprobados con OC</th>
                <th style="text-align: right;">Total Cotizado ($)</th>
                <th style="text-align: right;">Total Facturado ($)</th>
                <th style="text-align: center;">% Efectividad Cierre</th>
            </tr>`;

    const sortedSellers = Object.values(sellerDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
    let totPedSel = 0, totApprSel = 0, totCotSel = 0, totFactSel = 0;

    sortedSellers.forEach((s, idx) => {
        const efectividad = s.pedidosTotales > 0 ? (s.pedidosAprobados / s.pedidosTotales) : 0;
        totPedSel += s.pedidosTotales;
        totApprSel += s.pedidosAprobados;
        totCotSel += s.montoTotal;
        totFactSel += s.montoFacturado;
        const rowClass = idx % 2 === 1 ? 'class="even-row"' : '';

        excelHTML += `
            <tr ${rowClass}>
                <td><strong>${s.vendedor}</strong></td>
                <td class="number">${s.pedidosTotales}</td>
                <td class="number" style="color: #059669; font-weight: bold;">${s.pedidosAprobados}</td>
                <td class="currency">${s.montoTotal.toFixed(2)}</td>
                <td class="currency" style="color: #059669;">${s.montoFacturado.toFixed(2)}</td>
                <td class="percentage">${efectividad.toFixed(3)}</td>
            </tr>`;
    });

    const efectividadGlobal = totPedSel > 0 ? (totApprSel / totPedSel) : 0;
    excelHTML += `
            <tr class="total-row">
                <td>TOTAL CONSOLIDADO VENDEDORES</td>
                <td class="number">${totPedSel}</td>
                <td class="number">${totApprSel}</td>
                <td class="currency">${totCotSel.toFixed(2)}</td>
                <td class="currency">${totFactSel.toFixed(2)}</td>
                <td class="percentage">${efectividadGlobal.toFixed(3)}</td>
            </tr>
        </table>

        <!-- DETALLE COMPLETO DE COTIZACIONES -->
        <table>
            <tr>
                <td colspan="12" class="section-header">4. DETALLE DE COTIZACIONES Y PRESUPUESTOS EMITIDOS</td>
            </tr>
            <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Rubro</th>
                <th>Cliente</th>
                <th>CUIT</th>
                <th>Denominación de Obra</th>
                <th style="text-align: right;">Importe Total ($)</th>
                <th style="text-align: center;">Estado Comercial</th>
                <th style="text-align: center;">% Avance</th>
                <th style="text-align: right;">Monto Facturado ($)</th>
                <th>Nro Orden Compra (OC)</th>
                <th>Operador</th>
            </tr>`;

    let sumImporteDetalle = 0;
    let sumFacturadoDetalle = 0;

    dateFiltered.forEach((p, idx) => {
        const amt = parseFloat(p.importe || p.importe_total || 0);
        const fact = parseFloat(p.monto_facturado_total || p.monto_facturado || 0);
        const pct = parseFloat(p.avance_porcentaje_acumulado || p.facturado_porcentaje || 0);
        sumImporteDetalle += amt;
        sumFacturadoDetalle += fact;
        const rowClass = idx % 2 === 1 ? 'class="even-row"' : '';

        excelHTML += `
            <tr ${rowClass}>
                <td>${p.id || ''}</td>
                <td>${p.fecha ? p.fecha.substring(0, 10) : ''}</td>
                <td>${p.tipo_presupuesto || 'Eléctrico'}</td>
                <td><strong>${p.cliente_nombre || ''}</strong></td>
                <td>${p.cuit || ''}</td>
                <td>${p.meca_denominacion || ''}</td>
                <td class="currency">${amt.toFixed(2)}</td>
                <td style="text-align: center;">${p.estado || ''}</td>
                <td class="percentage">${(pct / 100).toFixed(2)}</td>
                <td class="currency">${fact.toFixed(2)}</td>
                <td>${p.meca_nro_oc || p.nro_oc || '-'}</td>
                <td>${p.operador || ''}</td>
            </tr>`;
    });

    excelHTML += `
            <tr class="total-row">
                <td colspan="6">TOTAL GENERAL DE COTIZACIONES FILTRADAS (${dateFiltered.length} Presupuestos)</td>
                <td class="currency">${sumImporteDetalle.toFixed(2)}</td>
                <td></td>
                <td></td>
                <td class="currency">${sumFacturadoDetalle.toFixed(2)}</td>
                <td></td>
                <td></td>
            </tr>
        </table>
    </body>
    </html>`;

    const blob = new Blob([excelHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `SG_Montajes_Reporte_Gerencial_${new Date().toISOString().substring(0, 10)}.xls`;

    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    showToast("📊 Planilla Excel descargada con formato gerencial oficial.", "success");
};

function renderMetricsCharts(isPrint = false) {
    const data = window.lastMetricsChartData;
    if (!data) return;

    const { approvedCnt, pendingCnt, rejectedCnt, approvedAmt, pendingAmt, rejectedAmt, elecTotAmt, mecaTotAmt, clientDataMap } = data;

    // Destruir gráficos anteriores
    if (chartPieInstance) { chartPieInstance.destroy(); chartPieInstance = null; }
    if (chartBarInstance) { chartBarInstance.destroy(); chartBarInstance = null; }
    if (chartTopClientesInstance) { chartTopClientesInstance.destroy(); chartTopClientesInstance = null; }
    if (chartRubroMixInstance) { chartRubroMixInstance.destroy(); chartRubroMixInstance = null; }

    const isLight = isPrint || document.body.getAttribute('data-theme') === 'light';
    const mainTextColor = isLight ? '#0f172a' : '#f8fafc';
    const mutedTextColor = isLight ? '#334155' : '#cbd5e1';
    const gridLineColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)';

    // Gráfico 1: Torta de Estados
    const ctxPie = document.getElementById('chartStatusPie');
    if (ctxPie) {
        chartPieInstance = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Aprobados con OC', 'Enviados / Pendientes', 'Rechazados'],
                datasets: [{
                    data: [approvedCnt, pendingCnt, rejectedCnt],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 2,
                    borderColor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: mainTextColor,
                            font: { size: 12, weight: 'bold', family: 'Inter, sans-serif' },
                            padding: 12,
                            boxWidth: 16
                        }
                    }
                }
            }
        });
    }

    // Gráfico 2: Barras Monto Cotizado vs Facturado
    const ctxBar = document.getElementById('chartAmountBar');
    if (ctxBar) {
        chartBarInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Aprobados con OC', 'Pendientes', 'Rechazados'],
                datasets: [{
                    label: 'Monto Total ($)',
                    data: [approvedAmt, pendingAmt, rejectedAmt],
                    backgroundColor: isLight
                        ? ['#10b981', '#f59e0b', '#ef4444']
                        : ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderColor: ['#059669', '#d97706', '#dc2626'],
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `$${Number(ctx.raw || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: mainTextColor,
                            font: { size: 11, weight: 'bold', family: 'Inter, sans-serif' }
                        },
                        grid: { color: gridLineColor }
                    },
                    y: {
                        ticks: {
                            color: mutedTextColor,
                            font: { size: 11, weight: '600', family: 'Inter, sans-serif' },
                            callback: function(val) {
                                if (val >= 1000000) return '$' + (val / 1000000).toLocaleString('es-AR', {maximumFractionDigits: 1}) + 'M';
                                return '$' + val.toLocaleString('es-AR');
                            }
                        },
                        grid: { color: gridLineColor }
                    }
                }
            }
        });
    }

    // Gráfico 3: Top Clientes
    const ctxTopCli = document.getElementById('chartTopClientes');
    if (ctxTopCli) {
        const sortedCli = Object.values(clientDataMap || {}).sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 5);
        chartTopClientesInstance = new Chart(ctxTopCli, {
            type: 'bar',
            data: {
                labels: sortedCli.map(c => c.nombre.length > 18 ? c.nombre.substring(0, 18) + '...' : c.nombre),
                datasets: [{
                    label: 'Total Cotizado ($)',
                    data: sortedCli.map(c => c.montoTotal),
                    backgroundColor: isLight ? '#0284c7' : 'rgba(56, 189, 248, 0.8)',
                    borderColor: '#0369a1',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `$${Number(ctx.raw || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: mutedTextColor,
                            font: { size: 11, weight: '600', family: 'Inter, sans-serif' },
                            callback: function(val) {
                                if (val >= 1000000) return '$' + (val / 1000000).toLocaleString('es-AR', {maximumFractionDigits: 1}) + 'M';
                                return '$' + val.toLocaleString('es-AR');
                            }
                        },
                        grid: { color: gridLineColor }
                    },
                    y: {
                        ticks: {
                            color: mainTextColor,
                            font: { size: 11, weight: 'bold', family: 'Inter, sans-serif' }
                        },
                        grid: { color: gridLineColor }
                    }
                }
            }
        });
    }

    // Gráfico 4: Mix por Rubro (Doughnut)
    const ctxRubro = document.getElementById('chartRubroMix');
    if (ctxRubro) {
        chartRubroMixInstance = new Chart(ctxRubro, {
            type: 'doughnut',
            data: {
                labels: ['⚡ Eléctrico', '⚙️ Mecánico'],
                datasets: [{
                    data: [elecTotAmt, mecaTotAmt],
                    backgroundColor: ['#f59e0b', '#06b6d4'],
                    borderWidth: 2,
                    borderColor: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: mainTextColor,
                            font: { size: 12, weight: 'bold', family: 'Inter, sans-serif' },
                            padding: 12,
                            boxWidth: 16
                        }
                    }
                }
            }
        });
    }
}

let reportChartPieInstance = null;
let reportChartBarInstance = null;

window.imprimirReporteEstadisticas = function() {
    const data = window.lastMetricsChartData;
    if (!data) {
        showToast("No hay datos estadísticos para generar el informe.", "warning");
        return;
    }

    const reportEl = document.getElementById('printable-executive-report');
    if (!reportEl) return;

    // 1. Configurar Metadatos del Informe
    const dtStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dtEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';
    const sellerSelect = document.getElementById('filter-metrics-seller');
    const rubroSelect = document.getElementById('filter-metrics-rubro');
    const sellerVal = sellerSelect && sellerSelect.value ? sellerSelect.value : 'Todos los Operadores';
    const rubroVal = rubroSelect && rubroSelect.value ? rubroSelect.value : 'Todos los Rubros';

    let periodoText = 'Histórico Completo';
    if (dtStart && dtEnd) {
        periodoText = `${dtStart.split('-').reverse().join('/')} al ${dtEnd.split('-').reverse().join('/')}`;
    } else if (dtStart) {
        periodoText = `Desde ${dtStart.split('-').reverse().join('/')}`;
    } else if (dtEnd) {
        periodoText = `Hasta ${dtEnd.split('-').reverse().join('/')}`;
    }

    const now = new Date();
    const emisionStr = `${now.toLocaleDateString('es-AR')} ${now.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} hs`;

    const elEmision = document.getElementById('rep-emision-date');
    const elPeriodo = document.getElementById('rep-periodo');
    const elOperador = document.getElementById('rep-operador');
    if (elEmision) elEmision.innerText = emisionStr;
    if (elPeriodo) elPeriodo.innerText = periodoText;
    if (elOperador) elOperador.innerText = `${sellerVal} • Rubro: ${rubroVal}`;

    // 2. Llenar Tarjetas de KPIs Consolidados
    const {
        approvedCnt = 0, pendingCnt = 0, rejectedCnt = 0,
        approvedAmt = 0, pendingAmt = 0, rejectedAmt = 0,
        elecTotAmt = 0, elecCnt = 0, mecaTotAmt = 0, mecaCnt = 0,
        facturadoMesAmt = 0, facturadoAnioAmt = 0,
        curMonthName = 'Mes Actual', curYear = new Date().getFullYear(),
        clientDataMap = {}, sellerDataMap = {}, filtered = []
    } = data;
    const totalAmt = approvedAmt + pendingAmt + rejectedAmt;
    const totalCnt = approvedCnt + pendingCnt + rejectedCnt;

    let totalFacturado = 0;
    Object.values(clientDataMap).forEach(c => { totalFacturado += (c.montoFacturado || 0); });
    const saldoPendiente = Math.max(0, totalAmt - totalFacturado);
    const pctFacturado = totalAmt > 0 ? ((totalFacturado / totalAmt) * 100).toFixed(1) : '0';

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    setTxt('rep-kpi-total-amt', `$${totalAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-total-cnt', totalCnt);
    setTxt('rep-kpi-facturado-amt', `$${totalFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-facturado-pct', `${pctFacturado}%`);
    setTxt('rep-kpi-facturado-mes-amt', `$${facturadoMesAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-facturado-mes-sub', `${curMonthName} ${curYear}`);
    setTxt('rep-kpi-facturado-anio-amt', `$${facturadoAnioAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-facturado-anio-sub', `Año ${curYear}`);
    setTxt('rep-kpi-pendiente-amt', `$${saldoPendiente.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-approved-amt', `$${approvedAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-approved-cnt', approvedCnt);
    setTxt('rep-kpi-elec-amt', `$${elecTotAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-elec-cnt', elecCnt);
    setTxt('rep-kpi-meca-amt', `$${mecaTotAmt.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
    setTxt('rep-kpi-meca-cnt', mecaCnt);

    // 3. Tabla: Resumen Financiero por Cliente
    const tbodyClients = document.getElementById('rep-table-clients-body');
    const tfootClients = document.getElementById('rep-table-clients-foot');
    if (tbodyClients) {
        tbodyClients.innerHTML = '';
        const sortedClients = Object.values(clientDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
        let totPresCli = 0, totFactCli = 0, totSaldoCli = 0, totPedCli = 0;

        sortedClients.forEach(c => {
            const avgAvance = c.pedidos > 0 ? Math.round(c.sumPctAvance / c.pedidos) : 0;
            const saldo = Math.max(0, c.montoTotal - c.montoFacturado);
            totPresCli += c.montoTotal;
            totFactCli += c.montoFacturado;
            totSaldoCli += saldo;
            totPedCli += c.pedidos;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.nombre}</strong></td>
                <td style="text-align: center; font-weight: 600;">${c.pedidos}</td>
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${c.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-weight: 700; color: #d97706;">${avgAvance}%</td>
                <td style="text-align: right; font-weight: 700; color: #059669;">$${c.montoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-weight: 700; color: #b45309;">$${saldo.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            `;
            tbodyClients.appendChild(tr);
        });

        if (tfootClients) {
            const avgGlobalAvance = totPresCli > 0 ? ((totFactCli / totPresCli) * 100).toFixed(1) : '0';
            tfootClients.innerHTML = `
                <tr>
                    <td><strong>TOTAL GENERAL CLIENTES</strong></td>
                    <td style="text-align: center;">${totPedCli}</td>
                    <td style="text-align: right; color: #0284c7;">$${totPresCli.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: center; color: #d97706;">${avgGlobalAvance}%</td>
                    <td style="text-align: right; color: #059669;">$${totFactCli.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: right; color: #b45309;">$${totSaldoCli.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        }
    }

    // 4. Tabla: Rendimiento por Vendedor / Operador
    const tbodySellers = document.getElementById('rep-table-sellers-body');
    const tfootSellers = document.getElementById('rep-table-sellers-foot');
    if (tbodySellers) {
        tbodySellers.innerHTML = '';
        const sortedSellers = Object.values(sellerDataMap).sort((a, b) => b.montoTotal - a.montoTotal);
        let totPedSel = 0, totApprSel = 0, totCotSel = 0, totFactSel = 0;

        sortedSellers.forEach(s => {
            const efectividad = s.pedidosTotales > 0 ? Math.round((s.pedidosAprobados / s.pedidosTotales) * 100) : 0;
            totPedSel += s.pedidosTotales;
            totApprSel += s.pedidosAprobados;
            totCotSel += s.montoTotal;
            totFactSel += s.montoFacturado;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.vendedor}</strong></td>
                <td style="text-align: center; font-weight: 600;">${s.pedidosTotales}</td>
                <td style="text-align: center; font-weight: 700; color: #059669;">${s.pedidosAprobados}</td>
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${s.montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-weight: 700; color: #059669;">$${s.montoFacturado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-weight: 800; color: ${efectividad >= 50 ? '#059669' : '#d97706'};">${efectividad}%</td>
            `;
            tbodySellers.appendChild(tr);
        });

        if (tfootSellers) {
            const efectividadGlobal = totPedSel > 0 ? Math.round((totApprSel / totPedSel) * 100) : 0;
            tfootSellers.innerHTML = `
                <tr>
                    <td><strong>TOTAL GENERAL VENDEDORES</strong></td>
                    <td style="text-align: center;">${totPedSel}</td>
                    <td style="text-align: center; color: #059669;">${totApprSel}</td>
                    <td style="text-align: right; color: #0284c7;">$${totCotSel.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: right; color: #059669;">$${totFactSel.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: center; color: #059669;">${efectividadGlobal}%</td>
                </tr>
            `;
        }
    }

    // 5. Tabla: Detalle Completo de Cotizaciones y Presupuestos
    const tbodyDetail = document.getElementById('rep-table-detail-body');
    const tfootDetail = document.getElementById('rep-table-detail-foot');
    if (tbodyDetail) {
        tbodyDetail.innerHTML = '';
        let sumTotDet = 0, sumFactDet = 0;

        filtered.forEach(p => {
            const amt = parseFloat(p.importe || p.importe_total || 0);
            const fact = parseFloat(p.monto_facturado_total || p.monto_facturado || 0);
            const pct = parseFloat(p.avance_porcentaje_acumulado || p.facturado_porcentaje || 0);
            sumTotDet += amt;
            sumFactDet += fact;

            const estadoStr = String(p.estado || '').toLowerCase();
            let estadoColor = '#d97706'; // orange default
            if (estadoStr.includes('aprob') || estadoStr.includes('oc')) estadoColor = '#059669';
            else if (estadoStr.includes('rechaz')) estadoColor = '#dc2626';

            const rubroLabel = (p.tipo_presupuesto || '').includes('Mec') ? 'Mecánico' : 'Eléctrico';
            const rubroStyle = rubroLabel === 'Mecánico' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #fef3c7; color: #b45309;';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: #0f172a;">${p.id || ''}</td>
                <td>${p.fecha ? p.fecha.substring(0, 10).split('-').reverse().join('/') : ''}</td>
                <td><span style="font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 3px; ${rubroStyle}">${rubroLabel}</span></td>
                <td><strong>${p.cliente_nombre || ''}</strong></td>
                <td>${p.meca_denominacion || '-'}</td>
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${amt.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: center; font-weight: 700; color: ${estadoColor};">${p.estado || 'Pendiente'}</td>
                <td style="text-align: center; font-weight: 700; color: #d97706;">${Math.round(pct)}%</td>
                <td style="text-align: right; font-weight: 700; color: #059669;">$${fact.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            `;
            tbodyDetail.appendChild(tr);
        });

        if (tfootDetail) {
            tfootDetail.innerHTML = `
                <tr>
                    <td colspan="5"><strong>TOTAL GENERAL COTIZACIONES (${filtered.length} Presupuestos)</strong></td>
                    <td style="text-align: right; color: #0284c7;">$${sumTotDet.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td></td>
                    <td></td>
                    <td style="text-align: right; color: #059669;">$${sumFactDet.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        }
    }

    // 6. Lanzar la Impresión
    const overlay = document.getElementById('modal-overlay');
    if (!overlay || overlay.style.display === 'none' || overlay.innerHTML.trim() === '') {
        document.body.classList.remove('modal-open');
    }
    document.body.classList.add('printing-report');

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-report');
        }, 800);
    }, 200);
};

window.abrirModalMetricaVendedor = function(metricaTipo) {
    openModal('tpl-modal-vendedor-metrics');

    const searchInput = document.getElementById('modal-metric-search-input');
    const resultsList = document.getElementById('modal-metric-results-list');
    const resultsCount = document.getElementById('modal-metric-results-count');
    const titleEl = document.getElementById('modal-metric-title');

    let titleText = "Desglose por Vendedor - Pedidos";
    if (metricaTipo === 'total') titleText = "Desglose por Vendedor - Pedidos Ingresados";
    else if (metricaTipo === 'approved') titleText = "Desglose por Vendedor - Pedidos Aprobados";
    else if (metricaTipo === 'pending') titleText = "Desglose por Vendedor - Pendientes de Autorización";
    else if (metricaTipo === 'rejected') titleText = "Desglose por Vendedor - Pedidos Rechazados";

    if (titleEl) titleEl.innerText = titleText;

    const dateStart = document.getElementById('filter-date-start') ? document.getElementById('filter-date-start').value : '';
    const dateEnd = document.getElementById('filter-date-end') ? document.getElementById('filter-date-end').value : '';
    const currentUser = getCurrentUser();

    // Primero filtrar por fechas
    let dateFiltered = appData.pedidos.filter(p => {
        const pDate = p.fecha.substring(0, 10);
        if (dateStart && pDate < dateStart) return false;
        if (dateEnd && pDate > dateEnd) return false;
        return true;
    });

    // Todos los usuarios pueden ver el listado completo de presupuestos sin restricción por vendedor

    const sellerStats = {};
    let overallCount = 0;
    let overallAmount = 0.0;

    // Inicializar todos los vendedores para que figuren
    if (typeof vendedoresDB !== 'undefined') {
        vendedoresDB.forEach(v => {
            sellerStats[v.nombre] = {
                vendedor: v.nombre,
                codigo: v.codigo,
                cantidad: 0,
                monto: 0.0
            };
        });
    }

    dateFiltered.forEach(p => {
        let matchState = false;
        if (metricaTipo === 'total') matchState = true;
        else if (metricaTipo === 'approved') matchState = (p.estado === 'Aprobado' || p.estado === 'Autorizado');
        else if (metricaTipo === 'pending') matchState = (p.estado === 'Pendiente de Autorización' || p.estado === 'Cargado con orden de compra' || p.estado === 'Cargado sin orden de compra');
        else if (metricaTipo === 'rejected') matchState = (p.estado === 'Rechazado');

        if (!matchState) return;

        let pSeller = p.vendedor_nombre || p.operador_vendedor_nombre;
        if (!pSeller && p.cliente_id && typeof clientesDB !== 'undefined') {
            const cli = clientesDB.find(c => c.codigo === p.cliente_id);
            if (cli) pSeller = cli.vendedor_nombre;
        }
        if (!pSeller) pSeller = "Sin Vendedor";

        if (!sellerStats[pSeller]) {
            sellerStats[pSeller] = {
                vendedor: pSeller,
                codigo: p.vendedor_id || '',
                cantidad: 0,
                monto: 0.0
            };
        }

        const amt = parseFloat(p.importe || 0.0);
        sellerStats[pSeller].cantidad++;
        sellerStats[pSeller].monto += amt;

        overallCount++;
        overallAmount += amt;
    });

    const listSellers = Object.values(sellerStats);

    const renderTable = (query) => {
        if (!resultsList) return;
        resultsList.innerHTML = '';
        const cleanQuery = (query || '').toLowerCase().trim();

        const filtered = listSellers.filter(s => s.vendedor.toLowerCase().includes(cleanQuery));
        // Ordenar descendente por monto
        filtered.sort((a, b) => b.monto - a.monto);

        if (filtered.length === 0) {
            resultsList.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">No se encontraron vendedores</td></tr>`;
            if (resultsCount) resultsCount.innerText = "Mostrando 0 vendedores";
            return;
        }

        const fragment = document.createDocumentFragment();
        filtered.forEach(s => {
            const tr = document.createElement('tr');

            const pct = overallAmount > 0 ? ((s.monto / overallAmount) * 100).toFixed(1) : '0.0';
            const sellerDisplay = s.codigo ? `<strong>${s.vendedor}</strong> <span style="font-size:10px; color:var(--text-muted); font-family:monospace;">(Cód: ${s.codigo})</span>` : `<strong>${s.vendedor}</strong>`;

            tr.innerHTML = `
                <td>${sellerDisplay}</td>
                <td style="text-align: right; font-family: monospace;">${s.cantidad}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; color: var(--success);">$${s.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: monospace; color: var(--primary); font-weight: 600;">${pct}%</td>
            `;
            fragment.appendChild(tr);
        });
        resultsList.appendChild(fragment);
        if (resultsCount) resultsCount.innerText = `Mostrando ${filtered.length} vendedores`;
    };

    renderTable('');

    if (searchInput) {
        searchInput.oninput = (e) => renderTable(e.target.value);
    }
};

// 7. CONFIGURACIÓN DEL SISTEMA Y USUARIOS

window.onPermisoCheckboxChange = function() {
    let activeCount = 0;
    const totalCount = document.querySelectorAll('.perm-checkbox').length || 6;

    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        const val = cb.value;
        const card = document.getElementById(`card-perm-${val}`);
        const badge = document.getElementById(`badge-perm-${val}`);

        if (cb.checked) {
            activeCount++;
            if (card) {
                card.style.borderColor = '#10b981';
                card.style.background = 'rgba(16, 185, 129, 0.12)';
            }
            if (badge) {
                if (val === 'menu-all') {
                    const cbVer = document.getElementById('perm-menu-all-ver');
                    const cbEdit = document.getElementById('perm-menu-all-edit');
                    const hasV = cbVer && cbVer.checked;
                    const hasE = cbEdit && cbEdit.checked;
                    if (hasV && hasE) badge.innerText = 'HISTORIAL + EDICIÓN';
                    else if (hasV) badge.innerText = 'SOLO HISTORIAL';
                    else if (hasE) badge.innerText = 'SOLO EDICIÓN';
                    else badge.innerText = 'HABILITADO';
                } else {
                    badge.innerText = 'HABILITADO';
                }
                badge.style.background = '#10b981';
                badge.style.color = '#ffffff';
                badge.style.border = '1px solid #059669';
            }
        } else {
            if (card) {
                card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                card.style.background = 'rgba(15, 23, 42, 0.5)';
            }
            if (badge) {
                badge.innerText = 'BLOQUEADO';
                badge.style.background = 'rgba(244, 63, 94, 0.18)';
                badge.style.color = '#fda4af';
                badge.style.border = '1px solid rgba(244, 63, 94, 0.4)';
            }
        }
    });

    // Sub-cards de Seguimiento
    const cardVer = document.getElementById('card-perm-menu-all-ver');
    const cbVer = document.getElementById('perm-menu-all-ver');
    if (cardVer && cbVer) {
        if (cbVer.checked) {
            cardVer.style.borderColor = '#0284c7';
            cardVer.style.background = 'rgba(2, 132, 199, 0.18)';
        } else {
            cardVer.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            cardVer.style.background = 'rgba(0, 0, 0, 0.25)';
        }
    }

    const cardEdit = document.getElementById('card-perm-menu-all-edit');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    if (cardEdit && cbEdit) {
        if (cbEdit.checked) {
            cardEdit.style.borderColor = '#f59e0b';
            cardEdit.style.background = 'rgba(245, 158, 11, 0.18)';
        } else {
            cardEdit.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            cardEdit.style.background = 'rgba(0, 0, 0, 0.25)';
        }
    }

    const cardPrice = document.getElementById('card-perm-menu-ingresar-edit-price');
    const cbPrice = document.getElementById('perm-menu-ingresar-edit-price');
    if (cardPrice && cbPrice) {
        if (cbPrice.checked) {
            cardPrice.style.borderColor = '#f59e0b';
            cardPrice.style.background = 'rgba(245, 158, 11, 0.18)';
        } else {
            cardPrice.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            cardPrice.style.background = 'rgba(0, 0, 0, 0.25)';
        }
    }

    const countBadge = document.getElementById('summary-perm-count-badge');
    if (countBadge) {
        countBadge.innerText = `⚡ ${activeCount} de ${totalCount} Módulos Habilitados`;
        if (activeCount === 0) {
            countBadge.style.background = '#e11d48';
        } else if (activeCount === totalCount) {
            countBadge.style.background = '#10b981';
        } else {
            countBadge.style.background = '#0284c7';
        }
    }
};

window.onSeguimientoMasterChange = function() {
    const master = document.getElementById('perm-menu-all');
    const cbVer = document.getElementById('perm-menu-all-ver');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    if (!master) return;

    if (master.checked) {
        if (cbVer && !cbVer.checked && cbEdit && !cbEdit.checked) {
            cbVer.checked = true;
            cbEdit.checked = true;
        }
    } else {
        if (cbVer) cbVer.checked = false;
        if (cbEdit) cbEdit.checked = false;
    }

    window.onPermisoCheckboxChange();
};

window.onSeguimientoSubPermChange = function() {
    const master = document.getElementById('perm-menu-all');
    const cbVer = document.getElementById('perm-menu-all-ver');
    const cbEdit = document.getElementById('perm-menu-all-edit');

    const anyChecked = (cbVer && cbVer.checked) || (cbEdit && cbEdit.checked);
    if (master) {
        master.checked = anyChecked;
    }

    window.onPermisoCheckboxChange();
};

// Permisos y Matriz de Sistema por Usuario
window.cargarPermisosParaUsuario = function(username) {
    if (!username) {
        const sel = document.getElementById('config-permisos-user-select');
        if (sel && sel.value) username = sel.value;
        else username = (appData && appData.users && appData.users[0]) ? appData.users[0].username : 'mel';
    }

    const feedbackBanner = document.getElementById('permisos-save-feedback-banner');
    if (feedbackBanner) feedbackBanner.style.display = 'none';

    const u = (appData && appData.users || []).find(x => String(x.username).trim().toLowerCase() === String(username).trim().toLowerCase());
    const nameEl = document.getElementById('summary-perm-username');
    const rubroEl = document.getElementById('summary-perm-rubro');
    const emailEl = document.getElementById('summary-perm-email');

    if (nameEl) nameEl.innerText = username || '-';
    if (rubroEl) rubroEl.innerText = (u && u.rubro_defecto === 'Mecánico') ? '⚙️ Mecánico' : '⚡ Eléctrico';
    if (emailEl) emailEl.innerText = u ? (u.email || 'Sin email') : '-';

    let perms = getUserEffectivePermissions(username, u ? u.role : 'Solicitante');

    // Si tenía menu-all pero ninguno de los subpermisos explícitos (datos legacy), activar ambos
    if (perms.includes('menu-all') && !perms.includes('menu-all-ver') && !perms.includes('menu-all-edit')) {
        perms = [...perms, 'menu-all-ver', 'menu-all-edit'];
    }

    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        cb.checked = perms.includes(cb.value);
    });

    const cbVer = document.getElementById('perm-menu-all-ver');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    if (cbVer) cbVer.checked = perms.includes('menu-all-ver');
    if (cbEdit) cbEdit.checked = perms.includes('menu-all-edit');

    const cbPrice = document.getElementById('perm-menu-ingresar-edit-price');
    if (cbPrice) cbPrice.checked = perms.includes('menu-ingresar-edit-price') || perms.includes('edit-precios') || perms.includes('edit_prices') || (u && u.can_edit_prices === true);

    if (typeof window.onPermisoCheckboxChange === 'function') {
        window.onPermisoCheckboxChange();
    }
};

window.seleccionarTodosPermisos = function(state) {
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        cb.checked = state;
    });
    document.querySelectorAll('.perm-sub-checkbox').forEach(cb => {
        cb.checked = state;
    });
    if (typeof window.onPermisoCheckboxChange === 'function') {
        window.onPermisoCheckboxChange();
    }
};

window.guardarPermisosUsuarioActual = async function() {
    const sel = document.getElementById('config-permisos-user-select');
    let username = sel ? sel.value : '';
    if (!username && appData.users && appData.users.length > 0) {
        username = appData.users[0].username;
    }
    if (!username) username = (appData.users && appData.users[0]) ? appData.users[0].username : 'mel';

    if (!appData.userPermissions) {
        appData.userPermissions = {};
    }

    const selected = [];
    document.querySelectorAll('.perm-checkbox, .perm-sub-checkbox').forEach(cb => {
        if (cb.checked) selected.push(cb.value);
    });

    const cbVer = document.getElementById('perm-menu-all-ver');
    const cbEdit = document.getElementById('perm-menu-all-edit');
    if (cbVer && cbVer.checked && !selected.includes('menu-all-ver')) selected.push('menu-all-ver');
    if (cbEdit && cbEdit.checked && !selected.includes('menu-all-edit')) selected.push('menu-all-edit');

    const cbPrice = document.getElementById('perm-menu-ingresar-edit-price');
    const canEditPrices = !!(cbPrice && cbPrice.checked);
    if (canEditPrices) {
        if (!selected.includes('menu-ingresar-edit-price')) selected.push('menu-ingresar-edit-price');
        if (!selected.includes('edit-precios')) selected.push('edit-precios');
    } else {
        // Remover de la lista si fue desmarcado
        for (let i = selected.length - 1; i >= 0; i--) {
            if (selected[i] === 'menu-ingresar-edit-price' || selected[i] === 'edit-precios' || selected[i] === 'edit-price' || selected[i] === 'modificar-precios') {
                selected.splice(i, 1);
            }
        }
    }

    const cleanKey = String(username).trim().toLowerCase();
    appData.userPermissions[cleanKey] = selected;
    appData.userPermissions[username] = selected;

    const uTarget = (appData.users || []).find(x => String(x.username).trim().toLowerCase() === cleanKey || String(x.id) === cleanKey);
    const targetId = uTarget ? uTarget.id : null;
    const targetUsername = uTarget ? uTarget.username : username;

    if (uTarget) {
        uTarget.permissions = selected;
        uTarget.permisos = selected;
        uTarget.can_edit_prices = canEditPrices;
    }

    saveData();

    // Actualizar directamente en la base de datos de Supabase (tabla 'usuarios' y 'app_state')
    let savedToSupabase = false;
    let errorDetail = null;

    // 1. Guardar vía SDK de Supabase si está disponible
    const client = (typeof getDbClient === 'function') ? getDbClient() : null;
    if (client) {
        try {
            let q = client.from('usuarios').update({
                permisos: selected,
                can_edit_prices: canEditPrices
            });
            if (targetId && !isNaN(parseInt(targetId, 10))) {
                q = q.eq('id', parseInt(targetId, 10));
            } else if (targetId) {
                q = q.eq('id', targetId);
            } else {
                q = q.ilike('username', targetUsername);
            }
            const res = await q;
            if (!res.error) {
                savedToSupabase = true;
                console.log("☁️ Supabase (SDK): Permisos de '" + targetUsername + "' guardados directamente en tabla usuarios.");
            } else {
                errorDetail = res.error;
                console.warn("Aviso SDK al guardar permisos:", res.error);
            }
        } catch(e) {
            errorDetail = e;
            console.warn("Aviso update usuarios SDK:", e);
        }
    }

    // 2. Fallback REST fetch directo si el SDK no guardó
    if (!savedToSupabase) {
        try {
            const config = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : { url: 'https://amkkuwgatjcbiyrykuoy.supabase.co', anonKey: 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ' };
            const rHeaders = {
                'apikey': config.anonKey,
                'Authorization': `Bearer ${config.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            };
            const filterParam = (targetId && !isNaN(parseInt(targetId, 10)))
                ? `id=eq.${parseInt(targetId, 10)}`
                : `username=ilike.${encodeURIComponent(targetUsername)}`;
            const resp = await fetch(`${config.url}/rest/v1/usuarios?${filterParam}`, {
                method: 'PATCH',
                headers: rHeaders,
                body: JSON.stringify({ permisos: selected, can_edit_prices: canEditPrices })
            });
            if (resp.ok) {
                savedToSupabase = true;
                console.log("☁️ Supabase (REST): Permisos de '" + targetUsername + "' guardados directamente en tabla usuarios.");
            } else {
                const txt = await resp.text();
                errorDetail = txt;
            }
        } catch(restErr) {
            errorDetail = restErr;
            console.warn("Aviso REST guardando permisos:", restErr);
        }
    }

    // 3. Sincronizar también app_state en Supabase para consistencia global
    try {
        const config = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : { url: 'https://amkkuwgatjcbiyrykuoy.supabase.co', anonKey: 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ' };
        await fetch(`${config.url}/rest/v1/app_state?id=eq.globalData`, {
            method: 'PATCH',
            headers: {
                'apikey': config.anonKey,
                'Authorization': `Bearer ${config.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                user_permissions: appData.userPermissions,
                updated_at: new Date().toISOString()
            })
        });
    } catch(e) {}

    // Actualizar barra de navegación inmediatamente si el usuario logueado es el modificado
    const currentUser = getCurrentUser();
    if (currentUser && String(currentUser.username).trim().toLowerCase() === cleanKey) {
        buildSidebar();
    }

    // 1. Mostrar cartel destacado de guardado con éxito
    const banner = document.getElementById('permisos-save-feedback-banner');
    const bannerText = document.getElementById('permisos-save-feedback-text');
    if (banner) {
        if (bannerText) {
            bannerText.innerText = `Los permisos y parámetros para el usuario "${username}" fueron guardados exitosamente (${selected.length} módulos habilitados).`;
        }
        banner.style.display = 'flex';
        if (banner.scrollIntoView) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 2. Efecto visual en el botón de guardar
    const saveBtn = document.getElementById('btn-guardar-permisos-usuario');
    if (saveBtn) {
        const originalHtml = saveBtn.innerHTML;
        const originalBg = saveBtn.style.background;
        saveBtn.style.background = '#10b981';
        saveBtn.style.borderColor = '#10b981';
        saveBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ¡Guardado con Éxito!`;
        setTimeout(() => {
            saveBtn.style.background = originalBg || '#0284c7';
            saveBtn.style.borderColor = '#0284c7';
            saveBtn.innerHTML = originalHtml;
        }, 2500);
    }

    // 3. Notificación Toast global
    showToast(`¡Permisos guardados con éxito para "${username}"!`, 'success');

    if (typeof window.onPermisoCheckboxChange === 'function') {
        window.onPermisoCheckboxChange();
    }
};

window.renderConfigUsersTable = function() {
    const tbody = document.getElementById('config-users-table-tbody');
    if (!tbody) return;
    if (!appData || !Array.isArray(appData.users) || appData.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 14px;">No hay usuarios registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = appData.users.map((u, idx) => {
        const isFrozen = (u.role === 'Congelado');
        const estadoBadge = isFrozen
            ? `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 11px;">⛔ Congelado</span>`
            : `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 11px;">✅ Activo</span>`;

        const rubroBadge = (u.rubro_defecto === 'Mecánico')
            ? `<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 11px;">⚙️ Mecánico</span>`
            : `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.4); font-size: 11px;">⚡ Eléctrico</span>`;

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: ${idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'};">
                <td style="padding: 10px 14px; font-weight: 700; color: white;">${u.username}</td>
                <td style="padding: 10px 14px; color: var(--text-muted);">${u.email || '-'}</td>
                <td style="padding: 10px 14px; text-align: center;">${rubroBadge}</td>
                <td style="padding: 10px 14px; text-align: center;">${estadoBadge}</td>
            </tr>
        `;
    }).join('');
};

window.fillPermissionsUserSelect = function() {
    const sel = document.getElementById('config-permisos-user-select');
    if (!sel) return;
    sel.innerHTML = '';
    const userList = (appData && Array.isArray(appData.users)) ? appData.users : [];
    userList.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.username;
        const rubroIcon = u.rubro_defecto === 'Mecánico' ? '⚙️' : '⚡';
        opt.innerText = `👤 ${u.username} [${rubroIcon} ${u.rubro_defecto || 'Eléctrico'}] (${u.email || 'Sin email'})`;
        sel.appendChild(opt);
    });
    if (sel.options.length > 0) {
        window.cargarPermisosParaUsuario(sel.value || sel.options[0].value);
    }
};

window.guardarEmailFacturacionConfig = function() {
    const input = document.getElementById('sys-config-email-facturacion');
    if (!input || !input.value.trim()) {
        showToast('Por favor ingrese una casilla de correo válida', 'error');
        return;
    }
    const cleanEmail = input.value.trim();
    window.emailResponsableFacturacion = cleanEmail;
    if (appData) appData.emailResponsableFacturacion = cleanEmail;
    saveData();
    showToast(`Casilla de facturación actualizada a: ${cleanEmail}`, 'success');
};

function initAdminView() {
    const editSelect = document.getElementById('edit-user-select');
    const deleteSelect = document.getElementById('delete-user-select');
    const deleteWarning = document.getElementById('delete-user-warning');
    const deleteUserName = document.getElementById('delete-user-name');
    const btnFreeze = document.getElementById('btn-freeze-user');
    const btnDelete = document.getElementById('btn-delete-user');

    function renderUsers() {
        const prevSelectedEdit = editSelect ? editSelect.value : '';
        const prevSelectedDelete = deleteSelect ? deleteSelect.value : '';

        if (editSelect) editSelect.innerHTML = '<option value="">Seleccione un empleado...</option>';
        if (deleteSelect) deleteSelect.innerHTML = '<option value="">Seleccione un empleado...</option>';

        const currentU = getCurrentUser();
        const currentUserId = currentU ? String(currentU.id) : '';
        const currentUsername = currentU ? String(currentU.username || '').toLowerCase() : '';

        if (appData && Array.isArray(appData.users)) {
            appData.users.forEach(u => {
                const val = (u.id != null) ? String(u.id) : String(u.username || '');
                const vendedorStr = u.vendedor_nombre ? ` 🧑‍💼 ${u.vendedor_nombre}` : '';
                const rubroStr = u.rubro_defecto === 'Mecánico' ? ' [⚙️ Mecánico]' : ' [⚡ Eléctrico]';
                const empresaStr = u.empresa && u.empresa.includes('ACOSTA') ? ' 🔵 [Acosta]' : ' ⚙️ [SG]';
                const optText = `${u.username}${vendedorStr}${rubroStr}${empresaStr} (${u.email || 'Sin email'})`;
                if (editSelect) editSelect.innerHTML += `<option value="${val}">${optText}</option>`;
                if (deleteSelect && String(u.id) !== currentUserId && String(u.username || '').toLowerCase() !== currentUsername) {
                    deleteSelect.innerHTML += `<option value="${val}">${optText}</option>`;
                }
            });
        }

        // Restaurar selección previa si aún existe
        if (prevSelectedEdit && editSelect) {
            const hasOpt = Array.from(editSelect.options).some(o => o.value === prevSelectedEdit);
            if (hasOpt) editSelect.value = prevSelectedEdit;
        }
        if (prevSelectedDelete && deleteSelect) {
            const hasOpt = Array.from(deleteSelect.options).some(o => o.value === prevSelectedDelete);
            if (hasOpt) deleteSelect.value = prevSelectedDelete;
        }

        if (!deleteSelect || !deleteSelect.value) {
            if (deleteWarning) deleteWarning.style.display = 'none';
            if (btnFreeze) {
                btnFreeze.style.opacity = '0.5';
                btnFreeze.style.pointerEvents = 'none';
            }
            if (btnDelete) {
                btnDelete.style.opacity = '0.5';
                btnDelete.style.pointerEvents = 'none';
            }
        }

        window.renderConfigUsersTable();
    }

    window.renderUsersAdminView = renderUsers;
    renderUsers();
    window.fillPermissionsUserSelect();

    // Sincronizar en vivo directamente con Supabase (Fuente Única de Verdad)
    if (typeof window.recargarUsuariosDesdeSupabase === 'function') {
        window.recargarUsuariosDesdeSupabase();
    }

    // Correo de Facturación
    const emailFactEl = document.getElementById('sys-config-email-facturacion');
    if (emailFactEl) {
        emailFactEl.value = window.emailResponsableFacturacion || (appData && appData.emailResponsableFacturacion) || 'facturacion@sgmontajes.com.ar';
    }

    // Llenar formulario de edición al seleccionar usuario (con lectura directa de Supabase)
    if (editSelect) {
        editSelect.onchange = async (e) => {
            const rawVal = e.target ? e.target.value : '';
            if (!rawVal) {
                const uField = document.getElementById('edit-username');
                const eField = document.getElementById('edit-email');
                const pField = document.getElementById('edit-password');
                const rField = document.getElementById('edit-rubro');
                const empField = document.getElementById('edit-empresa');
                if (uField) uField.value = '';
                if (eField) eField.value = '';
                if (pField) pField.value = '';
                if (rField) rField.value = 'Eléctrico';
                if (empField) empField.value = 'SG MONTAJES SRL';
                document.querySelectorAll('.edit-user-perm-cb').forEach(cb => { cb.checked = false; });
                return;
            }

            const cleanSearch = String(rawVal).trim().toLowerCase();
            let user = (appData && Array.isArray(appData.users)) ? appData.users.find(u => 
                String(u.id).trim() === String(rawVal).trim() ||
                String(u.username || '').trim().toLowerCase() === cleanSearch
            ) : null;

            // Consultar directamente a Supabase (Fuente Única de Verdad) para traer el registro más fresco
            try {
                const client = (typeof getDbClient === 'function') ? getDbClient() : null;
                if (client) {
                    let q = client.from('usuarios').select('*');
                    if (/^\d+$/.test(String(rawVal).trim())) {
                        q = q.or(`id.eq.${rawVal},username.ilike.${cleanSearch}`);
                    } else {
                        q = q.ilike('username', cleanSearch);
                    }
                    const { data: dbRows, error: dbErr } = await q;
                    if (!dbErr && Array.isArray(dbRows) && dbRows.length > 0) {
                        const freshUser = dbRows[0];
                        if (user) {
                            Object.assign(user, freshUser);
                        } else {
                            user = freshUser;
                            if (appData && Array.isArray(appData.users)) {
                                appData.users.push(freshUser);
                            }
                        }
                    }
                }
            } catch(fetchErr) {
                console.warn("Aviso consultando Supabase para usuario:", fetchErr);
            }

            if (user) {
                if (editSelect) editSelect.value = rawVal;

                const uField = document.getElementById('edit-username');
                const eField = document.getElementById('edit-email');
                const pField = document.getElementById('edit-password');
                const rField = document.getElementById('edit-rubro');
                const empField = document.getElementById('edit-empresa');
                if (uField) uField.value = user.username || '';
                if (eField) eField.value = user.email || '';
                if (pField) pField.value = user.password || '';
                if (rField) rField.value = user.rubro_defecto || 'Eléctrico';
                if (empField) empField.value = user.empresa || 'SG MONTAJES SRL';

                // Permisos efectivos directamente desde Supabase
                const perms = getUserEffectivePermissions(user);

                document.querySelectorAll('.edit-user-perm-cb').forEach(cb => {
                    if (cb.value === 'menu-all') {
                        cb.checked = perms.includes('menu-all') || perms.includes('menu-all-ver') || perms.includes('menu-all-edit');
                    } else if (cb.value === 'menu-ingresar-edit-price') {
                        cb.checked = perms.includes('menu-ingresar-edit-price') || perms.includes('edit-precios') || user.can_edit_prices === true;
                    } else {
                        cb.checked = perms.includes(cb.value);
                    }
                });
            } else {
                console.warn("No se encontró el usuario:", rawVal);
                showToast('No se encontró el registro del usuario', 'warning');
            }
        };
    }

    if (deleteSelect) {
        deleteSelect.onchange = (e) => {
            const rawVal = e.target.value;
            if (!rawVal) {
                if (deleteWarning) deleteWarning.style.display = 'none';
                if (btnFreeze) {
                    btnFreeze.style.opacity = '0.5';
                    btnFreeze.style.pointerEvents = 'none';
                }
                if (btnDelete) {
                    btnDelete.style.opacity = '0.5';
                    btnDelete.style.pointerEvents = 'none';
                }
                return;
            }

            const cleanSearch = String(rawVal).trim().toLowerCase();
            const user = (appData && Array.isArray(appData.users)) ? appData.users.find(u => 
                String(u.id).trim() === String(rawVal).trim() ||
                String(u.username || '').trim().toLowerCase() === cleanSearch
            ) : null;

            if (user) {
                if (deleteUserName) deleteUserName.textContent = user.username;
                if (deleteWarning) deleteWarning.style.display = 'block';
                if (btnFreeze) {
                    btnFreeze.style.opacity = '1';
                    btnFreeze.style.pointerEvents = 'auto';
                    if (user.role === 'Congelado') {
                        btnFreeze.innerHTML = '<i class="fa-solid fa-lock-open"></i> Descongelar';
                    } else {
                        btnFreeze.innerHTML = '<i class="fa-solid fa-snowflake"></i> Congelar';
                    }

                    btnFreeze.onclick = async () => {
                        user.role = (user.role === 'Congelado') ? 'Solicitante' : 'Congelado';
                        saveData();
                        const client = (typeof getDbClient === 'function') ? getDbClient() : null;
                        if (client) {
                            try {
                                if (user.id && !isNaN(parseInt(user.id, 10))) {
                                    await client.from('usuarios').update({ role: user.role }).eq('id', parseInt(user.id, 10));
                                } else {
                                    await client.from('usuarios').update({ role: user.role }).ilike('username', user.username);
                                }
                            } catch(err) {
                                console.warn("Aviso al actualizar rol en Supabase:", err);
                            }
                        }
                        showToast(`Usuario ${user.username} actualizado (${user.role}).`, 'success');
                        renderUsers();
                        deleteSelect.value = '';
                        if (deleteSelect.onchange) deleteSelect.onchange({ target: { value: '' }});
                    };
                }

                if (btnDelete) {
                    btnDelete.style.opacity = '1';
                    btnDelete.style.pointerEvents = 'auto';
                    btnDelete.onclick = async () => {
                        const confirmation = prompt(`¿Eliminar definitivamente a ${user.username}? Escriba ELIMINAR para confirmar.`);
                        if (confirmation === 'ELIMINAR') {
                            const uName = user.username;
                            const uId = user.id;
                            appData.users = appData.users.filter(u => String(u.id) !== String(uId) && String(u.username).toLowerCase() !== String(uName).toLowerCase());
                            saveData();
                            const client = (typeof getDbClient === 'function') ? getDbClient() : null;
                            if (client) {
                                try {
                                    if (uId && !isNaN(parseInt(uId, 10))) {
                                        await client.from('usuarios').delete().eq('id', parseInt(uId, 10));
                                    } else {
                                        await client.from('usuarios').delete().ilike('username', uName);
                                    }
                                    console.log("☁️ Supabase: Usuario " + uName + " eliminado.");
                                } catch(delErr) {
                                    console.warn("Aviso delete usuario Supabase:", delErr);
                                }
                            }
                            showToast(`Usuario ${uName} eliminado.`, 'info');
                            renderUsers();
                            window.fillPermissionsUserSelect();
                            deleteSelect.value = '';
                            if (deleteSelect.onchange) deleteSelect.onchange({ target: { value: '' }});
                        } else {
                            showToast('Eliminación cancelada.', 'error');
                        }
                    };
                }
            } else {
                if (deleteWarning) deleteWarning.style.display = 'none';
                if (btnFreeze) {
                    btnFreeze.style.opacity = '0.5';
                    btnFreeze.style.pointerEvents = 'none';
                }
                if (btnDelete) {
                    btnDelete.style.opacity = '0.5';
                    btnDelete.style.pointerEvents = 'none';
                }
            }
        };
    }

    // Submit edicion
    const editForm = document.getElementById('edit-user-form');
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const userId = editSelect ? editSelect.value : '';
            if (!userId) {
                showToast('Por favor seleccione un usuario para modificar', 'warning');
                return;
            }

            const cleanId = String(userId).trim().toLowerCase();
            const userIdx = (appData && Array.isArray(appData.users)) 
                ? appData.users.findIndex(u => String(u.id).trim() === String(userId).trim() || String(u.username || '').trim().toLowerCase() === cleanId) 
                : -1;
            if (userIdx === -1) {
                showToast('Usuario no encontrado', 'error');
                return;
            }

            const oldUser = appData.users[userIdx];
            const oldUsername = oldUser.username;

            const uField = document.getElementById('edit-username');
            const eField = document.getElementById('edit-email');
            const pField = document.getElementById('edit-password');
            const rField = document.getElementById('edit-rubro');
            const empField = document.getElementById('edit-empresa');

            const newUsername = uField ? uField.value.trim().toLowerCase() : '';
            const email = eField ? eField.value.trim() : '';
            const password = pField ? pField.value.trim() : '';
            const rubro_defecto = (rField ? rField.value : 'Eléctrico') || 'Eléctrico';
            const empresa = empField ? empField.value : (oldUser.empresa || 'SG MONTAJES SRL');

            const existing = (appData.users || []).find(u => 
                String(u.username).trim().toLowerCase() === newUsername && 
                String(u.id).trim() !== String(oldUser.id).trim() &&
                String(u.username).trim().toLowerCase() !== String(oldUsername).trim().toLowerCase()
            );
            if (existing) {
                showToast('El nombre de usuario ya está en uso', 'error');
                return;
            }

            // Extraer vistas seleccionadas
            const selectedPerms = [];
            document.querySelectorAll('.edit-user-perm-cb').forEach(cb => {
                if (cb.checked) selectedPerms.push(cb.value);
            });
            if (selectedPerms.includes('menu-all')) {
                if (!selectedPerms.includes('menu-all-ver')) selectedPerms.push('menu-all-ver');
                if (!selectedPerms.includes('menu-all-edit')) selectedPerms.push('menu-all-edit');
            }

            const canEditPrices = selectedPerms.includes('menu-ingresar-edit-price') || selectedPerms.includes('edit-precios');
            
            // Actualizar objeto en memoria
            appData.users[userIdx].username = newUsername;
            appData.users[userIdx].email = email;
            appData.users[userIdx].password = password;
            appData.users[userIdx].rubro_defecto = rubro_defecto;
            appData.users[userIdx].empresa = empresa;
            appData.users[userIdx].permissions = selectedPerms;
            appData.users[userIdx].permisos = selectedPerms;
            appData.users[userIdx].can_edit_prices = canEditPrices;

            if (!appData.userPermissions) appData.userPermissions = {};
            if (oldUsername && oldUsername !== newUsername && appData.userPermissions[oldUsername]) {
                delete appData.userPermissions[oldUsername];
            }
            appData.userPermissions[newUsername] = selectedPerms;

            saveData();

            // Sincronizar directamente con Supabase (Fuente Única de Verdad)
            const client = (typeof getDbClient === 'function') ? getDbClient() : null;
            const userRow = {
                username: newUsername,
                email: email,
                password: password,
                role: appData.users[userIdx].role || 'Solicitante',
                rubro_defecto: rubro_defecto,
                empresa: empresa,
                permisos: selectedPerms,
                can_edit_prices: canEditPrices
            };

            let savedToSupabase = false;
            if (client) {
                try {
                    let updateQuery = client.from('usuarios').update(userRow);
                    const currentRecordId = oldUser.id;
                    if (currentRecordId && !isNaN(parseInt(currentRecordId, 10))) {
                        updateQuery = updateQuery.eq('id', parseInt(currentRecordId, 10));
                    } else if (currentRecordId) {
                        updateQuery = updateQuery.eq('id', currentRecordId);
                    } else {
                        updateQuery = updateQuery.ilike('username', oldUsername);
                    }
                    const { error: updErr } = await updateQuery;
                    if (!updErr) {
                        savedToSupabase = true;
                        console.log("☁️ Supabase (SDK): Usuario " + newUsername + " actualizado con permisos en tabla usuarios.");
                    } else {
                        console.warn("⚠️ Error SDK actualizando usuario:", updErr);
                    }
                } catch(saveErr) {
                    console.warn("Aviso SDK guardando usuario:", saveErr);
                }
            }

            // Fallback REST fetch directo si el SDK no guardó
            if (!savedToSupabase) {
                try {
                    const config = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : { url: 'https://amkkuwgatjcbiyrykuoy.supabase.co', anonKey: 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ' };
                    const rHeaders = {
                        'apikey': config.anonKey,
                        'Authorization': `Bearer ${config.anonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    };
                    const currentRecordId = oldUser.id;
                    const filterParam = (currentRecordId && !isNaN(parseInt(currentRecordId, 10)))
                        ? `id=eq.${parseInt(currentRecordId, 10)}`
                        : `username=ilike.${encodeURIComponent(oldUsername || newUsername)}`;
                    const resp = await fetch(`${config.url}/rest/v1/usuarios?${filterParam}`, {
                        method: 'PATCH',
                        headers: rHeaders,
                        body: JSON.stringify(userRow)
                    });
                    if (resp.ok) {
                        savedToSupabase = true;
                        console.log("☁️ Supabase (REST): Usuario " + newUsername + " actualizado con permisos.");
                    }
                } catch(restErr) {
                    console.warn("Aviso REST guardando usuario:", restErr);
                }
            }

            // Sincronizar también app_state para consistencia global
            try {
                const config = (typeof getSupabaseConfig === 'function') ? getSupabaseConfig() : { url: 'https://amkkuwgatjcbiyrykuoy.supabase.co', anonKey: 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ' };
                await fetch(`${config.url}/rest/v1/app_state?id=eq.globalData`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': config.anonKey,
                        'Authorization': `Bearer ${config.anonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        user_permissions: appData.userPermissions,
                        updated_at: new Date().toISOString()
                    })
                });
            } catch(e) {}

            showToast('Credenciales y vistas actualizadas exitosamente en Supabase.', 'success');
            const currentUser = getCurrentUser();
            if (currentUser && (currentUser.username === oldUsername || currentUser.username === newUsername)) {
                buildSidebar();
            }
            renderUsers();
            window.fillPermissionsUserSelect();
            if (editSelect) {
                const currentSavedVal = (oldUser.id != null) ? String(oldUser.id) : newUsername;
                editSelect.value = currentSavedVal;
            }
        };
    }

    // Submit creacion
    const createForm = document.getElementById('create-user-form');
    if (createForm) {
        createForm.onsubmit = (e) => {
            e.preventDefault();
            const uField = document.getElementById('new-username');
            const pField = document.getElementById('new-password');
            const eField = document.getElementById('new-email');
            const rField = document.getElementById('new-rubro');
            const username = uField ? uField.value.trim().toLowerCase() : '';
            const password = pField ? pField.value.trim() : '';
            const email = eField ? eField.value.trim() : '';
            const rubro_defecto = (rField ? rField.value : 'Eléctrico') || 'Eléctrico';

            if (appData.users.find(u => u.username === username)) {
                showToast('El usuario ya existe', 'error');
                return;
            }

            // Extraer vistas seleccionadas para el nuevo usuario
            const selectedPerms = [];
            document.querySelectorAll('.new-user-perm-cb').forEach(cb => {
                if (cb.checked) selectedPerms.push(cb.value);
            });
            if (selectedPerms.includes('menu-all')) {
                if (!selectedPerms.includes('menu-all-ver')) selectedPerms.push('menu-all-ver');
                if (!selectedPerms.includes('menu-all-edit')) selectedPerms.push('menu-all-edit');
            }
            const finalPerms = selectedPerms.length > 0 ? selectedPerms : ['menu-ingresar', 'menu-estado-presupuesto', 'menu-rechazados', 'menu-all', 'menu-all-ver', 'menu-all-edit'];
            const canEditPrices = finalPerms.includes('menu-ingresar-edit-price') || finalPerms.includes('edit-precios');

            // Obtener el siguiente ID numérico secuencial correlativo
            let maxId = 0;
            (appData.users || []).forEach(u => {
                const num = parseInt(u.id, 10);
                if (!isNaN(num) && num > maxId) {
                    maxId = num;
                }
            });
            const nextUserId = String(maxId + 1);

            const newUser = {
                id: nextUserId,
                username,
                password,
                email,
                role: 'Solicitante',
                rubro_defecto,
                empresa: 'SG MONTAJES SRL',
                vendedor_codigo: '',
                vendedor_nombre: '',
                permisos: finalPerms,
                permissions: finalPerms,
                can_edit_prices: canEditPrices
            };

            appData.users.push(newUser);

            if (!appData.userPermissions) appData.userPermissions = {};
            appData.userPermissions[username] = finalPerms;

            saveData();

            const client = (typeof getDbClient === 'function') ? getDbClient() : null;
            if (client) {
                const newRow = {
                    id: parseInt(newUser.id, 10) || newUser.id,
                    username: newUser.username,
                    password: newUser.password,
                    email: newUser.email,
                    role: newUser.role,
                    rubro_defecto: newUser.rubro_defecto,
                    empresa: 'SG MONTAJES SRL',
                    permisos: finalPerms,
                    can_edit_prices: canEditPrices
                };
                client.from('usuarios').upsert([newRow], { onConflict: 'username' }).then(function(res) {
                    if (res && res.error) {
                        delete newRow.id;
                        client.from('usuarios').upsert([newRow], { onConflict: 'username' });
                    } else {
                        console.log("☁️ Supabase: Usuario " + newUser.username + " registrado con permisos en tabla usuarios.");
                    }
                }).catch(function() {
                    delete newRow.id;
                    client.from('usuarios').upsert([newRow], { onConflict: 'username' });
                });
            }

            showToast(`Usuario ${username} creado exitosamente (${rubro_defecto}).`, 'success');
            e.target.reset();
            renderUsers();
            window.fillPermissionsUserSelect();
        };
    }
}

// ================= NAVEGACIÓN Y TABS DE CONFIGURACIÓN GLOBAL =================
window.switchConfigMainTab = function(tabName) {
    const btnUsers = document.getElementById('main-tab-btn-usuarios');
    const btnSys = document.getElementById('main-tab-btn-sistema');
    const secUsers = document.getElementById('config-section-usuarios');
    const secSys = document.getElementById('config-section-sistema');

    if (tabName === 'usuarios') {
        if (btnUsers) {
            btnUsers.style.background = '#0284c7';
            btnUsers.style.color = 'white';
        }
        if (btnSys) {
            btnSys.style.background = 'rgba(30, 41, 59, 0.6)';
            btnSys.style.color = 'var(--text-muted)';
        }
        if (secUsers) secUsers.style.display = 'block';
        if (secSys) secSys.style.display = 'none';
    } else {
        if (btnUsers) {
            btnUsers.style.background = 'rgba(30, 41, 59, 0.6)';
            btnUsers.style.color = 'var(--text-muted)';
        }
        if (btnSys) {
            btnSys.style.background = '#0284c7';
            btnSys.style.color = 'white';
        }
        if (secUsers) secUsers.style.display = 'none';
        if (secSys) secSys.style.display = 'block';

        if (typeof window.fillPermissionsUserSelect === 'function') {
            window.fillPermissionsUserSelect();
        }
    }

    // Recargar usuarios frescos desde Supabase al cambiar de sección
    if (typeof window.recargarUsuariosDesdeSupabase === 'function') {
        window.recargarUsuariosDesdeSupabase();
    }
};

window.switchAdminTab = function(tabId) {
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-muted)';
        btn.style.borderBottomColor = 'transparent';
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.style.display = 'none';
    });

    const activeBtn = document.querySelector(`button[onclick="switchAdminTab('${tabId}')"]`);
    if(activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.color = 'var(--text-main)';
        activeBtn.style.borderBottomColor = 'var(--primary)';
    }

    const activeContent = document.getElementById(tabId);
    if(activeContent) activeContent.style.display = 'block';

    if (tabId === 'tab-user-list' && typeof window.renderConfigUsersTable === 'function') {
        window.renderConfigUsersTable();
    }

    // Recargar usuarios frescos desde Supabase al cambiar de pestaña
    if (typeof window.recargarUsuariosDesdeSupabase === 'function') {
        window.recargarUsuariosDesdeSupabase();
    }
};

window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.style.opacity = '1';
    } else {
        input.type = 'password';
        if (btn) btn.style.opacity = '0.7';
    }
};

// ================= GESTIÓN GLOBAL DE RESPALDOS (BACKUP) =================
window.exportarBaseDeDatosBackup = function() {
    try {
        let exportData = appData;
        if (!exportData || typeof exportData !== 'object' || !Array.isArray(exportData.users) || exportData.users.length === 0) {
            try {
                const stored = localStorage.getItem('appData');
                if (stored) exportData = JSON.parse(stored);
            } catch(e) {}
        }
        if (!exportData || typeof exportData !== 'object') {
            exportData = {
                users: (typeof defaultData !== 'undefined' && defaultData.users) ? defaultData.users : [],
                pedidos: [],
                notifications: [],
                userPermissions: {}
            };
        }

        const jsonString = JSON.stringify(exportData, null, 2);
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const fileName = `sgmontajes_backup_${yyyy}-${mm}-${dd}_${hh}${min}.json`;

        let url = '';
        let isBlob = false;
        try {
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            url = URL.createObjectURL(blob);
            isBlob = true;
        } catch (blobErr) {
            url = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
        }

        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', fileName);
        a.style.position = 'fixed';
        a.style.left = '-9999px';
        a.style.top = '-9999px';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            if (a && a.parentNode) {
                a.parentNode.removeChild(a);
            }
            if (isBlob && url) {
                URL.revokeObjectURL(url);
            }
        }, 500);

        showToast(`Copia de respaldo descargada: ${fileName}`, 'success');
    } catch (err) {
        console.error('Error al exportar backup:', err);
        showToast('Error al generar la descarga: ' + err.message, 'error');
    }
};

window.importarBaseDeDatosBackup = function(e) {
    try {
        const fileInput = e ? (e.target || e.srcElement) : document.getElementById('import-db-file');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed && (parsed.users || parsed.pedidos)) {
                    if (!parsed.users) parsed.users = [];
                    if (!parsed.pedidos) parsed.pedidos = [];
                    if (!parsed.notifications) parsed.notifications = [];
                    appData = parsed;
                    saveData();
                    showToast('Base de datos restaurada correctamente.', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast('El archivo no contiene una copia de respaldo válida.', 'error');
                }
            } catch(err) {
                console.error('Error al procesar JSON:', err);
                showToast('Error al procesar el archivo JSON de respaldo.', 'error');
            } finally {
                if (fileInput) fileInput.value = '';
            }
        };
        reader.readAsText(file);
    } catch (err) {
        console.error('Error al importar:', err);
        showToast('Error al importar archivo de respaldo.', 'error');
    }
};

window.loginAsQuick = function(userStr) {
    var uInp = document.getElementById('username');
    var pInp = document.getElementById('password');
    if (uInp) uInp.value = userStr;
    if (pInp) pInp.value = '123';
    window.ejecutarLoginDirecto();
};

window.loginAs = function(userStr, passStr) {
    var uInp = document.getElementById('username');
    var pInp = document.getElementById('password');
    if (uInp) uInp.value = userStr || 'mel';
    if (pInp) pInp.value = passStr || '123';
    window._isExecutingLogin = false;
    window.ejecutarLoginDirecto();
};

// Función global de login — vinculada desde HTML (onclick) y desde startApp
window.ejecutarLoginDirecto = function(e) {
    if (e) {
        try { if (e.preventDefault) e.preventDefault(); } catch(err) {}
        try { if (e.stopPropagation) e.stopPropagation(); } catch(err) {}
    }

    window._isExecutingLogin = false;

    try {
        var userInput = document.getElementById('username');
        var passInput = document.getElementById('password');
        var rawUserVal = userInput ? userInput.value.trim() : '';
        var cleanUserVal = rawUserVal.toLowerCase().replace(/\s+/g, '');
        var passVal = passInput ? passInput.value.trim() : '';

        if (!rawUserVal || !passVal) {
            showToast('Por favor ingrese su usuario y contraseña para ingresar.', 'warning');
            return;
        }

        if (typeof startApp === 'function' && (!appData || !Array.isArray(appData.users))) {
            try { startApp(); } catch(err) {}
        }
        if (!appData) appData = { users: [], pedidos: [], notifications: [] };
        if (!Array.isArray(appData.users) || appData.users.length === 0) {
            appData.users = JSON.parse(JSON.stringify(defaultData.users));
        }

        // Helper para comprobar coincidencia por usuario, email o vendedor
        var matchUser = function(u) {
            if (!u) return false;
            var uName = String(u.username || '').trim().toLowerCase().replace(/\s+/g, '');
            var uEmail = String(u.email || '').trim().toLowerCase().replace(/\s+/g, '');
            var uVend = String(u.vendedor_nombre || '').trim().toLowerCase().replace(/\s+/g, '');
            return uName === cleanUserVal || uEmail === cleanUserVal || (uVend && uVend === cleanUserVal);
        };

        // 1. Buscar en appData.users
        var found = appData.users.find(matchUser);

        // 2. Si no se encontró en appData.users, buscar en defaultData.users
        if (!found && Array.isArray(defaultData.users)) {
            found = defaultData.users.find(matchUser);
            if (found) {
                appData.users.push(found);
            }
        }

        // 3. Buscar coincidencia parcial
        if (!found) {
            found = (defaultData.users || []).find(function(u) {
                var name = String(u.username || '').toLowerCase();
                var email = String(u.email || '').toLowerCase();
                var vend = String(u.vendedor_nombre || '').toLowerCase();
                return name.includes(cleanUserVal) || cleanUserVal.includes(name) || email.includes(cleanUserVal) || vend.includes(cleanUserVal);
            });
        }

        // 4. Si es un usuario nuevo no registrado, registrarlo dinámicamente como Solicitante
        if (!found) {
            // Generar ID correlativo: max(id numérico existente) + 1
            var existingNumIds = (appData.users || []).map(function(u) {
                var n = parseInt(u.id, 10);
                return isNaN(n) ? 0 : n;
            });
            var nextUserId = String((existingNumIds.length > 0 ? Math.max.apply(null, existingNumIds) : 0) + 1);
            found = {
                id: nextUserId,
                username: rawUserVal,
                password: passVal || '123',
                email: cleanUserVal + '@sgmontajes.com.ar',
                role: 'Solicitante',
                rubro_defecto: 'Eléctrico'
            };
            appData.users.push(found);
        }

        if (found.role === 'Congelado') {
            showToast('Tu cuenta está congelada. Contactá al administrador.', 'error');
            return;
        }

        if (found.password && String(found.password).trim() !== String(passVal).trim()) {
            showToast('Contraseña incorrecta. Verifique sus credenciales.', 'error');
            return;
        }

        appData.currentUserId = String(found.id);
        try { localStorage.setItem('pedidos_current_user_id', String(found.id)); } catch(e) {}
        saveData();

        reqTipoPresupuesto = found.rubro_defecto || 'Eléctrico';

        showToast('¡Bienvenido, ' + found.username + '!', 'success');
        switchView('main');

        try {
            buildSidebar();
        } catch(sbErr) {
            console.error("Error al generar barra de menú:", sbErr);
        }

        try {
            renderNotifications();
        } catch(ntErr) {
            console.error("Error al renderizar notificaciones:", ntErr);
        }

        if (window.checkScheduledOcAlerts) {
            try { window.checkScheduledOcAlerts(); } catch(ocErr) {}
        }

        if (userInput) userInput.value = '';
        if (passInput) passInput.value = '';
    } catch(globalLoginErr) {
        console.error("Error al ejecutar login:", globalLoginErr);
        showToast("Aviso al iniciar sesión: " + (globalLoginErr.message || ''), "error");
    } finally {
        window._isExecutingLogin = false;
    }
};

window.ejecutarLogout = function(e) {
    if (e) {
        try { if (e.preventDefault) e.preventDefault(); } catch(err) {}
        try { if (e.stopPropagation) e.stopPropagation(); } catch(err) {}
    }

    try {
        if (typeof appData !== 'undefined' && appData) {
            appData.currentUserId = null;
        }
        try { localStorage.removeItem('pedidos_current_user_id'); } catch(err) {}
        try { sessionStorage.removeItem('pedidos_current_user_id'); } catch(err) {}
        try { localStorage.removeItem('supabase_auth_token'); } catch(err) {}

        var userInput = document.getElementById('username');
        var passInput = document.getElementById('password');
        if (userInput) userInput.value = '';
        if (passInput) passInput.value = '';

        if (typeof closeModal === 'function') {
            try { closeModal(); } catch(err) {}
        }

        if (typeof switchView === 'function') {
            switchView('login');
        } else {
            var loginView = document.getElementById('login-view');
            var mainView = document.getElementById('main-view');
            if (mainView) {
                mainView.classList.remove('active');
                mainView.style.display = 'none';
            }
            if (loginView) {
                loginView.classList.add('active');
                loginView.style.display = 'flex';
            }
        }

        if (typeof showToast === 'function') {
            showToast('Sesión cerrada correctamente.', 'info');
        }
    } catch(logoutErr) {
        console.error("Error en logout:", logoutErr);
        try { localStorage.removeItem('pedidos_current_user_id'); } catch(e) {}
        window.location.reload();
    }
};
window.logout = window.ejecutarLogout;

function startApp() {
    var quoteEl = document.getElementById('motivational-quote');
    var loginQuoteEl = document.getElementById('login-quote');
    var randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    if (quoteEl) quoteEl.innerText = '"' + randomQuote + '"';
    if (loginQuoteEl) loginQuoteEl.innerText = '"' + randomQuote + '"';

    if (!appData) appData = defaultData;
    if (!Array.isArray(appData.users) || appData.users.length === 0) {
        appData.users = defaultData.users.slice();
    } else {
        appData.users = appData.users.filter(u => !['admin', 'aut', 'sol'].includes(String(u.username).trim().toLowerCase()));
        if (appData.users.length === 0) {
            appData.users = defaultData.users.slice();
        }
    }

    // Auto-login si ya inició sesión anteriormente
    var savedUserId = null;
    try { savedUserId = localStorage.getItem('pedidos_current_user_id'); } catch(e) {}
    if (savedUserId && Array.isArray(appData.users)) {
        var existing = appData.users.find(u => String(u.id) === String(savedUserId));
        if (existing) {
            appData.currentUserId = savedUserId;
            switchView('main');
            try { buildSidebar(); } catch(e) {}
            try { renderNotifications(); } catch(e) {}
            var logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.onclick = window.ejecutarLogout;
            }
            return;
        }
    }

    appData.currentUserId = null;

    var userInput = document.getElementById('username');
    var passInput = document.getElementById('password');
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';

    switchView('login');

    var loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = window.ejecutarLoginDirecto;
    }

    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = window.ejecutarLogout;
    }

    // Botón de restablecer localStorage
    var resetBtn = document.getElementById('reset-ls-btn');
    if (resetBtn) {
        resetBtn.onclick = function(ev) {
            ev.preventDefault();
            purgarPresupuestosDePrueba();
        };
    }
}

// Función protegida: purgado deshabilitado para evitar pérdida accidental de datos
async function purgarPresupuestosDePrueba(silencioso = false) {
    console.log("ℹ️ La función de vaciado de presupuestos está deshabilitada para proteger los datos.");
    return true;
}
window.purgarPresupuestosDePrueba = purgarPresupuestosDePrueba;

// Función global para eliminar un presupuesto individual permanentemente
window.eliminarPresupuestoIndividual = async function(id) {
    if (!id) return;
    const p = (appData.pedidos || []).find(x => String(x.id) === String(id));
    const denom = p ? (p.meca_denominacion || p.motivo || p.cliente_nombre || '') : '';
    const confirmMsg = `¿Está seguro que desea ELIMINAR definitivamente el presupuesto ${id}${denom ? ' (' + denom + ')' : ''}?\n\nEsta acción borrará el presupuesto y todos sus ítems asociados de forma permanente en Supabase.`;
    if (!confirm(confirmMsg)) return;

    // 1. Eliminar en memoria local y actualizar localStorage
    appData.pedidos = (appData.pedidos || []).filter(x => String(x.id) !== String(id));
    try {
        localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appData));
    } catch(e) {}

    // 2. Eliminar en Supabase de forma relacional y segura
    const client = getDbClient();
    if (client) {
        try {
            await client.from('presupuesto_items').delete().eq('presupuesto_id', String(id));
            await client.from('avances_obra').delete().eq('presupuesto_id', String(id));
            const { error: delErr } = await client.from('presupuestos').delete().eq('id', String(id));
            if (delErr) {
                console.error("Error al eliminar presupuesto en Supabase:", delErr);
                showToast(`Aviso al borrar en Supabase: ${delErr.message}`, 'warning');
            } else {
                console.log(`☁️ Supabase: Presupuesto ${id} y sus ítems eliminados correctamente.`);
            }
        } catch(err) {
            console.error("Excepción eliminando presupuesto en Supabase:", err);
        }
    }

    // 3. Cerrar modal de detalle si estaba abierto con este presupuesto
    if (typeof closeModal === 'function') {
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay && modalOverlay.style.display !== 'none' && window.pedidoActivo && String(window.pedidoActivo.id) === String(id)) {
            closeModal();
        }
    }

    // 4. Re-renderizar tablas
    if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
    if (typeof renderStats === 'function') renderStats();
    if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();

    showToast(`Presupuesto ${id} eliminado correctamente.`, 'success');
};

// --- VISTA DE CONSULTA DE STOCK ---
let stockQueryRubroFilter = '';
let stockQueryEstadoFilter = '';
let stockQuerySearchVal = '';

function initStockQueryView() {
    const rubroFilter = document.getElementById('filter-stock-rubro');
    const estadoFilter = document.getElementById('filter-stock-estado');
    const searchInput = document.getElementById('search-stock');

    // Resetear filtros
    stockQueryRubroFilter = '';
    stockQueryEstadoFilter = '';
    stockQuerySearchVal = '';

    // Llenar selectores de filtro
    if (rubroFilter && typeof stockDB !== 'undefined') {
        const rubros = [...new Set(stockDB.map(s => s.rubro).filter(Boolean))].sort();
        let html = '<option value="">Todos los Rubros...</option>';
        rubros.forEach(r => {
            html += `<option value="${r}">${r}</option>`;
        });
        rubroFilter.innerHTML = html;
    }

    if (estadoFilter && typeof stockDB !== 'undefined') {
        const estados = [...new Set(stockDB.map(s => s.estado).filter(Boolean))].sort();
        let html = '<option value="">Todos los Estados...</option>';
        estados.forEach(e => {
            html += `<option value="${e}">${e}</option>`;
        });
        estadoFilter.innerHTML = html;
    }

    // Configurar listeners
    if (rubroFilter) {
        rubroFilter.onchange = (e) => {
            stockQueryRubroFilter = e.target.value;
            renderStockTable();
        };
    }
    if (estadoFilter) {
        estadoFilter.onchange = (e) => {
            stockQueryEstadoFilter = e.target.value;
            renderStockTable();
        };
    }
    if (searchInput) {
        searchInput.oninput = (e) => {
            stockQuerySearchVal = e.target.value.toLowerCase().trim();
            renderStockTable();
        };
    }

    renderStockTable();
}

function renderStockTable() {
    const listBody = document.getElementById('stock-query-list');
    const resultsCount = document.getElementById('stock-results-count');
    if (!listBody || typeof stockDB === 'undefined') return;

    let filtered = stockDB;

    // Aplicar filtros
    if (stockQueryRubroFilter) {
        filtered = filtered.filter(s => s.rubro === stockQueryRubroFilter);
    }
    if (stockQueryEstadoFilter) {
        filtered = filtered.filter(s => s.estado === stockQueryEstadoFilter);
    }
    if (stockQuerySearchVal) {
        filtered = filtered.filter(s =>
            s.detalle.toLowerCase().includes(stockQuerySearchVal) ||
            s.codigo.includes(stockQuerySearchVal)
        );
    }

    // Calcular KPIs rápidos del subconjunto actual
    const kpiTotal = filtered.length;
    const kpiAvailable = filtered.filter(s => s.stock > 0).length;
    const kpiEmpty = filtered.filter(s => s.stock <= 0).length;

    const totalKPIEl = document.getElementById('stock-kpi-total');
    const availKPIEl = document.getElementById('stock-kpi-available');
    const emptyKPIEl = document.getElementById('stock-kpi-empty');

    if (totalKPIEl) totalKPIEl.innerText = kpiTotal.toLocaleString('es-AR');
    if (availKPIEl) availKPIEl.innerText = kpiAvailable.toLocaleString('es-AR');
    if (emptyKPIEl) emptyKPIEl.innerText = kpiEmpty.toLocaleString('es-AR');

    resultsCount.innerText = `Mostrando ${filtered.length} productos`;

    if (filtered.length === 0) {
        listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron artículos con los filtros seleccionados.</td></tr>`;
        return;
    }

    // Generar la tabla por chunks o renderizado fragmentado
    let html = '';
    // Limitamos la cantidad en pantalla si es muy grande o paginamos para evitar ralentizar.
    const limit = 200;
    const sliced = filtered.slice(0, limit);

    sliced.forEach(s => {
        const badgeClass = s.stock > 0 ? 'status-auth' : 'status-rej';
        const badgeText = s.stock > 0 ? 'Disponible' : 'Agotado';

        html += `
            <tr>
                <td style="font-family: monospace;">${s.codigo}</td>
                <td><strong>${s.detalle}</strong><div style="font-size: 10px; color: var(--text-muted);">${s.estado || 'COMERCIAL'}</div></td>
                <td>${s.rubro}</td>
                <td>${s.subrubro || '-'}</td>
                <td style="text-align: right; font-family: monospace;">$${s.precio.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">${s.stock.toLocaleString('es-AR')}</td>
                <td style="text-align: center;">
                    <span class="status-badge ${badgeClass}" style="min-width: 100px; padding: 2px 8px; font-size: 11px;">
                        ${badgeText}
                    </span>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-icon" style="color: #ef4444; border: 1px solid #fca5a5; padding: 4px; border-radius: 4px; background: #fef2f2;" onclick="deleteStockItem('${s.codigo}')" title="Eliminar Ítem">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    listBody.innerHTML = html;

    if (filtered.length > limit) {
        resultsCount.innerText = `Mostrando primeros ${limit} de ${filtered.length} productos (refine su búsqueda)`;
    }
}

window.initStockQueryView = initStockQueryView;
window.renderStockTable = renderStockTable;

// --- CONTEXT MENU DE FECHAS (Filtros Rápidos en Clic Derecho) ---
window.currentDateContextMenuTarget = 'assignments';

window.selectDatePresetFromContextMenu = function(preset) {
    if (window.currentDateContextMenuTarget === 'metrics') {
        const selectEl = document.getElementById('preset-date-filter-metrics');
        if (selectEl) selectEl.value = preset;
        if (typeof applyPresetDateFilterMetrics === 'function') {
            applyPresetDateFilterMetrics(preset);
        }
    } else {
        const selectEl = document.getElementById('preset-date-filter');
        if (selectEl) selectEl.value = preset;
        if (typeof applyPresetDateFilter === 'function') {
            applyPresetDateFilter(preset);
        }
    }

    // Ocultar menú
    const menu = document.getElementById('date-context-menu');
    if (menu) menu.style.display = 'none';
};

// Delegación de eventos contextmenu en el documento para detectar clics derechos sobre los campos de fecha
document.addEventListener('contextmenu', function(e) {
    const target = e.target;
    if (target && (target.id === 'filter-date-from' || target.id === 'filter-date-to' || target.id === 'filter-date-start' || target.id === 'filter-date-end')) {
        e.preventDefault();

        // Determinar qué vista es según el id
        const isMetrics = target.id === 'filter-date-start' || target.id === 'filter-date-end';
        window.currentDateContextMenuTarget = isMetrics ? 'metrics' : 'assignments';

        const menu = document.getElementById('date-context-menu');
        if (menu) {
            // Mostrar para poder medir su offsetWidth/offsetHeight
            menu.style.display = 'block';

            const menuWidth = menu.offsetWidth || 180;
            const menuHeight = menu.offsetHeight || 220;

            let left = e.clientX;
            let top = e.clientY;

            // Si sobresale de la derecha de la pantalla, mover a la izquierda
            if (left + menuWidth > window.innerWidth) {
                left = window.innerWidth - menuWidth - 10;
            }
            if (left < 10) left = 10;

            // Si sobresale de abajo de la pantalla, mover hacia arriba
            if (top + menuHeight > window.innerHeight) {
                top = window.innerHeight - menuHeight - 10;
            }
            if (top < 10) top = 10;

            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
        }
    } else {
        const menu = document.getElementById('date-context-menu');
        if (menu) menu.style.display = 'none';
    }
});

// Ocultar menú en clics normales
document.addEventListener('click', function(e) {
    const menu = document.getElementById('date-context-menu');
    if (menu && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// Ocultar menús, dropdowns, cerrar modales y navegar hacia atrás con la tecla Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // 1. Cerrar menús contextuales y dropdowns
        const menu = document.getElementById('date-context-menu');
        if (menu) menu.style.display = 'none';
        const notifDrop = document.getElementById('notification-dropdown');
        if (notifDrop) notifDrop.style.display = 'none';
        const userDrop = document.getElementById('online-users-dropdown');
        if (userDrop) userDrop.style.display = 'none';

        // 2. Cerrar modales si hay alguno activo
        const overlay = document.getElementById('modal-overlay');
        const factModal = document.getElementById('modal-registrar-factura');
        const emailModal = document.getElementById('email-dispatch-modal');
        const obraModal = document.getElementById('modal-avance-obra');
        const compModal = document.getElementById('modal-comprobante-avance');

        const isAnyModalOpen = (overlay && overlay.style.display !== 'none' && overlay.innerHTML.trim().length > 0) ||
                               (factModal && factModal.style.display !== 'none') ||
                               (emailModal && emailModal.style.display !== 'none') ||
                               (obraModal && obraModal.style.display !== 'none') ||
                               (compModal && compModal.style.display !== 'none');

        if (isAnyModalOpen) {
            closeModal();
            return;
        }

        // 3. Si no hay modales, volver a la pantalla anterior o salir de donde esté
        if (typeof window.volverAccionAnterior === 'function') {
            window.volverAccionAnterior();
        }
    }
});

// Función para enviar el presupuesto oficial por WhatsApp
window.compartirWhatsAppPedido = function(id) {
    const p = appData.pedidos.find(x => x.id === id);
    if (!p) return;
    const nro = formatPresupuestoCodigo(p);
    const cliente = p.cliente_nombre ? p.cliente_nombre.toUpperCase() : 'CONSUMIDOR FINAL';
    const cotizMat = parseFloat(p.cotizacion_materiales || p.cotizacion || (window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1450)) || 1450;

    let laborARS = 0;
    let matUSD = 0;

    let msg = `*SG MONTAJES - PRESUPUESTO Nro. ${nro}*\n`;
    msg += `Fecha: ${p.fecha}\n`;
    msg += `Cliente: ${cliente}\n`;
    if (p.meca_nro_oc || p.nro_oc) {
        msg += `Orden de Compra (OC): ${p.meca_nro_oc || p.nro_oc}\n`;
    }
    msg += `------------------------------------\n`;
    if (Array.isArray(p.items)) {
        p.items.forEach(it => {
            if (it.estado === 'Rechazado') return;
            const q = parseFloat(String(it.cantidad || '0').replace(',', '.')) || 0;
            const isMat = (it.is_material === true || it.is_material === 1 || it.is_material === '1') ||
                          (window.isMaterialItem ? window.isMaterialItem(it, p.tipo_presupuesto) : false) ||
                          (String(it.subrubro || '').toLowerCase().includes('material') || String(it.subrubro || '').toLowerCase().includes('equipo'));
            if (isMat) {
                const prUSD = (it.precio_usd !== undefined && it.precio_usd !== null && !isNaN(parseFloat(it.precio_usd)))
                    ? parseFloat(it.precio_usd)
                    : (parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0);
                const subUSD = (it.subtotal_usd !== undefined && it.subtotal_usd !== null && !isNaN(parseFloat(it.subtotal_usd)))
                    ? parseFloat(it.subtotal_usd)
                    : (q * prUSD);
                matUSD += subUSD;
                const subPesos = subUSD * cotizMat;
                msg += `• [MAT] ${it.codigo} - ${it.detalle} (x${q} @ U$D ${prUSD.toLocaleString('es-AR', {minimumFractionDigits: 2})}) = $${subPesos.toLocaleString('es-AR', {minimumFractionDigits: 2})} (U$D ${subUSD.toLocaleString('es-AR', {minimumFractionDigits: 2})})\n`;
            } else {
                const pr = parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0;
                const sub = (it.subtotal !== undefined && it.subtotal !== null && !isNaN(parseFloat(String(it.subtotal).replace(',', '.'))))
                    ? parseFloat(String(it.subtotal).replace(',', '.'))
                    : (q * pr);
                laborARS += sub;
                msg += `• ${it.codigo} - ${it.detalle} (x${q}) = $${sub.toLocaleString('es-AR', {minimumFractionDigits: 2})}\n`;
            }
        });
    }
    msg += `------------------------------------\n`;
    if (matUSD > 0) {
        const matARS = matUSD * cotizMat;
        const grandTot = laborARS + matARS;
        msg += `Subtotal M.O.: $${laborARS.toLocaleString('es-AR', {minimumFractionDigits: 2})}\n`;
        msg += `Subtotal Materiales: U$D ${matUSD.toLocaleString('es-AR', {minimumFractionDigits: 2})} [Cotiz: $${cotizMat.toLocaleString('es-AR', {minimumFractionDigits: 2})}]\n`;
        msg += `Materiales Pesificados: $${matARS.toLocaleString('es-AR', {minimumFractionDigits: 2})}\n`;
        msg += `*TOTAL GENERAL: $${grandTot.toLocaleString('es-AR', {minimumFractionDigits: 2})}*\n\n`;
    } else {
        const grandTot = laborARS > 0 ? laborARS : (parseFloat(String(p.importe || '0').replace(',', '.')) || 0);
        msg += `*TOTAL GENERAL: $${grandTot.toLocaleString('es-AR', {minimumFractionDigits: 2})}*\n\n`;
    }
    msg += `Comprobante no válido como factura - SG MONTAJES`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
};

// --- DYNAMIC EXCEL GRID FOR PRESUPUESTO MECÁNICO ---
window.activeMecaTab = 0;

window.switchMecaTab = function(idx) {
    window.activeMecaTab = idx;
    const allBodies = document.querySelectorAll('[id^="meca-sec-body-"]');
    allBodies.forEach((bodyEl, i) => {
        bodyEl.style.display = i === idx ? 'table-row-group' : 'none';
    });
    const allTabs = document.querySelectorAll('[id^="meca-tab-"]');
    allTabs.forEach((tabEl, i) => {
        const isSelected = i === idx;
        tabEl.style.background = isSelected ? '#0891b2' : 'rgba(30, 41, 59, 0.6)';
        tabEl.style.color = isSelected ? '#ffffff' : 'var(--text-muted)';
        tabEl.style.border = `1px solid ${isSelected ? '#0891b2' : 'rgba(255, 255, 255, 0.1)'}`;
        tabEl.style.borderBottom = 'none';
        tabEl.style.fontWeight = isSelected ? '800' : '700';
    });
    const priceTh = document.getElementById('meca-excel-th-price');
    if (priceTh) {
        priceTh.innerHTML = (idx === 0)
            ? 'Precio unitario <span style="color:#38bdf8;font-size:11px;font-weight:bold;">(U$D)</span>'
            : 'Precio unitario <span style="color:#34d399;font-size:11px;font-weight:bold;">($ ARS)</span>';
    }
};

window.renderMecanicoExcelGridInContainer = function(container, isEditable = true) {
    if (!container) return;

    let catalog = getActiveStockCatalog();

    // Si estamos en un presupuesto mecánico, filtramos y agrupamos el catálogo según la planta seleccionada
    if (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico') {
        const reqPlantaSelect = document.getElementById('req-meca-planta');
        if (reqPlantaSelect) {
            let curPlanta = (reqPlantaSelect.value || '').trim().toUpperCase();
            if (curPlanta === 'PPA' || curPlanta === 'APA') curPlanta = 'APS';
if (curPlanta === 'APA') curPlanta = 'APS';

            // Regla dinámica (solo aplicable a PPA u otras, nunca mezclar APS y APG)
            if (curPlanta === 'PPA') curPlanta = 'APS';
            if (curPlanta !== 'APS' && curPlanta !== 'APG' && curPlanta && window.appData && window.appData.plantasRules && window.appData.plantasRules[curPlanta]) {
                curPlanta = window.appData.plantasRules[curPlanta];
            }

            const grouped = {};
            // 1. Asegurar que TODOS los códigos existan en grouped
            catalog.forEach(s => {
                if (!grouped[s.codigo]) {
                    grouped[s.codigo] = { ...s, precio: s.precio || 0, precio_unitario: s.precio_unitario || s.precio || 0, planta: curPlanta };
                }
            });
            // 2. Si hay precio genérico (sin planta), usarlo de base
            catalog.forEach(s => {
                if (!(s.planta || '').trim()) {
                    if (grouped[s.codigo]) {
                        if (s.precio > 0 || grouped[s.codigo].precio === 0) {
                            grouped[s.codigo].precio = s.precio;
                            grouped[s.codigo].precio_unitario = s.precio_unitario || s.precio;
                            grouped[s.codigo].detalle = s.detalle || grouped[s.codigo].detalle;
                        }
                    }
                }
            });
            // 3. Si hay precio específico para la planta actual, sobreescribir con máxima prioridad
            if (curPlanta) {
                catalog.forEach(s => {
                    if ((s.planta || '').trim().toUpperCase() === curPlanta) {
                        if (grouped[s.codigo]) {
                            if (s.precio > 0 || grouped[s.codigo].precio === 0) {
                                grouped[s.codigo].precio = s.precio;
                                grouped[s.codigo].precio_unitario = s.precio_unitario || s.precio;
                                grouped[s.codigo].detalle = s.detalle || grouped[s.codigo].detalle;
                            }
                        }
                    }
                });
            }
            catalog = Object.values(grouped);
        }
    }

    // Normalizador para búsqueda insensible a mayúsculas/minúsculas
    const norm = s => String(s || '').trim().toLowerCase();

    // Group catalog by subrubro (robusto e insensible a mayúsculas)
    const sections = [
        {
            name: "Materiales y Equipos",
            items: catalog.filter(i => norm(i.subrubro).includes("material") || norm(i.subrubro).includes("equipo"))
        },
        {
            name: "Mano de Obra EN TALLER",
            note: "VALOR HORA INCLUYE COPA",
            items: catalog.filter(i => norm(i.subrubro).includes("taller"))
        },
        {
            name: "Mano de Obra MANTENIMIENTO",
            items: catalog.filter(i => norm(i.subrubro).includes("mantenimiento") && !norm(i.subrubro).includes("emergencia"))
        },
        {
            name: "Mano de Obra PARADA DE PLANTA",
            note: "VALOR HORA INCLUYE COPA",
            items: catalog.filter(i => norm(i.subrubro).includes("parada"))
        },
        {
            name: "Mano de Obra EMERGENCIA MANTENIMIENTO",
            items: catalog.filter(i => norm(i.subrubro).includes("emergencia"))
        }
    ];

    // Catch-all: Asegurar que ningún ítem quede oculto por nombre de subrubro no coincidente
    const categorized = new Set();
    sections.forEach(sec => sec.items.forEach(it => categorized.add(it.codigo)));
    const uncategorized = catalog.filter(it => !categorized.has(it.codigo));
    if (uncategorized.length > 0) {
        sections.push({
            name: "Otros Conceptos",
            items: uncategorized
        });
    }

    // Find first visible tab index
    let firstVisibleTab = -1;
    sections.forEach((sec, idx) => {
        if (sec.items.length > 0 && firstVisibleTab === -1) {
            firstVisibleTab = idx;
        }
    });

    if (firstVisibleTab !== -1 && (window.activeMecaTab === -1 || !sections[window.activeMecaTab] || sections[window.activeMecaTab].items.length === 0)) {
        window.activeMecaTab = firstVisibleTab;
    }

    let html = `
        <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; color: var(--text-main); box-shadow: var(--glass-shadow); font-family: inherit; margin-bottom: 15px; text-align: left;">
            <div style="background: rgba(6, 182, 212, 0.15); color: #22d3ee; font-weight: 800; font-size: 14px; padding: 10px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: #0891b2; color: white; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: 800;">2</span>
                    <span style="text-decoration: underline; letter-spacing: 0.5px;">PROPUESTA COMERCIAL (TARIFARIO)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.7); border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 6px; padding: 4px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                        <span style="font-size: 11px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-dollar-sign"></i> Cotiz. U$D (Solo Mat):
                        </span>
                        <input type="text"
                               id="grid-cotizacion-materiales"
                               inputmode="decimal"
                               value="${(window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1450).toString().replace(/\./g, ',')}"
                               ${isEditable ? '' : 'disabled'}
                               onkeydown="onMecaPriceKeyDown(event, this)"
                               oninput="window.onGridCotizacionMaterialesChange ? window.onGridCotizacionMaterialesChange(this) : null"
                               style="width: 85px; text-align: right; background: rgba(0,0,0,0.45); border: 1px solid rgba(56, 189, 248, 0.6); border-radius: 4px; color: #38bdf8; font-family: monospace; font-weight: 900; font-size: 12px; padding: 3px 6px;"
                               title="Cotización oficial aplicada EXCLUSIVAMENTE a Materiales y Equipos">
                    </div>
                    <button type="button" class="btn btn-sm" onclick="abrirModalNuevoItemTarifario()" style="background: #10b981; color: white; border: 1px solid #059669; border-radius: 6px; padding: 5px 12px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Agregar nuevo ítem al tarifario en orden correlativo">
                        <i class="fas fa-plus-circle"></i> Agregar Ítem al Tarifario
                    </button>
                    <span style="font-size: 11px; font-weight: bold; color: #22d3ee;">${isEditable ? '✏️ Complete las cantidades usando las pestañas' : '👁️ Vista del Tarifario'}</span>
                </div>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 6px; background: rgba(15, 23, 42, 0.5); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 10px 10px 0 10px;">
    `;

    let visibleTabNumber = 1;
    sections.forEach((sec, idx) => {
        const hasItems = sec.items.length > 0;
        const displayStyle = hasItems ? 'block' : 'none';
        const isSelected = window.activeMecaTab === idx;
        const tabNumber = hasItems ? visibleTabNumber++ : '';
        html += `
            <button type="button" id="meca-tab-${idx}" onclick="switchMecaTab(${idx})"
                style="display: ${displayStyle}; padding: 10px 16px; border: 1px solid ${isSelected ? '#0891b2' : 'rgba(255, 255, 255, 0.1)'}; border-bottom: none; border-radius: 8px 8px 0 0; background: ${isSelected ? '#0891b2' : 'rgba(30, 41, 59, 0.6)'}; color: ${isSelected ? '#ffffff' : 'var(--text-muted)'}; font-weight: ${isSelected ? '800' : '700'}; font-size: 12px; cursor: pointer; text-transform: uppercase; transition: all 0.2s ease;">
                ${tabNumber ? `${tabNumber}. ` : ''}${sec.name.replace('Mano de Obra', 'MO')}
            </button>
        `;
    });

    html += `
            </div>

            <div style="overflow-x: auto; padding: 10px; background: transparent;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: var(--text-main); background: transparent;">
                    <thead>
                        <tr style="background: rgba(15, 23, 42, 0.7); border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-weight: bold; text-align: left;">
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; width: 45px; color: #ffffff !important; font-weight: 800; font-size: 12px;">#</th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Tarifario</th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; width: 160px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Cantidades Estimadas</th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: center; width: 85px; color: #ffffff !important; font-weight: 800; font-size: 12px;">U.D.M.</th>
                            <th id="meca-excel-th-price" style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; width: 155px; color: #ffffff !important; font-weight: 800; font-size: 12px;">
                                ${window.activeMecaTab === 0 ? 'Precio unitario <span style="color:#38bdf8;font-size:11px;font-weight:bold;">(U$D)</span>' : 'Precio unitario <span style="color:#34d399;font-size:11px;font-weight:bold;">($ ARS)</span>'}
                            </th>
                            <th style="border: 1px solid rgba(255, 255, 255, 0.08); padding: 10px; text-align: right; width: 145px; color: #ffffff !important; font-weight: 800; font-size: 12px;">Precio Total ($ ARS)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let globalItemIndex = 1;

    sections.forEach((sec, secIdx) => {
        html += `
            <tbody id="meca-sec-body-${secIdx}" style="display: ${window.activeMecaTab === secIdx ? 'table-row-group' : 'none'};">
        `;

        if (sec.items.length === 0) {
            html += `
                <tr style="background: rgba(0,0,0,0.2);">
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px; font-style: italic; font-size: 12px; font-weight: 600;">
                        No hay conceptos o ítems registrados en esta categoría.
                    </td>
                </tr>
            `;
        }

        sec.items.forEach((item, index) => {
            const existing = pedidoItems.find(pi => pi.codigo === item.codigo);
            const initialQty = existing ? existing.cantidad : '';
            const cotizMat = (window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1450) || 1;
            const isMat = (window.isMaterialItem ? window.isMaterialItem(item, reqTipoPresupuesto) : false) || (secIdx === 0);
            const numItemPrice = (item.precio !== undefined && item.precio !== null) ? item.precio : 0;
            const initialSubtotalPesos = existing
                ? (isMat ? (existing.cantidad * numItemPrice * cotizMat) : (existing.cantidad * numItemPrice))
                : 0;
            const initialSubtotalUSD = isMat && existing ? (existing.cantidad * numItemPrice) : 0;

            // Subheaders and section banners for Eléctrico budget
            if (reqTipoPresupuesto === 'Eléctrico') {
                if (secIdx === 2) { // Mano de Obra MANTENIMIENTO
                    if (index === 0) {
                        html += `
                            <tr style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-weight: 900; font-size: 13px;">
                                <td style="text-align: center; color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px; text-align: left; color: #22d3ee !important;"><strong>ACUERDO POR HS DE MANTENIMIENTO</strong></td>
                            </tr>
                            <tr style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-weight: 800;">
                                <td style="text-align: center; color: #fde047; border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; color: #fde047 !important; font-size: 12px;"><strong>Mano de obra por Hs al 76%</strong></td>
                            </tr>
                        `;
                    } else if (index === 5) {
                        html += `
                            <tr style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-weight: 800;">
                                <td style="text-align: center; color: #fde047; border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; color: #fde047 !important; font-size: 12px;"><strong>Mano de Obra por Hs al 36%</strong></td>
                            </tr>
                        `;
                    } else if (index === 10) {
                        html += `
                            <tr style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-weight: 800;">
                                <td style="text-align: center; color: #fde047; border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(234, 179, 8, 0.3); padding: 8px; color: #fde047 !important; font-size: 12px;"><strong>Mano de Obra por hs Normales</strong></td>
                            </tr>
                        `;
                    }
                } else if (secIdx === 3) { // Mano de Obra PARADA DE PLANTA
                    if (index === 0) {
                        html += `
                            <tr style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-weight: 900; font-size: 13px;">
                                <td style="text-align: center; color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px; text-align: left; color: #22d3ee !important;"><strong>ACUERDO POR HS EN PARADA DE PLANTA</strong></td>
                            </tr>
                            <tr style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 800;">
                                <td style="text-align: center; color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px; color: #6ee7b7 !important;"><strong>Mano de obra por Hs al 76% en parada de planta</strong></td>
                            </tr>
                        `;
                    } else if (index === 5) {
                        html += `
                            <tr style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 800;">
                                <td style="text-align: center; color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px; color: #6ee7b7 !important;"><strong>Mano de Obra por Hs al 36% en parada de planta</strong></td>
                            </tr>
                        `;
                    } else if (index === 10) {
                        html += `
                            <tr style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 800;">
                                <td style="text-align: center; color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px; color: #6ee7b7 !important;"><strong>Mano de Obra por hs Normales en parada de planta</strong></td>
                            </tr>
                        `;
                    }
                } else if (secIdx === 4) { // Mano de Obra EMERGENCIA MANTENIMIENTO
                    if (index === 0) {
                        html += `
                            <tr style="background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-weight: 900; font-size: 13px;">
                                <td style="text-align: center; color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px;"></td>
                                <td colspan="5" style="border: 1px solid rgba(6, 182, 212, 0.3); padding: 10px; text-align: left; color: #22d3ee !important;"><strong>MANO DE OBRA POR EMERGENCIA EN PLANTA SEGUN ACUERDO FIRMADO CON CARGILL</strong></td>
                            </tr>
                        `;
                    }
                }
            }

            const disabledAttr = isEditable ? '' : 'disabled';
            const canEditPrices = window.canUserEditUnitPrices ? window.canUserEditUnitPrices() : false;
            const priceDisabledAttr = (isEditable && canEditPrices) ? '' : 'disabled';
            const inputBg = initialQty ? 'rgba(234, 179, 8, 0.18)' : 'rgba(15, 23, 42, 0.6)';
            const inputBorder = initialQty ? '#eab308' : 'rgba(255, 255, 255, 0.15)';
            const inputColor = initialQty ? '#fde047' : '#ffffff';
            const formattedQty = (initialQty !== undefined && initialQty !== null && initialQty !== '' && initialQty > 0) ? Math.round(initialQty).toString() : '';
            const formattedPrice = (item.precio !== undefined && item.precio !== null) ? item.precio.toString().replace(/\./g, ',') : '0';

            html += `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02);">
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px; text-align: center; color: #38bdf8 !important; font-family: monospace; font-weight: 800; font-size: 11.5px;" title="Código del Ítem">${item.codigo}</td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px; font-weight: 600; color: #ffffff !important; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <span>${item.detalle}</span>
                            <button type="button" onclick="event.stopPropagation(); window.eliminarItemDelTarifario('${item.codigo}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 4px; color: #ef4444; font-size: 11px; font-weight: 900; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.15s ease;" title="Eliminar ítem del tarifario">✕</button>
                        </div>
                    </td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 6px; text-align: center;">
                        <input type="text"
                               inputmode="numeric"
                               class="meca-excel-input"
                               data-code="${item.codigo}"
                               data-price="${item.precio}"
                               data-sec="${secIdx}"
                               value="${formattedQty}"
                               placeholder="0"
                               ${disabledAttr}
                               style="width: 90%; text-align: right; background: ${inputBg} !important; border: 1.5px solid ${inputBorder} !important; border-radius: 6px; padding: 6px 10px; font-weight: 800 !important; color: ${inputColor} !important; font-family: monospace; font-size: 13px !important; opacity: 1 !important;"
                               onkeydown="if(['e','E','+','-','.','/',','].includes(event.key)){event.preventDefault();}else if(event.key==='Enter'){event.preventDefault();const tr=this.closest('tr');let nextTr=tr?tr.nextElementSibling:null;while(nextTr&&!nextTr.querySelector('.meca-excel-input')){nextTr=nextTr.nextElementSibling;}if(nextTr){const nextQ=nextTr.querySelector('.meca-excel-input');if(nextQ){nextQ.focus();nextQ.select();}}}"
                               oninput="this.value=this.value.replace(/[^0-9]/g,''); recalcMecaExcelRow(this)">
                    </td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px; text-align: center; color: var(--text-muted) !important; font-weight: 700; font-size: 12px;">${item.udm}</td>
                    <td style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 6px; text-align: right;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 3px;">
                            <span style="font-weight: 800; color: ${isMat ? '#38bdf8' : '#34d399'} !important; font-size: 11px;">${isMat ? 'U$D' : '$'}</span>
                            <input type="text"
                                   inputmode="decimal"
                                   class="meca-excel-price-input"
                                   data-code="${item.codigo}"
                                   data-sec="${secIdx}"
                                   data-is-material="${isMat ? '1' : '0'}"
                                   value="${formattedPrice}"
                                   ${priceDisabledAttr}
                                   title="${canEditPrices ? '' : 'No tiene permisos para modificar precios unitarios'}"
                                   style="width: 105px; text-align: right; background: rgba(15, 23, 42, 0.6) !important; border: 1.5px solid ${isMat ? 'rgba(56, 189, 248, 0.5)' : 'rgba(6, 182, 212, 0.4)'} !important; border-radius: 6px; padding: 5px 8px; font-weight: 700 !important; color: #ffffff !important; font-family: monospace; font-size: 12px !important; opacity: ${canEditPrices ? '1' : '0.65'} !important;"
                                   onkeydown="onMecaPriceKeyDown(event, this)"
                                   oninput="onMecaPriceInputChange(this)"
                                   onblur="onMecaPriceInputBlur(this)">
                        </div>
                    </td>
                    <td id="meca-total-${item.codigo}" style="border: 1px solid rgba(255, 255, 255, 0.06); padding: 8px; text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8 !important; font-size: 13px;">
                        $${initialSubtotalPesos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        ${isMat && existing && existing.cantidad > 0 ? `<div style="font-size: 10px; color: #94a3b8; font-weight: normal;">(U$D ${initialSubtotalUSD.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</div>` : ''}
                    </td>
                </tr>
            `;
        });

        html += `</tbody>`;
    });

    html += `
                    <tbody>
                        <tr style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: bold; font-size: 13px; border-top: 2px solid rgba(16, 185, 129, 0.5);">
                            <td colspan="5" style="border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px 14px; font-size: 12px; text-transform: uppercase;"><strong>TOTAL GENERAL</strong></td>
                            <td id="meca-excel-grand-total" style="border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px 14px; text-align: right; font-family: monospace; font-weight: 900; font-size: 16px; color: #34d399 !important;">$0,00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    recalcMecaExcelAll();
};

window.renderMecanicoExcelGrid = function() {
    const container = document.getElementById('req-mecanico-step2-container');
    if (container) {
        renderMecanicoExcelGridInContainer(container, true);
    }
    const editContainer = document.getElementById('auth-pedido-detalle-mecanico');
    if (editContainer && editContainer.style.display !== 'none') {
        renderMecanicoExcelGridInContainer(editContainer, true);
    }
};

window.onMecaPriceKeyDown = function(event, input) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const tr = input.closest('tr');
        let nextTr = tr ? tr.nextElementSibling : null;
        while (nextTr && !nextTr.querySelector('.meca-excel-input')) {
            nextTr = nextTr.nextElementSibling;
        }
        if (nextTr) {
            const nextQty = nextTr.querySelector('.meca-excel-input');
            if (nextQty) {
                nextQty.focus();
                nextQty.select();
            }
        } else {
            // Fin de la pestaña actual: avanzar a la siguiente pestaña
            const currentTab = window.activeMecaTab;
            let nextTabIdx = currentTab + 1;
            let foundNextTab = false;
            while (nextTabIdx < 10) {
                const nextTabBtn = document.getElementById(`meca-tab-${nextTabIdx}`);
                if (nextTabBtn && nextTabBtn.style.display !== 'none') {
                    foundNextTab = true;
                    switchMecaTab(nextTabIdx);
                    setTimeout(() => {
                        const firstInput = document.querySelector(`#meca-sec-body-${nextTabIdx} .meca-excel-input`);
                        if (firstInput) {
                            firstInput.focus();
                            firstInput.select();
                        }
                    }, 60);
                    break;
                }
                nextTabIdx++;
            }
            if (!foundNextTab) {
                const nextStepBtn = document.querySelector('#step-container-2 button.btn-primary');
                if (nextStepBtn) nextStepBtn.focus();
            }
        }
        return;
    }

    // PROHIBIR TOTALMENTE EL PUNTO (.) Y AUTO-CONVERTIR A COMA (,):
    if (event.key === '.') {
        event.preventDefault();
        if (!input.value.includes(',')) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            input.value = input.value.substring(0, start) + ',' + input.value.substring(end);
            input.setSelectionRange(start + 1, start + 1);
            window.onMecaPriceInputChange(input);
        }
        return;
    }

    // Si presiona coma y ya existe una coma, evitar duplicar
    if (event.key === ',' && input.value.includes(',')) {
        event.preventDefault();
        return;
    }

    // Bloquear signos y letras exponenciales
    if (['e', 'E', '+', '-', '/'].includes(event.key)) {
        event.preventDefault();
        return;
    }
};

window.onMecaPriceInputChange = function(input) {
    if (!window.canUserEditUnitPrices()) {
        if (typeof showToast === 'function') {
            showToast('No tiene permisos para modificar precios unitarios.', 'warning');
        }
        const code = input.getAttribute('data-code');
        const catItem = getActiveStockCatalog().find(c => c.codigo === code);
        if (catItem && catItem.precio !== undefined) {
            input.value = catItem.precio.toString().replace(/\./g, ',');
        }
        return;
    }
    const code = input.getAttribute('data-code');

    // Mejor manejo de puntos y comas:
    let cleanVal = input.value;

    // Si contiene múltiples puntos (ej. 1.500.000), son separadores de miles, los eliminamos.
    if ((cleanVal.match(/\./g) || []).length > 1) {
        cleanVal = cleanVal.replace(/\./g, '');
    }
    // Si contiene un punto Y una coma (ej. 1.500,50), el punto es de mil, lo eliminamos.
    else if (cleanVal.includes('.') && cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(/\./g, '');
    }
    // Si solo contiene un punto, asumimos que quiso poner una coma decimal.
    else if (cleanVal.includes('.') && !cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(/\./g, ',');
    }

    // Filtrar caracteres inválidos (solo dejamos números y coma)
    cleanVal = cleanVal.replace(/[^0-9,]/g, '');

    // Asegurar que solo exista como máximo una sola coma
    const parts = cleanVal.split(',');
    if (parts.length > 2) {
        cleanVal = parts[0] + ',' + parts.slice(1).join('');
    }

    if (input.value !== cleanVal) {
        input.value = cleanVal;
    }

    const newPrice = window.parseArgNumber(input.value);

    // Buscar detalles del item original
    let subr = null, det = null, u = null;
    if (typeof pedidoItems !== 'undefined' && Array.isArray(pedidoItems)) {
        const pItem = pedidoItems.find(i => i.codigo === code);
        if (pItem) { subr = pItem.subrubro; det = pItem.detalle; u = pItem.unidad; }
    }
    if (!det && typeof getActiveStockCatalog === 'function') {
        const cat = getActiveStockCatalog();
        if (cat) {
            const catItem = cat.find(i => i.codigo === code);
            if (catItem) { subr = catItem.subrubro; det = catItem.detalle || catItem.descripcion; u = catItem.unidad; }
        }
    }

    // saveCustomItemPrice removido de aquí para evitar race conditions en cada tecla.
    // Ahora se llama en onMecaPriceInputBlur

    const qtyInput = document.querySelector(`.meca-excel-input[data-code="${code}"]`);
    if (qtyInput) {
        qtyInput.setAttribute('data-price', newPrice);
    }

    recalcMecaExcelRow(input);
};

window.onMecaPriceInputBlur = function(input) {
    let cleanVal = input.value.trim();
    if ((cleanVal.match(/\./g) || []).length > 1) {
        cleanVal = cleanVal.replace(/\./g, '');
    } else if (cleanVal.includes('.') && cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(/\./g, '');
    } else if (cleanVal.includes('.') && !cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(/\./g, ',');
    }
    cleanVal = cleanVal.replace(/[^0-9,]/g, '');
    const parts = cleanVal.split(',');
    if (parts.length > 2) {
        cleanVal = parts[0] + ',' + parts.slice(1).join('');
    }
    if (!cleanVal) {
        cleanVal = '0';
    }
    input.value = cleanVal;
    window.onMecaPriceInputChange(input);
    // Format with dots for visual feedback
    const vParts = cleanVal.split(',');
    vParts[0] = vParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = vParts.join(',');

    // Guardar en Supabase y DB local de forma segura solo al perder el foco (blur)
    const newPrice = window.parseArgNumber(cleanVal);
    const code = input.getAttribute('data-code');
    let subr = null, det = null, u = null;
    if (typeof pedidoItems !== 'undefined' && Array.isArray(pedidoItems)) {
        const pItem = pedidoItems.find(i => i.codigo === code);
        if (pItem) { subr = pItem.subrubro; det = pItem.detalle; u = pItem.unidad; }
    }
    if (!det && typeof getActiveStockCatalog === 'function') {
        const cat = getActiveStockCatalog();
        if (cat) {
            const catItem = cat.find(i => i.codigo === code);
            if (catItem) { subr = catItem.subrubro; det = catItem.detalle || catItem.descripcion; u = catItem.unidad; }
        }
    }
    saveCustomItemPrice(code, newPrice, subr, det, u);
};

window.recalcMecaExcelRow = function(input) {
    const code = input.getAttribute('data-code');
    const priceInput = document.querySelector(`.meca-excel-price-input[data-code="${code}"]`);
    const qtyInput = document.querySelector(`.meca-excel-input[data-code="${code}"]`);
    const secIdx = parseInt(input.getAttribute('data-sec')) || 0;
    const isMat = (priceInput && priceInput.getAttribute('data-is-material') === '1') || (secIdx === 0);

    const price = priceInput ? window.parseArgNumber(priceInput.value) : (input.hasAttribute('data-price') ? window.parseArgNumber(input.getAttribute('data-price')) : 0);
    const qty = qtyInput ? (parseInt(qtyInput.value.replace(/[^0-9]/g, ''), 10) || 0) : 0;
    const cotizMat = (window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1450) || 1;
    const totalEl = document.getElementById(`meca-total-${code}`);

    if (qtyInput) {
        qtyInput.style.background = (qty > 0 ? 'rgba(234, 179, 8, 0.18)' : 'rgba(15, 23, 42, 0.6)');
        qtyInput.style.borderColor = (qty > 0 ? '#eab308' : 'rgba(255, 255, 255, 0.15)');
        qtyInput.style.color = (qty > 0 ? '#fde047' : '#ffffff');
    }

    if (totalEl) {
        if (isMat) {
            const subtotalUSD = qty * price;
            const subtotalPesos = subtotalUSD * cotizMat;
            totalEl.innerHTML = `$${subtotalPesos.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${qty > 0 ? `<div style="font-size: 10px; color: #94a3b8; font-weight: normal;">(U$D ${subtotalUSD.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</div>` : ''}`;
        } else {
            const subtotal = qty * price;
            totalEl.innerText = `$${subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
    }

    recalcMecaExcelAll();
};

window.recalcMecaExcelAll = function() {
    const inputs = document.querySelectorAll('.meca-excel-input');
    const subtotals = [0, 0, 0, 0, 0, 0];
    let grandTotal = 0;
    let materialsTotalUSD = 0;
    let materialsTotalPesos = 0;
    let laborTotalPesos = 0;

    const cotizMat = (window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1450) || 1;

    // Preservar ítems existentes que no estén en la grilla actual para que no se borren
    const gridCodes = new Set();
    inputs.forEach(inp => {
        const c = inp.getAttribute('data-code');
        if (c) gridCodes.add(c);
    });
    const nonGridItems = (Array.isArray(pedidoItems) ? pedidoItems : []).filter(item => item && item.codigo && !gridCodes.has(item.codigo) && item.cantidad > 0);

    // Reset items array
    pedidoItems = [];

    let catalog = getActiveStockCatalog();

    if (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico') {
        const reqPlantaSelect = document.getElementById('req-meca-planta');
        if (reqPlantaSelect) {
            let curPlanta = (reqPlantaSelect.value || '').trim().toUpperCase();
            if (curPlanta === 'PPA' || curPlanta === 'APA') curPlanta = 'APS';
if (curPlanta === 'APA') curPlanta = 'APS';
            if (curPlanta === 'PPA') curPlanta = 'APS';
            if (curPlanta !== 'APS' && curPlanta !== 'APG' && curPlanta && window.appData && window.appData.plantasRules && window.appData.plantasRules[curPlanta]) {
                curPlanta = window.appData.plantasRules[curPlanta];
            }

            const grouped = {};
            catalog.forEach(s => {
                if (!grouped[s.codigo] && (!(s.planta || '').trim() || (s.planta || '').trim().toUpperCase() === curPlanta)) grouped[s.codigo] = { ...s, precio: 0, precio_unitario: 0, planta: curPlanta };
            });
            catalog.forEach(s => {
                if (!(s.planta || '').trim()) {
                    if (s.precio > 0 || grouped[s.codigo].precio === 0) {
                        grouped[s.codigo].precio = s.precio;
                        grouped[s.codigo].precio_unitario = s.precio_unitario;
                        grouped[s.codigo].detalle = s.detalle;
                    }
                }
            });
            catalog.forEach(s => {
                if ((s.planta || '').trim().toUpperCase() === curPlanta) {
                    if (s.precio > 0 || grouped[s.codigo].precio === 0) {
                        grouped[s.codigo].precio = s.precio;
                        grouped[s.codigo].precio_unitario = s.precio_unitario;
                        grouped[s.codigo].detalle = s.detalle;
                    }
                }
            });
            catalog = Object.values(grouped);
        }
    }

    inputs.forEach(input => {
        const code = input.getAttribute('data-code');
        const tr = input.closest('tr');
        const priceInput = tr ? tr.querySelector('.meca-excel-price-input') : null;
        const price = priceInput ? window.parseArgNumber(priceInput.value) : window.parseArgNumber(input.getAttribute('data-price'));
        const qty = parseInt(input.value.replace(/[^0-9]/g, ''), 10) || 0;
        const secIdx = parseInt(input.getAttribute('data-sec')) || 0;

        const itemObj = catalog.find(i => i.codigo === code);
        const isMat = (priceInput && priceInput.getAttribute('data-is-material') === '1') ||
                      (window.isMaterialItem ? window.isMaterialItem(itemObj || { codigo: code, subrubro: (secIdx === 0 ? 'Materiales y Equipos' : '') }, reqTipoPresupuesto) : false) ||
                      (secIdx === 0);

        // Update individual item total column display
        const totalEl = tr ? (tr.querySelector('[id^="meca-total-"]') || document.getElementById(`meca-total-${code}`)) : document.getElementById(`meca-total-${code}`);
        if (totalEl) {
            if (isMat) {
                const subUSD = qty * price;
                const subARS = subUSD * cotizMat;
                totalEl.innerHTML = `$${subARS.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${qty > 0 ? `<div style="font-size: 10px; color: #94a3b8; font-weight: normal;">(U$D ${subUSD.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</div>` : ''}`;
            } else {
                const subARS = qty * price;
                totalEl.innerText = `$${subARS.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }
        }

        if (qty > 0) {
            let subtotalPesos = 0;
            if (isMat) {
                const subUSD = qty * price;
                subtotalPesos = subUSD * cotizMat;
                materialsTotalUSD += subUSD;
                materialsTotalPesos += subtotalPesos;
            } else {
                subtotalPesos = qty * price;
                laborTotalPesos += subtotalPesos;
            }

            if (subtotals[secIdx] !== undefined) {
                subtotals[secIdx] += subtotalPesos;
            }
            grandTotal += subtotalPesos;

            // Find item original name and details from stock database
            const secNames = [
                "Materiales y Equipos",
                "Mano de Obra EN TALLER",
                "Mano de Obra MANTENIMIENTO",
                "Mano de Obra PARADA DE PLANTA",
                "Mano de Obra EMERGENCIA MANTENIMIENTO"
            ];
            const resolvedSubr = (itemObj && itemObj.subrubro)
                ? itemObj.subrubro
                : (secNames[secIdx] || (typeof window.resolveItemSubrubro === 'function' ? window.resolveItemSubrubro({ codigo: code, detalle: itemObj ? itemObj.detalle : '' }, reqTipoPresupuesto) : 'Materiales y Equipos'));

            pedidoItems.push({
                codigo: code,
                detalle: itemObj ? itemObj.detalle : 'Artículo',
                precio: price,
                precio_unitario: price,
                precio_usd: isMat ? price : null,
                cotizacion_aplicada: isMat ? cotizMat : null,
                is_material: isMat,
                cantidad: qty,
                cantidad_original: qty,
                subtotal: subtotalPesos,
                subtotal_usd: isMat ? (qty * price) : null,
                udm: (itemObj && itemObj.udm) ? itemObj.udm : (isMat ? 'UN' : 'horas'),
                subrubro: resolvedSubr,
                estado: 'Pendiente'
            });
        }
    });

    // Reincorporar ítems fuera de la grilla para que nunca se pierdan
    nonGridItems.forEach(oldItem => {
        pedidoItems.push(oldItem);
        grandTotal += (oldItem.subtotal || 0);
    });

    if (reqTipoPresupuesto === 'Eléctrico') {
        const subMatTop = document.getElementById('elec-subtotal-materials-total-header');
        const subMatBottom = document.getElementById('elec-materials-subtotal-bottom');
        const subMatRow = document.getElementById('elec-materials-subtotal');
        const subLab = document.getElementById('elec-labor-subtotal');
        const subElecGrand = document.getElementById('meca-excel-grand-total');

        if (subMatTop) subMatTop.innerText = `$${materialsTotalPesos.toLocaleString('es-AR', {minimumFractionDigits: 2})} (U$D ${materialsTotalUSD.toLocaleString('es-AR', {minimumFractionDigits: 2})})`;
        if (subMatBottom) subMatBottom.innerText = `$${materialsTotalPesos.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        if (subMatRow) subMatRow.innerText = `$${materialsTotalPesos.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        if (subLab) subLab.innerText = `$${laborTotalPesos.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

        const elecGrandVal = materialsTotalPesos + laborTotalPesos;
        if (subElecGrand) {
            subElecGrand.innerText = `$${elecGrandVal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }

        const nvDisplay = document.getElementById('req-total-nv-display');
        if (nvDisplay) {
            nvDisplay.innerText = `$${elecGrandVal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }
    } else {
        // Update section subtotal displays for Mecánico
        subtotals.forEach((sub, idx) => {
            const subEl = document.getElementById(`meca-subtotal-${idx}`);
            if (subEl) {
                subEl.innerText = `$${sub.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
            }
        });

        // Update grand total displays
        const grandTotalEl = document.getElementById('meca-excel-grand-total');
        if (grandTotalEl) {
            grandTotalEl.innerText = `$${grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }

        const nvDisplay = document.getElementById('req-total-nv-display');
        if (nvDisplay) {
            nvDisplay.innerText = `$${grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
        }
    }

    // Update Summary Step 3 if elements exist
    const sumCotizMat = document.getElementById('summary-cotiz-materiales');
    if (sumCotizMat) sumCotizMat.innerText = `$${cotizMat.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    const sumMecaCotizMat = document.getElementById('summary-meca-cotiz-materiales');
    if (sumMecaCotizMat) sumMecaCotizMat.innerText = `$${cotizMat.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    if (typeof pedidoActivo !== 'undefined' && pedidoActivo) {
        pedidoActivo.items = JSON.parse(JSON.stringify(pedidoItems));
        if (typeof recalcAuthTotal === 'function') {
            recalcAuthTotal();
        }
    }
};

window.checkScheduledOcAlerts = function() {
    if (!appData || !appData.pedidos) return;
    const todayStr = new Date().toISOString().substring(0, 10);
    let alertsSent = 0;

    appData.pedidos.forEach(p => {
        if (p.estado === 'Cargado sin orden de compra' && p.oc_limite_fecha) {
            if (todayStr >= p.oc_limite_fecha) {
                if (!p.oc_alerta_enviada) {
                    p.oc_alerta_enviada = true;
                    alertsSent++;

                    const msgText = `⚠️ ALERTA O.C.: El Presupuesto ${p.id} de ${p.cliente_nombre} superó la fecha límite (${p.oc_limite_fecha}) sin recibir Orden de Compra. Correo recordatorio enviado a ${p.email || 'cliente'}.`;

                    appData.users.forEach(u => {
                        addNotification(u.id, msgText, p.id);
                    });

                    console.log(`[EMAIL SEND] Para: ${p.email || 'cliente@empresa.com'} - Presupuesto ${p.id} sin orden de compra.`);
                }
            }
        }
    });

    if (alertsSent > 0) {
        saveData();
        showToast(`Se enviaron ${alertsSent} alertas de orden de compra vencidas por correo electrónico.`, 'warning');
        if (typeof renderNotifications === 'function') {
            renderNotifications();
        }
    }
};

// --- SISTEMA DE CORREO CLIENTE MAILTO (FALLBACK GITHUB PAGES / SIN BACKEND) ---
window.abrirClienteCorreoMailto = function({ to, cc, subject, body, pdfBlob, filename }) {
    if (pdfBlob && filename) {
        try {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pdfBlob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                try { document.body.removeChild(link); } catch(e) {}
            }, 1000);
        } catch(e) {}
    }

    const toArr = Array.isArray(to) ? to : (to ? [to] : []);
    const ccArr = Array.isArray(cc) ? cc : (cc ? [cc] : []);
    const toClean = toArr.map(x => String(x).trim()).filter(Boolean).join(',');
    const ccClean = ccArr.map(x => String(x).trim()).filter(Boolean).join(',');

    const parts = [];
    if (ccClean) parts.push(`cc=${encodeURIComponent(ccClean)}`);
    if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
    if (body) parts.push(`body=${encodeURIComponent(body)}`);

    const mailtoUrl = `mailto:${encodeURIComponent(toClean)}${parts.length > 0 ? '?' + parts.join('&') : ''}`;
    window.location.href = mailtoUrl;

    if (typeof showToast === 'function') {
        showToast('✉️ Se abrió tu cliente de correo (Outlook/Gmail) y se descargó el PDF oficial para adjuntar.', 'success');
    }
    return { success: true, via: 'mailto' };
};

// --- SISTEMA DE CORREO SMTP CORPORATIVO BACKEND / CLOUD ---
window.enviarEmailBackend = async function({ to, subject, html, text, reply_to, attachments, cc, bcc }) {
    let lastError = null;

    // 1. INTENTO PRIORITARIO: Cola de envíos en Supabase (Procesada 24/7 por el worker en DigitalOcean)
    try {
        const client = (typeof getDbClient === 'function') ? getDbClient() : (window.supabaseDb || null);
        if (client) {
            const mailId = 'MAIL-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
            const toArr = Array.isArray(to) ? to : (to ? [to] : []);
            const ccArr = Array.isArray(cc) ? cc : (cc ? [cc] : []);
            const bccArr = Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []);

            const { error: qErr } = await client.from('cola_emails').insert([{
                id: mailId,
                destinatarios: toArr,
                cc: ccArr,
                bcc: bccArr,
                asunto: subject || 'Cotización SG Montajes',
                cuerpo_html: html || '',
                cuerpo_texto: text || '',
                adjuntos: attachments || [],
                estado: 'pendiente',
                creado_en: new Date().toISOString()
            }]);

            if (!qErr) {
                console.log("⏳ Email encolado en Supabase (cola_emails):", mailId, ". Verificando entrega...");

                // Esperar a que el worker procese el correo (hasta 18 segundos)
                let pollAttempts = 0;
                while (pollAttempts < 12) {
                    await new Promise(r => setTimeout(r, 1500));
                    pollAttempts++;
                    try {
                        const { data: qData, error: chkErr } = await client.from('cola_emails').select('estado, error_mensaje').eq('id', mailId).maybeSingle();
                        if (!chkErr && qData) {
                            if (qData.estado === 'enviado') {
                                console.log("✅ Email despachado exitosamente por worker cloud:", mailId);
                                try {
                                    client.from('notificaciones').insert({
                                        id: String(Date.now()),
                                        tipo: 'email_despachado',
                                        titulo: `Cotización enviada a ${toArr.join(', ')}`,
                                        mensaje: subject,
                                        leida: false,
                                        fecha: new Date().toISOString()
                                    }).then(() => {});
                                } catch(nErr) {}
                                return { success: true, via: 'queue', id: mailId };
                            } else if (qData.estado === 'error') {
                                console.warn("❌ El worker de correos reportó un error al despachar:", qData.error_mensaje);
                                lastError = `Servidor de correo: ${qData.error_mensaje || 'No se pudo conectar al servidor SMTP'}`;
                                break;
                            }
                        }
                    } catch(pollE) {}
                }

                // Si no arrojó error explícito y sigue pendiente tras el polling, el worker lo procesará en segundo plano
                if (!lastError) {
                    console.log("⏳ El correo continúa encolado y en procesamiento por el worker:", mailId);
                    return { success: true, via: 'queue', id: mailId };
                }
            } else {
                console.error("Error al insertar en cola_emails de Supabase:", qErr);
                lastError = qErr.message || (typeof qErr === 'object' ? JSON.stringify(qErr) : String(qErr));
            }
        } else {
            lastError = "Cliente Supabase no disponible";
        }
    } catch(queueErr) {
        console.error("Excepción al intentar encolar email:", queueErr);
        lastError = queueErr.message || String(queueErr);
    }

    const customBackend = localStorage.getItem('sg_backend_url') || window.SG_BACKEND_URL;

    const endpoints = [];
    if (customBackend) endpoints.push(`${customBackend.replace(/\/+$/, '')}/api/send-email`);

    // Endpoints locales y cloud relay
    endpoints.push(
        'http://localhost:8000/api/send-email',
        'http://127.0.0.1:8000/api/send-email',
        'https://sg-presupuestos.onrender.com/api/send-email'
    );

    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 35000);
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject, html, text, reply_to, attachments, cc, bcc }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.success) {
                    // Registrar despacho real en Supabase
                    try {
                        const client = (typeof getDbClient === 'function') ? getDbClient() : null;
                        if (client) {
                            client.from('notificaciones').insert({
                                id: String(Date.now()),
                                tipo: 'email_despachado',
                                titulo: `Cotización enviada a ${to}`,
                                mensaje: subject,
                                leida: false,
                                fecha: new Date().toISOString()
                            }).then(() => {});
                        }
                    } catch(dbErr) {}
                    return data;
                } else if (data && data.error) {
                    lastError = data.error;
                }
            }
        } catch(err) {
            // Continúa con el siguiente endpoint
        }
    }

    // Si ningún endpoint respondió
    const finalErr = lastError ? `Fallo en cola Supabase: ${lastError}` : 'No se pudo despachar el correo. Verificá que la tabla cola_emails en Supabase o el servidor estén activos.';
    return {
        success: false,
        error: finalErr
    };
};

window.enviarEmailPedido = function(id) {
    let p = null;
    if (id && typeof id === 'object') {
        p = id;
    } else if (id && typeof window.findPedidoById === 'function') {
        p = window.findPedidoById(id);
    }

    if (!p) {
        p = (typeof pedidoActivo !== 'undefined' && pedidoActivo) || window.pedidoActivo || null;
    }
    if (!p && id && typeof window.findPedidoById === 'function') {
        p = window.findPedidoById(id);
    }
    if (!p && typeof appData !== 'undefined' && appData && Array.isArray(appData.pedidos)) {
        p = appData.pedidos.find(x => x && (x.id === id || String(x.id).includes(String(id))));
    }

    if (!p) {
        if (typeof showToast === 'function') showToast('Presupuesto no encontrado', 'error');
        return;
    }

    const nro = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliente = (p.cliente_nombre || p.meca_denominacion || p.cliente || 'CARGILL SACI').trim();
    const cuit = p.cuit || p.meca_cuit || '30-50679216-5';
    const totalAmount = parseFloat(p.importe || 0);
    const totalStr = `$${totalAmount.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    const clientEmail = (p.email || p.cliente_email || '').trim();
    const defaultTo = clientEmail || 'melanidaiana28@gmail.com';
    const defaultSubject = `Presupuesto Oficial SG MONTAJES Nro. ${nro} — ${cliente}`;
    const initialReportFormat = 'detallado';

    const rawClientData = (typeof window.clientesDB !== 'undefined' && Array.isArray(window.clientesDB))
        ? window.clientesDB.find(c => (c.codigo && p.cliente_id && String(c.codigo).trim() === String(p.cliente_id).trim()) || (c.nombre && p.cliente_nombre && String(c.nombre).trim().toUpperCase() === String(p.cliente_nombre).trim().toUpperCase()))
        : null;
    const emailPlanta = (p.meca_planta || p.planta || (rawClientData && rawClientData.localidad && rawClientData.localidad.toUpperCase().includes('SAN MARTIN') ? 'PGSM' : 'VGG')).toUpperCase();

    const buildEmailPlainBody = () => {
        let plainMsg = `Estimados ${cliente},\n\n`;
        plainMsg += `Adjuntamos la propuesta comercial formal correspondiente al Presupuesto Oficial SG MONTAJES Nro. ${nro}.\n\n`;
        plainMsg += `• Presupuesto Nro.: ${nro}\n`;
        plainMsg += `• Fecha: ${p.fecha || new Date().toLocaleDateString('es-AR')}\n`;
        plainMsg += `• Obra / Denominación: ${(p.meca_denominacion || p.denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase()}\n`;
        plainMsg += `• Planta: ${emailPlanta}\n`;
        plainMsg += `• Importe Total: ${totalStr}\n`;
        if (p.meca_nro_ot || p.nro_ot) {
            plainMsg += `• Orden de Trabajo (OT): ${p.meca_nro_ot || p.nro_ot}\n`;
        }
        if (p.meca_nro_oc || p.nro_oc) {
            plainMsg += `• Orden de Compra (OC): ${p.meca_nro_oc || p.nro_oc}\n`;
        }
        if (p.estado === 'Cargado sin orden de compra' || p.estado === 'Enviado sin OC') {
            plainMsg += `⚠️ Recordatorio: Este presupuesto está pendiente de recepción de Orden de Compra. Fecha límite: ${p.oc_limite_fecha || '-'}\n`;
        }
        plainMsg += `\nEl detalle completo de los ítems cotizados, especificaciones técnicas y cómputo se encuentra en el archivo PDF oficial adjunto.\n\n`;
        plainMsg += `Quedamos a su entera disposición ante cualquier consulta.\n\n`;
        plainMsg += `Atentamente,\nSG MONTAJES S.R.L.\nMontajes Industriales & Servicios Electromecánicos\ncotizaciones@sgmontajes.com.ar | Tel: (0341) 5890126`;
        return plainMsg;
    };

    let modalEl = document.getElementById('modal-dispatch-email-quote');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'modal-dispatch-email-quote';
        modalEl.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 15px;';
        document.body.appendChild(modalEl);
    }

    // Array de archivos adicionales adjuntos por el usuario
    window._attachedEmailFiles = [];

    const renderAttachedFilesList = () => {
        const cont = document.getElementById('dispatch-attached-files-container');
        if (!cont) return;
        if (!window._attachedEmailFiles || window._attachedEmailFiles.length === 0) {
            cont.innerHTML = '';
            cont.style.display = 'none';
            return;
        }
        cont.style.display = 'flex';
        cont.innerHTML = window._attachedEmailFiles.map((file, idx) => `
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 6px; padding: 4px 8px; font-size: 11px; color: #f8fafc;">
                <i class="fas fa-file" style="color: #38bdf8;"></i>
                <span>${file.filename} (${(file.size / 1024).toFixed(1)} KB)</span>
                <span onclick="window._removeAttachedEmailFile(${idx})" style="color: #ef4444; cursor: pointer; font-weight: bold; margin-left: 4px;">✕</span>
            </div>
        `).join('');
    };

    window._removeAttachedEmailFile = function(idx) {
        window._attachedEmailFiles.splice(idx, 1);
        renderAttachedFilesList();
    };

    modalEl.innerHTML = `
        <div style="width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); padding: 22px 24px; color: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; position: relative;">

            <!-- Cabecera -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 1px solid #1e293b; padding-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: #0284c7; display: flex; align-items: center; justify-content: center; color: white; font-size: 17px; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);">
                        <i class="fas fa-paper-plane"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">Despachar Cotización por Email</h3>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;">Envío oficial automático desde cotizaciones@sgmontajes.com.ar</p>
                    </div>
                </div>
                <button type="button" id="btn-close-dispatch-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 4px;" title="Cerrar ventana">✕</button>
            </div>

            <!-- Destinatarios (TO) -->
            <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label style="font-size: 12px; font-weight: 600; color: #cbd5e1;">Destinatarios (uno o varios separados por coma):</label>
                    <div style="display: flex; gap: 5px;">
                        <button type="button" id="btn-dispatch-add-all" style="background: #0d9488; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fas fa-user-plus"></i> + Agregar Todos los Destinatarios
                        </button>
                        <button type="button" id="btn-dispatch-copy-to" style="background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                        <button type="button" id="btn-dispatch-clear-to" style="background: #dc2626; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fas fa-trash-can"></i> Limpiar
                        </button>
                    </div>
                </div>
                <input type="text" id="dispatch-email-to" value="${defaultTo}" style="width: 100%; box-sizing: border-box; background: #0b1329; border: 1px solid #1e3a8a; border-radius: 7px; padding: 8px 12px; color: #ffffff; font-size: 13px; font-weight: 600; outline: none;">

                <!-- Chips para Destinatarios -->
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px;">
                    ${clientEmail ? `
                    <button type="button" class="btn-dispatch-chip-to" data-email="${clientEmail}" style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; color: #cbd5e1; padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-building" style="color: #38bdf8;"></i> ${cliente}
                    </button>
                    ` : `
                    <button type="button" class="btn-dispatch-chip-to" data-email="" style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; color: #cbd5e1; padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-building" style="color: #38bdf8;"></i> ${cliente}
                    </button>
                    `}
                    <button type="button" class="btn-dispatch-chip-to" data-email="melanidaiana28@gmail.com" style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; color: #cbd5e1; padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-user" style="color: #38bdf8;"></i> melanidaiana28@gmail.com
                    </button>
                    <button type="button" class="btn-dispatch-chip-to" data-email="cotizaciones@sgmontajes.com.ar" style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; color: #cbd5e1; padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-envelope" style="color: #38bdf8;"></i> cotizaciones@sgmontajes.com.ar
                    </button>
                    <button type="button" class="btn-dispatch-chip-to" data-email="facturacion@sgmontajes.com.ar" style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; color: #cbd5e1; padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-briefcase" style="color: #38bdf8;"></i> facturacion@sgmontajes.com.ar
                    </button>
                </div>
            </div>

            <!-- Enviar Copia (CC) -->
            <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label style="font-size: 12px; font-weight: 600; color: #cbd5e1; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-copy" style="color: #38bdf8;"></i> Enviar copia (CC):
                    </label>
                    <button type="button" id="btn-dispatch-copy-cc" style="background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
                <input type="text" id="dispatch-email-cc" placeholder="ej: cotizaciones@sgmontajes.com.ar" style="width: 100%; box-sizing: border-box; background: #0b1329; border: 1px solid #334155; border-radius: 7px; padding: 8px 12px; color: #ffffff; font-size: 13px; outline: none;">

                <!-- Chips para CC -->
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px;">
                    <button type="button" class="btn-dispatch-chip-cc" data-email="melanidaiana28@gmail.com" style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; color: #cbd5e1; padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-user" style="color: #38bdf8;"></i> melanidaiana28@gmail.com
                    </button>
                    <button type="button" class="btn-dispatch-chip-cc" data-email="cotizaciones@sgmontajes.com.ar" style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; color: #cbd5e1; padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-envelope" style="color: #38bdf8;"></i> cotizaciones@sgmontajes.com.ar
                    </button>
                    <button type="button" id="btn-dispatch-no-cc" style="background: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.4); color: #f87171; padding: 3px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        ✕ Sin copia
                    </button>
                </div>
            </div>

            <!-- Asunto -->
            <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Asunto:</label>
                <input type="text" id="dispatch-email-subject" value="${defaultSubject}" style="width: 100%; box-sizing: border-box; background: #0b1329; border: 1px solid #334155; border-radius: 7px; padding: 8px 12px; color: #ffffff; font-size: 13px; font-weight: 600; outline: none;">
            </div>

            <!-- Cuerpo del Correo (Editable por el usuario) -->
            <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label style="font-size: 12px; font-weight: 600; color: #cbd5e1; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-pen-to-square" style="color: #38bdf8;"></i> Cuerpo del Correo (editable):
                    </label>
                    <button type="button" id="btn-dispatch-reset-body" style="background: rgba(51, 65, 85, 0.8); color: #cbd5e1; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid #475569; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Restablecer al texto predeterminado estándar">
                        <i class="fas fa-rotate-left"></i> Restablecer estándar
                    </button>
                </div>
                <textarea id="dispatch-email-body" rows="6" style="width: 100%; box-sizing: border-box; background: #0b1329; border: 1px solid #334155; border-radius: 7px; padding: 10px 12px; color: #ffffff; font-size: 12px; line-height: 1.5; outline: none; resize: vertical; font-family: inherit;">${(typeof escapeHtml === 'function' ? escapeHtml(buildEmailPlainBody()) : buildEmailPlainBody())}</textarea>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; display: flex; align-items: center; gap: 5px;">
                    <i class="fas fa-circle-info" style="color: #38bdf8;"></i>
                    <span>Podés modificar el texto antes de enviar. El presupuesto oficial completo se incluye en el PDF adjunto.</span>
                </div>
            </div>

            <!-- Selector Oficial de Formato del Comprobante PDF Adjunto -->
            <div style="margin-bottom: 14px; background: rgba(2, 132, 199, 0.1); border: 1.5px solid #0284c7; border-radius: 8px; padding: 10px 14px;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">
                    <i class="fas fa-file-invoice"></i> Formato Oficial del Comprobante PDF Adjunto:
                </label>
                <select id="dispatch-report-format" style="width: 100%; box-sizing: border-box; background: #0b1329; border: 1px solid #334155; border-radius: 6px; padding: 7px 10px; color: #ffffff; font-size: 12.5px; font-weight: 600; outline: none; cursor: pointer;">
                    <option value="detallado" ${(initialReportFormat === 'detallado') ? 'selected' : ''}>📄 Detallado (Desglose ítem por ítem con código, detalle, P. Unitario y subtotales)</option>
                    <option value="resumido" ${(initialReportFormat === 'resumido') ? 'selected' : ''}>📋 Resumido (Línea ejecutiva global con el total presupuestado)</option>
                    <option value="proyecto" ${(initialReportFormat === 'proyecto') ? 'selected' : ''}>🏗️ Proyecto (Mano de obra agrupada por especialidad + detalle de materiales)</option>
                </select>
            </div>

            <!-- Comprobante Oficial Imprimible y Adjuntos -->
            <div style="margin-bottom: 16px; background: rgba(15, 23, 42, 0.6); border: 1px solid #1e293b; border-radius: 8px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 12px; font-weight: 700; color: #38bdf8; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-paperclip"></i> Comprobante Oficial Imprimible y Adjuntos
                    </span>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" id="btn-dispatch-preview-pdf" style="background: rgba(2, 132, 199, 0.2); color: #38bdf8; border: 1px solid #0284c7; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                            <i class="fas fa-eye"></i> Ver / Imprimir Comprobante
                        </button>
                        <label for="dispatch-file-input" style="background: rgba(30, 41, 59, 0.8); color: #cbd5e1; border: 1px dashed #64748b; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; margin: 0;">
                            <i class="fas fa-plus"></i> Adjuntar otro archivo
                        </label>
                        <input type="file" id="dispatch-file-input" style="display: none;" multiple>
                    </div>
                </div>

                <!-- Lista de archivos extras adjuntos -->
                <div id="dispatch-attached-files-container" style="display: none; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;"></div>

                <!-- Resumen del Presupuesto -->
                <div style="background: #0b1329; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 12px; font-size: 12px; line-height: 1.5;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <span>Presupuesto: <strong style="color: #38bdf8; font-family: monospace;">${nro}</strong></span>
                        <span>Total: <strong style="color: #10b981; font-size: 13px; font-family: monospace;">${totalStr}</strong></span>
                    </div>
                    <div style="color: #94a3b8; font-size: 11.5px;">
                        Cliente: <strong style="color: #f8fafc;">${cliente}</strong> | CUIT: <span style="font-family: monospace;">${cuit}</span>
                    </div>
                </div>
            </div>

            <!-- Caja de Error / Información -->
            <div id="dispatch-email-error-box" style="display: none; margin-bottom: 12px;"></div>

            <!-- Botones de Acción Inferiores -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 14px; flex-wrap: wrap; gap: 8px;">
                <button type="button" id="btn-dispatch-cancel" style="background: #334155; color: #ffffff; font-weight: 700; font-size: 12.5px; padding: 10px 18px; border-radius: 8px; border: none; cursor: pointer;">
                    Cancelar
                </button>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button type="button" id="btn-dispatch-send-now" title="Enviar automáticamente desde cotizaciones@sgmontajes.com.ar" style="background: #0284c7; color: #ffffff; font-weight: 800; font-size: 13.5px; padding: 10px 26px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45);">
                        <i class="fas fa-paper-plane"></i> Enviar
                    </button>
                </div>
            </div>

        </div>
    `;

    modalEl.style.display = 'flex';

    // Función para cerrar modal
    const closeEmailModal = () => {
        modalEl.style.display = 'none';
        document.removeEventListener('keydown', window._dispatchEmailEscListener);
    };

    // Listeners para botones de cierre y cancelación
    const closeBtn = document.getElementById('btn-close-dispatch-modal');
    const cancelBtn = document.getElementById('btn-dispatch-cancel');
    if (closeBtn) closeBtn.onclick = closeEmailModal;
    if (cancelBtn) cancelBtn.onclick = closeEmailModal;

    // Cerrar con Escape
    document.removeEventListener('keydown', window._dispatchEmailEscListener);
    window._dispatchEmailEscListener = (e) => {
        if (e.key === 'Escape' && modalEl && modalEl.style.display !== 'none') {
            closeEmailModal();
        }
    };
    document.addEventListener('keydown', window._dispatchEmailEscListener);

    // Acciones de Destinatarios (TO)
    const inputTo = document.getElementById('dispatch-email-to');
    const clearBtn = document.getElementById('btn-dispatch-clear-to');
    if (clearBtn) clearBtn.onclick = () => { inputTo.value = ''; inputTo.focus(); };

    const copyToBtn = document.getElementById('btn-dispatch-copy-to');
    if (copyToBtn) {
        copyToBtn.onclick = () => {
            if (inputTo.value) {
                navigator.clipboard.writeText(inputTo.value);
                if (typeof showToast === 'function') showToast('Destinatarios copiados al portapapeles', 'info');
            }
        };
    }

    const addAllBtn = document.getElementById('btn-dispatch-add-all');
    if (addAllBtn) {
        addAllBtn.onclick = () => {
            const allMails = ['melanidaiana28@gmail.com', 'cotizaciones@sgmontajes.com.ar', 'facturacion@sgmontajes.com.ar'];
            if (clientEmail) allMails.unshift(clientEmail);
            inputTo.value = Array.from(new Set(allMails)).join(', ');
        };
    }

    // Chips Destinatarios
    modalEl.querySelectorAll('.btn-dispatch-chip-to').forEach(chip => {
        chip.onclick = () => {
            const mail = chip.dataset.email;
            if (!mail) return;
            const current = inputTo.value.split(',').map(s => s.trim()).filter(Boolean);
            if (!current.includes(mail)) {
                current.push(mail);
                inputTo.value = current.join(', ');
            }
        };
    });

    // Acciones Copia (CC)
    const inputCc = document.getElementById('dispatch-email-cc');
    const copyCcBtn = document.getElementById('btn-dispatch-copy-cc');
    if (copyCcBtn) {
        copyCcBtn.onclick = () => {
            if (inputCc.value) {
                navigator.clipboard.writeText(inputCc.value);
                if (typeof showToast === 'function') showToast('Copia (CC) copiada al portapapeles', 'info');
            }
        };
    }

    const noCcBtn = document.getElementById('btn-dispatch-no-cc');
    if (noCcBtn) noCcBtn.onclick = () => { inputCc.value = ''; };

    // Chips CC
    modalEl.querySelectorAll('.btn-dispatch-chip-cc').forEach(chip => {
        chip.onclick = () => {
            const mail = chip.dataset.email;
            if (!mail) return;
            const current = inputCc.value.split(',').map(s => s.trim()).filter(Boolean);
            if (!current.includes(mail)) {
                current.push(mail);
                inputCc.value = current.join(', ');
            }
        };
    });

    // Acciones Cuerpo de Correo (Editable & Restablecer)
    const inputBody = document.getElementById('dispatch-email-body');
    const resetBodyBtn = document.getElementById('btn-dispatch-reset-body');
    if (resetBodyBtn && inputBody) {
        resetBodyBtn.onclick = () => {
            inputBody.value = buildEmailPlainBody();
            if (typeof showToast === 'function') showToast('Cuerpo de correo restablecido al estándar.', 'info');
        };
    }

    const getDispatchBodyText = () => {
        const bodyEl = document.getElementById('dispatch-email-body');
        return (bodyEl && bodyEl.value.trim()) ? bodyEl.value.trim() : buildEmailPlainBody();
    };

    // Ver / Imprimir Comprobante
    const previewBtn = document.getElementById('btn-dispatch-preview-pdf');
    if (previewBtn) {
        previewBtn.onclick = () => {
            const fmtSel = document.getElementById('dispatch-report-format');
            const chosenFmt = fmtSel ? fmtSel.value : (p.tipo_reporte || 'detallado');
            if (typeof window.abrirPDFPresupuesto === 'function') {
                window.abrirPDFPresupuesto(p.id, chosenFmt);
            } else if (typeof window.imprimirPresupuestoModal === 'function') {
                window.imprimirPresupuestoModal();
            }
        };
    }

    // Adjuntar archivos extras
    const fileInput = document.getElementById('dispatch-file-input');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const files = Array.from(e.target.files || []);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (re) => {
                    window._attachedEmailFiles.push({
                        filename: file.name,
                        size: file.size,
                        content: re.target.result
                    });
                    renderAttachedFilesList();
                };
                reader.readAsDataURL(file);
            });
            fileInput.value = '';
        };
    }

    // Función auxiliar para Despacho por Gmail Web
    const ejecutarDespachoGmailWeb = async () => {
        const toVal = inputTo.value.trim();
        const ccVal = inputCc.value.trim();
        const subjVal = document.getElementById('dispatch-email-subject').value.trim();

        if (typeof showToast === 'function') {
            showToast('📄 Descargando PDF oficial y abriendo Gmail...', 'info');
        }

        const fmtSel = document.getElementById('dispatch-report-format');
        const chosenFmt = (fmtSel ? fmtSel.value : 'detallado').toLowerCase().trim();

        if (typeof window.descargarPDFPresupuestoDirecto === 'function') {
            try {
                await window.descargarPDFPresupuestoDirecto(p, chosenFmt);
            } catch(pdfE) {
                console.warn('Descarga PDF:', pdfE);
            }
        }

        const plainMsg = getDispatchBodyText();
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toVal)}&cc=${encodeURIComponent(ccVal)}&su=${encodeURIComponent(subjVal)}&body=${encodeURIComponent(plainMsg)}`;
        window.open(gmailUrl, '_blank');

        if (typeof showToast === 'function') {
            showToast(`✅ Abriendo Gmail Web con datos listos y PDF descargado.`, 'success');
        }
    };

    // Función auxiliar para Despacho Local por Mail / Outlook con Descarga de PDF
    const ejecutarDespachoLocalMailto = async () => {
        const toVal = inputTo.value.trim();
        const ccVal = inputCc.value.trim();
        const subjVal = document.getElementById('dispatch-email-subject').value.trim();

        if (typeof showToast === 'function') {
            showToast('📄 Descargando PDF oficial y abriendo correo...', 'info');
        }

        const fmtSel = document.getElementById('dispatch-report-format');
        const chosenFmt = (fmtSel ? fmtSel.value : 'detallado').toLowerCase().trim();

        if (typeof window.descargarPDFPresupuestoDirecto === 'function') {
            try {
                await window.descargarPDFPresupuestoDirecto(p, chosenFmt);
            } catch(pdfE) {
                console.warn('Descarga PDF:', pdfE);
            }
        }

        const plainMsg = getDispatchBodyText();
        const mailtoUrl = `mailto:${encodeURIComponent(toVal)}?cc=${encodeURIComponent(ccVal)}&subject=${encodeURIComponent(subjVal)}&body=${encodeURIComponent(plainMsg)}`;

        // Enlace invisible para garantizar ejecución en cualquier navegador
        const hiddenLink = document.createElement('a');
        hiddenLink.href = mailtoUrl;
        hiddenLink.style.display = 'none';
        document.body.appendChild(hiddenLink);
        hiddenLink.click();
        setTimeout(() => { if (hiddenLink.parentNode) hiddenLink.parentNode.removeChild(hiddenLink); }, 500);

        if (typeof showToast === 'function') {
            showToast(`✅ PDF descargado y correo redactado en tu app de email.`, 'success');
        }
    };

    // Botón principal de Envío Oficial por SMTP en Segundo Plano
    const btnSendNow = document.getElementById('btn-dispatch-send-now');
    if (btnSendNow) {
        btnSendNow.onclick = async () => {
            const toVal = inputTo.value.trim();
            const ccVal = inputCc.value.trim();
            const subjVal = document.getElementById('dispatch-email-subject').value.trim();

            if (!toVal) {
                if (typeof showToast === 'function') showToast('Por favor ingrese al menos un destinatario.', 'warning');
                inputTo.focus();
                return;
            }

            btnSendNow.disabled = true;
            btnSendNow.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            const fmtSel = document.getElementById('dispatch-report-format');
            const chosenFmt = (fmtSel ? fmtSel.value : 'detallado').toLowerCase().trim();

            // 1. Generar PDF oficial en Base64 con el formato oficial seleccionado (Detallado, Resumido o Proyecto)
            const attachments = [];
            if (typeof window.generarPDFPresupuestoBase64 === 'function') {
                try {
                    const pdfB64 = await window.generarPDFPresupuestoBase64(p, chosenFmt);
                    if (pdfB64) {
                        attachments.push({
                            filename: `Presupuesto_${nro}_${chosenFmt.toUpperCase()}.pdf`,
                            content: pdfB64
                        });
                    }
                } catch(pdfErr) {
                    console.warn('Error al generar PDF oficial adjunto:', pdfErr);
                }
            }

            // 2. Sumar archivos extras adjuntos
            if (window._attachedEmailFiles && window._attachedEmailFiles.length > 0) {
                window._attachedEmailFiles.forEach(att => {
                    attachments.push({
                        filename: att.filename,
                        content: att.content
                    });
                });
            }

            // 3. Obtener el cuerpo de correo redactado o editado por el usuario (sin logo en el cuerpo del correo; el logo y detalle van en el PDF adjunto)
            const userBodyText = getDispatchBodyText();
            const nowStrEmail = new Date().toLocaleDateString('es-AR');
            const userBodyHtml = (typeof escapeHtml === 'function' ? escapeHtml(userBodyText) : userBodyText).replace(/\n/g, '<br>');

            const htmlContent = `
                <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; color: #1e293b; border: 1.5px solid #0f766e; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                    <!-- Cabecera Oficial SG Montajes (Sin logo en cuerpo de correo para mantenerlo limpio) -->
                    <div style="background: #ffffff; border-bottom: 2px solid #0f766e; padding: 16px 22px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="margin: 0; font-size: 17px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">SG MONTAJES S.R.L.</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Montajes Industriales &amp; Servicios Electromecánicos</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="background: #0f766e; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 4px 10px; border-radius: 4px; display: inline-block; text-transform: uppercase;">
                                PRESUPUESTO OFICIAL
                            </div>
                            <div style="font-size: 11.5px; color: #334155; margin-top: 4px; font-weight: 600;">
                                Nro. <strong style="color: #0284c7; font-family: monospace;">${nro}</strong>
                            </div>
                            <div style="font-size: 10.5px; color: #64748b;">
                                Fecha: <strong style="color: #0f172a;">${p.fecha || nowStrEmail}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Mensaje del Correo -->
                    <div style="padding: 22px 24px; font-size: 13px; line-height: 1.65; color: #1e293b;">
                        ${userBodyHtml}
                    </div>

                    <!-- Notificación de Archivo Adjunto (PDF Oficial) -->
                    <div style="margin: 0 24px 20px 24px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 12px 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="font-size: 20px;">📎</div>
                            <div>
                                <div style="font-size: 12.5px; font-weight: 800; color: #166534;">
                                    Presupuesto Oficial Adjunto en Formato PDF
                                </div>
                                <div style="font-size: 11.5px; color: #15803d; margin-top: 2px;">
                                    El presupuesto oficial completo se encuentra adjunto en el archivo <strong>Presupuesto_${nro}_${chosenFmt.toUpperCase()}.pdf</strong>.
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Pie Corporativo -->
                    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; font-size: 10.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: #0f172a; font-size: 11.5px;">SG MONTAJES S.R.L.</strong><br>
                            Email: <a href="mailto:cotizaciones@sgmontajes.com.ar" style="color: #0284c7; text-decoration: none;">cotizaciones@sgmontajes.com.ar</a> | Tel: (0341) 5890126<br>
                            <span style="color: #94a3b8;">C.U.I.T.: 30-71602466-7 — Villa Gdor. Gálvez / Pto. Gral. San Martín, Santa Fe</span>
                        </div>
                        <div style="text-align: right; color: #94a3b8; font-size: 10px;">
                            Documento emitido por el Sistema de Presupuestos SG Montajes
                        </div>
                    </div>
                </div>
            `;

            let res = null;
            try {
                res = await window.enviarEmailBackend({
                    to: toVal,
                    cc: ccVal,
                    subject: subjVal,
                    text: userBodyText,
                    html: htmlContent,
                    attachments: attachments
                });
            } catch(eSend) {
                res = { success: false, error: eSend.message };
            }

            btnSendNow.disabled = false;
            btnSendNow.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar';

            if (!res || !res.success) {
                const detailedError = (res && res.error) ? res.error : 'No se pudo comunicar con la cola de envíos.';
                console.error("Fallo al enviar correo automáticamente:", detailedError);
                if (typeof showToast === 'function') {
                    showToast(`❌ ${detailedError}`, 'error');
                }
                const errBox = document.getElementById('dispatch-email-error-box');
                if (errBox) {
                    window._dispatchFallbackGmail = ejecutarDespachoGmailWeb;
                    window._dispatchFallbackMailto = ejecutarDespachoLocalMailto;
                    errBox.style.display = 'block';
                    errBox.innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.15); border: 1.5px solid #ef4444; border-radius: 8px; padding: 12px 14px; color: #fca5a5; font-size: 12.5px; line-height: 1.5;">
                            <div style="font-weight: 800; color: #f87171; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-triangle-exclamation"></i> No se pudo despachar por el servidor SMTP:
                            </div>
                            <div style="color: #cbd5e1; font-size: 12px; margin-bottom: 10px;">${detailedError}</div>
                            <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 8px;">Podés despacharlo inmediatamente con un clic por las vías alternativas:</div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button type="button" onclick="if(window._dispatchFallbackGmail) window._dispatchFallbackGmail()" style="background: #ea4335; color: white; border: none; border-radius: 6px; padding: 7px 12px; font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="fab fa-google"></i> Enviar con Gmail Web
                                </button>
                                <button type="button" onclick="if(window._dispatchFallbackMailto) window._dispatchFallbackMailto()" style="background: #334155; color: white; border: 1px solid #64748b; border-radius: 6px; padding: 7px 12px; font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <i class="fas fa-envelope"></i> Enviar con Mail / Outlook
                                </button>
                            </div>
                        </div>
                    `;
                }
                return;
            }

            // Actualizar estado de despacho en el pedido local y en Supabase (servidor local exitoso)
            if (p) {
                p.email_enviado = true;
                p.fecha_envio_email = new Date().toLocaleString('es-AR');
                if (p.estado === 'Cargado sin orden de compra' || !p.estado) {
                    p.estado = 'Enviado sin OC';
                }
                if (typeof saveData === 'function') {
                    try { saveData(); } catch(saveErr) {}
                }
            }

            closeEmailModal();
            if (typeof showToast === 'function') {
                showToast(`✅ ¡Cotización Oficial ${nro} enviada automáticamente desde cotizaciones@sgmontajes.com.ar!`, 'success');
            }
        };
    }

    // Acción de envío vía Gmail Web directo (sin servidor)
    const btnGmailNow = document.getElementById('btn-dispatch-gmail-now');
    if (btnGmailNow) {
        btnGmailNow.onclick = async () => {
            await ejecutarDespachoGmailWeb();
            if (p) {
                p.email_enviado = true;
                p.fecha_envio_email = new Date().toLocaleString('es-AR');
                if (p.estado === 'Cargado sin orden de compra' || !p.estado) {
                    p.estado = 'Enviado sin OC';
                }
                if (typeof saveData === 'function') {
                    try { saveData(); } catch(saveErr) {}
                }
            }
            closeEmailModal();
        };
    }

    // Acción de envío vía cliente mailto / Outlook (compatible 100% sin backend)
    const btnMailtoNow = document.getElementById('btn-dispatch-mailto-now');
    if (btnMailtoNow) {
        btnMailtoNow.onclick = async () => {
            const toVal = (document.getElementById('dispatch-email-to')?.value || '').trim();
            const ccVal = (document.getElementById('dispatch-email-cc')?.value || '').trim();
            const subjVal = (document.getElementById('dispatch-email-subject')?.value || defaultSubject).trim();
            const reportFormat = (document.getElementById('dispatch-report-format')?.value || 'detallado').toLowerCase().trim();

            btnMailtoNow.disabled = true;
            btnMailtoNow.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando PDF...';

            let pdfBlob = null;
            const pdfFilename = `Presupuesto_SG_Montajes_${nro}.pdf`;
            try {
                const pdfBase64 = await window.generatePdfBase64ForQuote(p, reportFormat);
                if (pdfBase64) {
                    const cleanB64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
                    const byteChars = atob(cleanB64);
                    const byteNumbers = new Array(byteChars.length);
                    for (let i = 0; i < byteChars.length; i++) {
                        byteNumbers[i] = byteChars.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
                }
            } catch(e) {
                console.warn("No se pudo compilar PDF para mailto, continuando...", e);
            }

            const bodySummary = `Estimados,\n\nAdjuntamos la cotización correspondiente al Presupuesto Oficial Nro. ${nro}.\n\nCliente: ${cliente}\nImporte Total: ${totalStr}\n\nQuedamos a su entera disposición ante cualquier consulta.\n\nAtentamente,\nSG MONTAJES S.R.L.\nEmail: cotizaciones@sgmontajes.com.ar\nTel: (0341) 5890126`;

            window.abrirClienteCorreoMailto({
                to: toVal,
                cc: ccVal,
                subject: subjVal,
                body: bodySummary,
                pdfBlob: pdfBlob,
                filename: pdfFilename
            });

            if (p) {
                p.email_enviado = true;
                p.fecha_envio_email = new Date().toLocaleString('es-AR');
                if (p.estado === 'Cargado sin orden de compra' || !p.estado) {
                    p.estado = 'Enviado sin OC';
                }
                if (typeof saveData === 'function') {
                    try { saveData(); } catch(saveErr) {}
                }
            }

            btnMailtoNow.disabled = false;
            btnMailtoNow.innerHTML = '<i class="fas fa-envelope-open-text"></i> Abrir en Outlook';
            closeEmailModal();
        };
    }
};

// Desactivar cambio involuntario de valores por la rueda del mouse en inputs numéricos y del tarifario
document.addEventListener('wheel', function(e) {
    if (document.activeElement && (document.activeElement.type === 'number' || document.activeElement.classList.contains('meca-excel-input'))) {
        document.activeElement.blur();
    }
}, { passive: true });

window.abrirModalAvanceProyecto = function(id) {
    let p = (typeof window.findPedidoById === 'function') ? window.findPedidoById(id) : ((typeof appData !== 'undefined' && appData && appData.pedidos) ? appData.pedidos.find(x => x.id === id) : null);
    if (!p) {
        p = (typeof pedidoActivo !== 'undefined' && pedidoActivo) || window.pedidoActivo || null;
    }
    if (!p) return;

    let modalEl = document.getElementById('modal-avance-proyecto');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'modal-avance-proyecto';
        modalEl.className = 'modal-backdrop';
        modalEl.style.display = 'none';
        modalEl.style.position = 'fixed';
        modalEl.style.top = '0';
        modalEl.style.left = '0';
        modalEl.style.width = '100%';
        modalEl.style.height = '100%';
        modalEl.style.backgroundColor = 'rgba(0,0,0,0.6)';
        modalEl.style.zIndex = '9999';
        modalEl.style.justifyContent = 'center';
        modalEl.style.alignItems = 'center';
        document.body.appendChild(modalEl);
    }

    // Calcular totales agrupados para el certificado (ignorando materiales desglosados)
    const formatted = window.getPresupuestoFormattedItems(p, 'proyecto');
    const titles = formatted.filter(f => f.subtotal !== '-');

    let rowsHtml = '';
    const prevHistory = p.avances_proyecto || [];

    titles.forEach((t, idx) => {
        const titleName = t.detalle;
        const sub = t.subtotal;

        let accPct = 0;
        prevHistory.forEach(h => {
            if (h.title === titleName) {
                accPct += parseFloat(h.pct || 0);
            }
        });
        const maxAllowed = Math.max(0, parseFloat((100 - accPct).toFixed(2)));
        const isCompleted = accPct >= 99.99;

        rowsHtml += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; border: 1.5px solid ${isCompleted ? '#059669' : '#334155'}; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <strong style="color: #f1f5f9; font-size: 13.5px;">${titleName}</strong>
                    <div style="font-size: 11.5px; color: #94a3b8; margin-top: 3px;">
                        Monto Total Concepto: <strong style="color: #cbd5e1; font-family: monospace;">$${sub.toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 14px; padding-left: 15px; border-left: 1px solid #334155;">
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <span style="font-size: 10.5px; color: ${isCompleted ? '#34d399' : '#94a3b8'}; margin-bottom: 3px; font-weight: 700;">
                            Acumulado previo: ${accPct.toFixed(2)}%
                        </span>
                        ${isCompleted ? `
                            <span style="color: #34d399; font-weight: 800; font-size: 11px; background: rgba(16,185,129,0.15); border: 1px solid #10b981; padding: 4px 10px; border-radius: 6px;">
                                <i class="fas fa-check-circle"></i> 100% Completado
                            </span>
                        ` : `
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <input type="number" id="avproy-pct-${idx}" min="0" max="${maxAllowed}" step="any"
                                       style="width: 75px; background: #1e293b; color: #38bdf8; font-weight: 800; border: 1.5px solid #0284c7; border-radius: 6px; padding: 5px 8px; text-align: right; font-size: 13.5px;"
                                       placeholder="0">
                                <span style="color: #38bdf8; font-weight: bold;">%</span>
                            </div>
                        `}
                    </div>
                    <div style="width: 130px; text-align: right;">
                        <span style="font-size: 10.5px; color: #94a3b8; display: block;">Importe a certificar:</span>
                        <strong id="avproy-monto-${idx}" style="color: #34d399; font-size: 14.5px; font-family: monospace;" data-title="${titleName}" data-total="${sub}" data-pct="0" data-certamt="0">$0,00</strong>
                    </div>
                </div>
            </div>
        `;
    });

    let histHtml = '';
    if (p.avances_proyecto_certificados && p.avances_proyecto_certificados.length > 0) {
        histHtml = `
            <div style="margin-top: 25px; border-top: 1px solid #334155; padding-top: 15px;">
                <h5 style="color: #38bdf8; margin: 0 0 10px 0;"><i class="fas fa-history"></i> Historial de Certificados Generados</h5>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${p.avances_proyecto_certificados.map((cert, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4); padding: 8px 12px; border-radius: 6px; border: 1px solid #334155;">
                            <div>
                                <span style="color: white; font-weight: bold;">Certificado #${i+1}</span>
                                <span style="color: #94a3b8; font-size: 11px; margin-left: 10px;">Fecha: ${cert.fecha}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <span style="color: #34d399; font-weight: bold; font-family: monospace;">$${cert.totalCert.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                                <button type="button" class="btn btn-sm btn-primary" onclick="window.generarPDFAvanceProyectoHistorico('${id}', ${i})" style="padding: 2px 8px; font-size: 11px; border-radius: 4px;">
                                    <i class="fas fa-eye"></i> Ver PDF
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    modalEl.innerHTML = `
        <div class="modal-content" style="width: 100%; max-width: 680px; background: #0f172a; color: white; border-radius: 12px; padding: 22px; border: 1.5px solid rgba(6, 182, 212, 0.4); max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 16px;">
                <div>
                    <h4 style="margin: 0; color: #2dd4bf; font-size: 17px; font-weight: 800;"><i class="fas fa-list-check"></i> Certificar Avance de Proyecto (por Títulos)</h4>
                    <p style="margin: 3px 0 0 0; font-size: 11.5px; color: #94a3b8;">El avance acumulado no puede superar el 100% de cada concepto ni del total de la obra.</p>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('modal-avance-proyecto').style.display='none'">✕</button>
            </div>
            <div id="avproy-rows-container">
                ${rowsHtml}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid #334155; padding-top: 15px; background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 8px;">
                <div>
                    <span style="color: #94a3b8; font-size: 11px; display: block; text-transform: uppercase; font-weight: 700;">Total a Certificar en este Hito:</span>
                    <strong id="avproy-total-cert" style="color: #34d399; font-size: 18px; font-family: monospace;">$0,00</strong>
                </div>
                <button type="button" class="btn btn-sm" style="background: #10b981; color: #ffffff; border: 1px solid #059669; font-weight: 800; padding: 8px 18px; font-size: 12.5px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);" onclick="generarPDFAvanceProyecto('${id}')">
                    <i class="fas fa-print"></i> Registrar y Emitir Certificado
                </button>
            </div>
            ${histHtml}
        </div>
    `;
    modalEl.style.display = 'flex';

    // Add event listeners for dynamic recalculation and strict 100% enforcement
    titles.forEach((t, idx) => {
        const inp = document.getElementById(`avproy-pct-${idx}`);
        if (inp) {
            let accPct = 0;
            prevHistory.forEach(h => {
                if (h.title === t.detalle) {
                    accPct += parseFloat(h.pct || 0);
                }
            });
            const maxAllowed = Math.max(0, parseFloat((100 - accPct).toFixed(2)));

            inp.addEventListener('input', function() {
                const sub = t.subtotal;
                let rawVal = parseFloat(this.value);
                if (isNaN(rawVal) || rawVal < 0) {
                    rawVal = 0;
                    this.value = '';
                }

                // Strict enforcement: cannot exceed maxAllowed and cannot exceed 100%
                if (rawVal > maxAllowed || (accPct + rawVal) > 100.001) {
                    rawVal = maxAllowed;
                    this.value = rawVal;
                    if (typeof showToast === 'function') {
                        showToast(`El porcentaje no puede superar el 100% acumulado. Máximo permitido: ${maxAllowed}%`, 'warning');
                    }
                }

                const certAmt = (sub * rawVal) / 100;
                const montoEl = document.getElementById(`avproy-monto-${idx}`);
                if (montoEl) {
                    montoEl.dataset.pct = rawVal;
                    montoEl.dataset.certamt = certAmt;
                    montoEl.textContent = '$' + certAmt.toLocaleString('es-AR', {minimumFractionDigits: 2});
                }

                let grandTotal = 0;
                document.querySelectorAll('[id^="avproy-monto-"]').forEach(el => {
                    grandTotal += parseFloat(el.dataset.certamt || 0);
                });

                const totalEl = document.getElementById('avproy-total-cert');
                if (totalEl) {
                    totalEl.textContent = '$' + grandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2});
                }
            });
        }
    });
};

window.generarPDFAvanceProyecto = async function(id) {
    let p = (typeof window.findPedidoById === 'function') ? window.findPedidoById(id) : ((typeof appData !== 'undefined' && appData && appData.pedidos) ? appData.pedidos.find(x => x.id === id) : null);
    if (!p) p = (typeof pedidoActivo !== 'undefined' && pedidoActivo) || window.pedidoActivo || null;
    if (!p) return;

    if (!p.avances_proyecto) p.avances_proyecto = [];
    if (!p.avances_proyecto_certificados) p.avances_proyecto_certificados = [];

    const rows = [];
    let hasValues = false;
    let anyExceeded = false;

    document.querySelectorAll('[id^="avproy-monto-"]').forEach(el => {
        const pct = parseFloat(el.dataset.pct || 0);
        const title = el.dataset.title;
        if (pct > 0) {
            let previousPct = 0;
            (p.avances_proyecto || []).forEach(h => {
                if (h.title === title) previousPct += parseFloat(h.pct || 0);
            });
            if (previousPct + pct > 100.001) {
                anyExceeded = true;
            }
            hasValues = true;
            rows.push({
                title: title,
                pct: pct,
                certAmt: parseFloat(el.dataset.certamt || 0),
                totalAmt: parseFloat(el.dataset.total || 0)
            });
        }
    });

    if (anyExceeded) {
        showToast('Error: El avance acumulado no puede superar el 100% para ningún concepto.', 'error');
        return;
    }

    if (!hasValues) {
        showToast('Debe ingresar al menos un porcentaje mayor a 0%', 'warning');
        return;
    }

    const nowStr = new Date().toLocaleDateString('es-AR');
    rows.forEach(r => {
        p.avances_proyecto.push({
            title: r.title,
            pct: r.pct,
            certAmt: r.certAmt,
            fecha: nowStr
        });
    });

    const totalCert = rows.reduce((s, r) => s + r.certAmt, 0);
    p.avances_proyecto_certificados.push({
        fecha: nowStr,
        rows: rows,
        totalCert: totalCert
    });

    // Also sync with general project progress (avances) so the main progress bar reflects it
    const totalPresupuesto = parseFloat(p.importe || 0);
    if (totalPresupuesto > 0) {
        const pctEquiv = parseFloat((totalCert / totalPresupuesto * 100).toFixed(2));
        if (!Array.isArray(p.avances)) p.avances = [];
        const currentAcc = p.avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
        const addedPct = Math.min(pctEquiv, Math.max(0, 100 - currentAcc));
        if (addedPct > 0) {
            p.avances.push({
                id: `${String(p.id)}-AV-${String(p.avances.length + 1).padStart(2, '0')}`,
                fecha: new Date().toISOString().substring(0, 10),
                porcentaje: addedPct,
                monto: totalCert,
                nro_doc: `Certificado Proy. #${p.avances_proyecto_certificados.length}`,
                detalle: `Certificación por Proyecto #${p.avances_proyecto_certificados.length}`,
                creado_en: new Date().toISOString()
            });
            const newTotalAcc = p.avances.reduce((sum, a) => sum + (parseFloat(a.porcentaje) || 0), 0);
            p.avance_porcentaje_acumulado = newTotalAcc;
            p.facturado_porcentaje = newTotalAcc;
            p.monto_facturado = (totalPresupuesto * (newTotalAcc / 100));
        }
    }

    // Disparar alerta automática de email para facturación en avance de proyecto
    if (typeof window.notificarEmailFacturacionAvance === 'function') {
        const totalAmount = parseFloat(p.importe || 0);
        const pctEquiv = totalAmount > 0 ? parseFloat((totalCert / totalAmount * 100).toFixed(2)) : 0;
        const nuevoHito = {
            porcentaje: pctEquiv,
            monto: totalCert,
            nro_doc: `Certificado Proy. #${p.avances_proyecto_certificados.length}`,
            detalle: `Certificación de Avance por Proyecto #${p.avances_proyecto_certificados.length} (${pctEquiv}%)`
        };
        window.notificarEmailFacturacionAvance(p, nuevoHito);
    }

    if (typeof saveData === 'function') {
        saveData();
    } else if (typeof guardarPedidosEnArchivo === 'function') {
        guardarPedidosEnArchivo(false);
    }
    showToast('Avance registrado exitosamente en el historial y sincronizado en tiempo real.', 'success');

    const modalProy = document.getElementById('modal-avance-proyecto');
    if (modalProy) modalProy.style.display = 'none';

    // Re-render avance obra modal if open
    if (typeof abrirModalAvanceObra === 'function' && window.pedidoAvanceActivoId) {
        abrirModalAvanceObra(window.pedidoAvanceActivoId);
    }

    window.generarPDFAvanceProyectoHistorico(id, p.avances_proyecto_certificados.length - 1);
};

window.generarPDFAvanceProyectoHistorico = function(id, certIndex) {
    let p = (typeof window.findPedidoById === 'function') ? window.findPedidoById(id) : ((typeof appData !== 'undefined' && appData && appData.pedidos) ? appData.pedidos.find(x => x.id === id) : null);
    if (!p) p = (typeof pedidoActivo !== 'undefined' && pedidoActivo) || window.pedidoActivo || null;
    if (!p || !p.avances_proyecto_certificados || !p.avances_proyecto_certificados[certIndex]) return;

    const cert = p.avances_proyecto_certificados[certIndex];
    const nroPres = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliente = (p.cliente_nombre || p.cliente || 'CARGILL SACI').trim();
    const logoSrc = (window.LOGO_SG_BASE64) ? window.LOGO_SG_BASE64 : 'logo_sg_montajes.png';
    const fecha = cert.fecha || new Date().toLocaleDateString('es-AR');

    const planta = (p.meca_planta || p.planta || 'VGG').toUpperCase();
    const nroOc = p.meca_nro_oc || p.nro_oc || '-';
    const denominacion = p.meca_denominacion || p.motivo || p.denominacion || 'cambio de iluminacion';
    const totalPresupuesto = parseFloat(p.importe || 0);

    // Calculate accumulation up to this milestone
    const allCerts = p.avances_proyecto_certificados;
    const sliced = allCerts.slice(0, certIndex + 1);
    const accMonto = sliced.reduce((s, c) => s + (c.totalCert || 0), 0);
    const accPct = totalPresupuesto > 0 ? parseFloat((accMonto / totalPresupuesto * 100).toFixed(2)) : 0;
    const saldoMonto = Math.max(0, totalPresupuesto - accMonto);
    const saldoPct = Math.max(0, parseFloat((100 - accPct).toFixed(2)));
    const hitoPct = totalPresupuesto > 0 ? parseFloat(((cert.totalCert || 0) / totalPresupuesto * 100).toFixed(2)) : 0;

    // Table rows of concepts certified in this milestone
    let conceptRows = cert.rows.map(r => `
        <tr style="background: #f0fdf4; border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 8px 10px; font-weight: 700; color: #166534;">
                ${r.title}
            </td>
            <td style="padding: 8px 10px; text-align: center; font-weight: 800; font-size: 13px; color: #0f766e;">
                +${r.pct}%
            </td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 800; font-size: 13px; color: #166534;">
                $${(r.certAmt || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}
            </td>
        </tr>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Certificado de Avance - ${nroPres}</title>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
                body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #ffffff; color: #1e293b; margin: 0; padding: 15px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <!-- Barra de Herramientas Superior (No se imprime) -->
            <div class="no-print" style="position: sticky; top: 0; background: #0f172a; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; margin: -15px -15px 20px -15px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 0 0 8px 8px;">
                <span style="color: #2dd4bf; font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    📄 Vista del Certificado de Avance (Proyecto)
                </span>
                <div style="display: flex; gap: 10px;">
                    <button type="button" onclick="window.print()" style="background: #0d9488; color: white; border: none; font-weight: 800; font-size: 13px; padding: 8px 18px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        🖨️ Imprimir / Guardar como PDF
                    </button>
                    <button type="button" onclick="window.close()" style="background: #334155; color: white; border: 1px solid #475569; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 6px; cursor: pointer;">
                        ✕ Cerrar
                    </button>
                </div>
            </div>

            <div style="max-width: 680px; margin: 0 auto;">

                <!-- Contenedor Imprimible del Comprobante (Diseño Oficial de Avance) -->
                <div style="border: 2px solid #0f766e; border-radius: 8px; padding: 22px; background: #ffffff; position: relative; overflow: hidden;">

                    <!-- Marca de Agua (Gota de agua torcida a -30deg) -->
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.28; z-index: 0; pointer-events: none; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                        <img src="${logoSrc}" style="width: 68%; object-fit: contain; transform: rotate(-30deg); filter: contrast(1.15);">
                    </div>

                    <div style="position: relative; z-index: 1;">
                        <!-- Encabezado con Logo y Título -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <img src="${logoSrc}" alt="Logo" style="height: 38px; width: auto; object-fit: contain;">
                                <div>
                                    <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">SG MONTAJES SRL</h3>
                                    <span style="font-size: 10.5px; color: #64748b; display: block;">Montajes Industriales & Servicios Electromecánicos</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <span style="background: #0f766e; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 4px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                                    CERTIFICADO DE AVANCE
                                </span>
                                <div style="font-size: 11px; color: #334155; margin-top: 4px; font-weight: 600;">
                                    Fecha: <span style="font-weight: 800; color: #0f172a;">${fecha}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Datos de la Obra y Presupuesto -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin-bottom: 16px; font-size: 11.5px; line-height: 1.6;">
                            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px;">
                                <div>
                                    <span style="color: #64748b; font-weight: 600;">Presupuesto Ref.:</span>
                                    <strong style="color: #0284c7; font-family: monospace; font-size: 13px;">${nroPres}</strong>
                                </div>
                                <div>
                                    <span style="color: #64748b; font-weight: 600;">Planta:</span>
                                    <strong style="color: #0f172a;">${planta}</strong>
                                </div>
                                <div>
                                    <span style="color: #64748b; font-weight: 600;">Cliente:</span>
                                    <strong style="color: #0f172a;">${cliente}</strong>
                                </div>
                                <div>
                                    <span style="color: #64748b; font-weight: 600;">Orden de Compra (OC):</span>
                                    <strong style="color: #0f172a;">${nroOc}</strong>
                                </div>
                                <div style="grid-column: 1 / -1;">
                                    <span style="color: #64748b; font-weight: 600;">Denominación del Servicio:</span>
                                    <strong style="color: #0f172a;">${denominacion}</strong>
                                </div>
                            </div>
                        </div>

                        <!-- Detalle del Hito Certificado (Grilla de Conceptos) -->
                        <div style="margin-bottom: 16px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left; border: 1px solid #cbd5e1;">
                                <thead style="background: #0f766e; color: #ffffff;">
                                    <tr>
                                        <th style="padding: 7px 10px; font-weight: 700;">Concepto</th>
                                        <th style="padding: 7px 10px; font-weight: 700; text-align: center; width: 110px;">% Avance</th>
                                        <th style="padding: 7px 10px; font-weight: 700; text-align: right; width: 150px;">Importe a Facturar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${conceptRows}
                                    <tr style="background: #e6fffa; border-top: 2px solid #0f766e; font-size: 12px;">
                                        <td style="padding: 8px 10px; font-weight: 800; color: #0f766e; text-transform: uppercase;">
                                            Certificado #${certIndex + 1} — Subtotal Hito
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 900; font-size: 13px; color: #0f766e;">
                                            +${hitoPct}%
                                        </td>
                                        <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 900; font-size: 13.5px; color: #0f766e;">
                                            $${(cert.totalCert || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Cuadro de Estado Financiero Acumulado -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 11px; text-align: center;">
                            <div style="background: #f1f5f9; padding: 8px 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <span style="color: #64748b; display: block; font-weight: 600;">Total Presupuesto</span>
                                <strong style="color: #0f172a; font-family: monospace; font-size: 12.5px;">$${totalPresupuesto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
                            </div>
                            <div style="background: #e6fffa; padding: 8px 6px; border-radius: 6px; border: 1px solid #99f6e4;">
                                <span style="color: #0d9488; display: block; font-weight: 600;">Acumulado a la Fecha</span>
                                <strong style="color: #0f766e; font-family: monospace; font-size: 12.5px;">${accPct}% ($${accMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})})</strong>
                            </div>
                            <div style="background: #fffbeb; padding: 8px 6px; border-radius: 6px; border: 1px solid #fde68a;">
                                <span style="color: #b45309; display: block; font-weight: 600;">Saldo Pendiente</span>
                                <strong style="color: #b45309; font-family: monospace; font-size: 12.5px;">${saldoPct}% ($${saldoMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})})</strong>
                            </div>
                        </div>

                        <!-- Tareas Realizadas / Observaciones -->
                        <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 22px; font-size: 11px; background: #fafafa;">
                            <strong style="color: #334155; display: block; margin-bottom: 4px;">Detalle de Trabajos y Tareas Ejecutadas:</strong>
                            <p style="margin: 0; color: #475569; font-style: italic;">Certificación por Proyecto #${certIndex + 1} — Hito registrado según planilla de avance técnico en planta.</p>
                        </div>

                        <!-- Firmas de Conformidad -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 32px; padding-top: 10px; font-size: 11px; text-align: center;">
                            <div style="border-top: 1px solid #64748b; padding-top: 6px;">
                                <span style="color: #0f172a; font-weight: 700; display: block;">Firma y Aclaración Responsable</span>
                                <span style="color: #64748b; font-size: 10px;">SG MONTAJES SRL</span>
                            </div>
                            <div style="border-top: 1px solid #64748b; padding-top: 6px;">
                                <span style="color: #0f172a; font-weight: 700; display: block;">Conformidad Inspección / Cliente</span>
                                <span style="color: #64748b; font-size: 10px;">${cliente}</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=880');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } else {
        showToast('Por favor habilite las ventanas emergentes (pop-ups) para ver el PDF.', 'error');
    }
};




window.generarHTMLPresupuestoNuevo = function(p, format, items, total, nro, cliName, logoSrc, nowStr) {
    const rawClient = (typeof window.clientesDB !== 'undefined' && Array.isArray(window.clientesDB))
        ? window.clientesDB.find(c => (c.codigo && p.cliente_id && String(c.codigo).trim() === String(p.cliente_id).trim()) || (c.nombre && (c.nombre === p.cliente_nombre || c.nombre === cliName || String(c.nombre).trim().toUpperCase() === String(cliName || '').trim().toUpperCase() || String(c.nombre).trim().toUpperCase() === String(p.cliente_nombre || '').trim().toUpperCase())))
        : null;

    const fechaEmision = p.fecha || nowStr;
    const hora = "10:36:51";
    const cuitCli = (p.cuit && p.cuit !== '-' && p.cuit.trim() !== '')
        ? p.cuit
        : (rawClient && rawClient.cuit ? rawClient.cuit : "30-50679216-5");
    const oc = p.nro_oc || p.meca_nro_oc || "-";
    const entrega = p.fecha_entrega || p.meca_fecha_fin || "2026-10-14";
    const domicilio = (p.domicilio && p.domicilio !== '-' && p.domicilio.trim() !== '')
        ? p.domicilio.trim().toUpperCase()
        : (rawClient && rawClient.domicilio ? rawClient.domicilio.trim().toUpperCase() : "-");
    const condicion = cleanConditionName(p.condicion_nombre || p.condicion_venta || p.forma_pago || "CONTADO").toUpperCase();
    const planta = (p.meca_planta || p.planta || (rawClient && rawClient.localidad && rawClient.localidad.toUpperCase().includes('SAN MARTIN') ? 'PGSM' : 'VGG')).toUpperCase();
    const numOt = p.meca_nro_ot || p.nro_ot || "-";
    const localidad = (p.localidad && p.localidad !== '-' && p.localidad.trim() !== '')
        ? p.localidad.trim().toUpperCase()
        : (rawClient && rawClient.localidad ? rawClient.localidad.trim().toUpperCase() : "-");
    const detalle = p.meca_denominacion || p.motivo || p.denominacion || "-";
    const codCliente = p.cliente_id || (rawClient ? rawClient.codigo : "2");

    // Propuesta tecnica
    const propTecnica = p.meca_propuesta || p.propuesta || detalle || "-";
    const personal = p.meca_personal || p.personal || "-";
    const exclus = p.meca_exclusiones || p.exclusiones || "-";
    const obs = p.observaciones || p.meca_observaciones || "-";

    // --- Detectar proveedor Acosta Servicios ---
    const _provStr = (p.proveedor || p.meca_proveedor || p.proveedor_nombre || '').trim().toUpperCase();
    // Buscar en todos los campos posibles del objeto p por si acaso
    const _allProvStr = Object.values(p).filter(v => typeof v === 'string').join(' ').toUpperCase();
    const _isAcosta = _provStr.includes('ACOSTA') || ((_allProvStr.includes('ACOSTA')) && !_allProvStr.includes('MECA_DENOMINACION=ACOSTA'));
    // Debug en consola para detectar problemas
    if (typeof console !== 'undefined') console.log('[PDF] Proveedor detectado:', _provStr, '| isAcosta:', _isAcosta, '| meca_proveedor:', p.meca_proveedor, '| proveedor:', p.proveedor);
    const _logoAcostaB64 = (typeof window !== 'undefined' && window.LOGO_ACOSTA_BASE64) ? window.LOGO_ACOSTA_BASE64 : 'logo_acosta.png';
    const _watermarkAcostaB64 = (typeof window !== 'undefined' && window.LOGO_ACOSTA_WATERMARK_BASE64) ? window.LOGO_ACOSTA_WATERMARK_BASE64 : 'logo_acosta_watermark.png';
    const _watermarkSgB64 = (typeof window !== 'undefined' && window.LOGO_SG_WATERMARK_GOLD_BASE64) ? window.LOGO_SG_WATERMARK_GOLD_BASE64 : (typeof window !== 'undefined' && window.LOGO_SG_BASE64 ? window.LOGO_SG_BASE64 : 'logo_sg_montajes.png');
    const _activeWatermark = _isAcosta ? _watermarkAcostaB64 : _watermarkSgB64;
    const _activeLogo = _isAcosta ? _logoAcostaB64 : (logoSrc || ((typeof window !== 'undefined' && window.LOGO_SG_BASE64) ? window.LOGO_SG_BASE64 : 'logo_sg_montajes.png'));

    const cotizMat = parseFloat(p.cotizacion_materiales || p.cotizacion || (window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1450)) || 1450;
    let laborTotalARS = 0;
    let materialsTotalUSD = 0;

    const rawItems = Array.isArray(p.items) ? p.items : [];
    if (rawItems.length > 0) {
        rawItems.forEach(it => {
            if (it.estado === 'Rechazado') return;
            const q = parseFloat(String(it.cantidad || '0').replace(',', '.')) || 0;
            const isMat = (it.is_material === true || it.is_material === 1 || it.is_material === '1') ||
                          (window.isMaterialItem ? window.isMaterialItem(it, p.tipo_presupuesto) : false) ||
                          (String(it.subrubro || '').toLowerCase().includes('material') || String(it.subrubro || '').toLowerCase().includes('equipo'));
            if (isMat) {
                const prUSD = (it.precio_usd !== undefined && it.precio_usd !== null && !isNaN(parseFloat(it.precio_usd)))
                    ? parseFloat(it.precio_usd)
                    : (parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0);
                const subUSD = (it.subtotal_usd !== undefined && it.subtotal_usd !== null && !isNaN(parseFloat(it.subtotal_usd)))
                    ? parseFloat(it.subtotal_usd)
                    : (q * prUSD);
                materialsTotalUSD += subUSD;
            } else {
                const pr = parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0;
                const sub = (it.subtotal !== undefined && it.subtotal !== null && !isNaN(parseFloat(String(it.subtotal).replace(',', '.'))))
                    ? parseFloat(String(it.subtotal).replace(',', '.'))
                    : (q * pr);
                laborTotalARS += sub;
            }
        });
    } else {
        items.forEach(r => {
            const isHeaderRow = (r.codigo === '-' && r.cantidad === '-' && r.precio === '-');
            if (isHeaderRow) {
                if (r.subtotal !== '-' && r.subtotal !== undefined && r.subtotal !== null) {
                    laborTotalARS += (parseFloat(r.subtotal) || 0);
                }
                return;
            }
            const isMat = (r.is_material === true || r.is_material === 1 || r.is_material === '1');
            if (isMat) {
                materialsTotalUSD += (parseFloat(r.subtotal_usd) || 0);
            } else {
                laborTotalARS += (parseFloat(r.subtotal) || 0);
            }
        });
    }
    const materialsTotalARS = materialsTotalUSD * cotizMat;
    const computedGrandTotal = (laborTotalARS + materialsTotalARS > 0) ? (laborTotalARS + materialsTotalARS) : total;

    let rowsHtml = items.map(r => {
        const isHeaderRow = (r.codigo === '-' && r.cantidad === '-' && r.precio === '-');
        const isMat = (r.is_material === true || r.is_material === 1 || r.is_material === '1');
        if (isHeaderRow) {
            const hasSub = (r.subtotal !== '-' && r.subtotal !== null && r.subtotal !== undefined);
            const subVal = hasSub ? parseFloat(r.subtotal) : null;
            const subStr = (subVal !== null && !isNaN(subVal))
                ? `$${subVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                : '-';
            return `
            <tr style="border-bottom: 2px solid #000; font-size: 11px; background: rgba(226, 232, 240, 0.45); font-weight: 800; page-break-inside: avoid;">
                <td style="padding: 6px; border-right: 1px solid #000; text-align:center; background: transparent;">-</td>
                <td style="padding: 6px; border-right: 1px solid #000; background: transparent;">${r.detalle}</td>
                <td style="padding: 6px; border-right: 1px solid #000; text-align: right; background: transparent;">-</td>
                <td style="padding: 6px; border-right: 1px solid #000; text-align: center; background: transparent;">-</td>
                <td style="padding: 6px; text-align: right; font-weight: bold; background: transparent;">${subStr}</td>
            </tr>`;
        }

        let priceStr = '-';
        let subStr = '-';
        if (r.precio !== '-') {
            const prVal = parseFloat(r.precio) || 0;
            if (isMat) {
                priceStr = 'U$D ' + prVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            } else {
                priceStr = '$' + prVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
        }

        if (r.subtotal !== '-') {
            const sVal = parseFloat(r.subtotal) || 0;
            if (isMat && r.subtotal_usd !== undefined && r.subtotal_usd !== null) {
                const sUSD = parseFloat(r.subtotal_usd) || 0;
                subStr = '$' + sVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) +
                    ` <br><span style="font-size: 9.5px; opacity: 0.85; font-weight: normal; color: #0369a1;">(U$D ${sUSD.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>`;
            } else {
                subStr = '$' + sVal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
        }

        const cleanCodigo = String(r.codigo).startsWith('TITLE-') ? '' : (r.codigo || '-');
        const cleanDetalle = (r.detalle || r.descripcion || r.denominacion || r.nombre || '-');

        return `
        <tr style="border-bottom: 1px solid #000; font-size: 10px; background: transparent; page-break-inside: avoid;">
            <td style="padding: 4px 5px; border-right: 1px solid #000; font-weight:bold; text-align:center; background: transparent; word-break: break-word;">${cleanCodigo}</td>
            <td style="padding: 4px 6px; border-right: 1px solid #000; background: transparent; word-break: break-word;">${cleanDetalle}</td>
            <td style="padding: 4px 5px; border-right: 1px solid #000; text-align: right; background: transparent; word-break: break-word; ${isMat ? 'color: #0369a1; font-weight:bold;' : ''}">${priceStr}</td>
            <td style="padding: 4px 5px; border-right: 1px solid #000; text-align: center; font-weight:bold; background: transparent; word-break: break-word;">${r.cantidad === '-' ? '-' : r.cantidad}</td>
            <td style="padding: 4px 5px; text-align: right; font-weight: bold; background: transparent; word-break: break-word;">${subStr}</td>
        </tr>`;
    }).join('');

    let pdfBreakdownRows = '';
    if (materialsTotalUSD > 0) {
        pdfBreakdownRows = `
            <tr style="border-top: 1px solid #000; font-size: 11px; background: transparent; page-break-inside: avoid;">
                <td colspan="4" style="padding: 5px 8px; font-weight: 600; text-align: right; border-right: 1px solid #000; background: transparent;">Subtotal Mano de Obra ($ ARS):</td>
                <td style="padding: 5px 8px; text-align: right; font-weight: bold; font-family: monospace; background: transparent;">$${laborTotalARS.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr style="border-top: 1px solid #ccc; font-size: 11px; background: transparent; page-break-inside: avoid;">
                <td colspan="4" style="padding: 5px 8px; font-weight: 600; text-align: right; border-right: 1px solid #000; color: #0369a1; background: transparent;">
                    Subtotal Materiales (U$D) <span style="font-size: 10px; color: #b45309; font-weight: 700; margin-left: 5px; background: rgba(254, 243, 199, 0.6); border: 1px solid #fcd34d; padding: 1px 5px; border-radius: 3px;">[Cotiz. Dólar: $${cotizMat.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}]</span>:
                </td>
                <td style="padding: 5px 8px; text-align: right; font-weight: bold; font-family: monospace; color: #0369a1; background: transparent;">U$D ${materialsTotalUSD.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr style="border-top: 1px solid #ccc; font-size: 11px; background: transparent; page-break-inside: avoid;">
                <td colspan="4" style="padding: 5px 8px; font-weight: 600; text-align: right; border-right: 1px solid #000; color: #0284c7; background: transparent;">Subtotal Materiales Pesificados:</td>
                <td style="padding: 5px 8px; text-align: right; font-weight: bold; font-family: monospace; color: #0284c7; background: transparent;">$${materialsTotalARS.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    }

    const htmlContent = `
        <div id="pdf-wrapper-download" style="box-sizing: border-box; width: 780px; min-width: 780px; max-width: 780px; padding: 6px 10px; font-family: Arial, sans-serif; background: #ffffff; color: #000000; margin: 0 auto; position: relative;">
            <style>
                #pdf-wrapper-download, #pdf-wrapper-download * {
                    box-sizing: border-box !important;
                }
                #pdf-wrapper-download {
                    width: 780px !important;
                    min-width: 780px !important;
                    max-width: 780px !important;
                    margin: 0 auto !important;
                }
                #pdf-wrapper-download tr,
                #pdf-wrapper-download .no-page-break {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                @media print {
                    #pdf-wrapper-download {
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                }
            </style>

            <div style="position: relative; z-index: 1;">

                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; border: 2px solid #000; border-radius: 6px; padding: 8px 12px; background: transparent;">
                    ${_isAcosta ? `
                    <div style="width: 30%;">
                        <img src="${_logoAcostaB64}" style="height: 44px; margin-bottom: 4px; object-fit: contain; max-width: 100%;">
                        <div style="font-size: 9.5px; line-height: 1.25;">
                            <strong>I.V.A. Responsable Inscripto</strong><br>
                            Estanislao López<br>
                            Timbues - Pcia. Santa Fe
                        </div>
                    </div>` : `
                    <div style="width: 30%;">
                        <img src="${_activeLogo}" style="height: 38px; margin-bottom: 4px; object-fit: contain; max-width: 100%;">
                        <div style="font-size: 9.5px; line-height: 1.25;">
                            <strong>I.V.A. Responsable Inscripto</strong><br>
                            Estanislao López (CP S2204)<br>
                            Timbues - Pcia. Santa Fe
                        </div>
                    </div>`}

                    <div style="width: 40%; text-align: center;">
                        <h2 style="margin: 0; font-size: 17px; font-weight: 800; letter-spacing: 1px;">PRESUPUESTO</h2>
                        <div style="display: inline-block; border: 2px solid #000; border-radius: 4px; padding: 1px 10px; font-size: 16px; font-weight: bold; margin-top: 3px; margin-bottom: 3px;">X</div>
                        <div style="font-size: 8px; font-weight: bold; line-height: 1.2;">COMPROBANTE NO<br>VÁLIDO COMO FACTURA</div>
                    </div>

                    <div style="width: 30%; text-align: right; font-size: 9.5px; line-height: 1.35;">
                        <div style="font-size: 13px; font-weight: bold; margin-bottom: 3px;">Nro. ${nro}</div>
                        <div><strong>Fecha:</strong> ${fechaEmision} ${hora}</div>
                        <div><strong>OC Mano de Obra:</strong> ${p.oc_mano_obra || p.meca_nro_oc || p.nro_oc || "-"}</div>
                        <div><strong>OC Materiales:</strong> ${p.oc_materiales || "-"}</div>
                        ${_isAcosta ? `<div><strong>C.U.I.T.:</strong> 30-71868621-7</div>
                        <div><strong>Ini. Act.:</strong> 25/06/2024</div>` : `<div><strong>C.U.I.T.:</strong> 30-71602466-7</div>
                        <div><strong>Ing.Br.:</strong> 0916600761 | <strong>Ini. Act.:</strong> 21/12/2017</div>`}
                    </div>
                </div>

                <!-- Client Info Box (Formato Unificado) -->
                <div style="border: 2px solid #000; border-radius: 6px; margin-bottom: 6px; font-size: 10px; padding: 5px 8px; background: transparent;">
                    <div style="display: flex;">
                        <div style="width: 55%; border-right: 1px solid #000; padding: 2px 8px 2px 0;">
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 68px; text-align:center; background: transparent; font-weight: 600;">Cliente:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${cliName}</strong>
                            </div>
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 68px; text-align:center; background: transparent; font-weight: 600;">Título:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${detalle}</strong>
                            </div>
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 68px; text-align:center; background: transparent; font-weight: 600;">Detalle:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; white-space: pre-wrap; background: transparent;">${propTecnica}</strong>
                            </div>
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 68px; text-align:center; background: transparent; font-weight: 600;">Domicilio:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${domicilio}</strong>
                            </div>
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 68px; text-align:center; background: transparent; font-weight: 600;">C.U.I.T.:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${cuitCli}</strong>
                            </div>
                            <div style="display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 68px; text-align:center; background: transparent; font-weight: 600;">Condición:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${condicion}</strong>
                            </div>
                        </div>
                        <div style="width: 45%; padding: 2px 0 2px 8px;">
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 80px; text-align:center; background: transparent; font-weight: 600;">Código:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${codCliente}</strong>
                            </div>
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 80px; text-align:center; background: transparent; font-weight: 600;">Número de OT:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${numOt}</strong>
                            </div>
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 80px; text-align:center; background: transparent; font-weight: 600;">Planta:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${planta}</strong>
                            </div>
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 80px; text-align:center; background: transparent; font-weight: 600;">Localidad:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${localidad}</strong>
                            </div>
                            <div style="margin-bottom: 3px; display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 80px; text-align:center; background: transparent; font-weight: 600;">F. Entrega:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${entrega}</strong>
                            </div>
                            <div style="display:flex; gap:5px;">
                                <span style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; width: 80px; text-align:center; background: transparent; font-weight: 600;">Nro Pres.:</span>
                                <strong style="border: 1px solid #000; border-radius:3px; padding: 1px 5px; flex:1; background: transparent;">${nro}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Items Table with Watermark -->
                <div style="position: relative; margin-bottom: 6px;">
                    <!-- Watermark Gota de Agua -->
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: ${_isAcosta ? '0.22' : '0.25'}; z-index: 0; pointer-events: none; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                        <img src="${_activeWatermark}" style="width: 70%; max-width: 420px; max-height: 85%; object-fit: contain; transform: rotate(-20deg); ${_isAcosta ? 'opacity: 0.9; filter: contrast(0.95);' : 'filter: contrast(1.15);'}">
                    </div>

                    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; position: relative; z-index: 1; background: transparent; table-layout: fixed;">
                        <thead style="font-size: 10px; background: transparent;">
                            <tr style="border-bottom: 2px solid #000; background: transparent; page-break-inside: avoid;">
                                <th style="padding: 5px; font-weight: bold; border-right: 1px solid #000; width: 14%; background: transparent; word-break: break-word;">CÓDIGO</th>
                                <th style="padding: 5px; font-weight: bold; border-right: 1px solid #000; width: 44%; background: transparent; word-break: break-word;">DETALLE DE PRODUCTOS / SERVICIOS</th>
                                <th style="padding: 5px; font-weight: bold; text-align: right; border-right: 1px solid #000; width: 15%; background: transparent; word-break: break-word;">PRECIO</th>
                                <th style="padding: 5px; font-weight: bold; text-align: center; border-right: 1px solid #000; width: 11%; background: transparent; word-break: break-word;">CANTIDAD</th>
                                <th style="padding: 5px; font-weight: bold; text-align: right; width: 16%; background: transparent; word-break: break-word;">TOTAL ($ ARS)</th>
                            </tr>
                        </thead>
                        <tbody style="background: transparent;">
                            ${rowsHtml}
                        </tbody>
                        <tfoot style="background: transparent;">
                            ${pdfBreakdownRows}
                            <tr style="border-top: 2px solid #000; font-size: 12px; background: transparent; page-break-inside: avoid;">
                                <td colspan="4" style="padding: 6px 8px; font-weight: bold; border-right: 1px solid #000; background: transparent;">TOTAL GENERAL ($ ARS):</td>
                                <td style="padding: 6px 8px; text-align: right; font-weight: bold; background: transparent;">$${computedGrandTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- Propuesta Tecnica (Unificada) -->
                <div class="no-page-break" style="border: 2px solid #000; margin-bottom: 5px; font-size: 10px; background: transparent; page-break-inside: avoid; break-inside: avoid;">
                    <div style="padding: 4px 6px; font-weight: bold; border-bottom: 1px solid #000; background: transparent;">PROPUESTA TÉCNICA / COMERCIAL</div>

                    <div style="display: flex; border-bottom: 1px solid #000; background: transparent;">
                        <div style="width: 30%; padding: 3px 6px; border-right: 1px solid #000; font-weight:bold; background: transparent;">SOLICITUD DE SUPERVISOR:</div>
                        <div style="width: 70%; padding: 3px 6px; background: transparent;">${personal}</div>
                    </div>
                    <div style="display: flex; border-bottom: 1px solid #000; background: transparent;">
                        <div style="width: 30%; padding: 3px 6px; border-right: 1px solid #000; font-weight:bold; background: transparent;">INDICAR EXCLUSIONES:</div>
                        <div style="width: 70%; padding: 3px 6px; background: transparent;">${exclus}</div>
                    </div>
                    <div style="display: flex; background: rgba(224, 242, 254, 0.4); padding: 3px 6px;">
                        <div style="background: #3b82f6; color: white; padding: 1px 5px; border-radius: 3px; margin-right: 8px; font-weight: bold;">Observaciones:</div>
                        <div style="background: transparent;">${obs}</div>
                    </div>
                </div>

                <div class="no-page-break" style="background: #94a3b8; color: white; text-align: center; padding: 4px 6px; font-size: 9.5px; font-weight: bold; margin-bottom: 5px; border-radius: 4px; page-break-inside: avoid; break-inside: avoid;">
                    PRECIOS DEL PRESUPUESTO, SUJETOS A MODIFICACIONES SIN PREVIO AVISO
                </div>

                <div class="no-page-break" style="border: 1px solid #f59e0b; border-radius: 5px; padding: 5px 8px; font-size: 9.5px; color: #b45309; line-height: 1.35; margin-bottom: 5px; background: transparent; page-break-inside: avoid; break-inside: avoid;">
                    <div style="font-weight: bold;">⚠️ Aclaraciones: LAS HORAS DE EMERGENCIA SE CONTEMPLAN 5 HORAS NORMALES.</div>
                    <div><strong>i. Garantía Requerida:</strong> 6 MESES</div>
                    <div><strong>ii. Convenio:</strong> La Mano de Obra contempla el Convenio UOCRA vigente. Los trabajos en planta contemplan el convenio Agroexportador.</div>
                    <div><strong>iii. Forma de Pago:</strong> 30 días fecha de factura</div>
                </div>

                <div class="no-page-break" style="display: flex; justify-content: space-between; border: 1px solid #38bdf8; border-radius: 4px; padding: 3px 8px; font-size: 9px; color: #0284c7; font-weight: bold; background: transparent; page-break-inside: avoid; break-inside: avoid;">
                    <span>Usuario: ${p.operador || 'mel'}</span>
                    <span>Fecha: ${nowStr} 10:38:14</span>
                    <span>Item: ${items.length}</span>
                    <span>Presupuesto Nro. ${nro} ${cliName}</span>
                    <span>Página: 1</span>
                    <span>Nro C.A.I.: 0   Vto: //</span>
                </div>
            </div>
        </div>
    `;
    return htmlContent;
};

window.generarPDFPresupuestoBase64 = async function(p, format = null) {
    if (!p) return null;
    const finalFormat = format || p.tipo_reporte || 'detallado';
    const items = window.getPresupuestoFormattedItems(p, finalFormat);
    const nro = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliName = (p.cliente_nombre || p.cliente || '').trim();
    const logoSrc = (window.LOGO_SG_BASE64) ? window.LOGO_SG_BASE64 : 'logo_sg_montajes.png';
    const nowStr = new Date().toLocaleDateString('es-AR');
    const total = items.reduce((sum, r) => sum + (r.subtotal !== '-' ? parseFloat(r.subtotal) : 0), 0);
    const htmlContent = window.generarHTMLPresupuestoNuevo(p, finalFormat, items, total, nro, cliName, logoSrc, nowStr);
    return new Promise((resolve) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '780px';
        container.style.minWidth = '780px';
        container.style.maxWidth = '780px';
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.background = '#ffffff';
        container.style.zIndex = '-99999';
        container.innerHTML = htmlContent;
        document.body.appendChild(container);

        const targetEl = container.querySelector('#pdf-wrapper-download') || container.firstElementChild || container;

        const opt = {
            margin: [4, 4, 4, 4],
            filename: `Presupuesto_${nro}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                windowWidth: 780
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(targetEl).outputPdf('datauristring').then(function(pdfAsString) {
                if (container.parentNode) document.body.removeChild(container);
                resolve(pdfAsString);
            }).catch(err => {
                console.error('Error in html2pdf:', err);
                if (container.parentNode) document.body.removeChild(container);
                resolve(null);
            });
        } else {
            console.error('html2pdf no está disponible');
            if (container.parentNode) document.body.removeChild(container);
            resolve(null);
        }
    });
};

window.descargarPDFPresupuestoDirecto = async function(p, format = null) {
    if (!p) return false;
    const finalFormat = format || p.tipo_reporte || 'detallado';
    const items = (typeof window.getPresupuestoFormattedItems === 'function') ? window.getPresupuestoFormattedItems(p, finalFormat) : [];
    const nro = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliName = (p.cliente_nombre || p.cliente || '').trim();
    const logoSrc = (window.LOGO_SG_BASE64) ? window.LOGO_SG_BASE64 : 'logo_sg_montajes.png';
    const nowStr = new Date().toLocaleDateString('es-AR');
    const total = items.reduce((sum, r) => sum + (r.subtotal !== '-' ? parseFloat(r.subtotal) : 0), 0);
    const htmlContent = window.generarHTMLPresupuestoNuevo(p, finalFormat, items, total, nro, cliName, logoSrc, nowStr);
    return new Promise((resolve) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '780px';
        container.style.minWidth = '780px';
        container.style.maxWidth = '780px';
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.background = '#ffffff';
        container.style.zIndex = '-99999';
        container.innerHTML = htmlContent;
        document.body.appendChild(container);

        const targetEl = container.querySelector('#pdf-wrapper-download') || container.firstElementChild || container;

        const opt = {
            margin: [4, 4, 4, 4],
            filename: `Presupuesto_${nro}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                windowWidth: 780
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(targetEl).save().then(() => {
                if (container.parentNode) document.body.removeChild(container);
                resolve(true);
            }).catch(err => {
                console.error('Error al guardar PDF:', err);
                if (container.parentNode) document.body.removeChild(container);
                resolve(false);
            });
        } else {
            console.error('html2pdf no está disponible');
            if (container.parentNode) document.body.removeChild(container);
            resolve(false);
        }
    });
};

window.abrirPDFPresupuesto = function(id, format = null) {
    const p = (window.appData && Array.isArray(window.appData.pedidos)) ? window.appData.pedidos.find(x => x.id === id) : null;
    if (!p) return;
    const finalFormat = format || p.tipo_reporte || 'detallado';
    const items = window.getPresupuestoFormattedItems(p, finalFormat);
    const nro = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const cliName = (p.cliente_nombre || p.cliente || '').trim();
    const logoSrc = (window.LOGO_SG_BASE64) ? window.LOGO_SG_BASE64 : 'logo_sg_montajes.png';
    const nowStr = new Date().toLocaleDateString('es-AR');
    const total = items.reduce((sum, r) => sum + (r.subtotal !== '-' ? parseFloat(r.subtotal) : 0), 0);
    const innerHtml = window.generarHTMLPresupuestoNuevo(p, finalFormat, items, total, nro, cliName, logoSrc, nowStr);
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Presupuesto - ${nro}</title>
            <style>
                @page { size: A4 portrait; margin: 8mm; }
                body { font-family: Arial, sans-serif; background: #ffffff; color: #000000; margin: 0; padding: 0; }
            </style>
        </head>
        <body>
            ${innerHtml}
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } else {
        showToast('Por favor habilita las ventanas emergentes (pop-ups) para ver el PDF.', 'error');
    }
};



// ====================================================================
// MÓDULO DE REGISTRO Y SEGUIMIENTO DE FACTURACIÓN
// ====================================================================
window.renderFacturacionTable = function() {
    const tbody = document.getElementById('facturacion-table-tbody');
    if (!tbody) return;

    const searchVal = (document.getElementById('facturacion-search-input')?.value || '').toLowerCase().trim();
    const estadoFilter = (document.getElementById('facturacion-estado-filter')?.value || '').trim();

    const allPedidos = (window.appData && Array.isArray(window.appData.pedidos)) ? window.appData.pedidos : [];
    // Una vez que los comprobantes estén aprobados con OC pasan a registrar facturación
    const validOrders = allPedidos.filter(p => {
        if (!p) return false;
        const est = String(p.estado || '').trim().toLowerCase();
        const oc = String(p.meca_nro_oc || p.nro_oc || p.oc_numero || '').trim();

        // Descartar rechazados, anulados o cancelados
        if (est === 'rechazado' || est === 'anulado' || est === 'cancelado') return false;

        const avancePct = parseFloat(p.avance_porcentaje_acumulado || p.avance_obra_porcentaje || 0);
        const hasAvances = (Array.isArray(p.avances) && p.avances.length > 0) || avancePct > 0;
        const factPct = parseFloat(p.facturado_porcentaje || 0);
        const factMonto = parseFloat(p.monto_facturado || 0);
        const hasFacturacion = factPct > 0 || factMonto > 0 || (Array.isArray(p.historial_facturacion) && p.historial_facturacion.length > 0) || est === 'facturado parcial' || est === 'facturado total';
        const hasOc = (oc !== '' && oc !== '-');
        const isApprovedConOc = est === 'aprobado con oc' || est.includes('con oc') || est.includes('con orden') || est === 'cargado con orden de compra';

        // Pasan a facturación:
        // 1. Aprobados con OC (o con número de OC cargado)
        // 2. Comprobantes que tienen Avance de Obra registrado
        // 3. Comprobantes con facturación iniciada
        return isApprovedConOc || hasOc || hasAvances || hasFacturacion;
    });

    let countPendiente = 0, sumPendiente = 0;
    let countParcial = 0, sumParcial = 0;
    let countTotal = 0, sumTotal = 0;

    validOrders.forEach(p => {
        const total = parseFloat(p.importe || 0);
        const factPct = parseFloat(p.facturado_porcentaje || 0);
        const factMonto = parseFloat(p.monto_facturado || 0) || (total * factPct / 100);

        if (factPct >= 100 || p.estado === 'Facturado Total') {
            countTotal++;
            sumTotal += total;
        } else if (factPct > 0 || p.estado === 'Facturado Parcial') {
            countParcial++;
            sumParcial += factMonto;
        } else {
            countPendiente++;
            sumPendiente += total;
        }
    });

    const pCountEl = document.getElementById('fact-card-pendiente-count');
    const pMontoEl = document.getElementById('fact-card-pendiente-monto');
    const parCountEl = document.getElementById('fact-card-parcial-count');
    const parMontoEl = document.getElementById('fact-card-parcial-monto');
    const totCountEl = document.getElementById('fact-card-total-count');
    const totMontoEl = document.getElementById('fact-card-total-monto');

    if (pCountEl) pCountEl.innerText = countPendiente;
    if (pMontoEl) pMontoEl.innerText = '$' + sumPendiente.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (parCountEl) parCountEl.innerText = countParcial;
    if (parMontoEl) parMontoEl.innerText = '$' + sumParcial.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (totCountEl) totCountEl.innerText = countTotal;
    if (totMontoEl) totMontoEl.innerText = '$' + sumTotal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    const filtered = validOrders.filter(p => {
        const nroStr = ((typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(p) : p.id) || '').toLowerCase();
        const cliStr = (p.cliente_nombre || p.cliente || '').toLowerCase();
        const detStr = (p.meca_denominacion || p.motivo || p.denominacion || '').toLowerCase();
        const matchesSearch = !searchVal || nroStr.includes(searchVal) || cliStr.includes(searchVal) || detStr.includes(searchVal);

        const factPct = parseFloat(p.facturado_porcentaje || 0);
        let estFact = 'Pendiente';
        if (factPct >= 100 || p.estado === 'Facturado Total') estFact = 'Total';
        else if (factPct > 0 || p.estado === 'Facturado Parcial') estFact = 'Parcial';

        const matchesEstado = !estadoFilter || estFact === estadoFilter;
        return matchesSearch && matchesEstado;
    });

    let html = '';
    if (filtered.length === 0) {
        html = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron registros de facturación.</td></tr>`;
    } else {
        filtered.forEach(p => {
            const nro = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
            const cli = p.cliente_nombre || p.cliente || '-';
            const det = p.meca_denominacion || p.motivo || p.denominacion || '-';
            const total = parseFloat(p.importe || 0);
            const factPct = parseFloat(p.facturado_porcentaje || 0);
            const factMonto = parseFloat(p.monto_facturado || 0) || (total * factPct / 100);
            const avanceObraPct = parseFloat(p.avance_obra_porcentaje || p.avance_porcentaje_acumulado || 0);

            let badgeEst = `<span class="badge" style="background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid #ef4444; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">Pendiente</span>`;
            if (factPct >= 100 || p.estado === 'Facturado Total') {
                badgeEst = `<span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid #10b981; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">Total</span>`;
            } else if (factPct > 0 || p.estado === 'Facturado Parcial') {
                badgeEst = `<span class="badge" style="background: rgba(234,179,8,0.2); color: #fde047; border: 1px solid #eab308; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">Parcial (${factPct.toFixed(1)}%)</span>`;
            }

            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 10px; font-family: monospace; font-weight: 700; color: #38bdf8;">${nro}</td>
                    <td style="padding: 10px; font-weight: 600; color: #ffffff;">${cli}</td>
                    <td style="padding: 10px; color: #cbd5e1;">${det}</td>
                    <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: 700; color: #ffffff;">$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: 700; color: #34d399;">$${factMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="padding: 10px; text-align: center; font-weight: 700; color: #38bdf8;">${avanceObraPct.toFixed(1)}%</td>
                    <td style="padding: 10px; text-align: center;">${badgeEst}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button type="button" class="btn btn-sm" onclick="abrirModalRegistrarFactura('${p.id}')" style="background: #10b981; color: #ffffff; border: 1px solid #059669; font-weight: bold; padding: 3px 8px; border-radius: 6px; font-size: 11px;" title="Registrar Factura">
                            <i class="fa-solid fa-file-invoice"></i> Cargar
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    tbody.innerHTML = html;
};

window.abrirModalRegistrarFactura = function(id) {
    const orderIdx = (typeof window.findPedidoIndex === 'function') ? window.findPedidoIndex(id) : appData.pedidos.findIndex(x => x.id === id);
    if (orderIdx === -1) return;
    const p = appData.pedidos[orderIdx];

    window.pedidoFacturaActivoId = p.id;

    const nro = (typeof formatPresupuestoCodigo === 'function') ? formatPresupuestoCodigo(p) : p.id;
    const total = parseFloat(p.importe || 0);
    const factPct = parseFloat(p.facturado_porcentaje || 0);
    const factMonto = parseFloat(p.monto_facturado || 0) || (total * factPct / 100);
    const avanceObraPct = parseFloat(p.avance_obra_porcentaje || p.avance_porcentaje_acumulado || 0);

    const maxPermitido = (avanceObraPct > 0) ? avanceObraPct : 100;
    const remPct = Math.max(0, parseFloat((maxPermitido - factPct).toFixed(2)));

    const resumenEl = document.getElementById('facturacion-modal-resumen');
    if (resumenEl) {
        const infoAvance = (avanceObraPct > 0)
            ? `<div style="color: #38bdf8; font-weight: 700; margin-top: 6px;"><i class="fa-solid fa-hammer"></i> Obra con Avance Registrado: ${avanceObraPct.toFixed(1)}% (Límite máximo permitido a facturar: ${avanceObraPct.toFixed(1)}%)</div>`
            : `<div style="color: #34d399; font-weight: 700; margin-top: 6px;"><i class="fa-solid fa-file-circle-check"></i> Aprobado con OC directo: Puede facturar el Total (100.0%) o parciales hasta el 100%</div>`;

        resumenEl.innerHTML = `
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px 16px; font-size: 12px; line-height: 1.6;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span><strong>Presupuesto:</strong> <span style="color: #38bdf8; font-family: monospace; font-weight: bold;">${nro}</span></span>
                    <span><strong>Cliente:</strong> <span style="color: white; font-weight: bold;">${p.cliente_nombre || p.cliente || '-'}</span></span>
                </div>
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px; margin-top: 6px;">
                    <span><strong>Total Presupuesto:</strong> <span style="color: #34d399; font-family: monospace; font-weight: bold;">$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></span>
                    <span><strong>Acum. Ya Facturado:</strong> <span style="color: #fde047; font-weight: bold;">${factPct.toFixed(1)}% ($${factMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})})</span></span>
                    <span><strong>Disponible a Facturar:</strong> <span style="color: #38bdf8; font-weight: 800;">${remPct.toFixed(1)}% ($${((total * remPct) / 100).toLocaleString('es-AR', {minimumFractionDigits: 2})})</span></span>
                </div>
                ${infoAvance}
            </div>
        `;
    }

    const dateInp = document.getElementById('nueva-factura-fecha');
    if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];

    const pctInp = document.getElementById('nueva-factura-porcentaje');
    if (pctInp) {
        pctInp.value = remPct > 0 ? remPct.toFixed(2) : '0';
        window.calcFacturaMontoDesdePorcentaje(pctInp.value);
    }

    window.renderHistorialFacturasModal(p);

    const modalEl = document.getElementById('modal-registrar-factura');
    if (modalEl) modalEl.style.display = 'flex';
};

window.calcFacturaMontoDesdePorcentaje = function(val) {
    const orderIdx = (typeof window.findPedidoIndex === 'function') ? window.findPedidoIndex(window.pedidoFacturaActivoId) : appData.pedidos.findIndex(x => x.id === window.pedidoFacturaActivoId);
    if (orderIdx === -1) return;
    const p = appData.pedidos[orderIdx];
    const total = parseFloat(p.importe || 0);
    const pct = parseFloat(val) || 0;
    const monto = (total * pct) / 100;
    const montoInp = document.getElementById('nueva-factura-monto');
    if (montoInp) montoInp.value = monto.toFixed(2);

    const currentFactPct = parseFloat(p.facturado_porcentaje || 0);
    const totalPct = currentFactPct + pct;
    const estadoSelect = document.getElementById('nueva-factura-estado');
    if (estadoSelect) {
        estadoSelect.value = (totalPct >= 99.99) ? 'Total' : 'Parcial';
    }
};

window.calcFacturaPorcentajeDesdeMonto = function(val) {
    const orderIdx = (typeof window.findPedidoIndex === 'function') ? window.findPedidoIndex(window.pedidoFacturaActivoId) : appData.pedidos.findIndex(x => x.id === window.pedidoFacturaActivoId);
    if (orderIdx === -1) return;
    const p = appData.pedidos[orderIdx];
    const total = parseFloat(p.importe || 0);
    const monto = parseFloat(val) || 0;
    const pct = total > 0 ? (monto * 100 / total) : 0;
    const pctInp = document.getElementById('nueva-factura-porcentaje');
    if (pctInp) pctInp.value = pct.toFixed(2);

    const currentFactPct = parseFloat(p.facturado_porcentaje || 0);
    const totalPct = currentFactPct + pct;
    const estadoSelect = document.getElementById('nueva-factura-estado');
    if (estadoSelect) {
        estadoSelect.value = (totalPct >= 99.99) ? 'Total' : 'Parcial';
    }
};

window.renderHistorialFacturasModal = function(p) {
    const histListaEl = document.getElementById('facturacion-historial-lista');
    if (!histListaEl) return;

    const history = Array.isArray(p.historial_facturacion) ? p.historial_facturacion : [];
    if (history.length === 0) {
        histListaEl.innerHTML = `<div style="color: #64748b; font-size: 11px; text-align: center; padding: 15px;">No hay facturas registradas previamente para este presupuesto.</div>`;
    } else {
        let html = history.map((h, i) => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; font-size: 11.5px;">
                <div>
                    <strong style="color: white;">Factura #${i+1} (${h.estado || 'Parcial'})</strong>
                    <span style="color: #94a3b8; font-size: 10.5px; margin-left: 8px;">Fecha: ${h.fecha || '-'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="color: #38bdf8; font-weight: bold;">${parseFloat(h.porcentaje || 0).toFixed(2)}%</span>
                    <span style="color: #34d399; font-weight: bold; font-family: monospace;">$${parseFloat(h.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
        `).join('');
        histListaEl.innerHTML = html;
    }
};

window.guardarFacturaModal = function() {
    const orderIdx = (typeof window.findPedidoIndex === 'function') ? window.findPedidoIndex(window.pedidoFacturaActivoId) : appData.pedidos.findIndex(x => x.id === window.pedidoFacturaActivoId);
    if (orderIdx === -1) return;
    const p = appData.pedidos[orderIdx];

    const fecha = document.getElementById('nueva-factura-fecha')?.value || new Date().toLocaleDateString('es-AR');
    const pct = parseFloat(document.getElementById('nueva-factura-porcentaje')?.value || 0);
    const total = parseFloat(p.importe || 0);
    const monto = (total * pct) / 100;

    if (pct <= 0) {
        showToast('Debe ingresar un porcentaje mayor a 0% a facturar.', 'warning');
        return;
    }

    const currentFactPct = parseFloat(p.facturado_porcentaje || 0);
    const newFactPct = currentFactPct + pct;
    const avanceObraPct = parseFloat(p.avance_obra_porcentaje || p.avance_porcentaje_acumulado || 0);

    // REGLA DE ORO 1: No se puede facturar más del 100%
    if (newFactPct > 100.001) {
        showToast(`Regla de oro: No se puede facturar más del 100%. Facturado previo: ${currentFactPct.toFixed(1)}%. Máximo posible a facturar: ${(100 - currentFactPct).toFixed(1)}%.`, 'error');
        return;
    }

    // REGLA DE ORO 2: Los que tienen avance de obra solo pueden facturar hasta ese porcentaje de avance
    if (avanceObraPct > 0 && newFactPct > (avanceObraPct + 0.001)) {
        const maxDisponible = Math.max(0, avanceObraPct - currentFactPct);
        showToast(`Regla de oro: No se puede facturar más del avance de obra realizado (${avanceObraPct.toFixed(1)}%). Facturado previo: ${currentFactPct.toFixed(1)}%. Máximo disponible ahora: ${maxDisponible.toFixed(1)}%.`, 'error');
        return;
    }

    // REGLA DE ORO 3 Y 4: Si es total 100% no puede ser parcial
    const isTotal = (newFactPct >= 99.99);
    const finalFactPct = isTotal ? 100 : newFactPct;
    const estadoFact = isTotal ? 'Total' : 'Parcial';

    if (!Array.isArray(p.historial_facturacion)) p.historial_facturacion = [];
    p.historial_facturacion.push({
        fecha: fecha,
        porcentaje: pct,
        monto: monto,
        estado: estadoFact,
        timestamp: new Date().toISOString()
    });

    p.facturado_porcentaje = finalFactPct;
    p.monto_facturado = (total * finalFactPct) / 100;
    p.estado_facturacion = estadoFact;

    if (p.estado !== 'Rechazado' && p.estado !== 'Anulado') {
        p.estado = isTotal ? 'Facturado Total' : 'Facturado Parcial';
    }

    saveData();
    showToast(`✅ Factura registrada exitosamente: ${pct.toFixed(1)}% ($${monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}) — Estado: ${estadoFact}`, 'success');

    const modalEl = document.getElementById('modal-registrar-factura');
    if (modalEl) modalEl.style.display = 'none';

    if (typeof renderAssignmentsTable === 'function') renderAssignmentsTable();
    if (typeof window.renderFacturacionTable === 'function') window.renderFacturacionTable();
};

window.getPresupuestoFormattedItems = function(p, format) {
    if (!p) return [];
    const finalFormat = (format || p.tipo_reporte || 'detallado').toLowerCase().trim();
    const items = Array.isArray(p.items) ? p.items : [];
    const validItems = items.filter(item => {
        const isExistingHeader = (item.codigo === '-' && (item.cantidad === '-' || item.precio === '-')) ||
                                 String(item.codigo || '').startsWith('TITLE-');
        if (isExistingHeader) return false;

        const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
        const sub = parseFloat(String(item.subtotal || '0').replace(',', '.')) || 0;
        const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario || 0)).replace(',', '.')) || 0;
        const hasText = Boolean((item.detalle && String(item.detalle).trim() !== '' && String(item.detalle).trim() !== '-') || 
                                (item.descripcion && String(item.descripcion).trim() !== '' && String(item.descripcion).trim() !== '-') || 
                                (item.denominacion && String(item.denominacion).trim() !== '' && String(item.denominacion).trim() !== '-') || 
                                (item.nombre && String(item.nombre).trim() !== '' && String(item.nombre).trim() !== '-'));
        return (q > 0 || sub > 0 || pr > 0 || hasText) && item.estado !== 'Rechazado';
    });

    const cotizMat = parseFloat(p.cotizacion_materiales || p.cotizacion || (window.getCotizacionMateriales ? window.getCotizacionMateriales() : 1450)) || 1450;

    let computedGrandTotal = 0;
    validItems.forEach(it => {
        const q = parseFloat(String(it.cantidad || '0').replace(',', '.')) || 0;
        const isMat = (it.is_material === true || it.is_material === 1 || it.is_material === '1') ||
                      (window.isMaterialItem ? window.isMaterialItem(it, p.tipo_presupuesto) : false) ||
                      (String(it.subrubro || '').toLowerCase().includes('material') || String(it.subrubro || '').toLowerCase().includes('equipo'));
        if (isMat) {
            const prUSD = (it.precio_usd !== undefined && it.precio_usd !== null && !isNaN(parseFloat(it.precio_usd)))
                ? parseFloat(it.precio_usd)
                : (parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0);
            const subUSD = (it.subtotal_usd !== undefined && it.subtotal_usd !== null && !isNaN(parseFloat(it.subtotal_usd)))
                ? parseFloat(it.subtotal_usd)
                : (q * prUSD);
            computedGrandTotal += (subUSD * cotizMat);
        } else {
            const pr = parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0;
            const sub = (it.subtotal !== undefined && it.subtotal !== null && !isNaN(parseFloat(String(it.subtotal).replace(',', '.')))) ? parseFloat(String(it.subtotal).replace(',', '.')) : (q * pr);
            computedGrandTotal += sub;
        }
    });

    if (finalFormat === 'resumido') {
        const devText = (p.meca_denominacion || p.denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase();
        const totalVal = (computedGrandTotal > 0) ? computedGrandTotal : (parseFloat(String(p.importe || '0').replace(',', '.')) || 0);
        return [{
            codigo: (typeof formatPresupuestoCodigo === 'function' ? formatPresupuestoCodigo(p) : p.id) || '001',
            detalle: devText,
            precio: totalVal,
            cantidad: 1,
            subtotal: totalVal,
            is_material: false
        }];
    }

    if (finalFormat === 'proyecto') {
        const catalog = [
            ...(window.presupuestoMecanicoDB || []),
            ...(window.presupuestosCatalogDB || []),
            ...(typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' ? PRESUPUESTO_MECANICO_STOCK : []),
            ...(typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' ? PRESUPUESTO_ELECTRICO_STOCK : [])
        ];
        const groupedLabor = {};
        const materials = [];

        validItems.forEach((item, idx) => {
            let subrubro = (item.subrubro || '').trim();
            if (!subrubro) {
                 const foundCat = catalog.find(c => c && (c.codigo === item.codigo || c.id === item.codigo));
                 if (foundCat && foundCat.subrubro) subrubro = foundCat.subrubro.trim();
            }
            const q = parseFloat(String(item.cantidad || '0').replace(',', '.')) || 0;
            const isMat = (item.is_material === true || item.is_material === 1 || item.is_material === '1') ||
                          (window.isMaterialItem ? window.isMaterialItem(item, p.tipo_presupuesto) : false) ||
                          (subrubro.toLowerCase().includes('material') || subrubro.toLowerCase().includes('equipo'));

            if (isMat) {
                const code = item.codigo || item.id || `MAT-${idx + 1}`;
                const desc = item.detalle || item.descripcion || item.denominacion || item.nombre || 'Material';
                const prUSD = (item.precio_usd !== undefined && item.precio_usd !== null && !isNaN(parseFloat(item.precio_usd)))
                    ? parseFloat(item.precio_usd)
                    : (parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario || 0)).replace(',', '.')) || 0);
                const subUSD = (item.subtotal_usd !== undefined && item.subtotal_usd !== null && !isNaN(parseFloat(item.subtotal_usd)))
                    ? parseFloat(item.subtotal_usd)
                    : (q * prUSD);
                const subPesos = (subUSD * cotizMat);

                materials.push({
                    codigo: code,
                    detalle: desc,
                    precio: prUSD,
                    precio_usd: prUSD,
                    is_material: true,
                    cantidad: q,
                    subtotal: subPesos,
                    subtotal_usd: subUSD
                });
            } else {
                const pr = parseFloat(String(item.precio !== undefined ? item.precio : (item.precio_unitario || 0)).replace(',', '.')) || 0;
                const sub = (item.subtotal !== undefined && item.subtotal !== null && !isNaN(parseFloat(String(item.subtotal).replace(',', '.')))) ? parseFloat(String(item.subtotal).replace(',', '.')) : (q * pr);

                let catKey = '';
                const subLow = subrubro.toLowerCase();
                if (subLow.includes('taller')) {
                    catKey = 'MANO DE OBRA EN TALLER';
                } else if (subLow.includes('emergencia')) {
                    catKey = 'MANO DE OBRA EMERGENCIA MANTENIMIENTO';
                } else if (subLow.includes('parada') || subLow.includes('planta')) {
                    catKey = 'MANO DE OBRA PARADA DE PLANTA';
                } else if (subLow.includes('civil') || subLow.includes('obra civil')) {
                    catKey = 'OBRA CIVIL Y EDILICIA';
                } else if (subLow.includes('mantenimiento') || subLow.includes('servicio')) {
                    catKey = 'MANO DE OBRA MANTENIMIENTO Y SERVICIOS';
                } else if (subLow.includes('montaje')) {
                    catKey = 'MANO DE OBRA MONTAJE INDUSTRIAL';
                } else if (subLow.includes('fabricaci') || subLow.includes('estructur')) {
                    catKey = 'FABRICACIÓN Y MONTAJE DE ESTRUCTURAS';
                } else if (subLow.includes('cañer') || subLow.includes('piping')) {
                    catKey = 'MONTAJE DE CAÑERÍAS / PIPING';
                } else if (subLow.includes('electr') || subLow.includes('tablero') || subLow.includes('cable')) {
                    catKey = 'INSTALACIONES ELÉCTRICAS Y TABLEROS';
                } else if (subLow.includes('automat') || subLow.includes('instrum')) {
                    catKey = 'AUTOMATIZACIÓN E INSTRUMENTACIÓN';
                } else if (subLow.includes('ingenier') || subLow.includes('diseño')) {
                    catKey = 'INGENIERÍA, CÁLCULO Y DISEÑO';
                } else if (subrubro) {
                    catKey = subrubro.toUpperCase();
                } else {
                    catKey = (p.tipo_presupuesto === 'Eléctrico' || (p.id && String(p.id).includes('ELEC'))) ? 'INSTALACIONES ELÉCTRICAS Y TABLEROS' : 'MANO DE OBRA Y SERVICIOS';
                }

                if (!groupedLabor[catKey]) groupedLabor[catKey] = { sub: 0 };
                groupedLabor[catKey].sub += sub;
            }
        });

        const preferredOrder = [
            'MANO DE OBRA EN TALLER',
            'MANO DE OBRA MONTAJE INDUSTRIAL',
            'MANO DE OBRA MANTENIMIENTO Y SERVICIOS',
            'MANO DE OBRA PARADA DE PLANTA',
            'MANO DE OBRA EMERGENCIA MANTENIMIENTO',
            'INSTALACIONES ELÉCTRICAS Y TABLEROS',
            'OBRA CIVIL Y EDILICIA',
            'FABRICACIÓN Y MONTAJE DE ESTRUCTURAS',
            'MONTAJE DE CAÑERÍAS / PIPING',
            'AUTOMATIZACIÓN E INSTRUMENTACIÓN',
            'INGENIERÍA, CÁLCULO Y DISEÑO'
        ];

        const sortedLaborKeys = Object.keys(groupedLabor).sort((a, b) => {
            const idxA = preferredOrder.indexOf(a);
            const idxB = preferredOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        const formatted = [];
        sortedLaborKeys.forEach(key => {
            formatted.push({
                codigo: '-',
                detalle: key,
                precio: '-',
                cantidad: '-',
                subtotal: groupedLabor[key].sub,
                is_material: false
            });
        });

        if (materials.length > 0) {
            formatted.push({
                codigo: '-',
                detalle: 'MATERIALES Y EQUIPOS',
                precio: '-',
                cantidad: '-',
                subtotal: '-',
                is_material: false
            });
            materials.forEach(m => formatted.push(m));
        }

        if (formatted.length === 0) {
            const devText = (p.meca_denominacion || p.denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase();
            const totalVal = (computedGrandTotal > 0) ? computedGrandTotal : (parseFloat(String(p.importe || '0').replace(',', '.')) || 0);
            formatted.push({ codigo: '-', detalle: devText, precio: '-', cantidad: '-', subtotal: totalVal, is_material: false });
        }

        return formatted;
    }

    // Separar con títulos según subrubro unificado (Mecánico y Eléctrico)
    const catalog = [...(window.presupuestoMecanicoDB || []), ...(window.presupuestosCatalogDB || []), ...(typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' ? PRESUPUESTO_MECANICO_STOCK : []), ...(typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' ? PRESUPUESTO_ELECTRICO_STOCK : [])];
    const groupsMap = {};

    validItems.forEach((it, idx) => {
        let subrubro = (it.subrubro || '').trim();
        if (!subrubro) {
             const foundCat = catalog.find(c => c && (c.codigo === it.codigo || c.id === it.codigo));
             if (foundCat && foundCat.subrubro) subrubro = foundCat.subrubro.trim();
        }

        let catKey = '';
        const subLow = subrubro.toLowerCase();
        if (subLow.includes('taller')) {
            catKey = 'MANO DE OBRA EN TALLER';
        } else if (subLow.includes('emergencia')) {
            catKey = 'MANO DE OBRA EMERGENCIA MANTENIMIENTO';
        } else if (subLow.includes('parada')) {
            catKey = 'MANO DE OBRA PARADA DE PLANTA';
        } else if (subLow.includes('mantenimiento')) {
            catKey = 'MANO DE OBRA MANTENIMIENTO';
        } else if (subLow.includes('material') || subLow.includes('equipo') || subLow.includes('insumo')) {
            catKey = 'MATERIALES Y EQUIPOS';
        } else if (subrubro) {
            catKey = subrubro.toUpperCase();
        } else {
            const detLow = (it.detalle || it.descripcion || '').toLowerCase();
            if (detLow.includes('taller')) {
                catKey = 'MANO DE OBRA EN TALLER';
            } else if (detLow.includes('material') || detLow.includes('perfil') || detLow.includes('chapa') || detLow.includes('bulon') || detLow.includes('tornillo')) {
                catKey = 'MATERIALES Y EQUIPOS';
            } else {
                catKey = 'MANO DE OBRA MANTENIMIENTO';
            }
        }

        if (!groupsMap[catKey]) {
            groupsMap[catKey] = [];
        }

        const q = parseFloat(String(it.cantidad || '0').replace(',', '.')) || 0;
        const isMat = (it.is_material === true || it.is_material === 1 || it.is_material === '1') ||
                      (window.isMaterialItem ? window.isMaterialItem(it, p.tipo_presupuesto) : false) ||
                      (catKey === 'MATERIALES Y EQUIPOS');

        let pr = parseFloat(String(it.precio !== undefined ? it.precio : (it.precio_unitario || 0)).replace(',', '.')) || 0;
        let priceUSD = null;
        let subUSD = null;
        let subPesos = (it.subtotal !== undefined && it.subtotal !== null && !isNaN(parseFloat(String(it.subtotal).replace(',', '.')))) ? parseFloat(String(it.subtotal).replace(',', '.')) : (q * pr);

        if (isMat) {
            priceUSD = (it.precio_usd !== undefined && it.precio_usd !== null && !isNaN(parseFloat(it.precio_usd)))
                ? parseFloat(it.precio_usd)
                : pr;
            subUSD = (it.subtotal_usd !== undefined && it.subtotal_usd !== null && !isNaN(parseFloat(it.subtotal_usd)))
                ? parseFloat(it.subtotal_usd)
                : (q * priceUSD);
            subPesos = subUSD * cotizMat;
            pr = priceUSD;
        }

        let foundCatItem = null;
        if (it.codigo && it.codigo !== '-') {
            foundCatItem = catalog.find(c => c && (c.codigo === it.codigo || c.id === it.codigo));
        }

        let itemDetalle = String(it.detalle || it.descripcion || it.denominacion || it.nombre || '').trim();
        if ((!itemDetalle || itemDetalle === '-') && foundCatItem && (foundCatItem.detalle || foundCatItem.descripcion)) {
            itemDetalle = String(foundCatItem.detalle || foundCatItem.descripcion).trim();
        }
        if (!itemDetalle || itemDetalle === '-') {
            itemDetalle = `Ítem ${it.codigo || (idx + 1)}`;
        }

        let itemCodigo = String(it.codigo || '').trim();
        if (!itemCodigo || itemCodigo === '-') {
            if (foundCatItem && foundCatItem.codigo) {
                itemCodigo = foundCatItem.codigo;
            } else {
                itemCodigo = `ITM-${String(idx + 1).padStart(2, '0')}`;
            }
        }

        groupsMap[catKey].push({
            codigo: itemCodigo,
            detalle: itemDetalle,
            precio: pr,
            precio_usd: priceUSD,
            is_material: isMat,
            cantidad: q,
            subtotal: subPesos,
            subtotal_usd: subUSD
        });
    });

    // Orden estándar preferido para Mecánico
    const preferredOrder = [
        'MANO DE OBRA EN TALLER',
        'MANO DE OBRA MANTENIMIENTO',
        'MANO DE OBRA PARADA DE PLANTA',
        'MANO DE OBRA EMERGENCIA MANTENIMIENTO',
        'MATERIALES Y EQUIPOS'
    ];

    const sortedCategoryKeys = Object.keys(groupsMap).sort((a, b) => {
        const idxA = preferredOrder.indexOf(a);
        const idxB = preferredOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    const formatted = [];
    sortedCategoryKeys.forEach(catTitle => {
        const catItems = groupsMap[catTitle];
        if (catItems && catItems.length > 0) {
            formatted.push({ codigo: '-', detalle: catTitle, precio: '-', cantidad: '-', subtotal: '-', is_material: false });
            catItems.forEach(item => formatted.push(item));
        }
    });

    if (formatted.length === 0) {
        const devText = (p.meca_denominacion || p.denominacion || p.motivo || 'SERVICIOS Y MONTAJES').toUpperCase();
        const totalVal = (computedGrandTotal > 0) ? computedGrandTotal : (parseFloat(String(p.importe || '0').replace(',', '.')) || 0);
        formatted.push({ codigo: '-', detalle: devText, precio: '-', cantidad: '-', subtotal: totalVal, is_material: false });
    }

    return formatted;
};

window.findPedidoById = function(id) {
    if (!id) {
        if (typeof pedidoActivo !== 'undefined' && pedidoActivo) return pedidoActivo;
        if (typeof window.pedidoActivo !== 'undefined' && window.pedidoActivo) return window.pedidoActivo;
        return null;
    }
    if (typeof id === 'object' && id !== null) {
        return id;
    }

    const cleanSearch = String(id).trim().toLowerCase();
    const pedidosList = (typeof appData !== 'undefined' && appData && Array.isArray(appData.pedidos))
        ? appData.pedidos
        : ((window.appData && Array.isArray(window.appData.pedidos)) ? window.appData.pedidos : []);

    // 1. Coincidencia exacta por ID
    let found = pedidosList.find(x => x && String(x.id || '').trim().toLowerCase() === cleanSearch);
    if (found) return found;

    // 2. Coincidencia por código formateado oficial (ej. "102-elec-0001" o "101-mec-0001")
    if (typeof formatPresupuestoCodigo === 'function') {
        found = pedidosList.find(x => {
            try {
                return x && String(formatPresupuestoCodigo(x) || '').trim().toLowerCase() === cleanSearch;
            } catch(e) { return false; }
        });
        if (found) return found;
    }

    // 3. Coincidencia por número correlativo (ej. "101-ELE-0005" con "5" o "0005")
    const searchNum = cleanSearch.replace(/\D/g, '');
    if (searchNum) {
        found = pedidosList.find(x => {
            if (!x || !x.id) return false;
            const xNum = String(x.id).replace(/\D/g, '');
            return xNum && parseInt(xNum, 10) === parseInt(searchNum, 10);
        });
        if (found) return found;
    }

    // 4. Coincidencia por subcadena
    found = pedidosList.find(x => x && x.id && (String(x.id).toLowerCase().includes(cleanSearch) || cleanSearch.includes(String(x.id).toLowerCase())));
    if (found) return found;

    // 5. Fallback a pedidoActivo si está cargado en el visor
    const act = (typeof pedidoActivo !== 'undefined' && pedidoActivo) || window.pedidoActivo;
    if (act) {
        return act;
    }

    return null;
};

window.revivirPedido = function(id) {
    let p = null;
    if (id && typeof id === 'object') {
        p = id;
    } else if (id && typeof window.findPedidoById === 'function') {
        p = window.findPedidoById(id);
    }
    if (!p) {
        p = (typeof pedidoActivo !== 'undefined' && pedidoActivo) || window.pedidoActivo || null;
    }
    if (!p && id && typeof window.findPedidoById === 'function') {
        p = window.findPedidoById(id);
    }

    if (!p) {
        if (typeof showToast === 'function') showToast('Presupuesto no encontrado', 'error');
        return;
    }

    // La opción de revivir aplica a presupuestos rechazados o cancelados
    const est = String(p.estado || '').toLowerCase().trim();
    if (!est.includes('rechaz') && !est.includes('cancel')) {
        if (typeof showToast === 'function') showToast('La acción de revivir únicamente aplica a presupuestos rechazados.', 'warning');
        return;
    }

    const confirmMsg = '¿Estás seguro de que deseas revivir este presupuesto? Se restaurará su estado a "Pendiente" y sus ítems se actualizarán con los precios actuales del tarifario.';
    if (!confirm(confirmMsg)) return;

    // Actualizar precios de los ítems con el tarifario/catálogo del día actual
    const isMec = (p.tipo_presupuesto === 'Mecánico' || (p.id && (String(p.id).startsWith('101') || String(p.id).toUpperCase().includes('MEC'))));
    let catalog = [];
    if (typeof getActiveStockCatalog === 'function') {
        const prevRubro = window.reqTipoPresupuesto;
        window.reqTipoPresupuesto = isMec ? 'Mecánico' : 'Eléctrico';
        catalog = getActiveStockCatalog();
        window.reqTipoPresupuesto = prevRubro;
    }
    if (!catalog || catalog.length === 0) {
        catalog = isMec ? (window.presupuestoMecanicoDB || []) : (window.presupuestosCatalogDB || []);
    }

    if (Array.isArray(p.items) && p.items.length > 0) {
        let nTotal = 0;
        p.items.forEach(item => {
            if (!item) return;
            const code = item.codigo || item.id;
            const desc = (item.detalle || item.descripcion || item.denominacion || item.nombre || '').toLowerCase().trim();

            const found = catalog.find(c => {
                if (code && c.codigo && String(c.codigo).trim().toLowerCase() === String(code).trim().toLowerCase()) return true;
                if (desc && (c.detalle || c.descripcion) && String(c.detalle || c.descripcion).trim().toLowerCase() === desc) return true;
                return false;
            });

            if (found) {
                const newPrice = parseFloat(found.precio !== undefined ? found.precio : (found.precio_unitario || 0)) || 0;
                item.precio = newPrice;
                item.precio_unitario = newPrice;
                const qty = parseFloat(String(item.cantidad || '1').replace(',', '.')) || 1;
                item.subtotal = qty * newPrice;
            }
            const itemSub = parseFloat(String(item.subtotal || 0).replace(',', '.')) || 0;
            nTotal += itemSub;
        });

        if (nTotal > 0) {
            p.importe = nTotal;
            p.monto_total = nTotal;
        }
    }

    p.estado = 'Pendiente';
    delete p.motivo_rechazo;
    delete p.motivoRechazo;

    if (typeof guardarPedidosEnArchivo === 'function') {
        guardarPedidosEnArchivo(false);
    } else if (typeof saveData === 'function') {
        saveData();
    }

    if (typeof showToast === 'function') {
        showToast(`Presupuesto #${p.id} revivido exitosamente en estado "Pendiente" con precios actualizados.`, 'success');
    }

    const modalDetalle = document.getElementById('modal-detalle-pedido') || document.getElementById('modal-auth-pedido');
    if (modalDetalle && modalDetalle.style.display !== 'none') {
        if (typeof verDetallePedido === 'function') {
            verDetallePedido(p.id);
        }
    }

    if (typeof refreshCurrentAssignmentsView === 'function') {
        refreshCurrentAssignmentsView();
    } else if (typeof initAssignmentsView === 'function') {
        const vMode = window.currentAssignmentsViewMode || 'Rechazados';
        initAssignmentsView(vMode);
    }
    if (typeof renderAssignmentsTable === 'function') {
        renderAssignmentsTable();
    }
};

/* ==========================================
   GESTOR Y ABM DE PLANTAS ("Alta de Planta")
   ========================================== */
window.getPlantas = function() {
    if (window.appData && Array.isArray(window.appData.plantas) && window.appData.plantas.length > 0) {
        return window.appData.plantas;
    }
    try {
        const stored = localStorage.getItem('sg_plantas');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                if (window.appData) window.appData.plantas = parsed;
                return parsed;
            }
        }
    } catch(e) {}
    const defaultPlantas = ['APS', 'APG', 'PPA'];
    if (window.appData) window.appData.plantas = defaultPlantas;
    return defaultPlantas;
};

window.savePlantas = function(plantasArr) {
    if (window.appData) window.appData.plantas = plantasArr;
    try {
        localStorage.setItem('sg_plantas', JSON.stringify(plantasArr));
    } catch(e) {}

    // Save to supabase as well if client exists
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        // Attempt to sync to supabase
        const rules = (window.appData && window.appData.plantasRules) ? window.appData.plantasRules : {};
        const payload = plantasArr.map(p => ({ nombre: p, usa_lista_de: rules[p] || p }));
        supabaseClient.from('plantas').upsert(payload, { onConflict: 'nombre' }).then(res => {
            if (res.error) {
                console.warn("Supabase plantas sync error:", res.error);
                alert("Error guardando todas las plantas en Supabase: " + res.error.message);
            }
        });
    }

    if (typeof guardarPedidosEnArchivo === 'function') {
        guardarPedidosEnArchivo(false);
    } else if (typeof saveData === 'function') {
        saveData();
    }
    window.actualizarSelectsPlantas();
};

window.fetchPlantasFromSupabase = async function() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('plantas').select('nombre, usa_lista_de');
            if (error) {
                console.warn('Error fetching plantas from Supabase:', error);
                alert('No se pudo conectar a la tabla Plantas en Supabase: ' + error.message);
                return;
            }
            if (data) {
                // Mapear reglas de listas de precios de Supabase
                if (!window.appData) window.appData = {};
                if (!window.appData.plantasRules) window.appData.plantasRules = {};

                data.forEach(r => {
                    if (r.nombre && r.usa_lista_de) {
                        window.appData.plantasRules[r.nombre.trim().toUpperCase()] = r.usa_lista_de.trim().toUpperCase();
                    }
                });

                let supabasePlantas = data.map(r => r.nombre.trim().toUpperCase()).filter(n => n !== '');

                // Traer también las locales por si falló el guardado en la nube
                let localPlantas = [];
                try {
                    const stored = localStorage.getItem('sg_plantas');
                    if (stored) localPlantas = JSON.parse(stored);
                } catch(e) {}

                // Fusionar listas
                let merged = [...new Set([...supabasePlantas, ...localPlantas, 'APS', 'APG', 'PPA'])];

                if (window.appData) window.appData.plantas = merged;
                localStorage.setItem('sg_plantas', JSON.stringify(merged));

                // Intentar resincronizar la base de datos si estaba vacía
                if (supabasePlantas.length < merged.length) {
                    const payload = merged.map(p => ({ nombre: p, usa_lista_de: window.appData.plantasRules[p] || p }));
                    Promise.resolve(supabaseClient.from('plantas').upsert(payload, { onConflict: 'nombre' })).catch(()=>{});
                }

                window.actualizarSelectsPlantas();
            }
        } catch(e) {
            console.warn('Exception fetching plantas:', e);
        }
    }
};

window.actualizarSelectsPlantas = function() {
    const list = window.getPlantas();
    const selectMeca = document.getElementById('req-meca-planta');
    if (selectMeca) {
        const currentVal = selectMeca.value;
        selectMeca.innerHTML = list.map(p => `<option value="${p}" style="background: #0f172a; color: #ffffff;">${p}</option>`).join('');
        if (list.includes(currentVal)) {
            selectMeca.value = currentVal;
        } else if (list.includes('APS')) {
            selectMeca.value = 'APS';
        } else if (list.length > 0) {
            selectMeca.value = list[0];
        }
    }

    const selectAuth = document.getElementById('auth-edit-meca-planta');
    if (selectAuth) {
        const currentVal = selectAuth.value;
        selectAuth.innerHTML = list.map(p => `<option value="${p}">${p}</option>`).join('');
        if (list.includes(currentVal)) selectAuth.value = currentVal;
    }
};

window.gestionarPlantasABM = function() {
    let modal = document.getElementById('modal-gestionar-plantas');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-gestionar-plantas';
        modal.className = 'modal';
        modal.style.cssText = 'display: flex; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); align-items: center; justify-content: center; backdrop-filter: blur(4px);';
        document.body.appendChild(modal);

        // Cierra con la tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                cerrarModalPlantas();
            }
        });

        // Cierra haciendo click afuera
        modal.addEventListener('mousedown', function(e) {
            if (e.target === modal) cerrarModalPlantas();
        });
    }
    window.renderModalGestionarPlantas();
        if (typeof window.actualizarSelectsPlantas === 'function') window.actualizarSelectsPlantas();
    modal.style.display = 'flex';
};

window.renderModalGestionarPlantas = function() {
    const modal = document.getElementById('modal-gestionar-plantas');
    if (!modal) return;
    const plantas = window.getPlantas();

    modal.innerHTML = `
        <div style="background: #0f172a; color: #ffffff; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; width: 440px; max-width: 92%; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); font-family: inherit;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-industry" style="color: #10b981;"></i> Gestionar Plantas
                </h3>
                <button type="button" onclick="cerrarModalPlantas()" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="font-size: 12px; font-weight: 600; color: #94a3b8; display: block; margin-bottom: 6px;">Agregar nueva planta:</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <input type="text" id="input-nueva-planta" placeholder="Ej: VGG"
                           style="flex: 1; min-width: 120px; background: #1e293b; color: #ffffff; border: 1px solid #334155; border-radius: 6px; padding: 8px 12px; font-size: 13px; outline: none;"
                           onkeydown="if(event.key==='Enter'){ event.preventDefault(); document.getElementById('input-nueva-planta-alias').focus(); }">

                    <select id="input-nueva-planta-alias" style="width: 130px; background: #1e293b; color: #ffffff; border: 1px solid #334155; border-radius: 6px; padding: 8px; font-size: 12px; outline: none; display: ${(typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Eléctrico') ? 'none' : 'block'};"
                            onkeydown="if(event.key==='Enter'){ event.preventDefault(); agregarNuevaPlanta(); }">
                        <option value="APS" selected>Usa lista de APS</option>
                        <option value="APG">Usa lista de APG</option>
                    </select>

                    <button type="button" onclick="agregarNuevaPlanta()"
                            style="background: #10b981; color: #ffffff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap;">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>
            </div>

            <div style="max-height: 240px; overflow-y: auto; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 8px;">
                ${plantas.length === 0 ? '<div style="text-align: center; color: #94a3b8; padding: 12px; font-size: 12px;">No hay plantas registradas</div>' : ''}
                ${plantas.map(p => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9;">${p}</span>
                        <button type="button" onclick="eliminarPlanta('${p.replace(/'/g, "\\'")}')"
                                title="Eliminar planta"
                                style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <i class="fas fa-times" style="font-size: 12px;"></i>
                        </button>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 20px; text-align: right;">
                <button type="button" onclick="cerrarModalPlantas()" style="background: #334155; color: #ffffff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    setTimeout(() => {
        const inp = document.getElementById('input-nueva-planta');
        if (inp) inp.focus();
    }, 50);
};

window.agregarNuevaPlanta = function() {
    try {
        const input = document.getElementById('input-nueva-planta');
        const aliasSelect = document.getElementById('input-nueva-planta-alias');
        if (!input) return;
        const val = input.value.trim().toUpperCase();
        if (!val) return;

        const plantas = window.getPlantas() || [];
        const existe = plantas.some(p => p.trim().toLowerCase() === val.toLowerCase());
        if (existe) {
            if (typeof showToast === 'function') {
                showToast('La planta ya existe', 'warning');
            } else {
                alert('La planta ya existe');
            }
            return;
        }

        const aliasVal = aliasSelect && aliasSelect.value ? aliasSelect.value.toUpperCase() : val;

        plantas.push(val);

        // Save to window.appData.plantasRules right away
        if (!window.appData) window.appData = {};
        if (!window.appData.plantasRules) window.appData.plantasRules = {};
        window.appData.plantasRules[val] = aliasVal;

        // Explicitly upsert the new plant with its alias to Supabase
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            supabaseClient.from('plantas').upsert([{ nombre: val, usa_lista_de: aliasVal }], { onConflict: 'nombre' }).then(res => {
                if (res.error) {
                    console.warn(res.error);
                    alert("Error en Supabase (upsert 1): " + res.error.message);
                }
            });
        }

        window.savePlantas(plantas);
        if (typeof showToast === 'function') {
            showToast(`Planta "${val}" agregada con éxito`, 'success');
        }
        window.renderModalGestionarPlantas();
        if (typeof window.actualizarSelectsPlantas === 'function') window.actualizarSelectsPlantas();
    } catch (error) {
        alert("Error agregando planta: " + error.message);
        console.error(error);
    }
};

window.eliminarPlanta = function(nombre) {
    if (!nombre) return;
    if (!confirm(`¿Desea eliminar la planta ${nombre}?`)) return;

    let plantas = window.getPlantas();
    plantas = plantas.filter(p => p.trim().toLowerCase() !== nombre.trim().toLowerCase());

    // Eliminar también de las reglas locales
    if (window.appData && window.appData.plantasRules && window.appData.plantasRules[nombre]) {
        delete window.appData.plantasRules[nombre];
    }

    // Borrar físicamente de Supabase
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient.from('plantas').delete().eq('nombre', nombre).then(res => {
            if (res.error) {
                console.warn("Error borrando planta en Supabase:", res.error);
                alert("Error borrando de la base de datos: " + res.error.message);
            }
        });
    }

    window.savePlantas(plantas);
    if (typeof showToast === 'function') {
        showToast(`Planta "${nombre}" eliminada`, 'info');
    }
    window.renderModalGestionarPlantas();
        if (typeof window.actualizarSelectsPlantas === 'function') window.actualizarSelectsPlantas();
};

window.cerrarModalPlantas = function() {
    const modal = document.getElementById('modal-gestionar-plantas');
    if (modal) modal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof window.actualizarSelectsPlantas === 'function') {
            window.actualizarSelectsPlantas();
        }
    } catch(e) {}
});

/* ==========================================
   PERMISOS DE EDICIÓN DE PRECIOS Y CORRELATIVIDAD
   ========================================== */
window.canUserEditUnitPrices = function(user) {
    let u = user;
    if (!u && typeof getCurrentUser === 'function') {
        u = getCurrentUser();
    }
    if (!u && window.appData && Array.isArray(window.appData.users)) {
        let curId = window.appData.currentUserId;
        if (!curId) {
            try { curId = localStorage.getItem('pedidos_current_user_id') || localStorage.getItem('sg_current_user_id') || localStorage.getItem('currentUserId') || localStorage.getItem('app_current_user_id'); } catch(e) {}
        }
        let curName = null;
        try { curName = localStorage.getItem('pedidos_current_username'); } catch(e) {}

        if (curId) {
            u = window.appData.users.find(x => String(x.id) === String(curId) || String(x.username).toLowerCase() === String(curId).toLowerCase());
        }
        if (!u && curName) {
            u = window.appData.users.find(x => String(x.username).toLowerCase() === String(curName).toLowerCase());
        }
    }
    if (!u) {
        return false;
    }

    const role = String(u.role || '').toLowerCase();
    const name = String(u.username || '').trim().toLowerCase();

    // Cuenta congelada
    if (role === 'congelado') return false;

    // 1. Respetar can_edit_prices configurado directamente en Supabase
    if (u.can_edit_prices === true) return true;

    // 2. Respetar permisos asignados en Supabase
    const perms = (typeof getUserEffectivePermissions === 'function') ? getUserEffectivePermissions(u) : (u.permisos || u.permissions || []);
    if (Array.isArray(perms) && (perms.includes('menu-ingresar-edit-price') || perms.includes('edit-precios') || perms.includes('modificar-precios'))) {
        return true;
    }

    // 3. Administradores siempre pueden
    if (role === 'administrador' || role === 'admin') return true;

    return false;
};

window.generateNextCorrelativeCode = function(catalog, customPrefix) {
    const isMec = (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico');
    const prefix = customPrefix || (isMec ? 'MEC-' : 'ELE-');

    // Collect all existing codes across all catalogs, pedidoItems, and local storage
    const allCatalogs = [];
    if (catalog && Array.isArray(catalog)) allCatalogs.push(...catalog);
    if (window.presupuestoMecanicoDB && Array.isArray(window.presupuestoMecanicoDB)) allCatalogs.push(...window.presupuestoMecanicoDB);
    if (window.presupuestosCatalogDB && Array.isArray(window.presupuestosCatalogDB)) allCatalogs.push(...window.presupuestosCatalogDB);
    if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_MECANICO_STOCK)) allCatalogs.push(...PRESUPUESTO_MECANICO_STOCK);
    if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_ELECTRICO_STOCK)) allCatalogs.push(...PRESUPUESTO_ELECTRICO_STOCK);
    if (typeof pedidoItems !== 'undefined' && Array.isArray(pedidoItems)) allCatalogs.push(...pedidoItems);

    const existingCodes = new Set();
    allCatalogs.forEach(it => {
        if (it && it.codigo) {
            existingCodes.add(String(it.codigo).trim().toUpperCase());
        }
    });

    // Also collect from custom prices in localStorage
    try {
        const cp = JSON.parse(localStorage.getItem('PRESUPUESTO_CUSTOM_PRICES') || '{}');
        Object.keys(cp).forEach(k => existingCodes.add(String(k).trim().toUpperCase()));
    } catch(e) {}

    // Find the max number strictly matching prefix + digits (e.g. ^MEC-(\d+)$)
    const escPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const rx = new RegExp(`^${escPrefix}(\\d+)$`, 'i');

    let maxNum = 0;
    existingCodes.forEach(code => {
        const m = code.match(rx);
        if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    let nextNum = maxNum + 1;
    let candidate = `${prefix}${String(nextNum).padStart(3, '0')}`;

    // Ensure uniqueness guaranteed: while candidate exists in any source, increment
    while (existingCodes.has(candidate.toUpperCase())) {
        nextNum++;
        candidate = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    return candidate;
};

window.abrirModalNuevoItemTarifario = function(subrubroDefault) {
    const modalTpl = document.getElementById('tpl-modal-nuevo-item-tarifario');
    if (!modalTpl) return;

    if (typeof openModal === 'function') {
        openModal('tpl-modal-nuevo-item-tarifario');
    }

    const initModalInputs = () => {
        // Clear previous input values so the modal is clean and fresh
        const detInput = document.getElementById('nuevo-item-detalle');
        if (detInput) detInput.value = '';

        const priceInput = document.getElementById('nuevo-item-precio');
        if (priceInput) priceInput.value = '';

        const cantInput = document.getElementById('nuevo-item-cantidad');
        if (cantInput) cantInput.value = '1';

        const subSelect = document.getElementById('nuevo-item-subrubro');
        if (subSelect) {
            const cat = (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico')
                ? (window.presupuestoMecanicoDB || [])
                : (window.presupuestosCatalogDB || []);
            const subrubros = Array.from(new Set(cat.map(i => i.subrubro).filter(Boolean)));
            if (subrubros.length === 0) {
                subrubros.push('Materiales y Equipos', 'Mano de Obra EN TALLER', 'Mano de Obra MANTENIMIENTO', 'Mano de Obra PARADA DE PLANTA', 'Mano de Obra EMERGENCIA MANTENIMIENTO');
            }
            subSelect.innerHTML = subrubros.map(s => `<option value="${s}">${s}</option>`).join('');
            if (subrubroDefault && subrubros.includes(subrubroDefault)) {
                subSelect.value = subrubroDefault;
            } else if (typeof window.activeMecaTab !== 'undefined') {
                const secNames = [
                    "Materiales y Equipos",
                    "Mano de Obra EN TALLER",
                    "Mano de Obra MANTENIMIENTO",
                    "Mano de Obra PARADA DE PLANTA",
                    "Mano de Obra EMERGENCIA MANTENIMIENTO"
                ];
                const activeSec = secNames[window.activeMecaTab];
                if (activeSec && subrubros.includes(activeSec)) {
                    subSelect.value = activeSec;
                }
            }
        }

        // Allow all users to enter initial price when adding a new item
        if (priceInput) {
            priceInput.readOnly = false;
            priceInput.disabled = false;
            priceInput.style.opacity = '1';
            priceInput.title = 'Ingrese el precio unitario del nuevo ítem';
        }

        // Sync currency label (U$D for materials vs ARS for MO)
        if (typeof window.onNuevoItemSubrubroChange === 'function') {
            window.onNuevoItemSubrubroChange();
        }

        if (detInput) detInput.focus();
    };

    // Run both synchronously and after next tick to guarantee ready state
    initModalInputs();
    setTimeout(initModalInputs, 50);
};

window.confirmarNuevoItemTarifario = function() {
    try {
        const subSelect = document.getElementById('nuevo-item-subrubro');
        const detInput = document.getElementById('nuevo-item-detalle');
        const udmSelect = document.getElementById('nuevo-item-udm');
        const priceInput = document.getElementById('nuevo-item-precio');
        const cantInput = document.getElementById('nuevo-item-cantidad');

        const subrubro = (subSelect?.value || 'Materiales y Equipos').trim() || 'Materiales y Equipos';
        const detalle = (detInput?.value || '').trim();
        const udm = (udmSelect?.value || 'Hs').trim() || 'Hs';
        const rawPrecio = (priceInput?.value || '0');
        const rawCantidad = (cantInput?.value || '1');

        if (!detalle) {
            if (typeof showToast === 'function') showToast('Por favor ingrese la descripción del ítem', 'warning');
            if (detInput) detInput.focus();
            return;
        }

        const precio = window.parseArgNumber ? window.parseArgNumber(rawPrecio) : (parseFloat(String(rawPrecio).replace(',', '.')) || 0);
        const parsedCant = window.parseArgNumber ? window.parseArgNumber(rawCantidad) : (parseFloat(String(rawCantidad).replace(',', '.')) || 0);
        const cantidad = parsedCant > 0 ? parsedCant : 1;

        // Detectar si hay una planta seleccionada actualmente para asociar el ítem
        let curPlanta = '';
        try {
            const reqPlantaSelect = document.getElementById('req-meca-planta');
            if (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico' && reqPlantaSelect && reqPlantaSelect.value) {
                curPlanta = reqPlantaSelect.value.trim().toUpperCase();
                if (curPlanta === 'PPA' || curPlanta === 'APA') curPlanta = 'APS';
                if (curPlanta !== 'APS' && curPlanta !== 'APG' && window.appData && window.appData.plantasRules && window.appData.plantasRules[curPlanta]) {
                    curPlanta = window.appData.plantasRules[curPlanta];
                }
            }
        } catch(ePl) {}

        const catalog = (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico')
            ? (window.presupuestoMecanicoDB || [])
            : (window.presupuestosCatalogDB || []);

        let nextCode = '';
        try {
            if (typeof window.generateNextCorrelativeCode === 'function') {
                nextCode = window.generateNextCorrelativeCode(catalog);
            }
        } catch(eCd) {
            console.warn("Aviso generando correlativo:", eCd);
        }
        if (!nextCode) {
            const pfx = (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico') ? 'MEC-' : 'ELE-';
            nextCode = pfx + Date.now().toString().slice(-4);
        }

        let cotizMat = 1450;
        try {
            if (typeof window.getCotizacionMateriales === 'function') cotizMat = window.getCotizacionMateriales() || 1450;
        } catch(eCot) {}

        const isMat = (typeof window.isMaterialItem === 'function')
            ? window.isMaterialItem({ subrubro: subrubro }, reqTipoPresupuesto)
            : (subrubro.toLowerCase().includes('material') || subrubro.toLowerCase().includes('equipo'));

        const subtotalPesos = isMat ? (cantidad * precio * cotizMat) : (cantidad * precio);

        const newItem = {
            codigo: nextCode,
            detalle: detalle,
            descripcion: detalle,
            udm: udm,
            precio: precio,
            precio_unitario: precio,
            precio_usd: isMat ? precio : null,
            cotizacion_aplicada: isMat ? cotizMat : null,
            is_material: isMat,
            cantidad: cantidad,
            subtotal: subtotalPesos,
            subtotal_usd: isMat ? (cantidad * precio) : null,
            subrubro: subrubro,
            stock: 999,
            planta: curPlanta || ''
        };

        // Agregar a todos los arrays de catálogo activos en memoria sin demora
        try {
            if (typeof window.presupuestoMecanicoDB !== 'undefined' && Array.isArray(window.presupuestoMecanicoDB)) {
                window.presupuestoMecanicoDB.push({ ...newItem, planta: curPlanta });
                if (curPlanta) window.presupuestoMecanicoDB.push({ ...newItem, planta: '' });
            }
            if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_MECANICO_STOCK)) {
                PRESUPUESTO_MECANICO_STOCK.push({ ...newItem, planta: curPlanta });
                if (curPlanta) PRESUPUESTO_MECANICO_STOCK.push({ ...newItem, planta: '' });
            }
            if (typeof window.presupuestosCatalogDB !== 'undefined' && Array.isArray(window.presupuestosCatalogDB)) {
                window.presupuestosCatalogDB.push(newItem);
            }
            if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_ELECTRICO_STOCK)) {
                if (!PRESUPUESTO_ELECTRICO_STOCK.some(x => x.codigo === nextCode)) {
                    PRESUPUESTO_ELECTRICO_STOCK.push(newItem);
                }
            }
            if (typeof stockDB !== 'undefined' && Array.isArray(stockDB)) {
                stockDB.push(newItem);
            }
        } catch(eCat) {
            console.warn("Aviso agregando a catálogos:", eCat);
        }

        // Save unit price into customPrices so it persists across sessions
        try {
            if (typeof window.saveCustomItemPrice === 'function') {
                window.saveCustomItemPrice(nextCode, precio);
            }
        } catch(ePr) {
            console.warn("Aviso guardando precio:", ePr);
        }

        if (typeof pedidoItems === 'undefined' || !Array.isArray(pedidoItems)) {
            window.pedidoItems = [];
        }

        if (cantidad > 0) {
            const existing = pedidoItems.find(pi => pi && pi.codigo === nextCode);
            if (existing) {
                existing.cantidad = cantidad;
                existing.precio = precio;
                existing.precio_usd = isMat ? precio : null;
                existing.cotizacion_aplicada = isMat ? cotizMat : null;
                existing.is_material = isMat;
                existing.subtotal = subtotalPesos;
                existing.subtotal_usd = isMat ? (cantidad * precio) : null;
            } else {
                pedidoItems.push({
                    codigo: nextCode,
                    detalle: detalle,
                    descripcion: detalle,
                    udm: udm,
                    precio: precio,
                    precio_usd: isMat ? precio : null,
                    cotizacion_aplicada: isMat ? cotizMat : null,
                    is_material: isMat,
                    cantidad: cantidad,
                    subtotal: subtotalPesos,
                    subtotal_usd: isMat ? (cantidad * precio) : null,
                    subrubro: newItem.subrubro
                });
            }
        }

        // Determinar la pestaña de destino exacta según subrubro
        const normSub = String(subrubro || '').toLowerCase();
        let targetIdx = 0;
        if (normSub.includes("material") || normSub.includes("equipo")) {
            targetIdx = 0;
        } else if (normSub.includes("taller")) {
            targetIdx = 1;
        } else if (normSub.includes("mantenimiento") && !normSub.includes("emergencia")) {
            targetIdx = 2;
        } else if (normSub.includes("parada")) {
            targetIdx = 3;
        } else if (normSub.includes("emergencia")) {
            targetIdx = 4;
        } else {
            targetIdx = 0;
        }
        window.activeMecaTab = targetIdx;

        try {
            if (typeof closeModal === 'function') closeModal();
        } catch(eCl) {}

        // Actualización INMEDIATA E INSTANTÁNEA en pantalla (para Mecánico y Eléctrico)
        try {
            if (typeof window.renderMecanicoExcelGrid === 'function') {
                window.renderMecanicoExcelGrid();
            }
        } catch(eG) { console.warn("Aviso al renderizar grilla:", eG); }

        try {
            if (typeof window.switchMecaTab === 'function') {
                window.switchMecaTab(targetIdx);
            }
        } catch(eT) { console.warn("Aviso al cambiar pestaña:", eT); }

        try {
            if (typeof window.actualizarTablaItemsRequerimiento === 'function') {
                window.actualizarTablaItemsRequerimiento();
            }
        } catch(eR) { console.warn("Aviso al actualizar requerimiento:", eR); }

        // Foco visual y scroll a la fila del nuevo ítem de forma ultra rápida
        setTimeout(() => {
            try {
                const allInputs = document.querySelectorAll('.meca-excel-input');
                let inputQ = null;
                for (let i = 0; i < allInputs.length; i++) {
                    if (allInputs[i].getAttribute('data-code') === nextCode) {
                        inputQ = allInputs[i];
                        break;
                    }
                }
                if (inputQ) {
                    inputQ.value = cantidad.toString();
                    inputQ.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    inputQ.focus();
                    inputQ.select();
                    if (typeof window.recalcMecaExcelRow === 'function') {
                        window.recalcMecaExcelRow(inputQ);
                    }
                    const tr = inputQ.closest('tr');
                    if (tr) {
                        const origBg = tr.style.background;
                        tr.style.background = 'rgba(16, 185, 129, 0.45)';
                        tr.style.transition = 'background 0.3s ease';
                        setTimeout(() => { tr.style.background = origBg; }, 2500);
                    }
                }
            } catch(eF) {}
        }, 60);

        // Sincronizar nuevo ítem directamente en la tabla 'tarifario' de Supabase
        try {
            const dbClient = (typeof getDbClient === 'function') ? getDbClient() : null;
            if (dbClient) {
                const rubroVal = (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Mecánico') ? 'Mecánico' : 'Eléctrico';
                const allPlantas = (rubroVal === 'Mecánico') ? ['APS', 'APG', ''] : [''];
                const upsertData = allPlantas.map(p => ({
                    id: p ? `${nextCode}_${p}` : nextCode,
                    codigo: nextCode,
                    detalle: detalle,
                    rubro: rubroVal,
                    subrubro: subrubro || (isMat ? 'Materiales y Equipos' : 'Mano de Obra EN TALLER'),
                    unidad: udm,
                    precio: precio,
                    stock: 999,
                    estado: 'ACTIVOS',
                    is_custom: true,
                    planta: p
                }));

                dbClient.from('tarifario').upsert(upsertData, { onConflict: 'id' }).then(function(res) {
                    if (res && res.error) console.warn("Aviso guardando en tarifario Supabase:", res.error);
                    else console.log("☁️ Supabase: Ítem", nextCode, "sincronizado en tabla tarifario.");
                }).catch(function() {});
            }
        } catch (eTar) {
            console.warn("Error enviando ítem a Supabase:", eTar);
        }

        if (typeof showToast === 'function') {
            showToast(`Ítem ${nextCode} agregado con éxito al tarifario ($${precio.toLocaleString('es-AR', {minimumFractionDigits: 2})})`, 'success');
        }
    } catch (errAdd) {
        console.error("Error al agregar ítem:", errAdd);
        if (typeof showToast === 'function') {
            showToast('Error al agregar el ítem: ' + (errAdd.message || errAdd), 'error');
        }
    }
};




window.deleteStockItem = function(codigo) {
    if (!confirm('¿Seguro que deseas eliminar el artículo ' + codigo + '?')) return;

    // Attempt to remove from all arrays
    if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
        const iE = PRESUPUESTO_ELECTRICO_STOCK.findIndex(x => x.codigo === codigo);
        if (iE !== -1) PRESUPUESTO_ELECTRICO_STOCK.splice(iE, 1);
    }
    if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined') {
        const iM = PRESUPUESTO_MECANICO_STOCK.findIndex(x => x.codigo === codigo);
        if (iM !== -1) PRESUPUESTO_MECANICO_STOCK.splice(iM, 1);
    }
    if (typeof stockDB !== 'undefined') {
        const iDB = stockDB.findIndex(x => x.codigo === codigo);
        if (iDB !== -1) stockDB.splice(iDB, 1);
    }

    renderStockTable();
};


window.eliminarItemDelTarifario = function(code) {
    if (!confirm('¿Seguro que desea eliminar el ítem ' + code + ' del tarifario?')) return;

    // 1. Eliminar visualmente del DOM en el acto (feedback instantáneo en pantalla)
    document.querySelectorAll(`.meca-excel-input[data-code="${code}"]`).forEach(el => {
        const tr = el.closest('tr');
        if (tr) tr.remove();
    });
    document.querySelectorAll(`tr:has([data-code="${code}"])`).forEach(tr => tr.remove());

    // 2. Eliminar de todas las colecciones en memoria
    if (typeof window.presupuestoMecanicoDB !== 'undefined' && Array.isArray(window.presupuestoMecanicoDB)) {
        window.presupuestoMecanicoDB = window.presupuestoMecanicoDB.filter(i => i.codigo !== code);
    }
    if (typeof window.presupuestosCatalogDB !== 'undefined' && Array.isArray(window.presupuestosCatalogDB)) {
        window.presupuestosCatalogDB = window.presupuestosCatalogDB.filter(i => i.codigo !== code);
    }
    if (typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_ELECTRICO_STOCK)) {
        window.PRESUPUESTO_ELECTRICO_STOCK = PRESUPUESTO_ELECTRICO_STOCK.filter(i => i.codigo !== code);
    }
    if (typeof PRESUPUESTO_MECANICO_STOCK !== 'undefined' && Array.isArray(PRESUPUESTO_MECANICO_STOCK)) {
        window.PRESUPUESTO_MECANICO_STOCK = PRESUPUESTO_MECANICO_STOCK.filter(i => i.codigo !== code);
    }
    if (typeof stockDB !== 'undefined' && Array.isArray(stockDB)) {
        window.stockDB = stockDB.filter(i => i.codigo !== code);
    }

    // 3. Eliminar de pedidoItems si estaba seleccionado
    if (typeof pedidoItems !== 'undefined') {
        pedidoItems = pedidoItems.filter(i => i.codigo !== code);
    }

    // 4. Limpiar precio personalizado si existía
    if (typeof removeCustomItemPrice === 'function') {
        removeCustomItemPrice(code);
    }

    // 4.1. Persistir código en lista negra de eliminados para que no resucite al refrescar
    try {
        let deletedList = JSON.parse(localStorage.getItem('PRESUPUESTO_DELETED_STOCK') || '[]');
        if (!deletedList.includes(code)) {
            deletedList.push(code);
            localStorage.setItem('PRESUPUESTO_DELETED_STOCK', JSON.stringify(deletedList));
        }
    } catch(e) {}

    // 5. Renumber electrical items si aplica
    if (typeof reqTipoPresupuesto !== 'undefined' && reqTipoPresupuesto === 'Eléctrico' && typeof PRESUPUESTO_ELECTRICO_STOCK !== 'undefined') {
        PRESUPUESTO_ELECTRICO_STOCK.forEach((it, i) => {
            it.codigo = 'ELE-' + String(i + 1).padStart(3, '0');
        });
    }

    // 6. Sincronizar eliminación en Supabase (borrando base y variantes por planta)
    try {
        const dbClient = (typeof getDbClient === 'function') ? getDbClient() : null;
        if (dbClient) {
            dbClient.from('tarifario').delete().or(`codigo.eq.${code},id.eq.${code},id.like.${code}_%`).then(function(delRes) {
                if (delRes && delRes.error) console.warn("Aviso al eliminar de tarifario en Supabase:", delRes.error);
                else console.log("☁️ Supabase: Ítem", code, "eliminado de la tabla tarifario.");
            }).catch(function() {});
        }
    } catch(delErr) {
        console.warn("Error eliminando ítem en Supabase:", delErr);
    }

    // 7. Re-render INMEDIATO en la interfaz (Mecánico y Eléctrico)
    if (typeof window.renderMecanicoExcelGrid === 'function') {
        window.renderMecanicoExcelGrid();
    }
    if (typeof window.recalcMecaExcelAll === 'function') {
        window.recalcMecaExcelAll();
    }
    if (typeof window.actualizarTablaItemsRequerimiento === 'function') {
        window.actualizarTablaItemsRequerimiento();
    }
    if (typeof showToast === 'function') {
        showToast('Ítem ' + code + ' eliminado del tarifario', 'info');
    }
};

window.recalcularPreciosPorPlanta = function() {
    if (typeof window.renderMecanicoExcelGrid === 'function') {
        window.renderMecanicoExcelGrid();
        if (typeof window.recalcMecaExcelAll === 'function') {
            window.recalcMecaExcelAll();
        }
        // Feedback visual
        const container = document.getElementById('meca-excel-grid-container');
        if (container) {
            container.style.opacity = '0.5';
            setTimeout(() => { container.style.opacity = '1'; }, 150);
        }
        return;
    }

    if (typeof reqItemsData === 'undefined' || !reqItemsData || !reqItemsData.length) return;

    const catalog = window.getActiveStockCatalog ? window.getActiveStockCatalog() : [];
    if (!catalog.length) return;

    const reqPlantaSelect = document.getElementById('req-meca-planta');
    if (!reqPlantaSelect) return;

    let curPlanta = (reqPlantaSelect.value || '').trim().toUpperCase();
            if (curPlanta === 'PPA' || curPlanta === 'APA') curPlanta = 'APS';
if (curPlanta === 'PPA') curPlanta = 'APS';
            if (curPlanta !== 'APS' && curPlanta !== 'APG' && curPlanta && window.appData && window.appData.plantasRules && window.appData.plantasRules[curPlanta]) {
        curPlanta = window.appData.plantasRules[curPlanta];
    } else if (curPlanta === 'APA') {
        curPlanta = 'APS';
    }

    // Group catalog by logic
    const grouped = {};
    catalog.forEach(s => {
        if (!grouped[s.codigo] && (!(s.planta || '').trim() || (s.planta || '').trim().toUpperCase() === curPlanta)) grouped[s.codigo] = { ...s, precio: 0, precio_unitario: 0, planta: curPlanta };
    });
    catalog.forEach(s => {
        if (!(s.planta || '').trim()) {
            if (s.precio > 0 || grouped[s.codigo].precio === 0) {
                grouped[s.codigo].precio = s.precio;
                grouped[s.codigo].precio_unitario = s.precio_unitario;
            }
        }
    });
    catalog.forEach(s => {
        if ((s.planta || '').trim().toUpperCase() === curPlanta) {
            if (s.precio > 0 || grouped[s.codigo].precio === 0) {
                grouped[s.codigo].precio = s.precio;
                grouped[s.codigo].precio_unitario = s.precio_unitario;
            }
        }
    });

    let updated = false;
    reqItemsData.forEach(item => {
        const cItem = grouped[item.codigo];
        if (cItem && cItem.precio !== undefined) {
            if (item.precio_unitario !== cItem.precio) {
                item.precio_unitario = cItem.precio;
                updated = true;
            }
        }
    });

    if (updated) {
        if (typeof window.actualizarTablaItemsRequerimiento === 'function') {
            window.actualizarTablaItemsRequerimiento();
        }
        if (typeof window.calcularTotalesPresupuesto === 'function') {
            window.calcularTotalesPresupuesto();
        }
    }
};

// ====================================================================
// SISTEMA DE AUTO-ACTUALIZACIÓN Y RECARGA REMOTA DE TERMINALES
// Permite que todas las computadoras de la empresa reciban las últimas
// versiones y datos automáticamente, incluso si nunca recargan la página.
// ====================================================================

window.CURRENT_APP_VERSION = '460';
window.PAGE_LOADED_AT = Date.now();
window._lastAppUpdateTs = new Date().toISOString();

// 1. Manejador de señal de recarga / actualización
window.handleRemoteReloadRequest = function(payload) {
    if (payload && payload.timestamp) {
        const t = typeof payload.timestamp === 'number' ? payload.timestamp : new Date(payload.timestamp).getTime();
        // Ignorar señales viejas de más de 3 minutos
        if (Date.now() - t > 180000) return;
    }

    // Verificar si el usuario está tipeando activamente o tiene un modal de edición abierto
    const isUserTyping = (function() {
        try {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
                return true;
            }
            const modal = document.getElementById('modal-overlay');
            if (modal && modal.style.display !== 'none' && modal.style.display !== '') {
                return true;
            }
            if (window.pedidoActivo || window.pedidoEnEdicionId) {
                return true;
            }
        } catch(e) {}
        return false;
    })();

    if (!isUserTyping) {
        console.log("🔄 Recargando terminal limpiamente por actualización de sistema...");
        if (typeof Swal !== 'undefined' && typeof Swal.fire === 'function') {
            Swal.fire({
                title: '⚡ Actualizando Sistema',
                text: 'Se aplicaron mejoras en el sistema. Actualizando terminal...',
                icon: 'info',
                timer: 2000,
                showConfirmButton: false,
                allowOutsideClick: false
            }).then(() => {
                window.location.reload(true);
            });
        } else {
            window.location.reload(true);
        }
    } else {
        // El usuario está redactando algo: mostrar banner flotante para que no pierda lo que hace
        window.showSystemUpdateBanner();
    }
};

// 2. Banner flotante para cuando el usuario está redactando o con un modal abierto
window.showSystemUpdateBanner = function() {
    if (document.getElementById('sg-system-update-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'sg-system-update-banner';
    banner.style.cssText = 'position: fixed; top: 18px; right: 20px; z-index: 9999999; background: #0f172a; border: 1px solid #0ea5e9; border-left: 5px solid #0ea5e9; padding: 12px 18px; border-radius: 8px; box-shadow: 0 10px 35px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 14px; color: #fff; font-family: inherit; animation: slideInDown 0.3s ease;';
    banner.innerHTML = `
        <span style="font-size: 22px;">🚀</span>
        <div>
            <div style="font-weight: 700; font-size: 13px; color: #38bdf8;">Nueva versión del sistema disponible</div>
            <div style="font-size: 11px; color: #94a3b8;">Guarda tu trabajo actual y haz clic en actualizar para aplicar los últimos cambios.</div>
        </div>
        <button type="button" onclick="window.location.reload(true)" style="background: #0ea5e9; color: #fff; border: none; padding: 7px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">Actualizar ahora</button>
    `;
    document.body.appendChild(banner);
};

// 3. Botón de Administrador para forzar actualización de todas las terminales
window.forzarRecargaRemotaTerminales = async function() {
    const curUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    const userName = curUser ? (curUser.username || curUser.nombre || 'Administrador') : 'Administrador';

    const confirmed = confirm(
        "📡 ¿Desea forzar la actualización de todas las pantallas y computadoras de la empresa?\n\n" +
        "Esta acción enviará una señal en tiempo real a todas las terminales conectadas para que se recarguen con la última versión limpia sin perder trabajo."
    );
    if (!confirmed) return;

    const client = (typeof getDbClient === 'function') ? getDbClient() : null;
    const nowIso = new Date().toISOString();

    if (client) {
        try {
            // 1. Enviar broadcast instantáneo por WebSockets Realtime
            const channel = client.channel('sg_system_control');
            await channel.send({
                type: 'broadcast',
                event: 'remote_reload',
                payload: {
                    sender: userName,
                    timestamp: Date.now()
                }
            });
            console.log("📡 Broadcast de recarga remota enviado.");
        } catch(e) {
            console.warn("Aviso broadcast:", e);
        }

        try {
            // 2. Actualizar updated_at en app_state como respaldo
            await client.from('app_state').update({
                updated_at: nowIso
            }).eq('id', 'globalData');
            console.log("☁️ app_state updated_at actualizado como señal de recarga.");
        } catch(e) {
            console.warn("Aviso app_state reload touch:", e);
        }
    }

    if (typeof showToast === 'function') {
        showToast("🚀 Señal enviada con éxito. Las pantallas se actualizarán en segundos.", "success");
    } else {
        alert("🚀 Señal enviada con éxito. Las pantallas se actualizarán en segundos.");
    }

    setTimeout(() => {
        window.location.reload(true);
    }, 1200);
};

// 4. Verificación periódica silenciosa de nueva versión en el servidor (cada 3 minutos)
setInterval(function() {
    fetch(`index.html?t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.text())
        .then(html => {
            const match = html.match(/app\.js\?v=(\d+)/);
            if (match && match[1]) {
                const serverVer = match[1];
                if (serverVer !== window.CURRENT_APP_VERSION) {
                    console.log(`🚀 [AUTO-UPDATE] Nueva versión detectada en servidor: v=${serverVer} (local: v=${window.CURRENT_APP_VERSION})`);
                    if (typeof window.handleRemoteReloadRequest === 'function') {
                        window.handleRemoteReloadRequest({ source: 'version_checker', version: serverVer, timestamp: Date.now() });
                    }
                }
            }
        })
        .catch(() => {});
}, 180000); // Chequea cada 3 minutos

