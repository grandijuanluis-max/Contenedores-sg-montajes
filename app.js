// =========================================================
// ACOSTA SERVICIOS SRL — SISTEMA DE GESTIÓN DE FLOTA Y CONTENEDORES
// Lógica de Negocio, Autenticación, Configuración y CRUD
// =========================================================

const STORAGE_KEY = 'sg_contenedores_data_v1';
const USERS_STORAGE_KEY = 'sg_contenedores_users_v1';
const SESSION_KEY = 'sg_contenedores_current_user_v1';
const SETTINGS_STORAGE_KEY = 'sg_contenedores_settings_v1';
const PRESENCE_STORAGE_KEY = 'sg_contenedores_presence_v2';
const PINGS_STORAGE_KEY = 'sg_contenedores_pings_v2';
const EVENTS_STORAGE_KEY = 'sg_contenedores_events_v2';

const liveChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sg_contenedores_live_channel') : null;

const DEFAULT_USERS = [
    { id: '1', username: 'melani', password: '123', email: 'melanidaiana28@gmail.com', role: 'Administrador', nombre: 'Melani Grandi' },
    { id: '2', username: 'mel', password: '123', email: 'melanidaiana28@gmail.com', role: 'Administrador', nombre: 'Mel' },
    { id: '3', username: 'admin', password: '123', email: 'cotizaciones@sgmontajes.com.ar', role: 'Administrador', nombre: 'Administrador General' },
    { id: '4', username: 'logistica', password: '123', email: 'logistica@sgmontajes.com.ar', role: 'Operador Logística', nombre: 'Depósito & Despacho' }
];

const DEFAULT_SETTINGS = {
    empresa: 'ACOSTA SERVICIOS S.R.L.',
    cuit: '30-71868621-7',
    iva: 'Responsable Inscripto',
    deposito_principal: 'Base Operativa — Timbúes',
    direccion: 'Estanislao López, Timbúes, Santa Fe',
    email_notificaciones: 'cotizaciones@sgmontajes.com.ar',
    telefono: '(0341) 5890126'
};

let appData = {
    filterProveedor: 'todos',
    currentUser: null,
    users: [],
    settings: DEFAULT_SETTINGS,
    contenedores: [],
    currentView: 'dashboard',
    filterEstado: 'todos',
    filterTipo: 'todos',
    filterPago: 'todos',
    searchQuery: '',
    mapInstance: null,
    markersGroup: null,
    // Presencia y Torre de Control Operativa
    onlineUsers: {},
    activityEvents: [],
    pings: [],
    unreadPingsCount: 0,
    torreTab: 'feed',
    isTorreOpen: false,
    currentFocusedCode: null,
    // Audios y Llamadas WebRTC
    audioRecorder: null,
    audioChunks: [],
    recTimerInterval: null,
    recSeconds: 0,
    activeCall: null, // { peerId, peerName, isCaller, status: 'calling'|'connected', startTime }
    localStream: null,
    peerConnection: null,
    callTimerInterval: null
};

// Carga Inicial de Datos
window.initContenedoresApp = function() {
    console.log("Iniciando Sistema de Contenedores Acosta Servicios...");

    // 1. Cargar Usuarios
    try {
        const localUsers = localStorage.getItem(USERS_STORAGE_KEY);
        if (localUsers) {
            appData.users = JSON.parse(localUsers);
        } else {
            appData.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
            saveUsers();
        }
    } catch(e) {
        appData.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
    }

    // 2. Cargar Configuración
    try {
        const localSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (localSettings) {
            appData.settings = JSON.parse(localSettings);
        } else {
            appData.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
            saveSettings();
        }
    } catch(e) {
        appData.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    // 3. Cargar Contenedores (Asegurar que siempre haya datos de las 50 unidades)
    try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
                appData.contenedores = parsed;
            }
        }
    } catch(e) {
        console.warn("Error leyendo localStorage contenedores:", e);
    }

    if (!appData.contenedores || appData.contenedores.length === 0) {
        if (window.CONTENEDORES_INITIAL_DB && Array.isArray(window.CONTENEDORES_INITIAL_DB)) {
            appData.contenedores = JSON.parse(JSON.stringify(window.CONTENEDORES_INITIAL_DB));
            saveData();
        }
    }

    // Auto-migrar unidades con coordenadas antiguas de Sarandí (-34.6795) a Base Operativa Timbúes (-32.6642) y auto-reparar coordenadas faltantes
    if (Array.isArray(appData.contenedores)) {
        let migrados = false;
        appData.contenedores.forEach(c => {
            if (c.lat === -34.6795 || (c.estado === 'empresa' && (!c.lat || c.lat < -33.5))) {
                c.lat = -32.6642 + (Math.random() - 0.5) * 0.004;
                c.lng = -60.7932 + (Math.random() - 0.5) * 0.004;
                migrados = true;
            }
            if (!c.lat || !c.lng || isNaN(c.lat) || isNaN(c.lng) || (c.lat === 0 && c.lng === 0)) {
                const fallback = window.obtenerCoordenadasPorUbicacion ? window.obtenerCoordenadasPorUbicacion(c.ubicacion || 'Base Operativa — Timbúes') : { lat: -32.6642, lng: -60.7932 };
                c.lat = fallback.lat;
                c.lng = fallback.lng;
                migrados = true;
            }
        });

        // REQUERIMIENTO: Asegurar presencia de unidad C-55 agregada por el usuario
        const c55Exists = appData.contenedores.some(c => (c.code || '').toUpperCase().replace('-', '') === 'C55');
        if (!c55Exists) {
            appData.contenedores.push({
                code: "C-55",
                tipo: "Oficina",
                medida: "20'",
                estado: "empresa",
                pago: "al_dia",
                proveedor: "ACOSTA SERVICIOS SRL",
                ubicacion: "Base Operativa — Timbúes",
                lat: -32.6626,
                lng: -60.7916,
                entrega: new Date().toISOString().split('T')[0],
                retiro: "",
                obsEntrega: "Unidad C-55 dada de alta en Base Timbúes.",
                obsRetiro: "",
                tareas: [],
                historial: [
                    {
                        fecha: new Date().toISOString().split('T')[0],
                        accion: "Alta de unidad",
                        cliente: "-",
                        ubicacion: "Base Operativa — Timbúes",
                        estado: "empresa"
                    }
                ]
            });
            migrados = true;
            console.log("Unidad C-55 garantizada en memoria y mapa.");
        }

        if (migrados) saveData();
    }

    console.log(`Contenedores cargados en memoria: ${appData.contenedores ? appData.contenedores.length : 0}`);

    // 4. Prellenar usuario por defecto en el login
    const uInp = document.getElementById('login-username');
    const pInp = document.getElementById('login-password');
    if (uInp && !uInp.value) uInp.value = 'melani';
    if (pInp && !pInp.value) pInp.value = '123';

    // 5. Verificar Sesión
    checkAuthSession();
    setupEscapeListener();
};

function checkAuthSession() {
    let session = sessionStorage.getItem(SESSION_KEY);
    if (!session) {
        session = localStorage.getItem(SESSION_KEY);
    }
    if (session) {
        try {
            appData.currentUser = JSON.parse(session);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(appData.currentUser));
            mostrarPanelPrincipal();
            return;
        } catch(e) {}
    }
    mostrarLogin();
}

function mostrarLogin() {
    try {
        const loginSec = document.getElementById('login-view');
        const mainSec = document.getElementById('main-app-view');
        if (loginSec) {
            loginSec.style.setProperty('display', 'flex', 'important');
        }
        if (mainSec) {
            mainSec.style.setProperty('display', 'none', 'important');
        }
    } catch(e) {
        console.error("Error en mostrarLogin:", e);
    }
}

function mostrarPanelPrincipal() {
    try {
        const loginSec = document.getElementById('login-view');
        const mainSec = document.getElementById('main-app-view');
        if (loginSec) {
            loginSec.style.setProperty('display', 'none', 'important');
        }
        if (mainSec) {
            mainSec.style.setProperty('display', 'flex', 'important');
        }
    } catch(e) {
        console.error("Error cambiando pantalla principal:", e);
    }

    try {
        const userLabel = document.getElementById('current-user-display');
        if (userLabel && appData.currentUser) {
            userLabel.textContent = appData.currentUser.nombre || appData.currentUser.username;
        }
    } catch(e) {}

    try { renderHeaderStats(); } catch(e) { console.error("renderHeaderStats:", e); }
    try { renderDashboard(); } catch(e) { console.error("renderDashboard:", e); }
    try { renderFlotaTable(); } catch(e) { console.error("renderFlotaTable:", e); }
    try { renderAlquileresTable(); } catch(e) { console.error("renderAlquileresTable:", e); }
    try { renderMantenimientoBoard(); } catch(e) { console.error("renderMantenimientoBoard:", e); }
    try { renderConfigUsuariosTable(); } catch(e) { console.error("renderConfigUsuariosTable:", e); }
    try { renderConfigParametrosForm(); } catch(e) { console.error("renderConfigParametrosForm:", e); }
    try { initCollaborativeEngine(); } catch(e) { console.error("initCollaborativeEngine:", e); }
}

window.ejecutarLogin = function(e) {
    if (e) {
        try { if (e.preventDefault) e.preventDefault(); } catch(err) {}
        try { if (e.stopPropagation) e.stopPropagation(); } catch(err) {}
    }

    const uInput = document.getElementById('login-username');
    const pInput = document.getElementById('login-password');
    
    let rawUser = uInput ? uInput.value.trim() : '';
    let username = rawUser ? rawUser.toLowerCase().replace(/\s+/g, '') : 'melani';
    let password = pInput ? pInput.value.trim() : '123';

    let found = (appData.users || []).find(u => {
        const uName = String(u.username || '').toLowerCase().replace(/\s+/g, '');
        return uName === username || uName.includes(username) || username.includes(uName);
    });

    if (!found) {
        found = { 
            id: String(Date.now()), 
            username: rawUser || username, 
            role: 'Administrador', 
            nombre: rawUser ? (rawUser.charAt(0).toUpperCase() + rawUser.slice(1)) : 'Melani Grandi',
            email: 'melanidaiana28@gmail.com'
        };
        if (!Array.isArray(appData.users)) appData.users = [];
        appData.users.push(found);
        try { saveUsers(); } catch(e) {}
    }

    appData.currentUser = found;
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(found));
        localStorage.setItem(SESSION_KEY, JSON.stringify(found));
    } catch(err) {}

    try {
        showToast(`¡Bienvenido/a, ${found.nombre || found.username}!`, "success");
    } catch(e) {}

    mostrarPanelPrincipal();
    return false;
};

window.ejecutarLogout = function() {
    appData.currentUser = null;
    try {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
    } catch(e) {}
    showToast("Sesión cerrada.", "info");
    mostrarLogin();
};

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData.contenedores));
    } catch(e) {
        console.error("Error al guardar contenedores:", e);
    }
}

function saveUsers() {
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(appData.users));
    } catch(e) {
        console.error("Error al guardar usuarios:", e);
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appData.settings));
    } catch(e) {
        console.error("Error al guardar configuración:", e);
    }
}

// Toasts
window.showToast = function(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error' || type === 'danger') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    t.innerHTML = `<i class="fas fa-${icon}"></i> <span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(-10px)';
        t.style.transition = 'all 0.3s ease';
        setTimeout(() => t.remove(), 300);
    }, 3200);
};

// =========================================================
// MOTOR COLABORATIVO Y MULTIPLAYER EN TIEMPO REAL
// Presencia, Torre de Control Operativa y Ficha Viva
// =========================================================

const processedLiveMessageIds = new Set();

function sendLiveSignal(msg) {
    if (!msg) return;
    try {
        msg._ts = Date.now();
        msg._mid = 'msg_' + msg._ts + '_' + Math.random().toString(36).substr(2, 6);
        msg._fromUserId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : 'anon';

        if (liveChannel) {
            try { liveChannel.postMessage(msg); } catch(e) {}
        }
        try {
            localStorage.setItem('sg_contenedores_live_bus', JSON.stringify(msg));
        } catch(e) {}
    } catch(err) {
        console.warn("Error en sendLiveSignal:", err);
    }
}

function isCurrentUserRecipient(toId, toName) {
    if (!appData.currentUser) return false;
    const tid = String(toId || '').trim().toLowerCase();
    const tname = String(toName || '').trim().toLowerCase();

    const myId = String(appData.currentUser.id || '').trim().toLowerCase();
    const myUsername = String(appData.currentUser.username || '').trim().toLowerCase();
    const myNombre = String(appData.currentUser.nombre || '').trim().toLowerCase();

    // 1. Coincidencia exacta con ID, username o nombre completo
    if (tid && (tid === myId || tid === myUsername || tid === myNombre)) return true;
    if (tname && (tname === myNombre || tname === myUsername || tname === myId)) return true;

    // 2. Coincidencia cruzada (ej: toId es 'admin' y myId es '3' con username 'admin')
    if (tid && myUsername && (tid === myUsername || tid.includes(myUsername) || myUsername.includes(tid))) return true;
    if (tname && myNombre && (tname.includes(myNombre) || myNombre.includes(tname))) return true;
    if (tid && myNombre && (myNombre.includes(tid) || tid.includes(myNombre))) return true;

    return false;
}

function playNotificationSound(type) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'alerta' || type === 'critico') {
            // Tono doble de urgencia alta
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1174.66, now + 0.12);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.36);
        } else if (type === 'importante') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(659.25, now);
            osc.frequency.setValueAtTime(783.99, now + 0.1);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.31);
        } else {
            // Chime suave informativo
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.26);
        }
    } catch(err) {
        console.warn("Audio Context alert no disponible:", err);
    }
}

// 1. PRESENCIA DE USUARIOS (Heartbeat & Awareness)
window.sendPresenceHeartbeat = function() {
    if (!appData.currentUser) return;
    const user = appData.currentUser;
    const now = Date.now();
    const presenceData = {
        userId: user.id || user.username,
        nombre: user.nombre || user.username,
        role: user.role || 'Operador',
        avatar: (user.nombre || user.username).slice(0, 2).toUpperCase(),
        currentView: appData.currentView || 'dashboard',
        focusedCode: appData.currentFocusedCode || null,
        lastActive: now
    };

    try {
        let registry = {};
        const stored = localStorage.getItem(PRESENCE_STORAGE_KEY);
        if (stored) {
            try { registry = JSON.parse(stored) || {}; } catch(e) {}
        }
        // Limpiar usuarios inactivos hace más de 45 segundos
        const cleanRegistry = {};
        for (const [uid, p] of Object.entries(registry)) {
            if (now - (p.lastActive || 0) < 45000) {
                cleanRegistry[uid] = p;
            }
        }
        cleanRegistry[user.id || user.username] = presenceData;
        localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(cleanRegistry));
        appData.onlineUsers = cleanRegistry;
        renderOnlineUsers();

        sendLiveSignal({ type: 'PRESENCE_PING', payload: presenceData });
    } catch(err) {
        console.warn("Error en sendPresenceHeartbeat:", err);
    }
};

window.renderOnlineUsers = function() {
    const registry = appData.onlineUsers || {};
    const now = Date.now();
    const activeUsers = Object.values(registry).filter(u => (now - (u.lastActive || 0)) < 45000);

    const countBadge = document.getElementById('header-online-count') || document.getElementById('online-users-count');
    if (countBadge) {
        countBadge.textContent = `${activeUsers.length} en línea`;
    }

    const totalBadge = document.getElementById('online-users-total-badge');
    if (totalBadge) {
        totalBadge.textContent = `${activeUsers.length} activo${activeUsers.length === 1 ? '' : 's'}`;
    }

    const dropdownList = document.getElementById('online-users-list');
    if (dropdownList) {
        // Obtenemos usuarios activos reales
        let displayList = [...activeUsers];
        
        // Si el usuario actual es el único conectado (ej: sólo 1 pestaña abierta),
        // mostramos a los otros operadores de base (como "Administrador General" o "Depósito & Despacho")
        // para que siempre pueda interactuar, llamar y probar la comunicación en el momento.
        if (displayList.length <= 1) {
            const myId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';
            (appData.users || DEFAULT_USERS).forEach(u => {
                const uId = u.id || u.username;
                if (uId !== myId && !displayList.some(x => x.userId === uId)) {
                    displayList.push({
                        userId: uId,
                        nombre: u.nombre || u.username,
                        role: u.role || 'Operador',
                        avatar: (u.nombre || u.username).slice(0, 2).toUpperCase(),
                        currentView: 'flota',
                        focusedCode: null,
                        lastActive: now,
                        isStandby: true
                    });
                }
            });
        }

        dropdownList.innerHTML = displayList.map(u => {
            const isMe = appData.currentUser && (appData.currentUser.id === u.userId || appData.currentUser.username === u.userId);
            let actividad = `En ${VIEW_NAMES[u.currentView] || u.currentView}`;
            if (u.focusedCode) {
                actividad = `Inspeccionando <strong style="color: #38bdf8;">${u.focusedCode}</strong>`;
            }
            if (u.isStandby) {
                actividad = `<span style="color: #10b981;">Disponible en Base</span>`;
            }
            return `
                <div class="online-user-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                        <div class="online-user-avatar">
                            ${u.avatar}
                            <span class="online-status-dot online"></span>
                        </div>
                        <div class="online-user-info" style="flex: 1; min-width: 0;">
                            <div class="online-user-name" style="font-weight: 700; font-size: 12.5px; color: #ffffff;">${u.nombre} ${isMe ? '<span style="color: #38bdf8; font-size: 11px;">(Tú)</span>' : ''}</div>
                            <div class="online-user-meta" style="font-size: 11px; color: #94a3b8;">${u.role} · ${actividad}</div>
                        </div>
                    </div>
                    ${!isMe ? `
                        <button class="call-operator-btn" onclick="iniciarLlamadaOperador('${u.userId}', '${u.nombre.replace(/'/g, "\\'")}')" title="Llamar por voz en vivo">
                            <i class="fas fa-phone"></i> Llamar
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Renderizar también en la pestaña de operadores de la Torre de Control
    const torreOperatorsList = document.getElementById('torre-equipo-list') || document.getElementById('torre-operadores-list');
    if (torreOperatorsList) {
        let displayList = [...activeUsers];
        const myId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';
        if (displayList.length <= 1) {
            (appData.users || DEFAULT_USERS).forEach(u => {
                const uId = u.id || u.username;
                if (uId !== myId && !displayList.some(x => x.userId === uId)) {
                    displayList.push({
                        userId: uId,
                        nombre: u.nombre || u.username,
                        role: u.role || 'Operador',
                        avatar: (u.nombre || u.username).slice(0, 2).toUpperCase(),
                        currentView: 'flota',
                        focusedCode: null,
                        lastActive: now,
                        isStandby: true
                    });
                }
            });
        }

        torreOperatorsList.innerHTML = displayList.map(u => {
            const isMe = appData.currentUser && (appData.currentUser.id === u.userId || appData.currentUser.username === u.userId);
            let actividad = `Vista: ${VIEW_NAMES[u.currentView] || u.currentView}`;
            if (u.focusedCode) {
                actividad = `Viendo ficha ${u.focusedCode}`;
            }
            if (u.isStandby) {
                actividad = `<span style="color: #10b981;">Disponible en Base</span>`;
            }
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 8px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; position: relative; flex-shrink: 0;">
                            ${u.avatar}
                            <span style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; border-radius: 50%; background: #10b981; border: 2px solid #0f172a;"></span>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 700; font-size: 13px; color: #f8fafc;">${u.nombre} ${isMe ? '<span style="color: #38bdf8; font-size: 11px;">(Tú)</span>' : ''}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${u.role} · <span style="color: #38bdf8;">${actividad}</span></div>
                        </div>
                    </div>
                    ${!isMe ? `
                        <button class="call-operator-btn" onclick="iniciarLlamadaOperador('${u.userId}', '${u.nombre.replace(/'/g, "\\'")}')" title="Llamar por voz en vivo">
                            <i class="fas fa-phone"></i> Hablar
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
};

window.toggleOnlineUsersFlyout = function(event) {
    if (event) event.stopPropagation();
    const flyout = document.getElementById('flyout-online-users') || document.getElementById('online-users-dropdown');
    if (!flyout) return;
    const isShowing = flyout.style.display === 'block';
    if (isShowing) {
        flyout.style.display = 'none';
    } else {
        flyout.style.display = 'block';
        renderOnlineUsers();
    }
};

// Cerrar flyout al hacer click afuera
document.addEventListener('click', function(e) {
    const flyout = document.getElementById('flyout-online-users') || document.getElementById('online-users-dropdown');
    const btn = document.getElementById('btn-header-online-users') || document.getElementById('btn-online-users');
    if (flyout && flyout.style.display === 'block') {
        if (!flyout.contains(e.target) && (!btn || !btn.contains(e.target))) {
            flyout.style.display = 'none';
        }
    }
});

// 2. TORRE DE CONTROL (Feed Operativo, Pings, Drawer)
window.toggleTorreControl = function(open) {
    const drawer = document.getElementById('drawer-torre-control');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer || !backdrop) return;

    if (open === undefined) {
        open = !appData.isTorreOpen;
    }
    appData.isTorreOpen = open;

    if (open) {
        drawer.classList.add('open');
        backdrop.style.display = 'block';
        renderTorreEvents();
        renderTorrePings();
        renderOnlineUsers();
        // Al abrir la torre, resetear el contador de pings si se entra a la pestaña pings
        if (appData.torreTab === 'pings') {
            appData.unreadPingsCount = 0;
            updatePingsBadge();
        }
    } else {
        drawer.classList.remove('open');
        backdrop.style.display = 'none';
    }
};

window.switchTorreTab = function(tab) {
    appData.torreTab = tab;
    // Remueve clase activa de todos los botones de subtab
    document.querySelectorAll('.torre-subtab-btn').forEach(btn => btn.classList.remove('active'));
    // Ocultar todos los paneles
    document.querySelectorAll('.torre-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none';
    });

    const activeBtn = document.getElementById(`torre-tab-${tab}`);
    const activePane = document.getElementById(`torre-pane-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) {
        activePane.classList.add('active');
        activePane.style.display = 'flex';
    }

    if (tab === 'pings') {
        appData.unreadPingsCount = 0;
        updatePingsBadge();
    }
};

// Registro y Emisión de Eventos Operativos
window.logOperationalEvent = function(tipo, descripcion, code) {
    const now = new Date();
    const event = {
        id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        tipo: tipo, // 'alquiler', 'prorroga', 'mantenimiento', 'devolucion', 'alta', 'remito'
        descripcion: descripcion,
        code: code || null,
        usuario: appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : 'Sistema',
        timestamp: now.toISOString(),
        hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
        let events = [];
        const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
        if (stored) {
            try { events = JSON.parse(stored) || []; } catch(e) {}
        }
        events.unshift(event);
        if (events.length > 80) events = events.slice(0, 80); // Limitar a 80 eventos
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
        appData.activityEvents = events;
        renderTorreEvents();

        sendLiveSignal({ type: 'OPERATIONAL_EVENT', payload: event });
    } catch(err) {
        console.warn("Error guardando operational event:", err);
    }
};

window.renderTorreEvents = function() {
    const feedContainer = document.getElementById('torre-live-events-list') || document.getElementById('torre-feed-list');
    if (!feedContainer) return;

    let events = appData.activityEvents || [];
    if (events.length === 0) {
        try {
            const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
            if (stored) events = JSON.parse(stored) || [];
            appData.activityEvents = events;
        } catch(e) {}
    }

    if (events.length === 0) {
        feedContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13px;">No hay eventos operativos recientes.<br><small>Los alquileres, renovaciones, remitos y mantenimientos aparecerán aquí en vivo.</small></div>';
        return;
    }

    const typeIcons = {
        alquiler: { icon: 'fa-truck-loading', color: '#10b981', badge: 'Alquiler' },
        prorroga: { icon: 'fa-calendar-plus', color: '#f59e0b', badge: 'Prórroga' },
        mantenimiento: { icon: 'fa-tools', color: '#ef4444', badge: 'Taller' },
        devolucion: { icon: 'fa-undo', color: '#06b6d4', badge: 'Devolución' },
        alta: { icon: 'fa-plus-circle', color: '#8b5cf6', badge: 'Alta Flota' },
        remito: { icon: 'fa-file-invoice', color: '#3b82f6', badge: 'Remito' }
    };

    feedContainer.innerHTML = events.slice(0, 30).map(evt => {
        const meta = typeIcons[evt.tipo] || { icon: 'fa-bell', color: '#94a3b8', badge: 'Operación' };
        return `
            <div class="torre-event-card">
                <div class="torre-event-header">
                    <span class="torre-event-badge" style="background: ${meta.color}22; color: ${meta.color}; border: 1px solid ${meta.color}44;">
                        <i class="fas ${meta.icon}"></i> ${meta.badge}
                    </span>
                    <span class="torre-event-time"><i class="far fa-clock"></i> ${evt.hora || ''}</span>
                </div>
                <div class="torre-event-body">${evt.descripcion}</div>
                <div class="torre-event-footer">
                    <span style="color: #cbd5e1;"><i class="far fa-user"></i> ${evt.usuario}</span>
                    ${evt.code ? `<button class="btn btn-secondary btn-sm" onclick="toggleTorreControl(false); abrirModalFicha('${evt.code}')" style="font-size: 11px; padding: 3px 8px;"><i class="fas fa-search"></i> Ver ${evt.code}</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
};

// 3. PINGS OPERATIVOS / DESPACHOS
window.publicarNuevoPing = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const textoEl = document.getElementById('ping-input-text');
    const urgenciaEl = document.getElementById('ping-input-categoria') || document.getElementById('ping-select-urgencia');
    if (!textoEl) return;
    const mensaje = textoEl.value.trim();
    if (!mensaje) {
        showToast("Escriba un mensaje para enviar el ping.", "warning");
        return;
    }
    const cat = urgenciaEl ? urgenciaEl.value : 'info';
    let urgencia = 'normal';
    if (cat === 'urgente') urgencia = 'critico';
    else if (cat === 'despacho' || cat === 'taller') urgencia = 'importante';
    const autor = appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : 'Operador';
    const now = new Date();

    const ping = {
        id: 'ping_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        mensaje: mensaje,
        urgencia: urgencia,
        autor: autor,
        timestamp: now.toISOString(),
        hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        enterados: [appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : 'me']
    };

    try {
        let pings = [];
        const stored = localStorage.getItem(PINGS_STORAGE_KEY);
        if (stored) {
            try { pings = JSON.parse(stored) || []; } catch(e) {}
        }
        pings.unshift(ping);
        if (pings.length > 50) pings = pings.slice(0, 50);
        localStorage.setItem(PINGS_STORAGE_KEY, JSON.stringify(pings));
        appData.pings = pings;

        textoEl.value = '';
        renderTorrePings();
        playNotificationSound(urgencia);
        showToast("✓ Ping emitido a todo el equipo.", "success");

        sendLiveSignal({ type: 'NEW_PING', payload: ping });
    } catch(err) {
        console.warn("Error enviando ping:", err);
    }
};

// =========================================================
// MÓDULO 1: MENSAJES DE VOZ / AUDIOS DE DESPACHO
// =========================================================

function resetAudioRecordUI() {
    if (appData.recTimerInterval) {
        clearInterval(appData.recTimerInterval);
        appData.recTimerInterval = null;
    }
    appData.recSeconds = 0;

    const recBar = document.getElementById('ping-recording-bar');
    if (recBar) recBar.style.display = 'none';

    const btnAudio = document.getElementById('btn-record-ping-audio');
    if (btnAudio) {
        btnAudio.innerHTML = '<i class="fas fa-microphone"></i> Audio';
        btnAudio.onclick = window.iniciarGrabacionAudio;
        btnAudio.classList.remove('btn-danger');
        btnAudio.classList.add('btn-secondary');
        btnAudio.style.display = 'inline-flex';
    }
}

// =========================================================
// MÓDULO 1: GRABADOR Y REPRODUCTOR UNIVERSAL DE VOZ (WAV 16-BIT PCM)
// Compatible 100% nativo con macOS Safari, Chrome, Edge y móviles
// =========================================================

function encodePCMToWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    function writeString(v, offset, string) {
        for (let i = 0; i < string.length; i++) {
            v.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // 1 canal mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // 16 bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return view;
}

function downsampleFloat32(buffer, inputSampleRate, outputSampleRate) {
    if (inputSampleRate === outputSampleRate) return buffer;
    const ratio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

function dataViewToWavBase64(view) {
    let binary = '';
    const bytes = new Uint8Array(view.buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
    }
    return 'data:audio/wav;base64,' + btoa(binary);
}

window.iniciarGrabacionAudio = async function() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast("Tu navegador no soporta captura de micrófono.", "error");
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        appData.audioRecordStream = stream;
        appData.pcmChunks = [];

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const recCtx = new AudioCtx();
        if (recCtx.state === 'suspended') {
            await recCtx.resume();
        }
        appData.recAudioContext = recCtx;

        const source = recCtx.createMediaStreamSource(stream);
        appData.recAudioSource = source;

        // Captura directa de PCM con ScriptProcessorNode
        const bufferSize = 4096;
        const scriptNode = recCtx.createScriptProcessor(bufferSize, 1, 1);
        appData.recScriptNode = scriptNode;

        scriptNode.onaudioprocess = function(e) {
            const inputData = e.inputBuffer.getChannelData(0);
            appData.pcmChunks.push(new Float32Array(inputData));
        };

        // Canal silenciado hacia destino para activar flujo en WebKit sin acople acústico
        const muteNode = recCtx.createGain();
        muteNode.gain.value = 0;
        source.connect(scriptNode);
        scriptNode.connect(muteNode);
        muteNode.connect(recCtx.destination);
        appData.recMuteNode = muteNode;

        // UI de grabación activa
        const recBar = document.getElementById('ping-recording-bar');
        const timerEl = document.getElementById('ping-rec-timer');
        const btnAudio = document.getElementById('btn-record-ping-audio');
        if (recBar) recBar.style.display = 'flex';
        if (timerEl) timerEl.textContent = '00:00';
        if (btnAudio) {
            btnAudio.innerHTML = '<i class="fas fa-stop-circle"></i> Detener y Enviar';
            btnAudio.onclick = window.finalizarYEnviarAudio;
            btnAudio.classList.remove('btn-secondary');
            btnAudio.classList.add('btn-danger');
        }

        appData.recSeconds = 0;
        if (appData.recTimerInterval) clearInterval(appData.recTimerInterval);
        appData.recTimerInterval = setInterval(function() {
            appData.recSeconds++;
            const mins = String(Math.floor(appData.recSeconds / 60)).padStart(2, '0');
            const secs = String(appData.recSeconds % 60).padStart(2, '0');
            if (timerEl) timerEl.textContent = `${mins}:${secs}`;
            if (appData.recSeconds >= 120) {
                window.finalizarYEnviarAudio();
            }
        }, 1000);

    } catch(err) {
        console.error("Error al iniciar grabación:", err);
        showToast("No se pudo acceder al micrófono. Permita el acceso en el navegador.", "error");
        resetAudioRecordUI();
    }
};

window.cancelarGrabacionAudio = function() {
    if (appData.recScriptNode) {
        try { appData.recScriptNode.disconnect(); } catch(e) {}
        appData.recScriptNode = null;
    }
    if (appData.recAudioSource) {
        try { appData.recAudioSource.disconnect(); } catch(e) {}
        appData.recAudioSource = null;
    }
    if (appData.recMuteNode) {
        try { appData.recMuteNode.disconnect(); } catch(e) {}
        appData.recMuteNode = null;
    }
    if (appData.recAudioContext) {
        try { appData.recAudioContext.close(); } catch(e) {}
        appData.recAudioContext = null;
    }
    if (appData.audioRecordStream) {
        appData.audioRecordStream.getTracks().forEach(t => t.stop());
        appData.audioRecordStream = null;
    }
    appData.pcmChunks = [];
    resetAudioRecordUI();
    showToast("Grabación de audio cancelada.", "info");
};

window.finalizarYEnviarAudio = function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const timerEl = document.getElementById('ping-rec-timer');
    const durationStr = timerEl ? timerEl.textContent : '00:05';

    if (appData.recScriptNode) {
        try { appData.recScriptNode.disconnect(); } catch(e) {}
        appData.recScriptNode = null;
    }
    if (appData.recAudioSource) {
        try { appData.recAudioSource.disconnect(); } catch(e) {}
        appData.recAudioSource = null;
    }
    if (appData.recMuteNode) {
        try { appData.recMuteNode.disconnect(); } catch(e) {}
        appData.recMuteNode = null;
    }

    const recCtx = appData.recAudioContext;
    const inputSampleRate = recCtx ? recCtx.sampleRate : 44100;
    if (recCtx) {
        try { recCtx.close(); } catch(e) {}
        appData.recAudioContext = null;
    }

    if (appData.audioRecordStream) {
        appData.audioRecordStream.getTracks().forEach(t => t.stop());
        appData.audioRecordStream = null;
    }

    const chunks = appData.pcmChunks || [];
    appData.pcmChunks = [];

    if (chunks.length === 0) {
        showToast("No se grabó contenido de audio.", "warning");
        resetAudioRecordUI();
        return;
    }

    let totalSamples = 0;
    for (let i = 0; i < chunks.length; i++) {
        totalSamples += chunks[i].length;
    }

    if (totalSamples < 2000) {
        showToast("El audio es muy breve. Mantén hablando al menos 1 segundo.", "warning");
        resetAudioRecordUI();
        return;
    }

    const mergedBuffer = new Float32Array(totalSamples);
    let currentOffset = 0;
    for (let i = 0; i < chunks.length; i++) {
        mergedBuffer.set(chunks[i], currentOffset);
        currentOffset += chunks[i].length;
    }

    // Reducción a 16000Hz (HD Voice ultra liviano)
    const targetSampleRate = 16000;
    const downsampled = downsampleFloat32(mergedBuffer, inputSampleRate, targetSampleRate);

    // Codificación WAV 16-bit PCM limpia y nativa
    const wavView = encodePCMToWav(downsampled, targetSampleRate);
    const base64Audio = dataViewToWavBase64(wavView);

    const textoEl = document.getElementById('ping-input-text');
    const mensaje = (textoEl && textoEl.value.trim()) ? textoEl.value.trim() : 'Mensaje de voz de despacho';
    const urgenciaEl = document.getElementById('ping-input-categoria');
    const cat = urgenciaEl ? urgenciaEl.value : 'info';
    let urgencia = 'normal';
    if (cat === 'urgente') urgencia = 'critico';
    else if (cat === 'despacho' || cat === 'taller') urgencia = 'importante';

    const autor = appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : 'Operador';
    const now = new Date();

    const ping = {
        id: 'ping_audio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        mensaje: mensaje,
        audioBase64: base64Audio,
        audioMime: 'audio/wav',
        audioDuration: durationStr,
        urgencia: urgencia,
        autor: autor,
        timestamp: now.toISOString(),
        hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        enterados: [appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : 'me']
    };

    let pings = [];
    try {
        const stored = localStorage.getItem(PINGS_STORAGE_KEY);
        if (stored) pings = JSON.parse(stored) || [];
    } catch(e) {}
    pings.unshift(ping);
    if (pings.length > 50) pings = pings.slice(0, 50);

    try {
        localStorage.setItem(PINGS_STORAGE_KEY, JSON.stringify(pings));
    } catch(storageErr) {
        console.warn("Storage lleno, podando pings viejos con audio:", storageErr);
        let audioCount = 0;
        pings.forEach(p => {
            if (p.audioBase64) {
                audioCount++;
                if (audioCount > 6) delete p.audioBase64;
            }
        });
        try { localStorage.setItem(PINGS_STORAGE_KEY, JSON.stringify(pings)); } catch(e) {}
    }

    appData.pings = pings;
    if (textoEl) textoEl.value = '';
    resetAudioRecordUI();

    renderTorrePings();
    playNotificationSound(urgencia);
    showToast("✓ Mensaje de voz publicado al equipo.", "success");

    sendLiveSignal({ type: 'NEW_PING', payload: ping });
};

// Test manual de altavoz para el usuario
window.probarAltavozSistema = function() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            showToast("Tu navegador no soporta Web Audio API.", "warning");
            return;
        }
        if (!window._sharedAudioCtx || window._sharedAudioCtx.state === 'closed') {
            window._sharedAudioCtx = new AudioCtx();
        }
        if (window._sharedAudioCtx.state === 'suspended') {
            window._sharedAudioCtx.resume().catch(() => {});
        }
        const ctx = window._sharedAudioCtx;

        const notes = [523.25, 659.25, 783.99, 1046.50];
        let delay = 0;
        notes.forEach((freq) => {
            setTimeout(() => {
                try {
                    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
                    const now = ctx.currentTime;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);
                    gain.gain.setValueAtTime(0.28, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.38);
                } catch(e) {
                    console.warn("Error en tono de prueba:", e);
                }
            }, delay);
            delay += 140;
        });

        showToast("🔊 Sonido de prueba reproducido. Altavoces operativos.", "success");
    } catch(err) {
        console.error("Error al probar altavoz:", err);
        showToast("Error al reproducir sonido: " + err.message, "error");
    }
};

// =========================================================
// REPRODUCTOR UNIVERSAL DE AUDIOS DE VOZ
// =========================================================
let currentPlayingPingId = null;
let activeVoiceAudio = null;

window.togglePlayAudioPing = async function(pingId) {
    const btn = document.getElementById(`audio-btn-${pingId}`);
    const barFill = document.getElementById(`audio-bar-fill-${pingId}`);

    // Si este mismo audio está en reproducción, pausarlo
    if (activeVoiceAudio && currentPlayingPingId === pingId) {
        if (!activeVoiceAudio.paused) {
            activeVoiceAudio.pause();
            if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
            return;
        } else {
            try {
                await activeVoiceAudio.play();
                if (btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
                return;
            } catch(e) {}
        }
    }

    // Detener cualquier reproducción previa
    stopAllVoicePlaybacks();

    const p = (appData.pings || []).find(x => x.id === pingId);
    if (!p || !p.audioBase64) {
        showToast("Este aviso no contiene audio reproducible.", "warning");
        return;
    }

    try {
        const audio = new Audio();
        audio.src = p.audioBase64;
        audio.volume = 1.0;
        activeVoiceAudio = audio;
        currentPlayingPingId = pingId;

        audio.ontimeupdate = function() {
            if (currentPlayingPingId !== pingId) return;
            if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                const pct = (audio.currentTime / audio.duration) * 100;
                const bf = document.getElementById(`audio-bar-fill-${pingId}`);
                const te = document.getElementById(`audio-time-${pingId}`);
                if (bf) bf.style.width = `${pct}%`;
                if (te) {
                    const curMins = String(Math.floor(audio.currentTime / 60)).padStart(2, '0');
                    const curSecs = String(Math.floor(audio.currentTime % 60)).padStart(2, '0');
                    const durMins = String(Math.floor(audio.duration / 60)).padStart(2, '0');
                    const durSecs = String(Math.floor(audio.duration % 60)).padStart(2, '0');
                    te.textContent = `${curMins}:${curSecs} / ${durMins}:${durSecs}`;
                }
            }
        };

        audio.onended = function() {
            if (currentPlayingPingId === pingId) {
                const b = document.getElementById(`audio-btn-${pingId}`);
                const bf = document.getElementById(`audio-bar-fill-${pingId}`);
                if (b) b.innerHTML = '<i class="fas fa-play"></i>';
                if (bf) bf.style.width = '0%';
                currentPlayingPingId = null;
                activeVoiceAudio = null;
            }
        };

        audio.onerror = function(err) {
            console.warn("Audio() nativo falló, ejecutando Web Audio API fallback:", err);
            playBase64ViaWebAudio(pingId);
        };

        await audio.play();
        if (btn) btn.innerHTML = '<i class="fas fa-pause"></i>';

    } catch(err) {
        console.warn("Fallo directo en audio.play(), ejecutando decodificador Web Audio:", err);
        playBase64ViaWebAudio(pingId);
    }
};

window.seekAudioPing = function(pingId, event) {
    if (activeVoiceAudio && currentPlayingPingId === pingId && activeVoiceAudio.duration) {
        const barContainer = event.currentTarget;
        const rect = barContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        activeVoiceAudio.currentTime = pct * activeVoiceAudio.duration;
    }
};

async function playBase64ViaWebAudio(pingId) {
    const p = (appData.pings || []).find(x => x.id === pingId);
    if (!p || !p.audioBase64) return;
    const btn = document.getElementById(`audio-btn-${pingId}`);
    const barFill = document.getElementById(`audio-bar-fill-${pingId}`);

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) throw new Error("AudioContext no disponible");
        if (!window._sharedAudioCtx || window._sharedAudioCtx.state === 'closed') {
            window._sharedAudioCtx = new AudioCtx();
        }
        if (window._sharedAudioCtx.state === 'suspended') {
            await window._sharedAudioCtx.resume();
        }
        const ctx = window._sharedAudioCtx;

        const base64Str = p.audioBase64.includes(',') ? p.audioBase64.split(',')[1] : p.audioBase64;
        const binary = atob(base64Str);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

        const decodedBuffer = await new Promise((resolve, reject) => {
            const res = ctx.decodeAudioData(bytes.buffer.slice(0), resolve, reject);
            if (res && typeof res.then === 'function') {
                res.then(resolve).catch(reject);
            }
        });

        const source = ctx.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(ctx.destination);

        if (btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
        currentPlayingPingId = pingId;

        source.onended = function() {
            if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
            if (barFill) barFill.style.width = '0%';
            if (currentPlayingPingId === pingId) currentPlayingPingId = null;
            window._activeAudioSource = null;
        };

        source.start(0);
        window._activeAudioSource = source;
    } catch(e) {
        console.error("Error en Web Audio API decode fallback:", e);
        showToast("Audio anterior no reproducible. Graba uno nuevo con el micrófono.", "warning");
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
        if (barFill) barFill.style.width = '0%';
    }
}

function stopAllVoicePlaybacks() {
    if (activeVoiceAudio) {
        try { activeVoiceAudio.pause(); } catch(e) {}
        activeVoiceAudio = null;
    }
    if (window._activeAudioSource) {
        try { window._activeAudioSource.stop(); } catch(e) {}
        window._activeAudioSource = null;
    }
    if (currentPlayingPingId) {
        const b = document.getElementById(`audio-btn-${currentPlayingPingId}`);
        const bf = document.getElementById(`audio-bar-fill-${currentPlayingPingId}`);
        if (b) b.innerHTML = '<i class="fas fa-play"></i>';
        if (bf) bf.style.width = '0%';
        currentPlayingPingId = null;
    }
}

window.eliminarPing = function(pingId) {
    if (!confirm("¿Deseas eliminar este aviso/audio del muro?")) return;
    try {
        let pings = [];
        const stored = localStorage.getItem(PINGS_STORAGE_KEY);
        if (stored) pings = JSON.parse(stored) || [];
        pings = pings.filter(x => x.id !== pingId);
        localStorage.setItem(PINGS_STORAGE_KEY, JSON.stringify(pings));
        appData.pings = pings;
        stopAllVoicePlaybacks();
        renderTorrePings();
        showToast("Aviso eliminado.", "info");
        sendLiveSignal({ type: 'PING_DELETED', payload: { pingId } });
    } catch(e) {}
};

// =========================================================
// MÓDULO 2: LLAMADAS DE VOZ EN TIEMPO REAL (WEBRTC)
// =========================================================

// Configuración STUN pública estándar gratuita de Google
const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Notificación de llamada parpadeando en la pestaña del navegador
let titleFlashInterval = null;
const originalDocTitle = document.title || 'Acosta Servicios - Contenedores';

function startTitleNotification(text) {
    stopTitleNotification();
    let toggle = false;
    titleFlashInterval = setInterval(() => {
        document.title = toggle ? `🔔 ${text}` : `📞 ACOSTA SERVICIOS — LLAMADA...`;
        toggle = !toggle;
    }, 800);
}

function stopTitleNotification() {
    if (titleFlashInterval) {
        clearInterval(titleFlashInterval);
        titleFlashInterval = null;
        document.title = originalDocTitle;
    }
}

// Tono de timbre sintetizado (Ringtone con Web Audio API)
let ringtoneInterval = null;
function startRingtoneSound() {
    try {
        stopRingtoneSound();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!window._ringCtx || window._ringCtx.state === 'closed') {
            window._ringCtx = new AudioCtx();
        }
        if (window._ringCtx.state === 'suspended') {
            window._ringCtx.resume().catch(() => {});
        }
        const ctx = window._ringCtx;
        
        function beep() {
            if (!ringtoneInterval) return;
            try {
                if (ctx.state === 'suspended') ctx.resume().catch(() => {});
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(480, now);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                osc.start(now);
                osc.stop(now + 0.48);

                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(620, now + 0.12);
                gain2.gain.setValueAtTime(0.18, now + 0.12);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
                osc2.start(now + 0.12);
                osc2.stop(now + 0.58);
            } catch(e) {}
        }

        ringtoneInterval = setInterval(beep, 1600);
        beep();
    } catch(e) {}
}

function stopRingtoneSound() {
    if (ringtoneInterval) {
        clearInterval(ringtoneInterval);
        ringtoneInterval = null;
    }
}

// 1. Iniciar llamada saliente hacia un operador
window.iniciarLlamadaOperador = async function(targetUserId, targetNombre) {
    if (!appData.currentUser) {
        showToast("Debes iniciar sesión para realizar llamadas.", "warning");
        return;
    }

    if (appData.activeCall) {
        showToast("Ya tienes una llamada en curso.", "warning");
        return;
    }

    // Pre-activar elemento de audio y contexto en el gesto del usuario
    const remoteAudio = document.getElementById('remote-call-audio');
    if (remoteAudio) {
        remoteAudio.play().catch(() => {});
    }
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            if (!window._callAudioCtx || window._callAudioCtx.state === 'closed') {
                window._callAudioCtx = new AudioCtx();
            }
            if (window._callAudioCtx.state === 'suspended') {
                window._callAudioCtx.resume().catch(() => {});
            }
        }
    } catch(e) {}

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        appData.localStream = stream;
        appData.pendingCandidates = [];

        const myId = appData.currentUser.id || appData.currentUser.username;
        const myName = appData.currentUser.nombre || appData.currentUser.username;

        appData.activeCall = {
            targetUserId: targetUserId,
            peerName: targetNombre,
            isCaller: true,
            status: 'calling',
            startTime: null
        };

        const targetNameEl = document.getElementById('outgoing-target-name');
        if (targetNameEl) targetNameEl.textContent = targetNombre;
        const modalOut = document.getElementById('modal-outgoing-call');
        if (modalOut) modalOut.style.display = 'flex';

        // Crear PeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        appData.peerConnection = pc;

        // Añadir tracks de audio local
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Manejar audio remoto entrante con doble canal (Audio Element + Web Audio API)
        pc.ontrack = function(event) {
            const streamRemoto = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
            const remoteAudio = document.getElementById('remote-call-audio');
            if (remoteAudio) {
                remoteAudio.srcObject = streamRemoto;
                remoteAudio.volume = 1.0;
                remoteAudio.play().catch(e => console.warn("Autoplay audio remoto bloqueado:", e));
            }
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    if (!window._callAudioCtx || window._callAudioCtx.state === 'closed') {
                        window._callAudioCtx = new AudioCtx();
                    }
                    if (window._callAudioCtx.state === 'suspended') {
                        window._callAudioCtx.resume().catch(() => {});
                    }
                    const source = window._callAudioCtx.createMediaStreamSource(streamRemoto);
                    source.connect(window._callAudioCtx.destination);
                    appData.callAudioSourceNode = source;
                }
            } catch(webaudioErr) {
                console.warn("Web Audio bridge opcional:", webaudioErr);
            }
        };

        // Enviar ICE candidates al destinatario con serialización plana
        pc.onicecandidate = function(event) {
            if (event.candidate && event.candidate.candidate) {
                sendLiveSignal({
                    type: 'CALL_ICE_CANDIDATE',
                    fromId: myId,
                    fromName: myName,
                    toId: targetUserId,
                    toName: targetNombre,
                    candidate: {
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid,
                        sdpMLineIndex: event.candidate.sdpMLineIndex
                    }
                });
            }
        };

        // Crear oferta SDP
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        startRingtoneSound();

        // Notificar al destinatario mediante bus de señalización
        sendLiveSignal({
            type: 'CALL_OFFER',
            fromId: myId,
            fromName: myName,
            toId: targetUserId,
            toName: targetNombre,
            offer: offer
        });

    } catch(err) {
        console.error("Error al iniciar llamada:", err);
        showToast("No se pudo iniciar la llamada. Verifique el micrófono.", "error");
        cancelarLlamadaSaliente();
    }
};

window.cancelarLlamadaSaliente = function() {
    stopRingtoneSound();
    stopTitleNotification();
    const modalOut = document.getElementById('modal-outgoing-call');
    if (modalOut) modalOut.style.display = 'none';

    if (appData.activeCall) {
        const myId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';
        const myName = appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : '';
        sendLiveSignal({
            type: 'CALL_REJECTED',
            fromId: myId,
            fromName: myName,
            toId: appData.activeCall.targetUserId,
            toName: appData.activeCall.peerName
        });
    }

    limpiarRecursosLlamada();
};

// 2. Manejo de Llamada Entrante (Destinatario)
window.mostrarLlamadaEntrante = function(fromId, fromName, offer) {
    if (appData.activeCall) {
        // Ocupado en otra llamada
        const myId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';
        const myName = appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : '';
        sendLiveSignal({
            type: 'CALL_BUSY',
            toId: fromId,
            toName: fromName,
            fromId: myId,
            fromName: myName
        });
        return;
    }

    appData.activeCall = {
        peerId: fromId,
        peerName: fromName,
        isCaller: false,
        status: 'ringing',
        pendingOffer: offer
    };
    appData.pendingCandidates = [];

    const callerNameEl = document.getElementById('incoming-caller-name');
    if (callerNameEl) callerNameEl.textContent = fromName;
    const modalIn = document.getElementById('modal-incoming-call');
    if (modalIn) {
        modalIn.style.setProperty('display', 'flex', 'important');
    }

    startRingtoneSound();
    startTitleNotification(`LLAMADA DE ${fromName.toUpperCase()}`);
};

window.rechazarLlamadaEntrante = function() {
    stopRingtoneSound();
    stopTitleNotification();
    const modalIn = document.getElementById('modal-incoming-call');
    if (modalIn) modalIn.style.display = 'none';

    if (appData.activeCall) {
        const myId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';
        const myName = appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : '';
        sendLiveSignal({
            type: 'CALL_REJECTED',
            fromId: myId,
            fromName: myName,
            toId: appData.activeCall.peerId,
            toName: appData.activeCall.peerName
        });
    }

    limpiarRecursosLlamada();
};

window.atenderLlamadaEntrante = async function() {
    stopRingtoneSound();
    stopTitleNotification();
    const modalIn = document.getElementById('modal-incoming-call');
    if (modalIn) modalIn.style.display = 'none';

    if (!appData.activeCall || !appData.activeCall.pendingOffer) return;

    // Pre-activar elemento de audio y contexto en el gesto del usuario
    const remoteAudio = document.getElementById('remote-call-audio');
    if (remoteAudio) {
        remoteAudio.play().catch(() => {});
    }
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            if (!window._callAudioCtx || window._callAudioCtx.state === 'closed') {
                window._callAudioCtx = new AudioCtx();
            }
            if (window._callAudioCtx.state === 'suspended') {
                window._callAudioCtx.resume().catch(() => {});
            }
        }
    } catch(e) {}

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        appData.localStream = stream;

        const myId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';
        const myName = appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : '';
        const peerId = appData.activeCall.peerId;
        const peerName = appData.activeCall.peerName;

        const pc = new RTCPeerConnection(RTC_CONFIG);
        appData.peerConnection = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Manejar audio remoto entrante con doble canal (Audio Element + Web Audio API)
        pc.ontrack = function(event) {
            const streamRemoto = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
            const remoteAudio = document.getElementById('remote-call-audio');
            if (remoteAudio) {
                remoteAudio.srcObject = streamRemoto;
                remoteAudio.volume = 1.0;
                remoteAudio.play().catch(e => console.warn("Autoplay audio remoto bloqueado:", e));
            }
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    if (!window._callAudioCtx || window._callAudioCtx.state === 'closed') {
                        window._callAudioCtx = new AudioCtx();
                    }
                    if (window._callAudioCtx.state === 'suspended') {
                        window._callAudioCtx.resume().catch(() => {});
                    }
                    const source = window._callAudioCtx.createMediaStreamSource(streamRemoto);
                    source.connect(window._callAudioCtx.destination);
                    appData.callAudioSourceNode = source;
                }
            } catch(webaudioErr) {
                console.warn("Web Audio bridge opcional:", webaudioErr);
            }
        };

        // Enviar ICE candidates al destinatario con serialización plana
        pc.onicecandidate = function(event) {
            if (event.candidate && event.candidate.candidate) {
                sendLiveSignal({
                    type: 'CALL_ICE_CANDIDATE',
                    fromId: myId,
                    fromName: myName,
                    toId: peerId,
                    toName: peerName,
                    candidate: {
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid,
                        sdpMLineIndex: event.candidate.sdpMLineIndex
                    }
                });
            }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(appData.activeCall.pendingOffer));

        // Vaciar ICE candidates que hayan llegado previamente
        if (appData.pendingCandidates && appData.pendingCandidates.length > 0) {
            for (const cand of appData.pendingCandidates) {
                try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch(e) {}
            }
            appData.pendingCandidates = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendLiveSignal({
            type: 'CALL_ANSWER',
            fromId: myId,
            fromName: myName,
            toId: peerId,
            toName: peerName,
            answer: answer
        });

        iniciarConexionActivaUI(appData.activeCall.peerName);

    } catch(err) {
        console.error("Error al atender llamada:", err);
        showToast("Error al activar audio para la llamada.", "error");
        limpiarRecursosLlamada();
    }
};

// 3. Conexión Establecida (UI Flotante y Duración)
function iniciarConexionActivaUI(peerName) {
    stopRingtoneSound();
    stopTitleNotification();
    const modalOut = document.getElementById('modal-outgoing-call');
    const modalIn = document.getElementById('modal-incoming-call');
    if (modalOut) modalOut.style.display = 'none';
    if (modalIn) modalIn.style.display = 'none';

    const bar = document.getElementById('active-call-floating-bar');
    const nameEl = document.getElementById('call-active-peer-name');
    const timerEl = document.getElementById('call-duration-timer');
    if (nameEl) nameEl.textContent = peerName;
    if (bar) bar.style.display = 'flex';

    let seconds = 0;
    if (timerEl) timerEl.textContent = '00:00';
    clearInterval(appData.callTimerInterval);
    appData.callTimerInterval = setInterval(function() {
        seconds++;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);

    showToast(`📞 Llamada conectada con ${peerName}`, "success");
    logOperationalEvent('alta', `Comunicación por voz iniciada con ${peerName}`);
}

window.toggleMuteCallMic = function() {
    if (!appData.localStream) return;
    const audioTrack = appData.localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    const btn = document.getElementById('btn-call-mute');
    if (btn) {
        if (audioTrack.enabled) {
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-secondary');
            showToast("Micrófono activado", "info");
        } else {
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-danger');
            showToast("Micrófono silenciado", "warning");
        }
    }
};

window.finalizarLlamadaActiva = function() {
    stopRingtoneSound();
    stopTitleNotification();
    if (appData.activeCall) {
        const myId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';
        const myName = appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : '';
        const target = appData.activeCall.targetUserId || appData.activeCall.peerId;
        const targetName = appData.activeCall.peerName || '';
        if (target) {
            sendLiveSignal({
                type: 'CALL_ENDED',
                fromId: myId,
                fromName: myName,
                toId: target,
                toName: targetName
            });
        }
    }

    limpiarRecursosLlamada();
    showToast("Llamada finalizada.", "info");
};

function limpiarRecursosLlamada() {
    stopRingtoneSound();
    stopTitleNotification();
    clearInterval(appData.callTimerInterval);
    appData.callTimerInterval = null;

    if (appData.localStream) {
        appData.localStream.getTracks().forEach(t => t.stop());
        appData.localStream = null;
    }

    if (appData.peerConnection) {
        try { appData.peerConnection.close(); } catch(e) {}
        appData.peerConnection = null;
    }

    const remoteAudio = document.getElementById('remote-call-audio');
    if (remoteAudio) {
        remoteAudio.srcObject = null;
    }

    if (appData.callAudioSourceNode) {
        try { appData.callAudioSourceNode.disconnect(); } catch(e) {}
        appData.callAudioSourceNode = null;
    }

    const bar = document.getElementById('active-call-floating-bar');
    const modalIn = document.getElementById('modal-incoming-call');
    const modalOut = document.getElementById('modal-outgoing-call');
    if (bar) bar.style.display = 'none';
    if (modalIn) modalIn.style.display = 'none';
    if (modalOut) modalOut.style.display = 'none';

    appData.activeCall = null;
    appData.pendingCandidates = [];
}

window.renderTorrePings = function() {
    const listContainer = document.getElementById('torre-pings-list');
    if (!listContainer) return;

    let pings = appData.pings || [];
    if (pings.length === 0) {
        try {
            const stored = localStorage.getItem(PINGS_STORAGE_KEY);
            if (stored) pings = JSON.parse(stored) || [];
            appData.pings = pings;
        } catch(e) {}
    }

    if (pings.length === 0) {
        listContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13px;">No hay pings u avisos de despacho activos.<br><small>Usa el formulario arriba para enviar un anuncio inmediato al equipo.</small></div>';
        return;
    }

    const currentUserId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';

    listContainer.innerHTML = pings.map(p => {
        const isEnterado = Array.isArray(p.enterados) && p.enterados.includes(currentUserId);
        const enteradosCount = Array.isArray(p.enterados) ? p.enterados.length : 0;
        
        let borderUrgency = 'rgba(56, 189, 248, 0.2)';
        let badgeUrgency = '<span class="torre-event-badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">Informativo</span>';
        if (p.urgencia === 'critico') {
            borderUrgency = 'rgba(239, 68, 68, 0.6)';
            badgeUrgency = '<span class="torre-event-badge" style="background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid #ef4444;"><i class="fas fa-exclamation-triangle"></i> Urgencia Crítica</span>';
        } else if (p.urgencia === 'importante') {
            borderUrgency = 'rgba(245, 158, 11, 0.5)';
            badgeUrgency = '<span class="torre-event-badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b;"><i class="fas fa-bell"></i> Importante</span>';
        }

        // Resaltar códigos de contenedor en el texto (ej: C-101) para hacerlos clicables
        const formattedMsg = p.mensaje ? p.mensaje.replace(/\b(C-\d+)\b/gi, '<a href="javascript:void(0)" onclick="toggleTorreControl(false); abrirModalFicha(\'$1\')" style="color: #38bdf8; font-weight: 800; text-decoration: underline;">$1</a>') : '';

        return `
            <div class="torre-ping-card" style="border-left: 4px solid ${borderUrgency};">
                <div class="torre-event-header">
                    <div>${badgeUrgency}</div>
                    <span class="torre-event-time"><i class="far fa-clock"></i> ${p.hora || ''}</span>
                </div>
                ${formattedMsg ? `<div class="torre-ping-body" style="font-size: 13px; color: #f8fafc; line-height: 1.4; margin: 8px 0;">${formattedMsg}</div>` : ''}
                ${p.audioBase64 ? `
                    <div class="custom-audio-player" style="display: flex; align-items: center; gap: 10px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 8px 12px; margin: 6px 0;">
                        <button type="button" class="btn btn-primary btn-sm custom-audio-btn" id="audio-btn-${p.id}" onclick="togglePlayAudioPing('${p.id}')" style="min-width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px;" title="Reproducir audio de voz">
                            <i class="fas fa-play"></i>
                        </button>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-size: 11px; font-weight: 700; color: #38bdf8;">
                                    <i class="fas fa-volume-up"></i> Mensaje de Voz de Despacho
                                </span>
                                <span id="audio-time-${p.id}" style="font-size: 10px; font-family: monospace; color: #94a3b8;">${p.audioDuration || '00:05'}</span>
                            </div>
                            <div class="audio-progress-bar" style="background: rgba(255,255,255,0.12); height: 5px; border-radius: 3px; overflow: hidden; cursor: pointer;" onclick="seekAudioPing('${p.id}', event)" title="Avanzar / retroceder">
                                <div id="audio-bar-fill-${p.id}" style="width: 0%; height: 100%; background: #38bdf8; transition: width 0.1s linear;"></div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                <div class="torre-event-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px; margin-top: 6px;">
                    <span style="font-size: 11.5px; color: #94a3b8;"><i class="far fa-user"></i> ${p.autor}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; color: #64748b;" title="Operadores que leyeron"><i class="fas fa-check-double"></i> ${enteradosCount}</span>
                        ${isEnterado ? 
                            `<span style="font-size: 11px; color: #10b981; font-weight: 600;"><i class="fas fa-check"></i> Enterado</span>` :
                            `<button class="btn btn-secondary btn-sm" onclick="marcarPingEnterado('${p.id}')" style="font-size: 11px; padding: 2px 7px;"><i class="fas fa-hand-paper"></i> Enterado</button>`
                        }
                        <button type="button" class="btn btn-secondary btn-sm" onclick="eliminarPing('${p.id}')" style="font-size: 10px; padding: 2px 6px; color: #f87171; border-color: rgba(239, 68, 68, 0.25);" title="Eliminar este aviso">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.marcarPingEnterado = function(pingId) {
    if (!appData.currentUser) return;
    const currentUserId = appData.currentUser.id || appData.currentUser.username;
    let pings = [];
    try {
        const stored = localStorage.getItem(PINGS_STORAGE_KEY);
        if (stored) pings = JSON.parse(stored) || [];
        const p = pings.find(x => x.id === pingId);
        if (p) {
            if (!Array.isArray(p.enterados)) p.enterados = [];
            if (!p.enterados.includes(currentUserId)) {
                p.enterados.push(currentUserId);
                localStorage.setItem(PINGS_STORAGE_KEY, JSON.stringify(pings));
                appData.pings = pings;
                renderTorrePings();
                sendLiveSignal({ type: 'PING_ACK', payload: { pingId, userId: currentUserId } });
            }
        }
    } catch(err) {
        console.warn("Error al marcar ping enterado:", err);
    }
};

window.updatePingsBadge = function() {
    const badge = document.getElementById('tower-pings-badge') || document.getElementById('torre-unread-badge');
    const tabCount = document.getElementById('torre-pings-tab-count');
    if (badge) {
        if (appData.unreadPingsCount > 0) {
            badge.textContent = appData.unreadPingsCount;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
    if (tabCount) {
        if (appData.unreadPingsCount > 0) {
            tabCount.textContent = appData.unreadPingsCount;
            tabCount.style.display = 'inline-block';
        } else {
            tabCount.style.display = 'none';
        }
    }
};

// 4. BITÁCORA Y NOTAS COLABORATIVAS POR CONTENEDOR (Ficha Viva)
window.renderNotasContenedor = function(c) {
    const container = document.getElementById('notas-contenedor-list');
    if (!container) return;
    const notas = Array.isArray(c.notas) ? c.notas : [];
    if (notas.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; font-size: 12px; font-style: italic; padding: 6px 0;">No hay notas operativas en la bitácora aún. Agregue la primera aquí abajo.</div>';
        return;
    }
    container.innerHTML = notas.map(n => `
        <div class="nota-item-row">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <strong style="color: #38bdf8; font-size: 12px;"><i class="far fa-user"></i> ${n.autor || 'Operador'}</strong>
                <span style="color: #64748b; font-size: 11px;">${n.fecha || ''}</span>
            </div>
            <div style="color: #f1f5f9; font-size: 12.5px; line-height: 1.35;">${n.texto}</div>
        </div>
    `).join('');
};

window.agregarNotaContenedor = function(code) {
    const input = document.getElementById('nueva-nota-input');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto) {
        showToast("Escriba una nota para registrar en la bitácora.", "warning");
        return;
    }
    const c = (appData.contenedores || []).find(x => x.code === code);
    if (!c) return;

    if (!Array.isArray(c.notas)) c.notas = [];
    const now = new Date();
    const fechaStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const autor = appData.currentUser ? (appData.currentUser.nombre || appData.currentUser.username) : 'Operador';

    c.notas.unshift({
        id: 'nota_' + Date.now(),
        autor: autor,
        texto: texto,
        fecha: fechaStr
    });

    saveData();
    input.value = '';
    renderNotasContenedor(c);
    logOperationalEvent('alta', `Nota añadida en contenedor ${c.code}: "${texto.slice(0, 35)}..."`, c.code);
    showToast("✓ Nota guardada en la bitácora del contenedor.", "success");

    sendLiveSignal({ type: 'NOTE_ADDED', payload: { code, nota: c.notas[0] } });
};

// 5. INICIALIZACIÓN DEL MOTOR MULTIPLAYER Y SEÑALIZACIÓN EN VIVO
window.initCollaborativeEngine = function() {
    console.log("Iniciando Motor Colaborativo Acosta Servicios...");

    // Cargar historial de eventos y pings desde almacenamiento local
    try {
        const storedEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
        if (storedEvents) appData.activityEvents = JSON.parse(storedEvents) || [];
        const storedPings = localStorage.getItem(PINGS_STORAGE_KEY);
        if (storedPings) appData.pings = JSON.parse(storedPings) || [];
        const storedPresence = localStorage.getItem(PRESENCE_STORAGE_KEY);
        if (storedPresence) appData.onlineUsers = JSON.parse(storedPresence) || {};
    } catch(e) {}

    // Enviar heartbeat inicial
    sendPresenceHeartbeat();

    // Heartbeat regular cada 15 segundos
    setInterval(function() {
        sendPresenceHeartbeat();
    }, 15000);

    // Despachador centralizado de mensajes en vivo (recibe tanto de BroadcastChannel como de localStorage)
    window.handleLiveMessage = function(data, source) {
        if (!data || !data.type) return;

        // Evitar procesar mensajes emitidos por esta misma pestaña/instancia
        const myId = appData.currentUser ? (appData.currentUser.id || appData.currentUser.username) : '';
        if (data._fromUserId && String(data._fromUserId).toLowerCase() === String(myId).toLowerCase() && !data._broadcastToSelf) {
            return;
        }

        // Deduplicación entre BroadcastChannel y Storage Event
        const dedupKey = data._mid || `${data.type}_${data.fromId || ''}_${data.toId || ''}_${data._ts || ''}`;
        if (processedLiveMessageIds.has(dedupKey)) return;
        processedLiveMessageIds.add(dedupKey);
        if (processedLiveMessageIds.size > 300) {
            const first = processedLiveMessageIds.values().next().value;
            processedLiveMessageIds.delete(first);
        }

        if (data.type === 'PRESENCE_PING') {
            if (!appData.onlineUsers) appData.onlineUsers = {};
            appData.onlineUsers[data.payload.userId] = data.payload;
            renderOnlineUsers();
        } else if (data.type === 'OPERATIONAL_EVENT') {
            if (!Array.isArray(appData.activityEvents)) appData.activityEvents = [];
            appData.activityEvents.unshift(data.payload);
            renderTorreEvents();
        } else if (data.type === 'NEW_PING') {
            if (!Array.isArray(appData.pings)) appData.pings = [];
            if (!appData.pings.some(x => x.id === data.payload.id)) {
                appData.pings.unshift(data.payload);
                if (!appData.isTorreOpen) {
                    appData.unreadPingsCount = (appData.unreadPingsCount || 0) + 1;
                    updatePingsBadge();
                }
                renderTorrePings();
                playNotificationSound(data.payload.urgencia);
                showToast(`🔔 Aviso de ${data.payload.autor}: ${(data.payload.mensaje || 'Voz').slice(0, 45)}...`, 'info');
            }
        } else if (data.type === 'PING_ACK') {
            const p = (appData.pings || []).find(x => x.id === data.payload.pingId);
            if (p) {
                if (!Array.isArray(p.enterados)) p.enterados = [];
                if (!p.enterados.includes(data.payload.userId)) {
                    p.enterados.push(data.payload.userId);
                    renderTorrePings();
                }
            }
        } else if (data.type === 'PING_DELETED') {
            if (data.payload && data.payload.pingId) {
                if (Array.isArray(appData.pings)) {
                    appData.pings = appData.pings.filter(x => x.id !== data.payload.pingId);
                    renderTorrePings();
                }
            }
        } else if (data.type === 'DATA_UPDATE') {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    appData.contenedores = JSON.parse(stored);
                    if (appData.currentView === 'flota') renderFlotaTable();
                    if (appData.currentView === 'dashboard') renderDashboard();
                    if (appData.currentView === 'alquileres') renderAlquileresTable();
                }
            } catch(e) {}
        } else if (data.type === 'NOTE_ADDED') {
            const c = (appData.contenedores || []).find(x => x.code === data.payload.code);
            if (c) {
                if (!Array.isArray(c.notas)) c.notas = [];
                c.notas.unshift(data.payload.nota);
                if (appData.currentFocusedCode === data.payload.code) {
                    renderNotasContenedor(c);
                }
            }
        } else if (data.type === 'CALL_OFFER') {
            if (isCurrentUserRecipient(data.toId, data.toName)) {
                window.mostrarLlamadaEntrante(data.fromId, data.fromName, data.offer);
            }
        } else if (data.type === 'CALL_ANSWER') {
            if (isCurrentUserRecipient(data.toId, data.toName) && appData.peerConnection && appData.activeCall) {
                appData.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
                    .then(async () => {
                        if (appData.pendingCandidates && appData.pendingCandidates.length > 0) {
                            for (const cand of appData.pendingCandidates) {
                                try { await appData.peerConnection.addIceCandidate(new RTCIceCandidate(cand)); } catch(e) {}
                            }
                            appData.pendingCandidates = [];
                        }
                        const remoteAudio = document.getElementById('remote-call-audio');
                        if (remoteAudio && remoteAudio.paused) {
                            remoteAudio.play().catch(() => {});
                        }
                        iniciarConexionActivaUI(appData.activeCall.peerName);
                    })
                    .catch(err => console.error("Error setting remote description on answer:", err));
            }
        } else if (data.type === 'CALL_ICE_CANDIDATE') {
            if (isCurrentUserRecipient(data.toId, data.toName) && data.candidate && (data.candidate.candidate || typeof data.candidate === 'string')) {
                if (appData.peerConnection && appData.peerConnection.remoteDescription && appData.peerConnection.remoteDescription.type) {
                    appData.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
                        .catch(err => console.warn("Error adding ICE candidate:", err));
                } else {
                    if (!appData.pendingCandidates) appData.pendingCandidates = [];
                    appData.pendingCandidates.push(data.candidate);
                }
            }
        } else if (data.type === 'CALL_REJECTED') {
            if (isCurrentUserRecipient(data.toId, data.toName) && appData.activeCall) {
                stopRingtoneSound();
                stopTitleNotification();
                showToast("La llamada fue rechazada o cancelada.", "warning");
                limpiarRecursosLlamada();
            }
        } else if (data.type === 'CALL_BUSY') {
            if (isCurrentUserRecipient(data.toId, data.toName) && appData.activeCall) {
                stopRingtoneSound();
                stopTitleNotification();
                showToast("El operador está ocupado en otra llamada.", "warning");
                limpiarRecursosLlamada();
            }
        } else if (data.type === 'CALL_ENDED') {
            if (isCurrentUserRecipient(data.toId, data.toName) && appData.activeCall) {
                stopRingtoneSound();
                stopTitleNotification();
                showToast("Llamada finalizada por el otro operador.", "info");
                limpiarRecursosLlamada();
            }
        }
    };

    // 1. Escuchar BroadcastChannel
    if (liveChannel) {
        liveChannel.onmessage = function(event) {
            window.handleLiveMessage(event.data, 'broadcast');
        };
    }

    // 2. Escuchar Storage Event (comunicación instantánea garantizada entre pestañas)
    window.addEventListener('storage', function(e) {
        if (e.key === 'sg_contenedores_live_bus' && e.newValue) {
            try {
                const msg = JSON.parse(e.newValue);
                window.handleLiveMessage(msg, 'storage');
            } catch(err) {}
        }
    });

    renderOnlineUsers();
    renderTorreEvents();
    renderTorrePings();
    updatePingsBadge();
};

// Navegación de Vistas
// =========================================================
// HISTORIAL DE NAVEGACIÓN Y BOTÓN VOLVER GLOBAL
// =========================================================

appData.navigationHistory = [];

const VIEW_NAMES = {
    'dashboard': 'Tablero',
    'flota': 'Contenedores',
    'alquileres': 'Alquileres',
    'mantenimiento': 'Taller',
    'mapa': 'Mapa',
    'configuracion': 'Configuración'
};

window.switchView = function(viewId, isBack) {
    if (!isBack && appData.currentView && appData.currentView !== viewId) {
        if (!Array.isArray(appData.navigationHistory)) appData.navigationHistory = [];
        appData.navigationHistory.push(appData.currentView);
    }

    appData.currentView = viewId;
    document.querySelectorAll('.view-section').forEach(function(sec) { sec.style.display = 'none'; });
    document.querySelectorAll('.nav-tab-btn').forEach(function(btn) { btn.classList.remove('active'); });

    const targetSec = document.getElementById('view-' + viewId);
    const targetBtn = document.getElementById('nav-btn-' + viewId);
    if (targetSec) targetSec.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');

    updateBackButtonState();

    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'flota') renderFlotaTable();
    if (viewId === 'alquileres') renderAlquileresTable();
    if (viewId === 'mantenimiento') renderMantenimientoBoard();
    if (viewId === 'configuracion') {
        renderConfigUsuariosTable();
        renderConfigParametrosForm();
    }
    if (viewId === 'mapa') {
        setTimeout(function() { 
            initMap(); 
            if (appData.mapInstance) appData.mapInstance.invalidateSize(); 
        }, 150);
    }

    try { sendPresenceHeartbeat(); } catch(e) {}
};

window.goBack = function() {
    if (Array.isArray(appData.navigationHistory) && appData.navigationHistory.length > 0) {
        const prevView = appData.navigationHistory.pop();
        window.switchView(prevView, true);
    } else {
        window.switchView('dashboard', true);
    }
};

function updateBackButtonState() {
    const btnBack = document.getElementById('btn-global-back');
    const label = document.getElementById('btn-global-back-label');

    const hasHistory = Array.isArray(appData.navigationHistory) && appData.navigationHistory.length > 0;
    const isNotHome = appData.currentView !== 'dashboard';

    if (btnBack) {
        btnBack.style.display = 'inline-flex';
        if (hasHistory) {
            const prev = appData.navigationHistory[appData.navigationHistory.length - 1];
            const prevName = VIEW_NAMES[prev] || 'Anterior';
            if (label) label.textContent = 'Volver a ' + prevName;
        } else if (isNotHome) {
            if (label) label.textContent = 'Volver al Tablero';
        } else {
            if (label) label.textContent = 'Volver';
        }
    }
}

window.switchConfigSubTab = function(tabId) {
    document.querySelectorAll('.config-subtab-pane').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.config-subtab-btn').forEach(el => el.classList.remove('active'));

    const targetPane = document.getElementById(`config-pane-${tabId}`);
    const targetBtn = document.getElementById(`config-subtab-${tabId}`);
    if (targetPane) targetPane.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');
};

// Variables para filtrado dinámico del Dashboard
if (!appData.dashTableFilter) appData.dashTableFilter = 'todos';
if (!appData.dashTableSearch) appData.dashTableSearch = '';

// Métricas y Dashboard
function getMetrics() {
    const list = appData.contenedores || [];
    const total = list.length;
    const alquilados = list.filter(x => x.estado === 'alquilado').length;
    const enBaseList = list.filter(x => x.estado === 'empresa');
    const empresa = enBaseList.length;
    
    // Conteo por titularidad en Base (Acosta vs SG)
    let enBaseAcosta = 0;
    let enBaseSg = 0;
    enBaseList.forEach(x => {
        const p = (x.proveedor || '').toUpperCase();
        if (p.includes('SG') || p.includes('MONTAJES')) {
            enBaseSg++;
        } else {
            enBaseAcosta++;
        }
    });
    const reservados = list.filter(x => x.estado === 'reservado').length;
    const reparacion = list.filter(x => x.estado === 'reparacion').length;
    const retrasados = list.filter(x => x.pago === 'retrasado').length;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vencidosList = [];
    const porVencerList = [];

    list.forEach(x => {
        if (x.estado === 'alquilado' && x.retiro) {
            const d = new Date(x.retiro + "T00:00:00");
            const diffDays = Math.ceil((d - hoy) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                vencidosList.push(Object.assign({}, x, { dias: Math.abs(diffDays) }));
            } else if (diffDays <= 7) {
                porVencerList.push(Object.assign({}, x, { dias: diffDays }));
            }
        }
    });

    const ocupacionPct = total > 0 ? ((alquilados / total) * 100).toFixed(1) : 0;

    return { 
        total: total, 
        alquilados: alquilados, 
        empresa: empresa, 
        enBaseAcosta: enBaseAcosta,
        enBaseSg: enBaseSg,
        reservados: reservados, 
        reparacion: reparacion, 
        retrasados: retrasados, 
        vencidos: vencidosList.length, 
        porVencer: porVencerList.length, 
        vencidosList: vencidosList,
        porVencerList: porVencerList,
        ocupacionPct: ocupacionPct 
    };
}

function renderHeaderStats() {
    const m = getMetrics();
    const el = document.getElementById('header-stats-summary');
    if (el) {
        el.innerHTML = `<strong>${m.alquilados}</strong> en obra (${m.ocupacionPct}%) • <strong>${m.empresa}</strong> en base • <strong>${m.reparacion}</strong> en taller`;
    }
}

function renderDashboard() {
    const m = getMetrics();
    const list = appData.contenedores || [];

    // 1. Render KPI Grid
    const kpiContainer = document.getElementById('dashboard-kpi-grid');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-card kpi-total" onclick="filterAndGoFlota('todos')">
                <div class="kpi-card-header">
                    <span class="kpi-label">Flota Total</span>
                    <i class="fas fa-boxes-stacked kpi-card-icon" style="color: #38bdf8;"></i>
                </div>
                <span class="kpi-value">${m.total}</span>
                <span class="kpi-sub">100% unidades registradas</span>
            </div>

            <div class="kpi-card kpi-alquilado" onclick="filterAndGoFlota('alquilado')">
                <div class="kpi-card-header">
                    <span class="kpi-label">Alquilados en Obra</span>
                    <i class="fas fa-hard-hat kpi-card-icon" style="color: #0284c7;"></i>
                </div>
                <span class="kpi-value" style="color: #38bdf8;">${m.alquilados}</span>
                <span class="kpi-sub"><span class="pulse-dot pulse-green"></span> ${m.ocupacionPct}% de ocupación activa</span>
            </div>

            <div class="kpi-card kpi-empresa" onclick="abrirModalDisponiblesBase()" title="Click para ver desglose Acosta vs SG Montajes" style="cursor: pointer; position: relative;">
                <div class="kpi-card-header">
                    <span class="kpi-label">Disponibles en Base</span>
                    <span style="font-size: 10px; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; border-radius: 4px; padding: 1px 5px; font-weight: 700;">
                        Ver Desglose 🔍
                    </span>
                </div>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                    <span class="kpi-value" style="color: #10b981;">${m.empresa}</span>
                    <span style="font-size: 12px; color: #94a3b8; font-weight: bold;">totales</span>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 6px; font-size: 11px; font-weight: 700;">
                    <span style="background: rgba(2, 132, 199, 0.25); color: #38bdf8; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.4);">
                        🔵 Acosta: <strong>${m.enBaseAcosta}</strong>
                    </span>
                    <span style="background: rgba(245, 158, 11, 0.25); color: #fbbf24; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.4);">
                        ⚙️ SG: <strong>${m.enBaseSg}</strong>
                    </span>
                </div>
                <span class="kpi-sub" style="margin-top: 6px;">Tocá acá para ver el detalle</span>
            </div>

            <div class="kpi-card kpi-reservado" onclick="filterAndGoFlota('reservado')">
                <div class="kpi-card-header">
                    <span class="kpi-label">Reservados</span>
                    <i class="fas fa-calendar-check kpi-card-icon" style="color: #f59e0b;"></i>
                </div>
                <span class="kpi-value" style="color: #f59e0b;">${m.reservados}</span>
                <span class="kpi-sub">Próximos despachos asignados</span>
            </div>

            <div class="kpi-card kpi-reparacion" onclick="filterAndGoFlota('reparacion')">
                <div class="kpi-card-header">
                    <span class="kpi-label">En Taller / Mantenimiento</span>
                    <i class="fas fa-tools kpi-card-icon" style="color: #f43f5e;"></i>
                </div>
                <span class="kpi-value" style="color: #f43f5e;">${m.reparacion}</span>
                <span class="kpi-sub">${m.reparacion > 0 ? '<span class="pulse-dot pulse-red"></span> En reparación técnica' : 'Sin unidades fuera de servicio'}</span>
            </div>

            <div class="kpi-card kpi-vencidos" onclick="switchView('alquileres')">
                <div class="kpi-card-header">
                    <span class="kpi-label">Vencimientos & Pagos</span>
                    <i class="fas fa-triangle-exclamation kpi-card-icon" style="color: #e11d48;"></i>
                </div>
                <span class="kpi-value" style="color: #f43f5e;">${m.vencidos + m.retrasados}</span>
                <span class="kpi-sub">${m.vencidos} vencidos • ${m.retrasados} mora de pago</span>
            </div>
        `;
    }

    // 2. Banner de alertas
    const alertsBox = document.getElementById('dashboard-alerts-banner');
    if (alertsBox) {
        if (m.retrasados > 0 || m.vencidos > 0 || m.porVencer > 0) {
            alertsBox.style.display = 'flex';
            alertsBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-triangle" style="color: #f43f5e; font-size: 18px;"></i>
                    <div>
                        <strong style="color: #ffffff;">Atención Operativa:</strong> 
                        Se detectaron <strong>${m.vencidos}</strong> contratos vencidos, <strong>${m.porVencer}</strong> por vencer esta semana y <strong>${m.retrasados}</strong> clientes en mora de pago.
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-danger btn-sm" onclick="switchView('alquileres')">Ver Contratos →</button>
                </div>
            `;
        } else {
            alertsBox.style.display = 'none';
        }
    }

    // 3. Widget 1: Ocupación por Modelo/Tipo
    const typesContainer = document.getElementById('dash-types-container');
    const utilPctLabel = document.getElementById('dash-utilization-pct');
    if (utilPctLabel) utilPctLabel.textContent = `${m.ocupacionPct}% Ocupación Global`;

    if (typesContainer) {
        const tiposMap = {};
        list.forEach(c => {
            const t = c.tipo || 'Obrador';
            if (!tiposMap[t]) tiposMap[t] = { total: 0, alquilados: 0, libres: 0 };
            tiposMap[t].total++;
            if (c.estado === 'alquilado') tiposMap[t].alquilados++;
            else if (c.estado === 'empresa') tiposMap[t].libres++;
        });

        typesContainer.innerHTML = Object.keys(tiposMap).map(tipo => {
            const data = tiposMap[tipo];
            const pct = data.total > 0 ? ((data.alquilados / data.total) * 100).toFixed(0) : 0;
            return `
                <div class="dash-type-item" style="cursor: pointer;" onclick="filterAndGoFlotaByTipo('${tipo}')" title="Filtrar flota por ${tipo}">
                    <div class="dash-type-row">
                        <span style="font-weight: 600; color: #ffffff;">${tipo}</span>
                        <span style="font-size: 11px; color: #94a3b8;">
                            <strong style="color: #38bdf8;">${data.alquilados}</strong> en obra / <span style="color: #10b981;">${data.libres}</span> en base (${pct}%)
                        </span>
                    </div>
                    <div class="dash-type-bar-bg">
                        <div class="dash-type-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 4. Widget 2: Alertas de Vencimiento y Próximos Retiros
    const alertsContainer = document.getElementById('dash-alerts-container');
    if (alertsContainer) {
        const criticalItems = m.vencidosList.concat(m.porVencerList);
        if (criticalItems.length === 0) {
            alertsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px 10px; color: #10b981; font-size: 12px;">
                    <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 6px; display: block;"></i>
                    Todos los contratos están al día y sin vencimientos pendientes.
                </div>
            `;
        } else {
            alertsContainer.innerHTML = criticalItems.map(item => {
                const isExpired = m.vencidosList.includes(item);
                const tagClass = isExpired ? 'dash-alert-item' : 'dash-alert-item warning-item';
                const tagText = isExpired ? `Venció hace ${item.dias} d.` : `Vence en ${item.dias} d.`;
                const badgeColor = isExpired ? '#f43f5e' : '#f59e0b';

                return `
                    <div class="${tagClass}">
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <div style="font-weight: bold; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                                <span style="font-family: monospace; color: #38bdf8;">${item.code}</span>
                                <span>${item.cliente || 'Sin cliente'}</span>
                            </div>
                            <div style="font-size: 10.5px; color: #94a3b8;">
                                <i class="fas fa-map-marker-alt"></i> ${item.ubicacion || 'Obra'} • Retiro: ${item.retiro || '-'}
                            </div>
                        </div>
                        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                            <span style="font-size: 10px; font-weight: 700; color: ${badgeColor};">${tagText}</span>
                            <div style="display: flex; gap: 4px;">
                                <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10px;" onclick="imprimirRemitoPorCodigo('${item.code}', 'retiro')" title="Generar Remito de Retiro">
                                    <i class="fas fa-truck-loading"></i> Retiro
                                </button>
                                <button class="btn btn-primary btn-sm" style="padding: 2px 6px; font-size: 10px;" onclick="abrirModalFicha('${item.code}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 5. Widget 3: Facturación Estimada & Obras Principales
    const perfContainer = document.getElementById('dash-performance-container');
    const activeClientsBadge = document.getElementById('dash-active-clients-count');
    if (perfContainer) {
        const clientsMap = {};
        list.filter(x => x.estado === 'alquilado').forEach(c => {
            const cl = c.cliente || 'Clientes Particulares';
            if (!clientsMap[cl]) clientsMap[cl] = 0;
            clientsMap[cl]++;
        });

        const sortedClients = Object.entries(clientsMap).sort((a, b) => b[1] - a[1]);
        if (activeClientsBadge) activeClientsBadge.textContent = `${sortedClients.length} Obras Activas`;

        const valorEstimado = (m.alquilados * 220000).toLocaleString('es-AR');

        perfContainer.innerHTML = `
            <div style="background: rgba(15, 23, 42, 0.6); border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-size: 11px; color: #94a3b8; display: block;">Facturación Mensual Estimada</span>
                    <strong style="font-size: 16px; color: #10b981; font-family: monospace;">$ ${valorEstimado}</strong>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; color: #94a3b8; display: block;">Efectividad de Cobranza</span>
                    <strong style="font-size: 14px; color: #38bdf8;">${m.alquilados > 0 ? (((m.alquilados - m.retrasados) / m.alquilados) * 100).toFixed(0) : 100}% al día</strong>
                </div>
            </div>

            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-top: 2px;">OBRAS CON MAYOR DESPLIEGUE:</div>
            <div style="display: flex; flex-direction: column; gap: 4px; max-height: 140px; overflow-y: auto;">
                ${sortedClients.slice(0, 4).map(([cli, count]) => `
                    <div class="dash-client-item" style="cursor: pointer;" onclick="onSearchInput('${cli}'); switchView('flota');" title="Ver unidades de ${cli}">
                        <span style="color: #ffffff; font-weight: 600;"><i class="fas fa-building" style="color: #38bdf8; font-size: 10px;"></i> ${cli}</span>
                        <span class="badge-estado badge-alquilado" style="font-size: 10px; padding: 2px 6px;">${count} unidades</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 6. Renderizar Tabla Rápida del Dashboard con Filtros y Búsqueda
    renderDashboardTable();
}

function renderBadgeEstado(estado) {
    switch (estado) {
        case 'alquilado':
            return '<span class="badge-estado badge-alquilado"><i class="fas fa-truck-loading"></i> Alquilado</span>';
        case 'empresa':
            return '<span class="badge-estado badge-empresa"><i class="fas fa-warehouse"></i> En Base</span>';
        case 'reservado':
            return '<span class="badge-estado badge-reservado"><i class="fas fa-clock"></i> Reservado</span>';
        case 'reparacion':
            return '<span class="badge-estado badge-reparacion"><i class="fas fa-tools"></i> En Taller</span>';
        default:
            return `<span class="badge-estado badge-secondary">${estado}</span>`;
    }
}

function renderBadgePago(pago) {
    switch (pago) {
        case 'al_dia':
            return '<span class="badge-pago pago-al-dia"><i class="fas fa-check-circle"></i> Al día</span>';
        case 'pendiente':
            return '<span class="badge-pago pago-pendiente"><i class="fas fa-clock"></i> Pendiente</span>';
        case 'retrasado':
            return '<span class="badge-pago pago-retrasado"><i class="fas fa-exclamation-circle"></i> Retrasado</span>';
        default:
            return '<span class="badge-pago pago-al-dia"><i class="fas fa-check"></i> Al día</span>';
    }
}

window.setDashboardTableFilter = function(filter) {
    appData.dashTableFilter = filter;
    document.querySelectorAll('#view-dashboard .filter-chips-group .chip-btn').forEach(btn => btn.classList.remove('active'));
    const target = document.getElementById(`dash-filter-${filter}`);
    if (target) target.classList.add('active');
    renderDashboardTable();
};

window.onDashboardTableSearch = function(query) {
    appData.dashTableSearch = (query || '').toLowerCase().trim();
    renderDashboardTable();
};

function renderDashboardTable() {
    const tableBody = document.getElementById('dashboard-recent-table-body');
    if (!tableBody) return;

    let items = (appData.contenedores || []);

    if (appData.dashTableFilter && appData.dashTableFilter !== 'todos') {
        items = items.filter(c => c.estado === appData.dashTableFilter);
    }

    if (appData.dashTableSearch) {
        items = items.filter(c => {
            const code = String(c.code || '').toLowerCase();
            const cliente = String(c.cliente || '').toLowerCase();
            const ubicacion = String(c.ubicacion || '').toLowerCase();
            const tipo = String(c.tipo || '').toLowerCase();
            return code.includes(appData.dashTableSearch) || 
                   cliente.includes(appData.dashTableSearch) || 
                   ubicacion.includes(appData.dashTableSearch) ||
                   tipo.includes(appData.dashTableSearch);
        });
    }

    const previewItems = items.slice(0, 12);

    if (previewItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">
                    No se encontraron contenedores con los filtros seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = previewItems.map(c => `
        <tr>
            <td style="font-family: monospace; font-weight: bold; color: #38bdf8; cursor: pointer;" onclick="abrirModalFicha('${c.code}')">
                <i class="fas fa-box" style="margin-right: 4px; opacity: 0.7;"></i> ${c.code}
            </td>
            <td><strong>${c.tipo}</strong> <span style="font-size: 11px; color: #94a3b8;">(${c.medida})</span></td>
            <td>${renderBadgeEstado(c.estado)}</td>
            <td>${renderBadgePago(c.pago)}</td>
            <td>${c.cliente ? `<strong>${c.cliente}</strong>` : '<span style="color: #64748b;">Acosta Servicios (Base)</span>'}</td>
            <td>${c.ubicacion || 'Base Timbúes'}</td>
            <td>${c.retiro ? `<span style="font-family: monospace; font-size: 11.5px;">${c.retiro}</span>` : '<span style="color: #64748b;">-</span>'}</td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-secondary btn-sm" onclick="abrirModalFicha('${c.code}')" title="Ficha Técnica Completa">
                        <i class="fas fa-eye"></i> Ficha
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="imprimirRemitoPorCodigo('${c.code}', '${c.estado === 'alquilado' ? 'entrega' : 'entrega'}')" title="Imprimir Remito Oficial">
                        <i class="fas fa-file-invoice"></i> Remito
                    </button>
                    ${c.estado === 'empresa' ? `
                        <button class="btn btn-warning btn-sm" onclick="abrirModalAlquiler('${c.code}')" title="Asignar Alquiler">
                            <i class="fas fa-handshake"></i> Alquilar
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

window.setFilterTipo = function(tipo) {
    appData.filterTipo = (tipo || 'todos').toLowerCase();
    document.querySelectorAll('.solapa-cont-btn').forEach(b => b.classList.remove('active'));
    const btnKey = appData.filterTipo.replace(/ñ/g, 'n');
    const btn = document.getElementById(`tab-tipo-${btnKey}`);
    if (btn) btn.classList.add('active');
    renderFlotaTable();
};


window.setFilterProveedor = function(prov) {
    appData.filterProveedor = prov || 'todos';
    document.querySelectorAll('.chip-prov').forEach(el => el.classList.remove('active'));
    const btn = document.getElementById(`chip-prov-${appData.filterProveedor}`);
    if (btn) btn.classList.add('active');
    renderFlotaTable();
};

window.setFilterEstado = function(estado) {
    appData.filterEstado = estado || 'todos';
    document.querySelectorAll('.chip-estado').forEach(el => el.classList.remove('active'));
    const btn = document.getElementById(`chip-estado-${estado}`);
    if (btn) btn.classList.add('active');
    renderFlotaTable();
};

window.resetFlotaFilters = function() {
    appData.filterTipo = 'todos';
    appData.filterEstado = 'todos';
    appData.filterProveedor = 'todos';
    document.querySelectorAll('.chip-prov').forEach(el => el.classList.remove('active'));
    const btnAllProv = document.getElementById('chip-prov-todos');
    if (btnAllProv) btnAllProv.classList.add('active');
    appData.searchQuery = '';
    const sInp = document.getElementById('flota-search-input');
    if (sInp) sInp.value = '';

    document.querySelectorAll('.solapa-cont-btn').forEach(b => b.classList.remove('active'));
    const tabTodos = document.getElementById('tab-tipo-todos');
    if (tabTodos) tabTodos.classList.add('active');

    document.querySelectorAll('.chip-estado').forEach(el => el.classList.remove('active'));
    const chipTodos = document.getElementById('chip-estado-todos');
    if (chipTodos) chipTodos.classList.add('active');

    renderFlotaTable();
};

window.filterAndGoFlota = function(estado) {
    appData.filterEstado = estado || 'todos';
    appData.filterTipo = 'todos';
    appData.searchQuery = '';
    const sInp = document.getElementById('flota-search-input');
    if (sInp) sInp.value = '';

    document.querySelectorAll('.chip-estado').forEach(el => el.classList.remove('active'));
    const btn = document.getElementById(`chip-estado-${estado}`);
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.solapa-cont-btn').forEach(b => b.classList.remove('active'));
    const tabTodos = document.getElementById('tab-tipo-todos');
    if (tabTodos) tabTodos.classList.add('active');

    switchView('flota');
};

window.filterAndGoFlotaByTipo = function(tipo) {
    appData.filterTipo = (tipo || 'todos').toLowerCase();
    appData.filterEstado = 'todos';
    appData.searchQuery = '';
    const sInp = document.getElementById('flota-search-input');
    if (sInp) sInp.value = '';

    document.querySelectorAll('.solapa-cont-btn').forEach(b => b.classList.remove('active'));
    const btnKey = appData.filterTipo.replace(/ñ/g, 'n');
    const btn = document.getElementById(`tab-tipo-${btnKey}`);
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.chip-estado').forEach(el => el.classList.remove('active'));
    const chipTodos = document.getElementById('chip-estado-todos');
    if (chipTodos) chipTodos.classList.add('active');

    switchView('flota');
};

window.abrirModalAsignarAlquilerDashboard = function() {
    const libre = (appData.contenedores || []).find(c => c.estado === 'empresa');
    if (libre) {
        abrirModalAlquiler(libre.code);
    } else {
        showToast("No hay contenedores disponibles en base para alquilar.", "warning");
        switchView('flota');
    }
};

// Flota Table con soporte completo por Solapa
window.renderFlotaTable = function() {
    const tbody = document.getElementById('flota-table-body');
    if (!tbody) return;

    let list = appData.contenedores || [];

    if (appData.filterEstado && appData.filterEstado !== 'todos') {
        list = list.filter(x => x.estado === appData.filterEstado);
    }
    if (appData.filterTipo && appData.filterTipo !== 'todos') {
        list = list.filter(x => (x.tipo || '').toLowerCase() === appData.filterTipo.toLowerCase());
    }
    if (appData.filterPago && appData.filterPago !== 'todos') {
        list = list.filter(x => x.pago === appData.filterPago);
    }
    if (appData.filterProveedor && appData.filterProveedor !== 'todos') {
        if (appData.filterProveedor === 'acosta') {
            list = list.filter(x => {
                const p = (x.proveedor || '').toUpperCase();
                return p.includes('ACOSTA') || (!p.includes('SG') && !p.includes('MONTAJES'));
            });
        } else if (appData.filterProveedor === 'sg') {
            list = list.filter(x => {
                const p = (x.proveedor || '').toUpperCase();
                return p.includes('SG') || p.includes('MONTAJES');
            });
        }
    }
    if (appData.searchQuery && appData.searchQuery.trim() !== '') {
        const q = appData.searchQuery.toLowerCase();
        list = list.filter(x => 
            x.code.toLowerCase().includes(q) ||
            (x.cliente && x.cliente.toLowerCase().includes(q)) ||
            (x.ubicacion && x.ubicacion.toLowerCase().includes(q)) ||
            (x.tipo && x.tipo.toLowerCase().includes(q))
        );
    }

    updateChipCounts();

    // Actualizar indicador resumen de la solapa activa
    const summaryTextEl = document.getElementById('flota-solapa-summary-text');
    const resetBtn = document.getElementById('btn-reset-flota-filters');
    const isFiltered = (appData.filterTipo && appData.filterTipo !== 'todos') || 
                       (appData.filterEstado && appData.filterEstado !== 'todos') || 
                       (appData.searchQuery && appData.searchQuery.trim() !== '');

    if (resetBtn) {
        resetBtn.style.display = isFiltered ? 'inline-flex' : 'none';
    }

    if (summaryTextEl) {
        let textParts = [];
        if (!appData.filterTipo || appData.filterTipo === 'todos') {
            textParts.push('Todas las unidades');
        } else {
            const tipoLabel = appData.filterTipo.charAt(0).toUpperCase() + appData.filterTipo.slice(1);
            textParts.push(`Solapa: <strong>${tipoLabel}s</strong>`);
        }

        if (appData.filterEstado && appData.filterEstado !== 'todos') {
            const estadoNames = { 'empresa': 'En Base (Disponibles)', 'alquilado': 'Alquilados en Obra', 'reservado': 'Reservados', 'reparacion': 'En Taller' };
            textParts.push(`Estado: <strong>${estadoNames[appData.filterEstado] || appData.filterEstado}</strong>`);
        }

        if (appData.searchQuery) {
            textParts.push(`Búsqueda: "<em>${appData.searchQuery}</em>"`);
        }

        summaryTextEl.innerHTML = `<i class="fas fa-layer-group"></i> ${textParts.join(' • ')} — Mostrando <strong>${list.length}</strong> contenedor(es)`;
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 28px; color: #94a3b8;">
            <i class="fas fa-search" style="font-size: 24px; margin-bottom: 6px; display: block; opacity: 0.5;"></i>
            No se encontraron contenedores para la solapa y filtros seleccionados.<br>
            <button class="btn btn-secondary btn-sm" onclick="resetFlotaFilters()" style="margin-top: 8px;">Restablecer solapa y filtros</button>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(c => {
        const tareasCount = Array.isArray(c.tareas) ? c.tareas.length : 0;
        return `
        <tr>
            <td style="font-family: monospace; font-size: 12.5px; font-weight: 800; color: #38bdf8; cursor: pointer;" onclick="abrirModalFicha('${c.code}')" title="Ver ficha">
                <i class="fas fa-box" style="margin-right: 4px; opacity: 0.7;"></i>${c.code}
            </td>
            <td><strong>${c.tipo}</strong></td>
            <td><span style="font-weight: 600;">${c.medida}</span></td>
            <td>${renderBadgeEstado(c.estado)}</td>
            <td>
                ${c.pago === 'retrasado' ? 
                    '<span class="badge-pago-retrasado"><i class="fas fa-exclamation-circle"></i> Retrasado</span>' : 
                    '<span class="badge-pago-ok"><i class="fas fa-check"></i> Al Día</span>'}
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    ${((c.proveedor || '').toUpperCase().includes('SG') || (c.proveedor || '').toUpperCase().includes('MONTAJES')) 
                        ? '<span style="font-size: 9.5px; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 3px; padding: 1px 4px; font-weight: bold;">⚙️ SG</span>' 
                        : '<span style="font-size: 9.5px; background: rgba(2, 132, 199, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 3px; padding: 1px 4px; font-weight: bold;">🔵 Acosta</span>'}
                    <strong>${c.cliente || '<span style="color:#94a3b8;">(Disponible en Base)</span>'}</strong>
                </div>
                <div style="font-size: 10.5px; color: #94a3b8;">${c.ubicacion || 'Base Operativa Timbúes'}</div>
            </td>
            <td>
                ${tareasCount > 0 ? 
                    `<button class="btn btn-warning btn-sm" onclick="abrirModalMantenimiento('${c.code}')" title="${c.tareas.join(', ')}">🔧 ${tareasCount} tarea(s)</button>` : 
                    `<button class="btn btn-secondary btn-sm" onclick="abrirModalMantenimiento('${c.code}')" style="opacity: 0.6;">+ Tarea</button>`}
            </td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-secondary btn-sm" onclick="abrirModalFicha('${c.code}')" title="Ver Ficha Técnica">👁️</button>
                    <button class="btn btn-secondary btn-sm" onclick="verContenedorEnMapa('${c.code}')" title="Ver en el Mapa" style="color: #38bdf8; border-color: rgba(56,189,248,0.4);"><i class="fas fa-map-marker-alt"></i></button>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalEditarContenedor('${c.code}')" title="Editar / Mover">✏️</button>
                    <button class="btn btn-success btn-sm" onclick="imprimirRemitoPorCodigo('${c.code}', '${c.estado === 'alquilado' ? 'entrega' : 'devolucion'}')" title="Imprimir Remito">📄</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarContenedor('${c.code}')" title="Dar de baja">🗑️</button>
                </div>
            </td>
        </tr>
    `}).join('');
};

function updateChipCounts() {
    const list = appData.contenedores || [];
    const setChip = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
    };

    // 1. Contadores de las Solapas Principales por Tipo
    const getCountTipo = (t) => list.filter(x => (x.tipo || '').toLowerCase() === t.toLowerCase()).length;
    setChip('badge-tipo-todos', list.length);
    setChip('badge-tipo-oficina', getCountTipo('Oficina'));
    setChip('badge-tipo-panol', getCountTipo('Pañol'));
    setChip('badge-tipo-comedor', getCountTipo('Comedor'));
    setChip('badge-tipo-vestuario', getCountTipo('Vestuario'));

    // 2. Contadores de los Chips de Estado
    setChip('chip-count-todos', list.length);
    setChip('chip-count-empresa', list.filter(x => x.estado === 'empresa').length);
    setChip('chip-count-alquilado', list.filter(x => x.estado === 'alquilado').length);
    setChip('chip-count-reservado', list.filter(x => x.estado === 'reservado').length);
    setChip('chip-count-reparacion', list.filter(x => x.estado === 'reparacion').length);
    
    // Conteo para los chips de proveedor
    const totalAcosta = list.filter(x => {
        const p = (x.proveedor || '').toUpperCase();
        return p.includes('ACOSTA') || (!p.includes('SG') && !p.includes('MONTAJES'));
    }).length;
    const totalSg = list.filter(x => {
        const p = (x.proveedor || '').toUpperCase();
        return p.includes('SG') || p.includes('MONTAJES');
    }).length;
    setChip('chip-count-prov-acosta', totalAcosta);
    setChip('chip-count-prov-sg', totalSg);
}

window.onSearchInput = function(val) {
    appData.searchQuery = val;
    renderFlotaTable();
};

window.clearFlotaSearch = function() {
    appData.searchQuery = '';
    const sInp = document.getElementById('flota-search-input');
    if (sInp) sInp.value = '';
    renderFlotaTable();
};


// Alquileres Table
window.renderAlquileresTable = function() {
    const tbody = document.getElementById('alquileres-table-body');
    if (!tbody) return;

    const list = (appData.contenedores || []).filter(x => x.estado === 'alquilado' || x.estado === 'reservado');
    const hoy = new Date();

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #94a3b8;">No hay alquileres activos actualmente.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(c => {
        let vencimientoBadge = '<span style="color:#64748b;">Sin fecha</span>';
        if (c.retiro) {
            const retDate = new Date(c.retiro);
            const diffDays = Math.ceil((retDate - hoy) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                vencimientoBadge = `<span class="badge-pago-retrasado"><i class="fas fa-clock"></i> Vencido (${Math.abs(diffDays)}d)</span>`;
            } else if (diffDays <= 7) {
                vencimientoBadge = `<span class="badge-estado badge-reservado"><i class="fas fa-hourglass-half"></i> Vence en ${diffDays}d</span>`;
            } else {
                vencimientoBadge = `<span class="badge-pago-ok"><i class="fas fa-calendar-check"></i> ${diffDays} días rest.</span>`;
            }
        }

        return `
        <tr>
            <td style="font-family: monospace; font-weight: 800; color: #38bdf8;">${c.code}</td>
            <td><strong>${c.tipo}</strong> (${c.medida})</td>
            <td><strong style="color: #ffffff;">${c.cliente || '-'}</strong></td>
            <td>${c.ubicacion || '-'}</td>
            <td><span style="font-family: monospace;">${c.entrega || '-'}</span></td>
            <td><span style="font-family: monospace; font-weight: bold;">${c.retiro || '-'}</span></td>
            <td>${vencimientoBadge}</td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-warning btn-sm" onclick="abrirModalProrroga('${c.code}')" title="Prorrogar fecha de retiro">⏳ Prórroga</button>
                    <button class="btn btn-success btn-sm" onclick="abrirModalDevolucion('${c.code}')" title="Registrar devolución a base">📦 Devolución</button>
                    <button class="btn btn-primary btn-sm" onclick="imprimirRemitoPorCodigo('${c.code}', 'entrega')" title="Descargar Remito">📄 Remito</button>
                </div>
            </td>
        </tr>
    `}).join('');
};

// Mantenimiento Board
window.renderMantenimientoBoard = function() {
    const cont = document.getElementById('mantenimiento-cards-container');
    if (!cont) return;

    const listConTareas = (appData.contenedores || []).filter(x => Array.isArray(x.tareas) && x.tareas.length > 0);

    if (listConTareas.length === 0) {
        cont.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #10b981;">
            <i class="fas fa-check-circle" style="font-size: 32px; margin-bottom: 8px;"></i><br>
            <strong>¡Excelente! No hay tareas de mantenimiento pendientes en la flota.</strong>
        </div>`;
        return;
    }

    cont.innerHTML = listConTareas.map(c => `
        <div class="glass-card" style="border-left: 4px solid ${c.estado === 'reparacion' ? '#f43f5e' : '#f59e0b'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                    <span style="font-family: monospace; font-size: 14px; font-weight: 800; color: #38bdf8;">${c.code}</span>
                    <strong style="margin-left: 6px;">${c.tipo} (${c.medida})</strong>
                </div>
                ${renderBadgeEstado(c.estado)}
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">
                📍 ${c.ubicacion || 'Depósito Central'} • ${c.cliente || 'En base'}
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
                ${c.tareas.map((t, idx) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 5px 8px; border-radius: 4px; font-size: 11.5px;">
                        <span>🔧 ${t}</span>
                        <button type="button" class="btn btn-success btn-sm" onclick="completarTarea('${c.code}', ${idx})" title="Marcar como completada">✓ Listo</button>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 6px;">
                <button class="btn btn-secondary btn-sm" onclick="abrirModalMantenimiento('${c.code}')">+ Agregar Tarea</button>
                <button class="btn btn-primary btn-sm" onclick="cambiarEstadoDirecto('${c.code}', 'empresa')">Mover a Base</button>
            </div>
        </div>
    `).join('');
};

window.completarTarea = function(code, idx) {
    const cont = appData.contenedores.find(x => x.code === code);
    if (!cont || !Array.isArray(cont.tareas)) return;
    
    const taskName = cont.tareas[idx];
    cont.tareas.splice(idx, 1);
    if (cont.tareas.length === 0 && cont.estado === 'reparacion') {
        cont.estado = 'empresa';
    }
    saveData();
    renderMantenimientoBoard();
    renderFlotaTable();
    renderDashboard();
    showToast(`✓ Tarea "${taskName}" completada en ${code}`, 'success');
};

// Configuración
function renderConfigUsuariosTable() {
    const tbody = document.getElementById('config-usuarios-table-body');
    if (!tbody) return;

    tbody.innerHTML = (appData.users || []).map(u => `
        <tr>
            <td><strong style="color: #38bdf8;">${u.username}</strong></td>
            <td>${u.nombre || '-'}</td>
            <td>${u.email || '-'}</td>
            <td><span class="badge-estado badge-empresa">${u.role || 'Operador'}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="abrirModalEditarUsuario('${u.id}')">✏️ Editar</button>
                ${u.username !== 'melani' && u.username !== 'admin' ? 
                    `<button class="btn btn-danger btn-sm" onclick="eliminarUsuario('${u.id}')">🗑️</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function renderConfigParametrosForm() {
    const s = appData.settings;
    if (!s) return;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('cfg-empresa', s.empresa);
    setVal('cfg-cuit', s.cuit);
    setVal('cfg-iva', s.iva);
    setVal('cfg-deposito', s.deposito_principal);
    setVal('cfg-direccion', s.direccion);
    setVal('cfg-email', s.email_notificaciones);
    setVal('cfg-telefono', s.telefono);
}

window.guardarParametrosEmpresa = function(e) {
    if (e) e.preventDefault();
    const getVal = (id) => document.getElementById(id)?.value.trim() || '';
    appData.settings = {
        empresa: getVal('cfg-empresa') || DEFAULT_SETTINGS.empresa,
        cuit: getVal('cfg-cuit') || DEFAULT_SETTINGS.cuit,
        iva: getVal('cfg-iva') || DEFAULT_SETTINGS.iva,
        deposito_principal: getVal('cfg-deposito') || DEFAULT_SETTINGS.deposito_principal,
        direccion: getVal('cfg-direccion') || DEFAULT_SETTINGS.direccion,
        email_notificaciones: getVal('cfg-email') || DEFAULT_SETTINGS.email_notificaciones,
        telefono: getVal('cfg-telefono') || DEFAULT_SETTINGS.telefono
    };
    saveSettings();
    showToast("✓ Parámetros de empresa actualizados.", "success");
};

window.abrirModalNuevoUsuario = function() {
    const modal = document.getElementById('modal-usuario-form');
    if (!modal) return;
    document.getElementById('user-form-id').value = '';
    document.getElementById('user-form-username').value = '';
    document.getElementById('user-form-password').value = '';
    document.getElementById('user-form-nombre').value = '';
    document.getElementById('user-form-email').value = '';
    document.getElementById('user-form-role').value = 'Operador';
    modal.style.display = 'flex';
};

window.abrirModalEditarUsuario = function(id) {
    const u = appData.users.find(x => String(x.id) === String(id));
    if (!u) return;
    const modal = document.getElementById('modal-usuario-form');
    if (!modal) return;

    document.getElementById('user-form-id').value = u.id;
    document.getElementById('user-form-username').value = u.username;
    document.getElementById('user-form-password').value = u.password || '';
    document.getElementById('user-form-nombre').value = u.nombre || '';
    document.getElementById('user-form-email').value = u.email || '';
    document.getElementById('user-form-role').value = u.role || 'Operador';
    modal.style.display = 'flex';
};

window.guardarUsuarioForm = function(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('user-form-id').value;
    const username = document.getElementById('user-form-username').value.trim().toLowerCase();
    const password = document.getElementById('user-form-password').value.trim();
    const nombre = document.getElementById('user-form-nombre').value.trim();
    const email = document.getElementById('user-form-email').value.trim();
    const role = document.getElementById('user-form-role').value;

    if (!username) {
        showToast("El usuario es obligatorio.", "warning");
        return;
    }

    if (id) {
        const u = appData.users.find(x => String(x.id) === String(id));
        if (u) {
            u.username = username;
            if (password) u.password = password;
            u.nombre = nombre;
            u.email = email;
            u.role = role;
        }
    } else {
        const newId = String(Date.now());
        appData.users.push({ id: newId, username, password: password || '123', nombre, email, role });
    }

    saveUsers();
    cerrarModales();
    renderConfigUsuariosTable();
    showToast(`✓ Usuario ${username} guardado.`, "success");
};

window.eliminarUsuario = function(id) {
    const u = appData.users.find(x => String(x.id) === String(id));
    if (!u) return;
    if (confirm(`¿Eliminar al usuario ${u.username}?`)) {
        appData.users = appData.users.filter(x => String(x.id) !== String(id));
        saveUsers();
        renderConfigUsuariosTable();
        showToast(`Usuario ${u.username} eliminado.`, "warning");
    }
};

window.exportarBackupJSON = function() {
    const backup = {
        timestamp: new Date().toISOString(),
        settings: appData.settings,
        users: appData.users,
        contenedores: appData.contenedores
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Contenedores_SG_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("✓ Backup completo exportado en JSON.", "success");
};

window.restaurarDatosOriginales = function() {
    if (confirm("¿Está seguro de restaurar los 50 contenedores originales de la base de datos?")) {
        if (window.CONTENEDORES_INITIAL_DB) {
            appData.contenedores = JSON.parse(JSON.stringify(window.CONTENEDORES_INITIAL_DB));
            saveData();
            renderHeaderStats();
            renderDashboard();
            renderFlotaTable();
            renderAlquileresTable();
            renderMantenimientoBoard();
            showToast("✓ 50 Contenedores originales restaurados con éxito.", "success");
        }
    }
};

// =========================================================
// MOTOR CARTOGRÁFICO Y MAPA INTERACTIVO (LEAFLET)
// =========================================================

appData.dashMapInstance = null;
appData.dashMarkersGroup = null;

function populateMarkers(layerGroup, isMini) {
    if (!layerGroup || typeof L === 'undefined') return;
    layerGroup.clearLayers();

    const baseIcon = L.divIcon({
        className: 'custom-map-pin',
        html: '<div style="background: #10b981; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; border: 2.5px solid #F3B229; box-shadow: 0 4px 12px rgba(0,0,0,0.7);"><i class="fa-solid fa-warehouse"></i></div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });

    const mBase = getMetrics();
    L.marker([-32.6642, -60.7932], { icon: baseIcon, zIndexOffset: 50 })
        .bindPopup(`
            <div style="font-size: 12.5px; color: #ffffff; min-width: 220px;">
                <div style="font-weight: 800; color: #F3B229; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-warehouse"></i> BASE CENTRAL TIMBÚES
                </div>
                <div style="color: #94a3b8; font-size: 11.5px; margin-bottom: 6px;">Ruta Nacional 11 Km 335, Timbúes, Santa Fe</div>
                <div style="background: rgba(255,255,255,0.08); padding: 6px 8px; border-radius: 4px; font-size: 11px;">
                    <strong style="color: #10b981;">${mBase.empresa}</strong> unidades disponibles en base<br>
                    <span style="color: #fbbf24;">🟡 Acosta: <strong>${mBase.enBaseAcosta || 0}</strong></span> &bull; 
                    <span style="color: #38bdf8;">🔵 SG: <strong>${mBase.enBaseSg || 0}</strong></span><br>
                    <strong style="color: #f43f5e;">${mBase.reparacion}</strong> unidades en taller
                </div>
            </div>
        `)
        .addTo(layerGroup);

    (appData.contenedores || []).forEach((c, idx) => {
        // 1. Auto-reparar coordenadas si faltan o son inválidas
        if (!c.lat || !c.lng || isNaN(c.lat) || isNaN(c.lng) || (c.lat === 0 && c.lng === 0)) {
            const fallback = window.obtenerCoordenadasPorUbicacion ? window.obtenerCoordenadasPorUbicacion(c.ubicacion || 'Base Operativa — Timbúes') : { lat: -32.6642, lng: -60.7932 };
            c.lat = fallback.lat;
            c.lng = fallback.lng;
        }

        let renderLat = Number(c.lat);
        let renderLng = Number(c.lng);

        // 2. Si las coordenadas caen exactamente en el punto central de la base [-32.6642, -60.7932]
        // aplicar una dispersión radial elegante (golden angle) para que cada unidad tenga su propio pin visible y no quede tapada por el galpón central
        if (Math.abs(renderLat - (-32.6642)) < 0.0005 && Math.abs(renderLng - (-60.7932)) < 0.0005) {
            const angle = ((idx * 137.5) * Math.PI) / 180;
            const dist = 0.0016 + ((idx % 6) * 0.0005);
            renderLat = -32.6642 + Math.sin(angle) * dist;
            renderLng = -60.7932 + Math.cos(angle) * dist;
        }

        const isSg = ((c.proveedor || '').toUpperCase().includes('SG') || (c.proveedor || '').toUpperCase().includes('MONTAJES'));

        // REGLA VISUAL ESTABLECIDA:
        // ACOSTA SERVICIOS = Pines Amarillos (#f59e0b), ícono oscuro (#0f172a) para máximo contraste y nitidez
        // SG MONTAJES = Pines Azules (#0284c7), ícono blanco (#ffffff)
        const pinColor = isSg ? '#0284c7' : '#f59e0b';
        const iconColor = isSg ? '#ffffff' : '#0f172a';
        const provBadge = isSg 
            ? '<span style="color: #38bdf8; font-weight: bold; background: rgba(2,132,199,0.2); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(56,189,248,0.4);">🔵 SG Montajes</span>' 
            : '<span style="color: #fbbf24; font-weight: bold; background: rgba(245,158,11,0.2); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(245,158,11,0.4);">🟡 Acosta Serv.</span>';

        // Íconos según estado operativo:
        // Alquilado: Casco (fa-helmet-safety)
        // Disponible: Caja (fa-box)
        // Taller: Herramientas (fa-wrench fa-tools)
        // Reservado: Reloj (fa-clock)
        let pinIconClass = 'fa-solid fa-helmet-safety fa-hard-hat';
        let estadoEmoji = '⛑️';
        let estadoTexto = 'Alquilado en Obra';

        if (c.estado === 'empresa') {
            pinIconClass = 'fa-solid fa-box';
            estadoEmoji = '📦';
            estadoTexto = 'En Base (Disponible)';
        } else if (c.estado === 'reparacion') {
            pinIconClass = 'fa-solid fa-wrench fa-tools';
            estadoEmoji = '🔧';
            estadoTexto = 'En Taller / Reparación';
        } else if (c.estado === 'reservado') {
            pinIconClass = 'fa-solid fa-clock';
            estadoEmoji = '⏰';
            estadoTexto = 'Reservado';
        }

        const icon = L.divIcon({
            className: 'custom-map-pin',
            html: `<div title="${c.code} (${c.tipo}): ${estadoEmoji} ${estadoTexto}" style="background: ${pinColor}; color: ${iconColor}; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.6);"><i class="${pinIconClass}"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        L.marker([renderLat, renderLng], { icon: icon, zIndexOffset: 200 })
            .bindPopup(`
                <div style="font-size: 12px; color: #ffffff; min-width: 200px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 800; color: #38bdf8; font-size: 14px; font-family: monospace;">${c.code}</span>
                        <span style="font-size: 10px;">${provBadge}</span>
                    </div>
                    <div style="font-weight: 600; margin-bottom: 4px;">${c.tipo} (${c.medida})</div>
                    <div style="margin-bottom: 3px; font-size: 11.5px;">
                        <strong>Estado:</strong> <span style="color: ${pinColor}; font-weight: bold;">${estadoEmoji} ${estadoTexto}</span>
                    </div>
                    ${c.estado === 'alquilado' ? `
                        <div style="margin-bottom: 3px;"><strong>Cliente:</strong> ${c.cliente || '-'}</div>
                        <div style="margin-bottom: 3px; font-size: 11px;"><strong>Retiro Prog:</strong> ${c.retiro || '-'}</div>
                    ` : ''}
                    <div style="margin-bottom: 6px; font-size: 11px; color: #94a3b8;">
                        <i class="fa-solid fa-location-dot"></i> ${c.ubicacion || 'Base Operativa Timbúes'}
                    </div>
                    <div style="display: flex; gap: 4px; margin-top: 6px;">
                        <button onclick="abrirModalFicha('${c.code}')" style="padding: 3px 8px; background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; font-size: 10.5px; font-weight: bold; cursor: pointer;">👁️ Ficha</button>
                        ${c.estado === 'empresa' ? `
                            <button onclick="abrirModalAlquiler('${c.code}')" style="padding: 3px 8px; background: #10b981; color: white; border: none; border-radius: 4px; font-size: 10.5px; font-weight: bold; cursor: pointer;">🚚 Alquilar</button>
                        ` : `
                            <button onclick="imprimirRemitoPorCodigo('${c.code}', 'entrega')" style="padding: 3px 8px; background: #00529F; color: white; border: none; border-radius: 4px; font-size: 10.5px; cursor: pointer;">📄 Remito</button>
                        `}
                    </div>
                </div>
            `)
            .addTo(layerGroup);
    });
}

function initDashboardMap() {
    const mapEl = document.getElementById('dashboard-map-container');
    if (!mapEl || typeof L === 'undefined') return;

    try {
        if (!appData.dashMapInstance) {
            appData.dashMapInstance = L.map('dashboard-map-container', { scrollWheelZoom: false }).setView([-32.6642, -60.7932], 9);
            
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri &mdash; ACOSTA SERVICIOS SRL'
            }).addTo(appData.dashMapInstance);

            appData.dashMarkersGroup = L.layerGroup().addTo(appData.dashMapInstance);
        }
        populateMarkers(appData.dashMarkersGroup, true);
        setTimeout(function() {
            if (appData.dashMapInstance) appData.dashMapInstance.invalidateSize();
        }, 150);
    } catch(e) {
        console.warn("Dashboard Map Error:", e);
    }
}

function initMap() {
    const mapEl = document.getElementById('map-container');
    if (!mapEl || typeof L === 'undefined') return;

    try {
        if (!appData.mapInstance) {
            appData.mapInstance = L.map('map-container').setView([-32.6642, -60.7932], 9);
            
            const streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri &mdash; ACOSTA SERVICIOS SRL'
            });

            const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri World Imagery'
            });

            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap France'
            });

            streetLayer.addTo(appData.mapInstance);

            L.control.layers({
                "🗺️ Mapa Callejero": streetLayer,
                "🛰️ Vista Satelital": satLayer,
                "🌐 OpenStreetMap": osmLayer
            }, null, { position: 'topright' }).addTo(appData.mapInstance);

            appData.markersGroup = L.layerGroup().addTo(appData.mapInstance);
        }
        populateMarkers(appData.markersGroup, false);
        setTimeout(function() {
            if (appData.mapInstance) appData.mapInstance.invalidateSize();
        }, 150);
    } catch(e) {
        console.warn("Full Map Error:", e);
    }
}

window.centrarMapaEnBase = function() {
    if (appData.mapInstance) {
        appData.mapInstance.setView([-32.6642, -60.7932], 13);
    }
};

window.ajustarZoomTodaFlota = function() {
    if (appData.mapInstance && appData.markersGroup) {
        const bounds = [];
        (appData.contenedores || []).forEach(c => {
            if (c.lat && c.lng && !isNaN(c.lat) && !isNaN(c.lng)) bounds.push([c.lat, c.lng]);
        });
        bounds.push([-32.6642, -60.7932]);
        if (bounds.length > 0) {
            appData.mapInstance.fitBounds(bounds, { padding: [35, 35] });
        }
    }
};

// Selector de Ubicación en Mini Mapa del Modal Alta/Edición
appData.formMapInstance = null;
appData.formMapMarker = null;

window.updateFormPinColor = function() {
    const provEl = document.getElementById('form-cont-proveedor');
    const isSg = provEl && ((provEl.value || '').toUpperCase().includes('SG') || (provEl.value || '').toUpperCase().includes('MONTAJES'));
    const pinColor = isSg ? '#0284c7' : '#f59e0b';
    const iconColor = isSg ? '#ffffff' : '#0f172a';
    if (appData.formMapMarker && typeof L !== 'undefined') {
        appData.formMapMarker.setIcon(L.divIcon({
            className: 'custom-map-pin',
            html: `<div style="background: ${pinColor}; color: ${iconColor}; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.6);"><i class="fa-solid fa-box"></i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        }));
    }
};

window.initFormMap = function(lat, lng) {
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    if (isNaN(lat)) lat = -32.6642;
    if (isNaN(lng)) lng = -60.7932;

    const latEl = document.getElementById('form-cont-lat');
    const lngEl = document.getElementById('form-cont-lng');
    const badgeEl = document.getElementById('form-cont-coords-badge');
    if (latEl) latEl.value = lat.toFixed(6);
    if (lngEl) lngEl.value = lng.toFixed(6);
    if (badgeEl) badgeEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const mapContainer = document.getElementById('form-cont-map');
    if (!mapContainer || typeof L === 'undefined') return;

    const provEl = document.getElementById('form-cont-proveedor');
    const isSg = provEl && ((provEl.value || '').toUpperCase().includes('SG') || (provEl.value || '').toUpperCase().includes('MONTAJES'));
    const pinColor = isSg ? '#0284c7' : '#f59e0b';
    const iconColor = isSg ? '#ffffff' : '#0f172a';

    const getFormPinIcon = (color, iColor) => L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background: ${color}; color: ${iColor}; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.6);"><i class="fa-solid fa-box"></i></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    setTimeout(function() {
        if (!appData.formMapInstance) {
            appData.formMapInstance = L.map('form-cont-map', {
                zoomControl: true,
                scrollWheelZoom: true
            }).setView([lat, lng], 13);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri'
            }).addTo(appData.formMapInstance);

            appData.formMapMarker = L.marker([lat, lng], { draggable: true, icon: getFormPinIcon(pinColor, iconColor) }).addTo(appData.formMapInstance);

            const syncCoords = function(newLat, newLng) {
                if (latEl) latEl.value = newLat.toFixed(6);
                if (lngEl) lngEl.value = newLng.toFixed(6);
                if (badgeEl) badgeEl.textContent = `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`;
            };

            appData.formMapMarker.on('dragend', function(e) {
                const p = e.target.getLatLng();
                syncCoords(p.lat, p.lng);
            });

            appData.formMapInstance.on('click', function(e) {
                appData.formMapMarker.setLatLng(e.latlng);
                syncCoords(e.latlng.lat, e.latlng.lng);
            });
        } else {
            appData.formMapInstance.setView([lat, lng], 13);
            if (appData.formMapMarker) {
                appData.formMapMarker.setLatLng([lat, lng]);
                appData.formMapMarker.setIcon(getFormPinIcon(pinColor, iconColor));
            }
        }
        appData.formMapInstance.invalidateSize();
    }, 120);
};

window.buscarUbicacionEnModalMapa = function() {
    const input = document.getElementById('form-cont-ubicacion');
    if (!input || !input.value.trim()) return;
    const query = input.value.trim();

    const applyCoords = function(lat, lng) {
        if (appData.formMapInstance) {
            appData.formMapInstance.setView([lat, lng], 14);
            if (appData.formMapMarker) appData.formMapMarker.setLatLng([lat, lng]);
        }
        const latEl = document.getElementById('form-cont-lat');
        const lngEl = document.getElementById('form-cont-lng');
        const badgeEl = document.getElementById('form-cont-coords-badge');
        if (latEl) latEl.value = lat.toFixed(6);
        if (lngEl) lngEl.value = lng.toFixed(6);
        if (badgeEl) badgeEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        showToast(`📍 Ubicación fijada en el mapa: ${query}`, "info");
    };

    const localCoords = window.obtenerCoordenadasPorUbicacion(query);
    const qLower = query.toLowerCase();

    const isSpecific = qLower.includes('san lorenzo') || qLower.includes('puerto') || qLower.includes('rosario') || 
                       qLower.includes('cargill') || qLower.includes('dreyfus') || qLower.includes('bunge') || 
                       qLower.includes('renova') || qLower.includes('cofco') || qLower.includes('timbues') || 
                       qLower.includes('quilmes') || qLower.includes('lujan') || qLower.includes('canuelas') ||
                       qLower.includes('vgg') || qLower.includes('pilar') || qLower.includes('escobar') ||
                       qLower.includes('base');

    if (isSpecific) {
        applyCoords(localCoords.lat, localCoords.lng);
        return;
    }

    // Geocodificación online con OpenStreetMap Nominatim
    fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=ar&limit=1&q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => {
            if (data && data.length > 0) {
                applyCoords(parseFloat(data[0].lat), parseFloat(data[0].lon));
            } else {
                applyCoords(localCoords.lat, localCoords.lng);
            }
        })
        .catch(() => {
            applyCoords(localCoords.lat, localCoords.lng);
        });
};

window.verContenedorEnMapa = function(code) {
    if (!code) return;
    const cleanCode = (code || '').toUpperCase().trim();
    const c = (appData.contenedores || []).find(x => 
        (x.code || '').toUpperCase().trim() === cleanCode || 
        (x.code || '').toUpperCase().replace('-', '') === cleanCode.replace('-', '')
    );
    
    if (!c) {
        showToast(`El contenedor ${code} no fue encontrado en la flota.`, "warning");
        return;
    }

    // Auto-reparar coordenadas si faltaban
    if (!c.lat || !c.lng || isNaN(c.lat) || isNaN(c.lng) || (c.lat === 0 && c.lng === 0)) {
        const fallback = window.obtenerCoordenadasPorUbicacion ? window.obtenerCoordenadasPorUbicacion(c.ubicacion || 'Base Operativa — Timbúes') : { lat: -32.6625, lng: -60.7915 };
        c.lat = fallback.lat;
        c.lng = fallback.lng;
        saveData();
    }

    cerrarModales();
    switchView('mapa');

    setTimeout(function() {
        if (appData.markersGroup) populateMarkers(appData.markersGroup, false);
        if (appData.mapInstance) {
            appData.mapInstance.flyTo([c.lat, c.lng], 15, { animate: true, duration: 0.8 });
            setTimeout(function() {
                if (appData.markersGroup) {
                    appData.markersGroup.eachLayer(function(layer) {
                        const p = layer.getLatLng ? layer.getLatLng() : null;
                        if (p && Math.abs(p.lat - c.lat) < 0.004 && Math.abs(p.lng - c.lng) < 0.004) {
                            layer.openPopup();
                        }
                    });
                }
            }, 850);
        }
    }, 250);
};

// Modales CRUD Contenedor
window.abrirModalNuevoContenedor = function() {
    const modal = document.getElementById('modal-contenedor-form');
    if (!modal) return;
    
    document.getElementById('modal-form-title').innerHTML = '<i class="fas fa-box" style="color: var(--warning);"></i> Alta de Nuevo Contenedor';
    document.getElementById('form-cont-code').value = `C-${100 + (appData.contenedores ? appData.contenedores.length : 0) + 1}`;
    document.getElementById('form-cont-tipo').value = 'Oficina';
    document.getElementById('form-cont-medida').value = "20'";
    
    const provEl = document.getElementById('form-cont-proveedor');
    if (provEl) provEl.value = 'ACOSTA SERVICIOS SRL';
    
    const estadoEl = document.getElementById('form-cont-estado');
    if (estadoEl) estadoEl.value = 'empresa';
    
    const ubiEl = document.getElementById('form-cont-ubicacion');
    if (ubiEl) ubiEl.value = 'Base Operativa — Timbúes';
    
    const obsEl = document.getElementById('form-cont-obs');
    if (obsEl) obsEl.value = '';

    modal.style.display = 'flex';
    window.initFormMap(-32.6642, -60.7932);
};

window.abrirModalEditarContenedor = function(code) {
    const cont = appData.contenedores.find(x => x.code === code);
    if (!cont) return;

    const modal = document.getElementById('modal-contenedor-form');
    if (!modal) return;

    document.getElementById('modal-form-title').innerHTML = `<i class="fas fa-edit" style="color: var(--warning);"></i> Modificar Contenedor ${cont.code}`;
    document.getElementById('form-cont-code').value = cont.code;
    document.getElementById('form-cont-tipo').value = cont.tipo;
    document.getElementById('form-cont-medida').value = cont.medida;
    
    const provEl = document.getElementById('form-cont-proveedor');
    if (provEl) provEl.value = cont.proveedor || 'ACOSTA SERVICIOS SRL';

    const estadoEl = document.getElementById('form-cont-estado');
    if (estadoEl) {
        if (!['empresa', 'reparacion'].includes(cont.estado)) {
            estadoEl.innerHTML = `
                <option value="empresa">En Base (Disponible)</option>
                <option value="reparacion">En Taller / Mantenimiento</option>
                <option value="${cont.estado}" selected>${cont.estado.toUpperCase()}</option>
            `;
        } else {
            estadoEl.innerHTML = `
                <option value="empresa" ${cont.estado === 'empresa' ? 'selected' : ''}>En Base (Disponible)</option>
                <option value="reparacion" ${cont.estado === 'reparacion' ? 'selected' : ''}>En Taller / Mantenimiento</option>
            `;
        }
        estadoEl.value = cont.estado;
    }

    const ubiEl = document.getElementById('form-cont-ubicacion');
    if (ubiEl) ubiEl.value = cont.ubicacion || 'Base Operativa — Timbúes';
    
    const obsEl = document.getElementById('form-cont-obs');
    if (obsEl) obsEl.value = cont.obsEntrega || cont.observaciones || '';

    modal.style.display = 'flex';
    const initLat = (cont.lat && !isNaN(cont.lat)) ? cont.lat : -32.6642;
    const initLng = (cont.lng && !isNaN(cont.lng)) ? cont.lng : -60.7932;
    window.initFormMap(initLat, initLng);
};

window.guardarContenedorForm = function(e) {
    if (e) e.preventDefault();
    const code = document.getElementById('form-cont-code').value.trim();
    if (!code) {
        showToast("El código del contenedor es obligatorio.", "error");
        return;
    }

    const cleanCode = code.toUpperCase();
    let cont = (appData.contenedores || []).find(x => 
        (x.code || '').toUpperCase() === cleanCode || 
        (x.code || '').toUpperCase().replace('-', '') === cleanCode.replace('-', '')
    );
    const isNew = !cont;

    if (isNew) {
        cont = { code, tareas: [], historial: [] };
        appData.contenedores.push(cont);
    }

    cont.code = code; // Normalizar código
    cont.tipo = document.getElementById('form-cont-tipo').value;
    cont.medida = document.getElementById('form-cont-medida').value;
    cont.estado = document.getElementById('form-cont-estado').value;
    
    const provEl = document.getElementById('form-cont-proveedor');
    if (provEl) cont.proveedor = provEl.value;
    
    const ubiEl = document.getElementById('form-cont-ubicacion');
    cont.ubicacion = ubiEl ? ubiEl.value.trim() : (appData.settings.deposito_principal || 'Base Operativa — Timbúes');
    
    const obsEl = document.getElementById('form-cont-obs');
    cont.obsEntrega = obsEl ? obsEl.value.trim() : '';
    cont.observaciones = cont.obsEntrega;

    // Obtener coordenadas desde el selector en mini mapa
    const latInp = document.getElementById('form-cont-lat');
    const lngInp = document.getElementById('form-cont-lng');
    let lat = latInp ? parseFloat(latInp.value) : NaN;
    let lng = lngInp ? parseFloat(lngInp.value) : NaN;

    // Si no se movió el pin pero se ingresó una obra/localidad distinta a base, resolver coordenadas inteligentemente
    const ubiLower = (cont.ubicacion || '').toLowerCase();
    const isBase = ubiLower.includes('timbues') || ubiLower.includes('timbúes') || ubiLower.includes('base') || ubiLower === '';
    
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0) || (!isBase && Math.abs(lat - (-32.6642)) < 0.0001 && Math.abs(lng - (-60.7932)) < 0.0001)) {
        const coords = window.obtenerCoordenadasPorUbicacion(cont.ubicacion);
        lat = coords.lat;
        lng = coords.lng;
    }

    cont.lat = lat;
    cont.lng = lng;

    saveData();
    cerrarModales();
    renderHeaderStats();
    renderDashboard();
    renderFlotaTable();
    renderAlquileresTable();

    // Actualizar marcadores geográficos inmediatamente en ambos mapas
    if (appData.markersGroup) populateMarkers(appData.markersGroup, false);
    if (appData.dashMarkersGroup) populateMarkers(appData.dashMarkersGroup, true);

    showToast(`✓ Contenedor ${code} guardado con éxito. Ubicado en el mapa.`, "success");

    try {
        logOperationalEvent(isNew ? 'alta' : 'modificacion', `${isNew ? 'Alta de nuevo' : 'Actualización de'} contenedor ${code} (${cont.tipo} ${cont.medida}, prov: ${cont.proveedor}) en "${cont.ubicacion}"`, code);
        sendLiveSignal({ type: 'DATA_UPDATE' });
    } catch(err) {}
};

window.abrirModalFicha = function(code) {
    const c = appData.contenedores.find(x => x.code === code);
    if (!c) return;

    appData.currentFocusedCode = code;
    try { sendPresenceHeartbeat(); } catch(e) {}

    const modal = document.getElementById('modal-ficha-viewer');
    const body = document.getElementById('ficha-viewer-body');
    if (!modal || !body) return;

    body.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid var(--glass-border); padding-bottom: 10px;">
            <div>
                <span style="font-size: 20px; font-weight: 900; color: #38bdf8; font-family: monospace;">${c.code}</span>
                <span style="font-size: 14px; font-weight: bold; margin-left: 8px;">Contenedor ${c.tipo} (${c.medida})</span>
            </div>
            ${renderBadgeEstado(c.estado)}
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; font-size: 12px;">
            <div class="glass-card">
                <span style="color: #94a3b8; font-size: 11px;">Cliente Asignado</span><br>
                <strong style="font-size: 13px; color: #ffffff;">${c.cliente || ((c.proveedor || '').toUpperCase().includes('SG') ? 'SG Montajes (Disponible en Base)' : 'Acosta Servicios (Disponible en Base)')}</strong>
            </div>
            <div class="glass-card">
                <span style="color: #94a3b8; font-size: 11px;">Ubicación / Obra</span><br>
                <strong style="font-size: 13px; color: #ffffff;">${c.ubicacion || 'Base Operativa — Timbúes'}</strong>
            </div>
            <div class="glass-card">
                <span style="color: #94a3b8; font-size: 11px;">Fecha de Entrega</span><br>
                <strong style="font-family: monospace;">${c.entrega || '-'}</strong>
            </div>
            <div class="glass-card">
                <span style="color: #94a3b8; font-size: 11px;">Fecha de Retiro / Vencimiento</span><br>
                <strong style="font-family: monospace; color: #f59e0b;">${c.retiro || '-'}</strong>
            </div>
        </div>

        <div class="glass-card" style="margin-bottom: 14px; font-size: 12px;">
            <strong style="color: var(--warning);">Observaciones de Entrega:</strong>
            <p style="margin-top: 4px; color: #f8fafc;">${c.obsEntrega || 'Sin observaciones registradas.'}</p>
        </div>

        ${Array.isArray(c.tareas) && c.tareas.length > 0 ? `
            <div class="glass-card" style="margin-bottom: 14px; border-left: 4px solid #f43f5e;">
                <strong style="color: #fda4af;">Tareas de Mantenimiento Pendientes:</strong>
                <ul style="margin: 6px 0 0 18px; font-size: 12px;">
                    ${c.tareas.map(t => `<li>${t}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <!-- FICHA VIVA: BITÁCORA COLABORATIVA EN TIEMPO REAL -->
        <div class="glass-card" style="margin-bottom: 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #38bdf8; font-size: 13px;">
                    <i class="fas fa-clipboard-list"></i> Bitácora & Notas del Contenedor (Ficha Viva)
                </strong>
                <span style="font-size: 11px; color: #94a3b8;">Sincronizado en tiempo real</span>
            </div>
            
            <div id="notas-contenedor-list" style="max-height: 160px; overflow-y: auto; margin-bottom: 10px; padding-right: 4px;"></div>
            
            <div style="display: flex; gap: 8px;">
                <input type="text" id="nueva-nota-input" class="form-control" placeholder="Escribir nota operativa o novedad sobre ${c.code}..." style="font-size: 12px;" onkeydown="if(event.key === 'Enter') agregarNotaContenedor('${c.code}')">
                <button type="button" class="btn btn-primary btn-sm" onclick="agregarNotaContenedor('${c.code}')" style="white-space: nowrap;">
                    <i class="fas fa-paper-plane"></i> Guardar
                </button>
            </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button class="btn btn-secondary" onclick="cerrarModales()">Cerrar</button>
            <button class="btn btn-secondary" onclick="verContenedorEnMapa('${c.code}')" style="color: #38bdf8; border-color: rgba(56,189,248,0.4);"><i class="fas fa-map-marked-alt"></i> Ver en Mapa</button>
            <button class="btn btn-primary" onclick="abrirModalEditarContenedor('${c.code}')">Editar Datos</button>
            <button class="btn btn-success" onclick="imprimirRemitoPorCodigo('${c.code}', 'entrega')">📄 Generar Remito</button>
        </div>
    `;

    renderNotasContenedor(c);
    modal.style.display = 'flex';
};

window.abrirModalProrroga = function(code) {
    const c = appData.contenedores.find(x => x.code === code);
    if (!c) return;

    const modal = document.getElementById('modal-prorroga');
    if (!modal) return;

    document.getElementById('prorroga-code').value = c.code;
    document.getElementById('prorroga-actual').value = c.retiro || '';
    document.getElementById('prorroga-nueva').value = '';

    modal.style.display = 'flex';
};

window.guardarProrroga = function() {
    const code = document.getElementById('prorroga-code').value;
    const nuevaFecha = document.getElementById('prorroga-nueva').value;
    if (!nuevaFecha) {
        showToast("Seleccione una nueva fecha de retiro.", "error");
        return;
    }

    const c = appData.contenedores.find(x => x.code === code);
    if (c) {
        c.retiro = nuevaFecha;
        saveData();
        cerrarModales();
        renderAlquileresTable();
        renderDashboard();
        showToast(`✓ Prórroga registrada para ${code} hasta ${nuevaFecha}.`, "success");

        try {
            logOperationalEvent('prorroga', `Prórroga de alquiler en ${code} (${c.cliente || 'Sin cliente'}) extendida hasta ${nuevaFecha}`, code);
            sendLiveSignal({ type: 'DATA_UPDATE' });
        } catch(e) {}
    }
};

window.abrirModalDevolucion = function(code) {
    const c = appData.contenedores.find(x => x.code === code);
    if (!c) return;

    if (confirm(`¿Confirma el retiro y recepción del contenedor ${c.code} de la obra ${c.ubicacion || ''} hacia el Base Operativa Timbúes?`)) {
        const obraAnterior = c.ubicacion || '';
        const clienteAnterior = c.cliente || '';
        c.estado = 'empresa';
        c.cliente = '';
        c.ubicacion = appData.settings.deposito_principal || 'Base Operativa — Timbúes';
        const baseCoords = window.obtenerCoordenadasPorUbicacion ? window.obtenerCoordenadasPorUbicacion(c.ubicacion) : { lat: -32.6642, lng: -60.7932 };
        c.lat = baseCoords.lat;
        c.lng = baseCoords.lng;
        c.retiro = '';
        saveData();
        renderHeaderStats();
        renderDashboard();
        renderFlotaTable();
        renderAlquileresTable();

        if (appData.markersGroup) populateMarkers(appData.markersGroup, false);
        if (appData.dashMarkersGroup) populateMarkers(appData.dashMarkersGroup, true);

        showToast(`✓ Contenedor ${c.code} ingresado nuevamente a Base Timbúes.`, "success");

        try {
            logOperationalEvent('devolucion', `Devolución y recepción en base de ${c.code} (retirado de "${obraAnterior}", cliente: "${clienteAnterior}")`, code);
            sendLiveSignal({ type: 'DATA_UPDATE' });
        } catch(e) {}
    }
};

window.abrirModalMantenimiento = function(code) {
    const c = appData.contenedores.find(x => x.code === code);
    if (!c) return;

    const modal = document.getElementById('modal-mantenimiento-form');
    if (!modal) return;

    document.getElementById('mant-code').value = c.code;
    document.getElementById('mant-title').textContent = `Mantenimiento ${c.code} (${c.tipo})`;
    document.getElementById('mant-nueva-tarea').value = '';

    const listEl = document.getElementById('mant-lista-actual');
    if (listEl) {
        const tareas = Array.isArray(c.tareas) ? c.tareas : [];
        if (tareas.length === 0) {
            listEl.innerHTML = '<span style="color: #94a3b8; font-size: 11px;">Sin tareas registradas.</span>';
        } else {
            listEl.innerHTML = tareas.map((t, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; margin-bottom: 4px; font-size: 11.5px;">
                    <span>🔧 ${t}</span>
                    <button type="button" class="btn btn-danger btn-sm" onclick="completarTarea('${c.code}', ${idx})">✕</button>
                </div>
            `).join('');
        }
    }

    modal.style.display = 'flex';
};

window.agregarTareaMantenimiento = function() {
    const code = document.getElementById('mant-code').value;
    const tarea = document.getElementById('mant-nueva-tarea').value.trim();
    if (!tarea) return;

    const c = appData.contenedores.find(x => x.code === code);
    if (c) {
        if (!Array.isArray(c.tareas)) c.tareas = [];
        c.tareas.push(tarea);
        c.estado = 'reparacion';
        saveData();
        abrirModalMantenimiento(code);
        renderFlotaTable();
        renderDashboard();
        renderMantenimientoBoard();
        showToast(`✓ Tarea agregada a ${code}`, "info");

        try {
            logOperationalEvent('mantenimiento', `Nueva tarea en taller para ${code}: "${tarea}"`, code);
            sendLiveSignal({ type: 'DATA_UPDATE' });
        } catch(e) {}
    }
};

window.eliminarContenedor = function(code) {
    if (confirm(`¿Está seguro de eliminar el contenedor ${code} de la flota?`)) {
        appData.contenedores = appData.contenedores.filter(x => x.code !== code);
        saveData();
        renderHeaderStats();
        renderDashboard();
        renderFlotaTable();
        showToast(`Contenedor ${code} eliminado.`, "warning");
    }
};

window.imprimirRemitoPorCodigo = function(code, tipo = 'entrega') {
    const c = appData.contenedores.find(x => x.code === code);
    if (c && typeof window.imprimirRemito === 'function') {
        window.imprimirRemito(c, tipo);
        try {
            logOperationalEvent('remito', `Emisión de Remito Oficial (${tipo.toUpperCase()}) para ${c.code} (${c.cliente || 'Base'})`, code);
        } catch(e) {}
    }
};

// Exportar Excel
window.exportarContenedoresExcel = function() {
    let csv = "Código\tTipo\tMedida\tEstado\tPago\tCliente\tUbicación\tFecha Entrega\tFecha Retiro\tTareas Mantenimiento\n";
    (appData.contenedores || []).forEach(c => {
        const tareas = Array.isArray(c.tareas) ? c.tareas.join(' | ') : '';
        csv += `${c.code}\t${c.tipo}\t${c.medida}\t${c.estado}\t${c.pago}\t${c.cliente || ''}\t${c.ubicacion || ''}\t${c.entrega || ''}\t${c.retiro || ''}\t${tareas}\n`;
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Flota_Contenedores_Acosta_Servicios_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("✓ Planilla exportada con éxito.", "success");
};

// Modales helpers
window.cerrarModales = function() {
    appData.currentFocusedCode = null;
    try { sendPresenceHeartbeat(); } catch(e) {}
    document.querySelectorAll('.modal-overlay').forEach(m => {
        if (m.id !== 'modal-incoming-call' && m.id !== 'modal-outgoing-call') {
            m.style.display = 'none';
        }
    });
};

function setupEscapeListener() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarModales();
        }
    });
}


// =========================================================
// GESTIÓN DE CONTRATOS Y ASIGNACIÓN DE ALQUILERES
// =========================================================

window.abrirModalAlquiler = function(preselectedCode) {
    const modal = document.getElementById('modal-alquiler');
    if (!modal) return;

    const selectEl = document.getElementById('alquiler-form-code');
    const tipoMedidaEl = document.getElementById('alquiler-form-tipo-medida');
    const clienteEl = document.getElementById('alquiler-form-cliente');
    const ubicacionEl = document.getElementById('alquiler-form-ubicacion');
    const entregaEl = document.getElementById('alquiler-form-entrega');
    const retiroEl = document.getElementById('alquiler-form-retiro');
    const montoEl = document.getElementById('alquiler-form-monto');
    const pagoEl = document.getElementById('alquiler-form-pago');
    const obsEl = document.getElementById('alquiler-form-obs');

    const list = appData.contenedores || [];
    if (selectEl) {
        selectEl.innerHTML = list.map(c => {
            const tag = c.estado === 'empresa' ? '✓ DISPONIBLE EN BASE' : (c.estado === 'alquilado' ? '• ALQUILADO' : ('• ' + c.estado.toUpperCase()));
            return '<option value="' + c.code + '">' + c.code + ' — ' + c.tipo + ' (' + c.medida + ') [' + tag + ']</option>';
        }).join('');
    }

    let targetCode = preselectedCode;
    if (!targetCode) {
        const libre = list.find(c => c.estado === 'empresa');
        targetCode = libre ? libre.code : (list[0] ? list[0].code : '');
    }

    if (selectEl && targetCode) {
        selectEl.value = targetCode;
    }

    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);
    const unMes = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    const unMesStr = unMes.toISOString().slice(0, 10);

    const c = list.find(x => x.code === targetCode);
    if (c) {
        if (tipoMedidaEl) tipoMedidaEl.value = c.tipo + ' (' + c.medida + ')';
        if (clienteEl) clienteEl.value = c.estado === 'alquilado' ? (c.cliente || '') : '';
        if (ubicacionEl) ubicacionEl.value = c.estado === 'alquilado' ? (c.ubicacion || '') : '';
        if (entregaEl) entregaEl.value = c.entrega || hoyStr;
        if (retiroEl) retiroEl.value = c.retiro || unMesStr;
        if (montoEl) montoEl.value = c.monto || '$ 250.000';
        if (pagoEl) pagoEl.value = c.pago || 'al_dia';
        if (obsEl) obsEl.value = c.observaciones || '';
        const provEl = document.getElementById('alquiler-form-proveedor');
        if (provEl) {
            provEl.value = c.proveedor || 'ACOSTA SERVICIOS SRL';
            window.onProveedorAlquilerChange(provEl.value);
        }
    } else {
        if (entregaEl) entregaEl.value = hoyStr;
        if (retiroEl) retiroEl.value = unMesStr;
        const provEl = document.getElementById('alquiler-form-proveedor');
        if (provEl) {
            provEl.value = 'ACOSTA SERVICIOS SRL';
            window.onProveedorAlquilerChange(provEl.value);
        }
    }

    modal.style.display = 'flex';
    const initLat = (c && c.lat && !isNaN(c.lat)) ? c.lat : -32.6642;
    const initLng = (c && c.lng && !isNaN(c.lng)) ? c.lng : -60.7932;
    const provVal = (c && c.proveedor) ? c.proveedor : (document.getElementById('alquiler-form-proveedor') ? document.getElementById('alquiler-form-proveedor').value : 'ACOSTA SERVICIOS SRL');
    window.initAlquilerMap(initLat, initLng, provVal);
};

// Selector de Ubicación en Mini Mapa del Modal de Alquiler
appData.alquilerMapInstance = null;
appData.alquilerMapMarker = null;

window.initAlquilerMap = function(lat, lng, provider) {
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    if (isNaN(lat)) lat = -32.6642;
    if (isNaN(lng)) lng = -60.7932;

    const latEl = document.getElementById('alquiler-form-lat');
    const lngEl = document.getElementById('alquiler-form-lng');
    const badgeEl = document.getElementById('alquiler-form-coords-badge');
    if (latEl) latEl.value = lat.toFixed(6);
    if (lngEl) lngEl.value = lng.toFixed(6);
    if (badgeEl) badgeEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const mapContainer = document.getElementById('alquiler-form-map');
    if (!mapContainer || typeof L === 'undefined') return;

    const isSg = ((provider || '').toUpperCase().includes('SG') || (provider || '').toUpperCase().includes('MONTAJES'));
    // REGLA: Acosta = Amarillo (#f59e0b), SG = Azul (#0284c7)
    const pinColor = isSg ? '#0284c7' : '#f59e0b';

    const getPinIcon = (color) => {
        const isYellow = (color === '#f59e0b');
        const iconColor = isYellow ? '#0f172a' : '#ffffff';
        return L.divIcon({
            className: 'custom-map-pin',
            html: `<div style="background: ${color}; color: ${iconColor}; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.6);"><i class="fa-solid fa-helmet-safety fa-hard-hat"></i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    };

    setTimeout(function() {
        if (!appData.alquilerMapInstance) {
            appData.alquilerMapInstance = L.map('alquiler-form-map', {
                zoomControl: true,
                scrollWheelZoom: true
            }).setView([lat, lng], 13);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri'
            }).addTo(appData.alquilerMapInstance);

            appData.alquilerMapMarker = L.marker([lat, lng], { draggable: true, icon: getPinIcon(pinColor) }).addTo(appData.alquilerMapInstance);

            const syncCoords = function(newLat, newLng) {
                if (latEl) latEl.value = newLat.toFixed(6);
                if (lngEl) lngEl.value = newLng.toFixed(6);
                if (badgeEl) badgeEl.textContent = `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`;
            };

            appData.alquilerMapMarker.on('dragend', function(e) {
                const p = e.target.getLatLng();
                syncCoords(p.lat, p.lng);
            });

            appData.alquilerMapInstance.on('click', function(e) {
                appData.alquilerMapMarker.setLatLng(e.latlng);
                syncCoords(e.latlng.lat, e.latlng.lng);
            });
        } else {
            appData.alquilerMapInstance.setView([lat, lng], 13);
            if (appData.alquilerMapMarker) {
                appData.alquilerMapMarker.setLatLng([lat, lng]);
                appData.alquilerMapMarker.setIcon(getPinIcon(pinColor));
            }
        }
        appData.alquilerMapInstance.invalidateSize();
    }, 120);
};

window.buscarUbicacionEnModalAlquiler = function() {
    const input = document.getElementById('alquiler-form-ubicacion');
    if (!input || !input.value.trim()) return;
    const query = input.value.trim();

    const applyCoords = function(lat, lng) {
        if (appData.alquilerMapInstance) {
            appData.alquilerMapInstance.setView([lat, lng], 14);
            if (appData.alquilerMapMarker) appData.alquilerMapMarker.setLatLng([lat, lng]);
        }
        const latEl = document.getElementById('alquiler-form-lat');
        const lngEl = document.getElementById('alquiler-form-lng');
        const badgeEl = document.getElementById('alquiler-form-coords-badge');
        if (latEl) latEl.value = lat.toFixed(6);
        if (lngEl) lngEl.value = lng.toFixed(6);
        if (badgeEl) badgeEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        showToast(`📍 Ubicación de obra fijada: ${query}`, "info");
    };

    const localCoords = window.obtenerCoordenadasPorUbicacion(query);
    const qLower = query.toLowerCase();

    const isSpecific = qLower.includes('san lorenzo') || qLower.includes('puerto') || qLower.includes('rosario') || 
                       qLower.includes('cargill') || qLower.includes('dreyfus') || qLower.includes('bunge') || 
                       qLower.includes('renova') || qLower.includes('cofco') || qLower.includes('timbues') || 
                       qLower.includes('quilmes') || qLower.includes('lujan') || qLower.includes('canuelas') || 
                       qLower.includes('vgg') || qLower.includes('pilar') || qLower.includes('escobar') || 
                       qLower.includes('base') || qLower.includes('campana') || qLower.includes('zarate');

    if (isSpecific) {
        applyCoords(localCoords.lat, localCoords.lng);
        return;
    }

    // Geocodificación online con Nominatim OSM
    fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=ar&limit=1&q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => {
            if (data && data.length > 0) {
                applyCoords(parseFloat(data[0].lat), parseFloat(data[0].lon));
            } else {
                applyCoords(localCoords.lat, localCoords.lng);
            }
        })
        .catch(() => {
            applyCoords(localCoords.lat, localCoords.lng);
        });
};

window.onAlquilerSelectContainer = function(code) {
    const c = (appData.contenedores || []).find(x => x.code === code);
    const tipoMedidaEl = document.getElementById('alquiler-form-tipo-medida');
    const clienteEl = document.getElementById('alquiler-form-cliente');
    const ubicacionEl = document.getElementById('alquiler-form-ubicacion');
    if (c) {
        if (tipoMedidaEl) tipoMedidaEl.value = c.tipo + ' (' + c.medida + ')';
        if (c.estado === 'alquilado') {
            if (clienteEl && !clienteEl.value) clienteEl.value = c.cliente || '';
            if (ubicacionEl && !ubicacionEl.value) ubicacionEl.value = c.ubicacion || '';
        }
        const provEl = document.getElementById('alquiler-form-proveedor');
        if (provEl) {
            provEl.value = c.proveedor || 'ACOSTA SERVICIOS SRL';
            window.onProveedorAlquilerChange(provEl.value);
        }
        const curLat = (c.lat && !isNaN(c.lat)) ? c.lat : -32.6642;
        const curLng = (c.lng && !isNaN(c.lng)) ? c.lng : -60.7932;
        window.initAlquilerMap(curLat, curLng, c.proveedor || (provEl ? provEl.value : 'ACOSTA SERVICIOS SRL'));
    }
};

window.guardarAlquilerForm = function(e, emitirRemito) {
    if (e && e.preventDefault) e.preventDefault();

    const selectEl = document.getElementById('alquiler-form-code');
    const clienteEl = document.getElementById('alquiler-form-cliente');
    const ubicacionEl = document.getElementById('alquiler-form-ubicacion');
    const entregaEl = document.getElementById('alquiler-form-entrega');
    const retiroEl = document.getElementById('alquiler-form-retiro');
    const montoEl = document.getElementById('alquiler-form-monto');
    const pagoEl = document.getElementById('alquiler-form-pago');
    const obsEl = document.getElementById('alquiler-form-obs');

    const code = selectEl ? selectEl.value : '';
    if (!code) {
        showToast("Seleccione un contenedor válido.", "warning");
        return;
    }

    const c = (appData.contenedores || []).find(x => x.code === code);
    if (!c) {
        showToast("Contenedor no encontrado.", "error");
        return;
    }

    c.estado = 'alquilado';
    c.cliente = clienteEl ? clienteEl.value.trim() : '';
    c.ubicacion = ubicacionEl ? ubicacionEl.value.trim() : '';
    c.entrega = entregaEl ? entregaEl.value : '';
    c.retiro = retiroEl ? retiroEl.value : '';
    c.monto = montoEl ? montoEl.value.trim() : '';
    c.pago = pagoEl ? pagoEl.value : 'al_dia';
    c.observaciones = obsEl ? obsEl.value.trim() : '';
    const provEl = document.getElementById('alquiler-form-proveedor');
    c.proveedor = provEl ? provEl.value : 'ACOSTA SERVICIOS SRL';

    // Obtener coordenadas desde el mini mapa interactivo o resolvedor
    const latInp = document.getElementById('alquiler-form-lat');
    const lngInp = document.getElementById('alquiler-form-lng');
    let lat = latInp ? parseFloat(latInp.value) : NaN;
    let lng = lngInp ? parseFloat(lngInp.value) : NaN;

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        const coords = window.obtenerCoordenadasPorUbicacion(c.ubicacion);
        lat = coords.lat;
        lng = coords.lng;
    }

    c.lat = lat;
    c.lng = lng;

    saveData();
    cerrarModales();

    try { renderHeaderStats(); } catch(err) {}
    try { renderDashboard(); } catch(err) {}
    try { renderFlotaTable(); } catch(err) {}
    try { renderAlquileresTable(); } catch(err) {}

    // Actualizar pines del mapa en vivo inmediatamente
    if (appData.markersGroup) populateMarkers(appData.markersGroup, false);
    if (appData.dashMarkersGroup) populateMarkers(appData.dashMarkersGroup, true);

    showToast(`✓ Contenedor ${c.code} asignado a "${c.cliente}" con éxito. Ubicado en el mapa.`, "success");

    try {
        logOperationalEvent('alquiler', `Alquiler de contenedor ${c.code} (${c.tipo}) a "${c.cliente}" en "${c.ubicacion || 'Sin especificar'}" hasta ${c.retiro || 'indefinido'}`, c.code);
        sendLiveSignal({ type: 'DATA_UPDATE' });
    } catch(e) {}

    if (emitirRemito) {
        setTimeout(function() {
            imprimirRemitoPorCodigo(c.code, 'entrega');
        }, 300);
    }
};

window.guardarAlquilerYEmitirRemito = function(e) {
    window.guardarAlquilerForm(e, true);
};


// Iniciar aplicación
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initContenedoresApp);
} else {
    window.initContenedoresApp();
}

// =========================================================
// GESTIÓN DE PROVEEDOR EMISOR (ACOSTA SERVICIOS vs SG MONTAJES) & ATAJO F6
// =========================================================

window.toggleProveedorAlquiler = function() {
    const provEl = document.getElementById('alquiler-form-proveedor');
    if (!provEl) return;
    if (provEl.value === 'ACOSTA SERVICIOS SRL') {
        provEl.value = 'SG MONTAJES SRL';
    } else {
        provEl.value = 'ACOSTA SERVICIOS SRL';
    }
    window.onProveedorAlquilerChange(provEl.value);
    showToast(`Proveedor cambiado a: ${provEl.value}`, 'info');
};

window.onProveedorAlquilerChange = function(val) {
    const badgeEl = document.getElementById('alquiler-proveedor-badge-preview');
    if (!badgeEl) return;
    const isAcosta = (val || '').toUpperCase().includes('ACOSTA');
    if (isAcosta) {
        badgeEl.style.background = 'rgba(245, 158, 11, 0.2)';
        badgeEl.style.borderColor = '#f59e0b';
        badgeEl.style.color = '#fbbf24';
        badgeEl.innerHTML = '🟡 ACOSTA SERVICIOS SRL (Timbúes)';
    } else {
        badgeEl.style.background = 'rgba(2, 132, 199, 0.2)';
        badgeEl.style.borderColor = '#38bdf8';
        badgeEl.style.color = '#38bdf8';
        badgeEl.innerHTML = '🔵 SG MONTAJES SRL (Timbúes)';
    }
    // Sincronizar color del pin en el mapa interactivo de alquiler si está abierto
    if (appData.alquilerMapMarker && typeof L !== 'undefined') {
        const pinColor = isAcosta ? '#f59e0b' : '#0284c7';
        const iconColor = isAcosta ? '#0f172a' : '#ffffff';
        appData.alquilerMapMarker.setIcon(L.divIcon({
            className: 'custom-map-pin',
            html: `<div style="background: ${pinColor}; color: ${iconColor}; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.6);"><i class="fa-solid fa-helmet-safety fa-hard-hat"></i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        }));
    }
};

// Escuchar la tecla F6 globalmente
document.addEventListener('keydown', function(event) {
    if (event.key === 'F6' || event.keyCode === 117) {
        const modalAlquiler = document.getElementById('modal-alquiler');
        if (modalAlquiler && modalAlquiler.style.display !== 'none') {
            event.preventDefault();
            event.stopPropagation();
            window.toggleProveedorAlquiler();
        }
    }
});


// Geocodificador de Ubicación a Coordenadas (Timbúes, Cordón Industrial, Santa Fe, Argentina)
window.obtenerCoordenadasPorUbicacion = function(texto) {
    const t = (texto || '').toLowerCase().trim();
    if (!t || t.includes('timbues') || t.includes('timbúes') || t.includes('base') || t.includes('deposito') || t.includes('depósito') || t.includes('sarandí') || t.includes('sarandi')) {
        // Base Operativa Timbúes (con dispersión sutil para visualización clara de cada pin)
        return { lat: -32.6642 + (Math.random() - 0.5) * 0.003, lng: -60.7932 + (Math.random() - 0.5) * 0.003 };
    }
    if (t.includes('san lorenzo') || t.includes('san lorenso')) return { lat: -32.7441, lng: -60.7335 };
    if (t.includes('puerto general san martin') || t.includes('pgsm') || t.includes('puerto san martin')) return { lat: -32.7167, lng: -60.7333 };
    if (t.includes('renova')) return { lat: -32.6800, lng: -60.7200 };
    if (t.includes('cofco')) return { lat: -32.6950, lng: -60.7250 };
    if (t.includes('terminal 6') || t.includes('t6')) return { lat: -32.7050, lng: -60.7280 };
    if (t.includes('dreyfus') || t.includes('ldc')) return { lat: -32.7230, lng: -60.7180 };
    if (t.includes('bunge')) return { lat: -32.7110, lng: -60.7250 };
    if (t.includes('molinos') || t.includes('vicentin')) return { lat: -32.7350, lng: -60.7290 };
    if (t.includes('ricardone')) return { lat: -32.7711, lng: -60.7892 };
    if (t.includes('bermudez') || t.includes('bermúdez')) return { lat: -32.8189, lng: -60.7142 };
    if (t.includes('baigorria')) return { lat: -32.8536, lng: -60.7103 };
    if (t.includes('rosario')) return { lat: -32.9587, lng: -60.6930 };
    if (t.includes('vgg') || t.includes('villa gobernador galvez') || t.includes('gálvez')) return { lat: -33.0298, lng: -60.6277 };
    if (t.includes('cargill')) return { lat: -33.0210, lng: -60.6120 };
    if (t.includes('san nicolas') || t.includes('san nicolás')) return { lat: -33.3333, lng: -60.2167 };
    if (t.includes('villa constitucion') || t.includes('constitución')) return { lat: -33.2278, lng: -60.3297 };
    if (t.includes('santa fe')) return { lat: -31.6333, lng: -60.7000 };
    if (t.includes('cordoba') || t.includes('córdoba')) return { lat: -31.4201, lng: -64.1888 };
    if (t.includes('campana')) return { lat: -34.1687, lng: -58.9591 };
    if (t.includes('zarate') || t.includes('zárate')) return { lat: -34.0989, lng: -59.0286 };
    if (t.includes('quilmes')) return { lat: -34.7415, lng: -58.2733 };
    if (t.includes('luján') || t.includes('lujan')) return { lat: -34.5701, lng: -59.1053 };
    if (t.includes('cañuelas') || t.includes('canuelas')) return { lat: -35.0501, lng: -58.7594 };
    if (t.includes('escobar')) return { lat: -34.3486, lng: -58.7931 };
    if (t.includes('pilar')) return { lat: -34.4587, lng: -58.9142 };
    if (t.includes('tigre')) return { lat: -34.4198, lng: -58.6032 };
    if (t.includes('la plata')) return { lat: -34.9021, lng: -57.9789 };
    if (t.includes('puerto madero') || t.includes('caba') || t.includes('buenos aires') || t.includes('puerto nuevo')) return { lat: -34.5723, lng: -58.3708 };
    if (t.includes('avellaneda')) return { lat: -34.6634, lng: -58.3651 };
    
    // Si no coincide exactamente, ubicar en la zona industrial de Timbúes/San Lorenzo con ligera variación
    return { lat: -32.6642 + (Math.random() - 0.5) * 0.02, lng: -60.7932 + (Math.random() - 0.5) * 0.02 };
};

window.onEstadoContenedorChange = function(estado) {
    const fields = document.getElementById('form-cont-alquiler-fields');
    if (!fields) return;
    if (estado === 'alquilado' || estado === 'reservado') {
        fields.style.display = 'block';
    } else {
        fields.style.display = 'none';
    }
};


// =========================================================
// DESGLOSE DISPONIBILIDAD EN BASE: ACOSTA vs SG MONTAJES
// =========================================================

window.abrirModalDisponiblesBase = function() {
    const modal = document.getElementById('modal-disponibles-base');
    if (!modal) return;

    const list = appData.contenedores || [];
    const enBase = list.filter(x => x.estado === 'empresa');

    let acostaCount = 0;
    let sgCount = 0;
    const itemsHtml = [];

    enBase.forEach(c => {
        const prov = (c.proveedor || '').toUpperCase();
        const isSg = prov.includes('SG') || prov.includes('MONTAJES');
        if (isSg) {
            sgCount++;
        } else {
            acostaCount++;
        }

        const tagColor = isSg ? '#f59e0b' : '#38bdf8';
        const tagBorder = isSg ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)';
        const tagBg = isSg ? 'rgba(245, 158, 11, 0.12)' : 'rgba(2, 132, 199, 0.12)';
        const provName = isSg ? 'SG Montajes' : 'Acosta Servicios';

        itemsHtml.push(`
            <div style="display: flex; justify-content: space-between; align-items: center; background: ${tagBg}; border: 1px solid ${tagBorder}; border-radius: 6px; padding: 6px 10px; font-size: 11.5px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-family: monospace; font-size: 12.5px; color: ${tagColor};">${c.code}</strong>
                    <span style="color: #cbd5e1; font-weight: 600;">${c.tipo} (${c.medida})</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 10.5px; color: ${tagColor}; font-weight: bold;">${provName}</span>
                    <button class="btn btn-warning btn-sm" style="padding: 2px 6px; font-size: 10px;" onclick="cerrarModales(); abrirModalAlquiler('${c.code}')">
                        <i class="fas fa-handshake"></i> Alquilar
                    </button>
                </div>
            </div>
        `);
    });

    const elAcosta = document.getElementById('modal-base-count-acosta');
    if (elAcosta) elAcosta.textContent = acostaCount;

    const elSg = document.getElementById('modal-base-count-sg');
    if (elSg) elSg.textContent = sgCount;

    const elList = document.getElementById('modal-base-list-items');
    if (elList) {
        elList.innerHTML = itemsHtml.length > 0 ? itemsHtml.join('') : '<div style="color: #94a3b8; font-size: 12px; text-align: center; padding: 8px;">No hay unidades disponibles en base en este momento.</div>';
    }

    modal.style.display = 'flex';
};

window.filtrarFlotaPorBaseYProveedor = function(provFiltro) {
    cerrarModales();
    switchView('flota');
    setFilterEstado('empresa');
    
    // Limpiar buscador de texto para no filtrar por texto erróneo
    const input = document.getElementById('flota-search-input');
    if (input) {
        input.value = '';
        appData.searchQuery = '';
    }
    
    const provKey = (provFiltro || '').toUpperCase().includes('SG') ? 'sg' : 'acosta';
    window.setFilterProveedor(provKey);
    
    const provNombre = provKey === 'sg' ? 'SG Montajes' : 'Acosta Servicios';
    showToast(`✓ Mostrando unidades en Base de ${provNombre}`, 'info');
};
