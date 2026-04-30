// ============================================================
//  NOTIFICATION SYSTEM
// ============================================================
const NOTIF_ICONS = {
  error: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 6 L10 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="13.5" r="1" fill="currentColor"/></svg>`,
  warn: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 2.5 L18 17 L2 17 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M10 8 L10 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.5" r="1" fill="currentColor"/></svg>`,
  success: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 10 L8.5 13 L14.5 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  info: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 9 L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="6.5" r="1" fill="currentColor"/></svg>`
};

const NOTIF_TITLES = { error: 'Erreur', warn: 'Avertissement', success: 'Succès', info: 'Info' };

function notify(type, message, detail='', duration=5000) {
  const container = document.getElementById('notif-container');
  const id = 'n_' + Date.now();
  const div = document.createElement('div');
  div.className = `notif type-${type}`;
  div.id = id;
  const time = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  div.innerHTML = `
    <div class="notif-icon">${NOTIF_ICONS[type]}</div>
    <div class="notif-body">
      <div class="notif-title">${NOTIF_TITLES[type]}</div>
      <div class="notif-msg">${message}${detail ? `<br><span style="opacity:.7;font-size:.72rem;">${detail}</span>` : ''}</div>
      <div class="notif-time">${time}</div>
    </div>
    <div class="notif-close" onclick="dismissNotif('${id}')">×</div>
    <div class="notif-progress" id="np_${id}" style="width:100%"></div>
  `;
  div.addEventListener('click', () => dismissNotif(id));
  container.appendChild(div);
  requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('show')));

  const bar = document.getElementById('np_' + id);
  if (bar) {
    bar.style.transition = `width ${duration}ms linear`;
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '0%'; }));
  }

  setTimeout(() => dismissNotif(id), duration);
}

function dismissNotif(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('fade-out');
  el.classList.remove('show');
  setTimeout(() => el.remove(), 350);
}

function showToast(msg, duration=3500) {
  const isError = msg.includes('Erreur') || msg.includes('erreur') || msg.includes('impossible') || msg.includes('Impossible');
  const isWarn = msg.includes('Avertissement') || msg.includes('attention') || msg.includes('Déconnecté');
  const isSuccess = msg.includes('succès') || msg.includes('connecté') || msg.includes('copié') || msg.includes('exporté');
  const type = isError ? 'error' : isWarn ? 'warn' : isSuccess ? 'success' : 'info';
  const clean = msg.replace(/^[^a-zA-ZÀ-ÿ0-9]+/, '').trim();
  notify(type, clean, '', duration);
}

function showAlert(msg, color) {
  const isWarn = color === '#eab308' || color?.includes('eab');
  const type = isWarn ? 'warn' : 'error';
  const clean = msg.replace(/^[^a-zA-ZÀ-ÿ0-9]+/, '').trim();
  notify(type, clean, '', 6000);
}

// ============================================================
//  STAT MODAL
// ============================================================
function openStatModal(label, elId, unit) {
  const el = document.getElementById(elId);
  if (!el) return;
  let val = el.textContent;
  const numMatch = val.match(/([\d.,-]+)/);
  const restMatch = val.match(/([a-zA-Zéàü°/²%]+)/);
  document.getElementById('modal-label').textContent = label;
  if (numMatch) {
    document.getElementById('modal-value').textContent = numMatch[0];
    document.getElementById('modal-unit').textContent = restMatch ? restMatch[0] : (unit || '');
  } else {
    document.getElementById('modal-value').textContent = val;
    document.getElementById('modal-unit').textContent = unit || '';
  }
  const colors = ['accent','green','blue','red','yellow','purple'];
  let color = 'var(--text)';
  colors.forEach(c => { if (el.classList.contains(c)) color = `var(--${c})`; });
  document.getElementById('modal-value').style.color = color;
  document.getElementById('stat-modal').classList.add('show');
}

function closeStatModal() {
  document.getElementById('stat-modal').classList.remove('show');
}

document.getElementById('stat-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('stat-modal')) closeStatModal();
});

// ============================================================
//  GLOBAL STATE
// ============================================================
let role = null;
let peer = null;
let conn = null;
let beaconUUID = null;
let isRunning = false;
let raceStartTime = null;
let raceTimerInterval = null;
let simInterval = null;

let watchId = null;
let accelData = {x:0,y:0,z:0};
let gyroData = {alpha:0,beta:0,gamma:0};
let lastPos = null;

let racePoints = [];
let speedHistory = [];
let accelHistory = [];
let timeLabels = [];
let maxSpeed = 0;
let sumSpeed = 0;
let countSpeed = 0;
let maxShock = 0;
let totalDist = 0;
let startAlt = null;
let dataFreqSamples = [];
let lastDataTime = 0;

let map = null;
let mapMarker = null;
let mapPolyline = null;
let mapLatLngs = [];
let currentTileLayer = null;
let currentLayerIdx = 0;

let speedChartInst = null;
let accelChartInst = null;

// ===== DRIVER MODE STATE =====
let driverModeActive = false;
let driverDataInterval = null;
let lastSlopeValue = 0;
let maxSlopeValue = 0;
let sensorSendInterval = null;
let slopePoints = []; // Track positions for slope calculation in driver mode

// ============================================================
//  MAP TILE LAYERS (alternatives pour éviter 403)
// ============================================================
const MAP_LAYERS = [
  {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: 'abc',
    crossOrigin: true
  },
  {
    name: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
    subdomains: 'abcd',
    crossOrigin: true
  },
  {
    name: 'Stadia Outdoors',
    url: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    attr: '&copy; Stadia Maps &copy; OpenStreetMap contributors',
    maxZoom: 20,
    crossOrigin: true
  },
  {
    name: 'CyclOSM',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attr: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: 'abc',
    crossOrigin: true
  }
];

// ============================================================
//  UTILITY
// ============================================================
function genUUID() {
  return String(Math.floor(10000000 + Math.random() * 89999999));
}

function beaconLog(msg, cls='') {
  const el = document.getElementById('beacon-log');
  if (!el) return;
  const d = document.createElement('div');
  d.className = 'log-entry' + (cls ? ' ' + cls : '');
  const t = document.createElement('span');
  t.className = 'log-time';
  t.textContent = new Date().toLocaleTimeString('fr-FR');
  const m = document.createElement('span');
  m.className = 'log-msg';
  m.textContent = msg;
  d.appendChild(t); d.appendChild(m);
  el.insertBefore(d, el.firstChild);
  if (el.children.length > 25) el.removeChild(el.lastChild);
}

function ctrlLog(msg, cls='') {
  const el = document.getElementById('ctrl-log');
  if (!el) return;
  const d = document.createElement('div');
  d.className = 'log-entry' + (cls ? ' ' + cls : '');
  const t = document.createElement('span');
  t.className = 'log-time';
  t.textContent = new Date().toLocaleTimeString('fr-FR');
  const m = document.createElement('span');
  m.className = 'log-msg';
  m.textContent = msg;
  d.appendChild(t); d.appendChild(m);
  el.insertBefore(d, el.firstChild);
  if (el.children.length > 40) el.removeChild(el.lastChild);
}

function fmtTime(ms) {
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const h = Math.floor(m/60);
  return `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function calcDistance(lat1,lon1,lat2,lon2) {
  const R=6371000; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function setSignalBars(strength) {
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById('sig' + i);
    if (bar) bar.classList.toggle('active', i <= strength);
  }
}

// ============================================================
//  ROLE SELECTION
// ============================================================
function chooseRole(r) {
  role = r;
  document.getElementById('splash').style.display = 'none';
  if (r === 'beacon') initBeacon();
  else initControl();
}

// ============================================================
//  BEACON ROLE
// ============================================================
function initBeacon() {
  const pg = document.getElementById('beacon-page');
  pg.style.display = 'flex';
  beaconUUID = genUUID();
  document.getElementById('beacon-uuid').textContent = beaconUUID;
  beaconLog('Balise initialisée', 'log-ok');
  initPeerBeacon();
}

function initPeerBeacon() {
  document.getElementById('b-peer-badge').textContent = 'Connexion réseau...';
  peer = new Peer(beaconUUID, {
    host: '0.peerjs.com', port: 443, path: '/', secure: true,
    config: { iceServers: [
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'stun:stun1.l.google.com:19302'}
    ]}
  });
  peer.on('open', id => {
    beaconLog(`Réseau P2P actif — ID: ${id}`, 'log-ok');
    document.getElementById('b-peer-badge').className = 'badge online';
    document.getElementById('b-peer-badge').innerHTML = '<span class="dot"></span> En ligne';
  });
  peer.on('connection', c => {
    conn = c;
    beaconLog('Poste de commande connecté', 'log-ok');
    notify('success', 'Poste de commande connecté', 'Liaison P2P WebRTC établie');
    document.getElementById('b-peer-badge').className = 'badge online';
    document.getElementById('b-peer-badge').innerHTML = '<span class="dot"></span> Commandé';
    conn.on('data', handleBeaconCommand);
    conn.on('close', () => {
      beaconLog('Poste de commande déconnecté', 'log-err');
      notify('warn', 'Poste de commande déconnecté', 'La liaison P2P a été perdue');
      document.getElementById('b-peer-badge').className = 'badge warning';
      document.getElementById('b-peer-badge').textContent = 'Déconnecté';
      conn = null;
    });
  });
  peer.on('error', e => {
    beaconLog(`Erreur réseau: ${e.type}`, 'log-err');
    notify('error', 'Erreur réseau P2P', `Type: ${e.type} — Vérifiez votre connexion internet`);
    document.getElementById('b-peer-badge').className = 'badge offline';
    document.getElementById('b-peer-badge').textContent = 'Erreur réseau';
  });
  peer.on('disconnected', () => {
    beaconLog('Déconnecté du serveur P2P', 'log-err');
    notify('warn', 'Serveur P2P inaccessible', 'Tentative de reconnexion automatique...');
    setTimeout(() => { try { peer.reconnect(); } catch(e){} }, 3000);
  });
}

function handleBeaconCommand(data) {
  if (data.cmd === 'start') {
    startBeacon();
    notify('info', 'Commande reçue', 'Démarrage ordonné par le poste de commande');
  }
  if (data.cmd === 'stop') {
    stopBeacon();
    notify('warn', 'Arrêt commandé', 'Stop ordonné par le poste de commande');
  }
}

function regenUUID() {
  if (isRunning) { notify('warn', 'Balise active', 'Arrêtez la balise avant de régénérer l\'UUID'); return; }
  if (peer) { try { peer.destroy(); } catch(e){} }
  beaconUUID = genUUID();
  document.getElementById('beacon-uuid').textContent = beaconUUID;
  initPeerBeacon();
  beaconLog('UUID régénéré');
  notify('info', 'UUID régénéré', `Nouveau code: ${beaconUUID}`);
}

function copyUUID() {
  navigator.clipboard.writeText(beaconUUID)
    .then(() => notify('success', 'UUID copié', `Code ${beaconUUID} dans le presse-papiers`))
    .catch(() => notify('info', 'UUID: ' + beaconUUID, 'Copie manuelle nécessaire'));
}

function startBeacon() {
  if (isRunning) return;
  isRunning = true;
  document.getElementById('btn-start-beacon').style.display = 'none';
  document.getElementById('btn-stop-beacon').style.display = 'inline-flex';
  document.getElementById('btn-driver-mode').style.display = 'inline-flex';
  document.getElementById('b-status-badge').className = 'badge online';
  document.getElementById('b-status-badge').innerHTML = '<span class="dot"></span> Actif';
  beaconLog('Démarrage des capteurs...', 'log-ok');
  startGPS();
  startMotionSensors();
  // Start high-frequency sensor data transmission (50ms = 20 Hz)
  sensorSendInterval = setInterval(() => {
    if (conn && conn.open && lastPos) {
      const payload = {
        type: 'data', ts: Date.now(),
        lat: lastPos.latitude, lon: lastPos.longitude, alt: lastPos.altitude || 0,
        speed: lastPos.speed ? lastPos.speed * 3.6 : 0,
        heading: lastPos.heading || 0, accuracy: lastPos.accuracy,
        acc_x: accelData.x, acc_y: accelData.y, acc_z: accelData.z,
        gyro_a: gyroData.alpha, gyro_b: gyroData.beta, gyro_g: gyroData.gamma
      };
      try { conn.send(payload); } catch(e){}
    }
  }, 50); // Send sensor data  at 20 Hz for smooth real-time updates
  if (conn) conn.send({type:'status', status:'started'});
}

function stopBeacon() {
  if (!isRunning) return;
  // Exit driver mode if active
  if (driverModeActive) {
    exitDriverMode();
  }
  isRunning = false;
  document.getElementById('btn-start-beacon').style.display = 'inline-flex';
  document.getElementById('btn-stop-beacon').style.display = 'none';
  document.getElementById('btn-driver-mode').style.display = 'none';
  document.getElementById('b-status-badge').className = 'badge offline';
  // Stop high-frequency sensor transmission
  if (sensorSendInterval) {
    clearInterval(sensorSendInterval);
    sensorSendInterval = null;
  }
  document.getElementById('b-status-badge').innerHTML = '<span class="dot" style="background:var(--red)"></span> Arrêté';
  if (watchId) navigator.geolocation.clearWatch(watchId);
  beaconLog('Balise arrêtée');
  if (conn) conn.send({type:'status', status:'stopped'});
}

function startGPS() {
  if (!navigator.geolocation) {
    notify('error', 'GPS indisponible', 'Ce navigateur ne supporte pas la géolocalisation');
    beaconLog('GPS non disponible', 'log-err');
    return;
  }
  beaconLog('Acquisition GPS à haute précision...');
  watchId = navigator.geolocation.watchPosition(pos => {
    const {latitude, longitude, altitude, speed, heading, accuracy} = pos.coords;
    lastPos = {latitude, longitude, altitude, speed, heading, accuracy}; // Store for frequent sending
    document.getElementById('sc-gps').classList.add('active');
    document.getElementById('sv-gps').textContent = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    document.getElementById('sv-alt').textContent = altitude ? `${altitude.toFixed(1)} m` : '— m';
    const spd = speed ? (speed * 3.6).toFixed(1) : '0.0';
    document.getElementById('sv-speed').textContent = `${spd} km/h`;
    document.getElementById('sv-heading').textContent = heading ? `${heading.toFixed(0)}°` : '—°';
    document.getElementById('b-gps-badge').className = 'badge online';
    document.getElementById('b-gps-badge').innerHTML = `<span class="dot"></span> ±${accuracy ? accuracy.toFixed(0) : '?'}m`;
    
    // Add to race points for driver mode if running
    if (raceStartTime && racePoints.length > 0) {
      // Only add if at least 5 meters from last point to avoid noise
      const lastPoint = racePoints[racePoints.length - 1];
      const dist = calcDistance(lastPoint.lat, lastPoint.lon, latitude, longitude);
      if (dist >= 5) {
        const now = Date.now();
        speedHistory.push(speed ? speed * 3.6 : 0);
        racePoints.push({lat: latitude, lon: longitude, alt: altitude || 0, speed: speed ? speed * 3.6 : 0, ts: now});
        if (lastPoint) {
          totalDist += dist;
        }
      }
    }
    
    // Send immediately for very fast updates
    const payload = {
      type:'data', ts: Date.now(),
      lat: latitude, lon: longitude, alt: altitude || 0,
      speed: speed ? speed*3.6 : 0,
      heading: heading || 0, accuracy: accuracy,
      acc_x: accelData.x, acc_y: accelData.y, acc_z: accelData.z,
      gyro_a: gyroData.alpha, gyro_b: gyroData.beta, gyro_g: gyroData.gamma
    };
    if (conn && conn.open) { try { conn.send(payload); } catch(e){
      notify('error', 'Erreur d\'envoi P2P', e.message || 'Connexion instable');
    }}
  }, err => {
    const errMsg = {1:'Permission refusée par l\'utilisateur', 2:'Position indisponible', 3:'Délai GPS dépassé'}[err.code] || err.message;
    beaconLog(`Erreur GPS: ${errMsg}`, 'log-err');
    notify('error', 'Erreur GPS', errMsg + ` (code ${err.code})`);
    document.getElementById('b-gps-badge').className = 'badge offline';
    document.getElementById('b-gps-badge').textContent = 'GPS: erreur';
  }, {enableHighAccuracy:true, maximumAge:0, timeout:8000}); // Reduced timeout for faster updates
}

function startMotionSensors() {
  if (typeof DeviceMotionEvent !== 'undefined') {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(p => {
        if (p === 'granted') {
          window.addEventListener('devicemotion', onMotion);
          beaconLog('Accéléromètre actif', 'log-ok');
        } else {
          notify('warn', 'Permission accéléromètre refusée', 'Les données de force G ne seront pas disponibles');
          beaconLog('Permission accéléromètre refusée', 'log-err');
        }
      }).catch(e => {
        notify('error', 'Erreur accéléromètre', e.message || String(e));
        beaconLog('Accél: ' + e, 'log-err');
      });
    } else {
      window.addEventListener('devicemotion', onMotion);
      beaconLog('Accéléromètre actif', 'log-ok');
    }
  } else {
    notify('warn', 'Accéléromètre indisponible', 'Données d\'accélération non supportées sur cet appareil');
    beaconLog('Accéléromètre non disponible', 'log-err');
  }

  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(p => {
        if (p === 'granted') {
          window.addEventListener('deviceorientation', onOrientation);
          beaconLog('Gyroscope actif', 'log-ok');
        } else {
          notify('warn', 'Permission gyroscope refusée', 'Les données de rotation ne seront pas disponibles');
        }
      }).catch(e => {});
    } else {
      window.addEventListener('deviceorientation', onOrientation);
      beaconLog('Gyroscope actif', 'log-ok');
    }
  } else {
    notify('warn', 'Gyroscope indisponible', 'Données de rotation non supportées');
    beaconLog('Gyroscope non disponible', 'log-err');
  }
}

function onMotion(e) {
  if (!isRunning) return;
  const a = e.accelerationIncludingGravity;
  if (a) {
    accelData = {x: a.x || 0, y: a.y || 0, z: a.z || 0};
    document.getElementById('sc-acc').classList.add('active');
    document.getElementById('sv-acc').textContent =
      `X:${(a.x||0).toFixed(1)} Y:${(a.y||0).toFixed(1)}`;
  }
}

function onOrientation(e) {
  if (!isRunning) return;
  gyroData = {alpha: e.alpha||0, beta: e.beta||0, gamma: e.gamma||0};
  document.getElementById('sc-gyro').classList.add('active');
  document.getElementById('sv-gyro').textContent =
    `α:${(e.alpha||0).toFixed(0)} β:${(e.beta||0).toFixed(0)}`;
}

// ============================================================
//  CONTROL ROLE — CONNECT
// ============================================================
let connCountdownInt = null;

function initControl() {
  document.getElementById('control-connect').style.display = 'flex';
  document.getElementById('control-connect').style.flexDirection = 'column';
  peer = new Peer({
    host: '0.peerjs.com', port: 443, path: '/', secure: true,
    config: { iceServers: [
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'stun:stun1.l.google.com:19302'}
    ]}
  });
  peer.on('open', id => {
    document.getElementById('ctrl-peer-badge').className = 'badge online';
    document.getElementById('ctrl-peer-badge').innerHTML = '<span class="dot"></span> Prêt';
  });
  peer.on('error', e => {
    document.getElementById('ctrl-peer-badge').className = 'badge warning';
    document.getElementById('ctrl-peer-badge').textContent = 'Erreur réseau';
    notify('error', 'Erreur réseau P2P', `Type: ${e.type} — Impossible de joindre le serveur de signalisation`);
  });
  peer.on('disconnected', () => {
    notify('warn', 'Déconnecté du serveur P2P', 'Reconnexion en cours...');
    setTimeout(() => { try { peer.reconnect(); } catch(e){} }, 3000);
  });
}

function connectToBeacon() {
  const uuid = document.getElementById('uuid-input').value.trim();
  if (uuid.length !== 8) {
    notify('warn', 'UUID invalide', 'L\'identifiant doit contenir exactement 8 chiffres');
    return;
  }
  if (!peer || peer.destroyed) {
    notify('error', 'Réseau non initialisé', 'Le module P2P n\'est pas prêt — rechargez la page');
    return;
  }
  document.getElementById('connect-area').style.display = 'none';
  document.getElementById('connecting-state').style.display = 'block';

  let countdown = 10;
  const cdEl = document.getElementById('conn-countdown');
  if (cdEl) cdEl.textContent = countdown;
  connCountdownInt = setInterval(() => {
    countdown--;
    if (cdEl) cdEl.textContent = countdown;
  }, 1000);

  conn = peer.connect(uuid, {reliable: true, serialization: 'json'});
  const timeout = setTimeout(() => {
    clearInterval(connCountdownInt);
    notify('error', 'Connexion impossible', `Aucune balise trouvée avec l\'UUID ${uuid}. Vérifiez le code et que la balise est active.`);
    document.getElementById('connect-area').style.display = 'flex';
    document.getElementById('connecting-state').style.display = 'none';
  }, 10000);

  conn.on('open', () => {
    clearTimeout(timeout);
    clearInterval(connCountdownInt);
    beaconUUID = uuid;
    notify('success', 'Balise connectée', `Liaison P2P avec la balise #${uuid} établie`);
    openControlPanel(uuid);
  });
  conn.on('error', e => {
    clearTimeout(timeout);
    clearInterval(connCountdownInt);
    const errDetail = e?.type ? `Type: ${e.type}` : String(e);
    notify('error', 'Échec de connexion', errDetail + ' — Vérifiez que la balise est démarrée et en ligne');
    document.getElementById('connect-area').style.display = 'flex';
    document.getElementById('connecting-state').style.display = 'none';
  });
  conn.on('data', handleControlData);
  conn.on('close', () => {
    document.getElementById('ctrl-conn-badge').className = 'badge offline';
    document.getElementById('ctrl-conn-badge').innerHTML = 'Déconnecté';
    document.getElementById('info-conn').textContent = 'Déconnecté';
    setSignalBars(0);
    ctrlLog('Balise déconnectée', 'log-err');
    notify('error', 'Balise déconnectée', 'La liaison P2P a été interrompue. Vérifiez la balise.');
    if (isRunning) endRace();
  });
}

function simulateBeacon() {
  beaconUUID = 'SIM-DEMO';
  notify('info', 'Mode simulation activé', 'Données GPS et capteurs générées automatiquement');
  openControlPanel('DEMO');
  startSimulation();
}

function openControlPanel(uuid) {
  document.getElementById('control-connect').style.display = 'none';
  const cp = document.getElementById('control-page');
  cp.style.display = 'flex';
  document.getElementById('ctrl-uuid-display').textContent = `#${uuid}`;
  document.getElementById('stats-uuid-display').textContent = `Balise #${uuid}`;
  document.getElementById('ctrl-conn-badge').className = 'badge online';
  document.getElementById('ctrl-conn-badge').innerHTML = `
    <div class="signal-bars">
      <div class="signal-bar active" id="sig1"></div>
      <div class="signal-bar active" id="sig2"></div>
      <div class="signal-bar active" id="sig3"></div>
      <div class="signal-bar" id="sig4"></div>
    </div>
    Connecté
  `;
  document.getElementById('info-conn').textContent = 'P2P WebRTC actif';
  initMap();
  initMiniCharts();
  ctrlLog('Connexion établie avec balise #' + uuid, 'log-ok');
}

// ============================================================
//  MAP INIT & LAYERS
// ============================================================
function initMap() {
  map = L.map('map', {zoomControl: true, attributionControl: true}).setView([48.8566, 2.3522], 17);
  setMapLayer(0);

  const carIcon = L.divIcon({
    html: `<div style="background:var(--accent);width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 14px rgba(249,115,22,.9);display:flex;align-items:center;justify-content:center;">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7 L5 2 L8 7" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="7" x2="7" y2="7" stroke="white" stroke-width="1"/></svg>
    </div>`,
    className:'', iconSize:[20,20], iconAnchor:[10,10]
  });
  mapMarker = L.marker([48.8566,2.3522], {icon:carIcon}).addTo(map);
  mapPolyline = L.polyline([], {color:'#f97316', weight:3.5, opacity:.9}).addTo(map);

  map.on('tileerror', e => {
  });
}

function setMapLayer(idx) {
  const layer = MAP_LAYERS[idx];
  if (!layer) return;
  if (currentTileLayer && map) {
    map.removeLayer(currentTileLayer);
  }
  const opts = {
    attribution: layer.attr,
    maxZoom: layer.maxZoom
  };
  if (layer.subdomains) opts.subdomains = layer.subdomains;
  currentTileLayer = L.tileLayer(layer.url, opts);
  currentTileLayer.addTo(map);
  currentTileLayer.on('tileerror', e => {
  });
  currentLayerIdx = idx;
}

function toggleMapLayer() {
  const nextIdx = (currentLayerIdx + 1) % MAP_LAYERS.length;
  setMapLayer(nextIdx);
  notify('info', 'Fond de carte changé', MAP_LAYERS[nextIdx].name);
}

// ============================================================
//  SIMULATION
// ============================================================
let simLat = 47.9965, simLon = 0.1973, simSpeed = 0, simAlt = 85, simHeading = 45;
let simT = 0;

function startSimulation() {
  if (simInterval) clearInterval(simInterval);
  simInterval = setInterval(() => {
    simT += 0.5;
    simSpeed = Math.max(0, 28 + 22*Math.sin(simT*0.3) + 10*Math.sin(simT*0.7) + (Math.random()-0.5)*4);
    simAlt = 85 - simT*0.3 + 5*Math.sin(simT*0.2);
    simHeading = (simHeading + 2.5 + (Math.random()-0.5)*8 + 360) % 360;
    const v = simSpeed / 3.6;
    const rad = simHeading * Math.PI / 180;
    simLat += (v * Math.cos(rad)) / 111320;
    simLon += (v * Math.sin(rad)) / (111320 * Math.cos(simLat*Math.PI/180));
    const payload = {
      type: 'data', ts: Date.now(),
      lat: simLat, lon: simLon, alt: simAlt,
      speed: simSpeed, heading: simHeading, accuracy: 3,
      acc_x: (Math.random()-0.5)*4,
      acc_y: (Math.random()-0.5)*4,
      acc_z: 9.8 + (Math.random()-0.5)*2,
      gyro_a: (Math.random()-0.5)*18,
      gyro_b: (Math.random()-0.5)*18,
      gyro_g: (Math.random()-0.5)*18
    };
    handleControlData(payload);
  }, 500);
}

// ============================================================
//  MINI CHARTS
// ============================================================
function initMiniCharts() {
  const opts = {
    responsive:true, maintainAspectRatio:false, animation:{duration:0},
    plugins:{legend:{display:false}},
    scales:{
      x:{display:false},
      y:{display:true, ticks:{color:'#64748b',font:{size:9}}, grid:{color:'#1e293b'}}
    }
  };
  speedChartInst = new Chart(document.getElementById('speed-chart'), {
    type:'line',
    data:{ labels:[], datasets:[{label:'km/h',data:[],borderColor:'#f97316',backgroundColor:'rgba(249,115,22,0.1)',fill:true,tension:.4,pointRadius:0,borderWidth:2}]},
    options: JSON.parse(JSON.stringify(opts))
  });
  accelChartInst = new Chart(document.getElementById('accel-chart'), {
    type:'line',
    data:{ labels:[], datasets:[
      {label:'X',data:[],borderColor:'#ef4444',fill:false,tension:.3,pointRadius:0,borderWidth:1.5},
      {label:'Y',data:[],borderColor:'#22c55e',fill:false,tension:.3,pointRadius:0,borderWidth:1.5},
      {label:'Z',data:[],borderColor:'#3b82f6',fill:false,tension:.3,pointRadius:0,borderWidth:1.5}
    ]},
    options: { ...JSON.parse(JSON.stringify(opts)), plugins:{legend:{display:true, labels:{color:'#64748b',font:{size:9},boxWidth:8}}}}
  });
}

// ============================================================
//  CONTROL DATA HANDLER
// ============================================================
let lastSignalUpdate = 0;

function handleControlData(data) {
  if (data.type === 'status') {
    ctrlLog(`Statut balise: ${data.status}`);
    if (data.status === 'stopped') {
      notify('warn', 'Balise arrêtée', 'La balise a coupé ses capteurs');
      if (isRunning) endRace();
    }
    return;
  }
  if (data.type !== 'data') return;

  const now = Date.now();

  if (lastDataTime > 0) {
    const dt = now - lastDataTime;
    const hz = 1000 / dt;
    dataFreqSamples.push(hz);
    if (dataFreqSamples.length > 10) dataFreqSamples.shift();
    const avgHz = dataFreqSamples.reduce((a,b)=>a+b,0)/dataFreqSamples.length;
    const el = document.getElementById('info-hz');
    if (el) el.textContent = avgHz.toFixed(1) + ' Hz';

    if (now - lastSignalUpdate > 2000) {
      lastSignalUpdate = now;
      const bars = avgHz > 1.5 ? 4 : avgHz > 1 ? 3 : avgHz > 0.5 ? 2 : 1;
      setSignalBars(bars);
    }
  }
  lastDataTime = now;

  const accStr = data.accuracy ? `±${data.accuracy.toFixed(0)}m` : '?';
  document.getElementById('ctrl-gps-badge').className = 'badge ' + (data.accuracy && data.accuracy < 15 ? 'online' : 'warning');
  document.getElementById('ctrl-gps-badge').innerHTML = `<span class="dot"></span> GPS ${accStr}`;

  const elLat = document.getElementById('info-lat');
  const elLon = document.getElementById('info-lon');
  const elAcc = document.getElementById('info-acc');
  if (elLat) elLat.textContent = data.lat.toFixed(6);
  if (elLon) elLon.textContent = data.lon.toFixed(6);
  if (elAcc) elAcc.textContent = data.accuracy ? data.accuracy.toFixed(1) + ' m' : '—';

  if (data.accuracy && now - lastDataTime < 200) {
    ctrlLog(`Précision GPS faible: ±${data.accuracy.toFixed(0)}m`);
  }

  const latlng = [data.lat, data.lon];
  if (mapMarker) { mapMarker.setLatLng(latlng); }
  if (mapPolyline) {
    mapLatLngs.push(latlng);
    mapPolyline.setLatLngs(mapLatLngs);
    if (mapLatLngs.length <= 3) map.setView(latlng, 17);
  }

  const spd = data.speed || 0;
  const gaugeEl = document.getElementById('gauge-speed');
  const gaugeFill = document.getElementById('gauge-fill');
  if (gaugeEl) gaugeEl.textContent = spd.toFixed(0);
  if (gaugeFill) {
    const maxV = 80;
    const frac = Math.min(spd / maxV, 1);
    const circ = 289;
    gaugeFill.style.strokeDashoffset = circ - frac * circ;
    const hue = (1 - frac) * 120;
    gaugeFill.style.stroke = `hsl(${hue},90%,55%)`;
  }

  const ax = data.acc_x || 0, ay = data.acc_y || 0, az = data.acc_z || 0;
  const totalG = Math.sqrt(ax*ax + ay*ay + az*az) / 9.81;
  const elAT = document.getElementById('accel-total');
  if (elAT) elAT.textContent = totalG.toFixed(2) + ' g';

  function setBar(id, val, min, max) {
    const pct = ((val - min) / (max - min)) * 100;
    const el = document.getElementById(id);
    if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }
  setBar('bar-ax', ax, -20, 20);
  setBar('bar-ay', ay, -20, 20);
  setBar('bar-az', az, -20, 20);
  const axFmt = v => (v >= 0 ? '+' : '') + v.toFixed(2) + ' m/s²';
  const elVax = document.getElementById('val-ax');
  const elVay = document.getElementById('val-ay');
  const elVaz = document.getElementById('val-az');
  if (elVax) elVax.textContent = axFmt(ax);
  if (elVay) elVay.textContent = axFmt(ay);
  if (elVaz) elVaz.textContent = axFmt(az);

  const elGa = document.getElementById('gyro-a');
  const elGb = document.getElementById('gyro-b');
  const elGg = document.getElementById('gyro-g');
  if (elGa) elGa.textContent = (data.gyro_a||0).toFixed(1) + '°/s';
  if (elGb) elGb.textContent = (data.gyro_b||0).toFixed(1) + '°/s';
  if (elGg) elGg.textContent = (data.gyro_g||0).toFixed(1) + '°/s';

  const elCap = document.getElementById('stat-cap');
  if (elCap) elCap.textContent = (data.heading||0).toFixed(0) + '°';

  const elAlt = document.getElementById('stat-alt');
  if (elAlt) elAlt.textContent = data.alt ? data.alt.toFixed(1) + ' m' : '— m';

  if (isRunning) {
    if (spd > maxSpeed) {
      maxSpeed = spd;
      const el = document.getElementById('stat-vmax');
      if (el) el.textContent = maxSpeed.toFixed(1) + ' km/h';
      const peak = document.getElementById('gauge-peak-val');
      if (peak) peak.textContent = maxSpeed.toFixed(1);
    }
    sumSpeed += spd; countSpeed++;
    const el2 = document.getElementById('stat-vmoy');
    if (el2) el2.textContent = (sumSpeed/countSpeed).toFixed(1) + ' km/h';

    if (totalG > maxShock) {
      maxShock = totalG;
      const elS = document.getElementById('stat-shock');
      if (elS) elS.textContent = maxShock.toFixed(2) + ' g';
      if (totalG > 4) {
        notify('warn', 'Choc important détecté', `Force G: ${totalG.toFixed(2)} g à ${spd.toFixed(0)} km/h`);
      }
    }

    if (startAlt === null && data.alt) startAlt = data.alt;
    if (data.alt && startAlt !== null) {
      const deniv = startAlt - data.alt;
      const elD = document.getElementById('stat-deniv');
      if (elD) elD.textContent = deniv.toFixed(1) + ' m';
    }

    if (racePoints.length > 0) {
      const last = racePoints[racePoints.length-1];
      totalDist += calcDistance(last.lat, last.lon, data.lat, data.lon);
      const elDist = document.getElementById('stat-dist');
      if (elDist) {
        elDist.textContent = totalDist < 1000 ?
          totalDist.toFixed(0) + ' m' : (totalDist/1000).toFixed(2) + ' km';
      }
    }

    racePoints.push({...data});
    const timeLabel = raceStartTime ? fmtTime(now - raceStartTime) : '';
    speedHistory.push(spd);
    accelHistory.push({ax, ay, az, totalG});
    timeLabels.push(timeLabel);

    const el3 = document.getElementById('info-pts');
    if (el3) el3.textContent = racePoints.length;

    const maxPts = 60;
    if (speedChartInst) {
      speedChartInst.data.labels = timeLabels.slice(-maxPts);
      speedChartInst.data.datasets[0].data = speedHistory.slice(-maxPts);
      speedChartInst.update('none');
    }
    if (accelChartInst) {
      accelChartInst.data.labels = timeLabels.slice(-maxPts);
      accelChartInst.data.datasets[0].data = accelHistory.slice(-maxPts).map(a=>a.ax);
      accelChartInst.data.datasets[1].data = accelHistory.slice(-maxPts).map(a=>a.ay);
      accelChartInst.data.datasets[2].data = accelHistory.slice(-maxPts).map(a=>a.az);
      accelChartInst.update('none');
    }
  }
}

// ============================================================
//  RACE CONTROL
// ============================================================
function startRace() {
  isRunning = true;
  raceStartTime = Date.now();
  racePoints = []; speedHistory = []; accelHistory = []; timeLabels = [];
  maxSpeed = 0; sumSpeed = 0; countSpeed = 0; maxShock = 0; totalDist = 0; startAlt = null;
  mapLatLngs = [];
  if (mapPolyline) mapPolyline.setLatLngs([]);
  const btn = document.getElementById('btn-start-race');
  btn.disabled = true;
  btn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" width="15" height="15"><circle cx="7.5" cy="7.5" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 4.5 L7.5 7.5 L9.5 9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Course en cours...`;
  document.getElementById('race-timer').classList.add('running');
  raceTimerInterval = setInterval(updateTimer, 1000);
  if (conn) conn.send({cmd:'start'});
  ctrlLog('Course démarrée', 'log-ok');
  notify('success', 'Chronométrie démarrée', 'Enregistrement de tous les capteurs en cours');
  if (simInterval === null && beaconUUID === 'SIM-DEMO') startSimulation();
}

function updateTimer() {
  if (!raceStartTime) return;
  document.getElementById('race-timer').textContent = fmtTime(Date.now() - raceStartTime);
}

function stopRace() {
  if (!isRunning && racePoints.length === 0) {
    notify('warn', 'Aucune course active', 'Démarrez la chronométrie d\'abord');
    return;
  }
  endRace();
  if (conn) conn.send({cmd:'stop'});
}

function endRace() {
  isRunning = false;
  clearInterval(raceTimerInterval);
  document.getElementById('race-timer').classList.remove('running');
  if (simInterval) { clearInterval(simInterval); simInterval = null; }
  const elapsed = raceStartTime ? fmtTime(Date.now() - raceStartTime) : '—';
  document.getElementById('finish-time-display').textContent = `Temps: ${elapsed}`;
  document.getElementById('finish-overlay').style.display = 'flex';
  ctrlLog('Course terminée — ' + racePoints.length + ' points enregistrés');
  notify('success', 'Course terminée', `${racePoints.length} points · Temps: ${elapsed} · Max: ${maxSpeed.toFixed(1)} km/h`);
}

// ============================================================
//  STATS PAGE
// ============================================================
function showStats() {
  document.getElementById('finish-overlay').style.display = 'none';
  document.getElementById('control-page').style.display = 'none';
  const sp = document.getElementById('stats-page');
  sp.style.display = 'flex';
  sp.style.flexDirection = 'column';

  document.getElementById('sum-vmax').textContent = maxSpeed.toFixed(1) + ' km/h';
  document.getElementById('sum-vmoy').textContent = (countSpeed > 0 ? (sumSpeed/countSpeed).toFixed(1) : 0) + ' km/h';
  document.getElementById('sum-dist').textContent = totalDist < 1000 ? totalDist.toFixed(0) + ' m' : (totalDist/1000).toFixed(2) + ' km';
  document.getElementById('sum-time').textContent = raceStartTime ? fmtTime(Date.now() - raceStartTime) : '—';
  document.getElementById('sum-shock').textContent = maxShock.toFixed(2) + ' g';
  const deniv = racePoints.length > 1 && racePoints[0].alt && racePoints[racePoints.length-1].alt ?
    (racePoints[0].alt - racePoints[racePoints.length-1].alt).toFixed(1) + ' m' : '— m';
  document.getElementById('sum-deniv').textContent = deniv;

  setTimeout(buildStatsCharts, 120);
}

let statsMapInst = null;
let elevChart = null, fullSpeedChart = null, fullAccelChart = null, speedDistChart = null, gyroChart2 = null, headingChart = null;

function buildStatsCharts() {
  if (statsMapInst) { statsMapInst.remove(); statsMapInst = null; }
  statsMapInst = L.map('stats-map', {zoomControl:true});

  const sl = MAP_LAYERS[currentLayerIdx];
  const sopts = {attribution: sl.attr, maxZoom: sl.maxZoom};
  if (sl.subdomains) sopts.subdomains = sl.subdomains;
  L.tileLayer(sl.url, sopts).addTo(statsMapInst);

  if (racePoints.length > 0) {
    const latlngs = racePoints.map(p => [p.lat, p.lon]);

    for (let i = 1; i < latlngs.length; i++) {
      const spd = racePoints[i].speed || 0;
      const frac = Math.min(spd / (maxSpeed || 1), 1);
      const hue = (1 - frac) * 120;
      L.polyline([latlngs[i-1], latlngs[i]], {
        color:`hsl(${hue},90%,55%)`, weight:4.5, opacity:.92
      }).addTo(statsMapInst);
    }

    const mkStyle = (color, text) => L.divIcon({html:`<div style="background:${color};padding:3px 8px;border-radius:6px;color:white;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.4);">${text}</div>`,className:'',iconAnchor:[30,12]});
    L.marker(latlngs[0], {icon:mkStyle('#22c55e','Depart')}).addTo(statsMapInst);
    L.marker(latlngs[latlngs.length-1], {icon:mkStyle('#ef4444','Arrivee')}).addTo(statsMapInst);

    statsMapInst.fitBounds(latlngs);

    const legend = L.control({position:'bottomright'});
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `<div style="background:rgba(17,24,39,.92);padding:8px 12px;border-radius:8px;font-size:11px;color:#e2e8f0;border:1px solid #1e293b;">
        <div style="font-weight:700;margin-bottom:4px;font-size:10px;color:#94a3b8;">VITESSE</div>
        <div style="display:flex;gap:4px;align-items:center;">
          <span style="font-size:9px;color:#64748b;">0</span>
          <div style="width:60px;height:5px;background:linear-gradient(to right,hsl(120,90%,55%),hsl(60,90%,55%),hsl(0,90%,55%));border-radius:3px;"></div>
          <span style="font-size:9px;color:#64748b;">${maxSpeed.toFixed(0)}</span>
        </div>
      </div>`;
      return div;
    };
    legend.addTo(statsMapInst);
  }

  const labels = racePoints.map((p,i) => raceStartTime ? fmtTime(p.ts - raceStartTime) : String(i));
  const baseOpts = {
    responsive:true, maintainAspectRatio:false, animation:{duration:300},
    plugins:{legend:{display:false}},
    scales:{
      x:{display:true, ticks:{color:'#64748b',font:{size:8},maxTicksLimit:6}, grid:{color:'#1e293b'}},
      y:{display:true, ticks:{color:'#64748b',font:{size:9}}, grid:{color:'#1e293b'}}
    }
  };

  if (elevChart) elevChart.destroy();
  elevChart = new Chart(document.getElementById('elev-chart'), {
    type:'line',
    data:{
      labels,
      datasets:[{label:'Altitude (m)',data: racePoints.map(p => p.alt || 0),borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,0.12)',fill:true,tension:.4,pointRadius:0,borderWidth:2}]
    },
    options:{...JSON.parse(JSON.stringify(baseOpts)), plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${c.parsed.y.toFixed(1)} m`}}}}
  });

  if (fullSpeedChart) fullSpeedChart.destroy();
  fullSpeedChart = new Chart(document.getElementById('full-speed-chart'), {
    type:'line',
    data:{
      labels,
      datasets:[{label:'Vitesse',data: speedHistory,borderColor:'#f97316',backgroundColor:'rgba(249,115,22,0.08)',fill:true,tension:.4,pointRadius:0,borderWidth:2}]
    },
    options:{...JSON.parse(JSON.stringify(baseOpts)), plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${c.parsed.y.toFixed(1)} km/h`}}}}
  });

  if (fullAccelChart) fullAccelChart.destroy();
  fullAccelChart = new Chart(document.getElementById('full-accel-chart'), {
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Total G',data:accelHistory.map(a=>a.totalG),borderColor:'#f97316',fill:false,tension:.3,pointRadius:0,borderWidth:2},
        {label:'X',data:accelHistory.map(a=>a.ax),borderColor:'#ef4444',fill:false,tension:.3,pointRadius:0,borderWidth:1},
        {label:'Y',data:accelHistory.map(a=>a.ay),borderColor:'#22c55e',fill:false,tension:.3,pointRadius:0,borderWidth:1},
        {label:'Z',data:accelHistory.map(a=>a.az),borderColor:'#3b82f6',fill:false,tension:.3,pointRadius:0,borderWidth:1}
      ]
    },
    options:{...JSON.parse(JSON.stringify(baseOpts)),
      plugins:{legend:{display:true,labels:{color:'#64748b',font:{size:9},boxWidth:10}}}}
  });

  const bins = 10;
  const binSize = maxSpeed / bins || 1;
  const histogram = new Array(bins).fill(0);
  speedHistory.forEach(s => { const idx = Math.min(Math.floor(s/binSize), bins-1); histogram[idx]++; });
  const histLabels = Array.from({length:bins}, (_,i) => `${(i*binSize).toFixed(0)}-${((i+1)*binSize).toFixed(0)}`);
  if (speedDistChart) speedDistChart.destroy();
  speedDistChart = new Chart(document.getElementById('speed-dist-chart'), {
    type:'bar',
    data:{labels:histLabels, datasets:[{label:'Occ.',data:histogram,backgroundColor:'rgba(249,115,22,0.55)',borderColor:'#f97316',borderWidth:1,borderRadius:4}]},
    options:{...JSON.parse(JSON.stringify(baseOpts)),plugins:{legend:{display:false}}}
  });

  if (gyroChart2) gyroChart2.destroy();
  gyroChart2 = new Chart(document.getElementById('gyro-chart'), {
    type:'line',
    data:{labels,datasets:[
      {label:'Alpha',data:racePoints.map(p=>p.gyro_a||0),borderColor:'#a855f7',fill:false,tension:.3,pointRadius:0,borderWidth:1.5},
      {label:'Beta',data:racePoints.map(p=>p.gyro_b||0),borderColor:'#3b82f6',fill:false,tension:.3,pointRadius:0,borderWidth:1.5},
      {label:'Gamma',data:racePoints.map(p=>p.gyro_g||0),borderColor:'#22c55e',fill:false,tension:.3,pointRadius:0,borderWidth:1.5}
    ]},
    options:{...JSON.parse(JSON.stringify(baseOpts)),plugins:{legend:{display:true,labels:{color:'#64748b',font:{size:9},boxWidth:10}}}}
  });

  const sectorCount = 12;
  const sectorSize = 360/sectorCount;
  const sectorData = new Array(sectorCount).fill(0);
  racePoints.forEach(p => { const idx = Math.floor((p.heading||0)/sectorSize) % sectorCount; sectorData[idx]++; });
  const sectorLabels = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','ONO'];
  if (headingChart) headingChart.destroy();
  headingChart = new Chart(document.getElementById('heading-chart'), {
    type:'polarArea',
    data:{labels:sectorLabels,datasets:[{data:sectorData,backgroundColor:Array.from({length:sectorCount},(_,i)=>`hsla(${i*30},80%,60%,0.55)`)}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{ticks:{color:'#64748b',font:{size:8}},grid:{color:'#1e293b'}}}}
  });
}

// ============================================================
//  ACTIONS
// ============================================================
function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
}

function centerMap() {
  if (map && mapLatLngs.length > 0) {
    map.setView(mapLatLngs[mapLatLngs.length-1], 18);
    notify('info', 'Carte recentrée', 'Vue sur la position actuelle');
  } else {
    notify('warn', 'Aucune position', 'Pas encore de données GPS reçues');
  }
}

function restartRace() {
  document.getElementById('finish-overlay').style.display = 'none';
  document.getElementById('stats-page').style.display = 'none';
  const cp = document.getElementById('control-page');
  cp.style.display = 'flex';
  cp.style.flexDirection = 'column';
  const btn = document.getElementById('btn-start-race');
  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" width="15" height="15"><path d="M4 2.5 L12 7.5 L4 12.5 Z" fill="currentColor"/></svg> Démarrer la Chronométrie`;
  document.getElementById('race-timer').textContent = '00:00:00';
  raceStartTime = null;
  if (statsMapInst) { statsMapInst.remove(); statsMapInst = null; }
  notify('info', 'Prêt pour une nouvelle course', 'Données précédentes effacées');
}

function exportData() {
  if (racePoints.length === 0) {
    notify('warn', 'Aucune donnée à exporter', 'Lancez et arrêtez une course d\'abord');
    return;
  }
  const csv = ['timestamp,lat,lon,alt,speed,heading,acc_x,acc_y,acc_z,gyro_a,gyro_b,gyro_g']
    .concat(racePoints.map(p =>
      `${p.ts},${p.lat},${p.lon},${p.alt||0},${p.speed||0},${p.heading||0},${p.acc_x||0},${p.acc_y||0},${p.acc_z||0},${p.gyro_a||0},${p.gyro_b||0},${p.gyro_g||0}`
    )).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `CAS01_${new Date().toISOString().slice(0,10)}_${racePoints.length}pts.csv`;
  a.click();
  notify('success', 'Données exportées', `${racePoints.length} points dans le fichier CSV`);
}

function goHome() {
  location.reload();
}

// ============================================================
//  DRIVER MODE
// ============================================================
function enterDriverMode() {
  driverModeActive = true;
  document.getElementById('driver-mode').classList.add('active');
  document.getElementById('control-page').style.display = 'none';
  document.getElementById('beacon-page').style.display = 'none';
  
  // Initialize race data
  if (!raceStartTime) {
    raceStartTime = Date.now();
    racePoints = [{lat: lastPos.latitude, lon: lastPos.longitude, alt: lastPos.altitude || 0, speed: 0, ts: raceStartTime}];
    speedHistory = [0];
    accelHistory = [];
    timeLabels = [];
    maxSpeed = 0;
    sumSpeed = 0;
    countSpeed = 0;
    maxShock = 0;
    totalDist = 0;
    startAlt = lastPos.altitude || null;
    slopePoints = [];
  }
  
  // Request landscape orientation
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(e => {
      console.log('Cannot lock landscape orientation:', e);
    });
  }
  
  // Start high-frequency data updates for driver mode
  driverDataInterval = setInterval(updateDriverMode, 100); // 10 updates per second for smooth animation
  notify('info', 'Mode Conduite activé', 'Tableau de bord conditions de course');
}

function exitDriverMode() {
  driverModeActive = false;
  document.getElementById('driver-mode').classList.remove('active');
  
  if (driverDataInterval) {
    clearInterval(driverDataInterval);
    driverDataInterval = null;
  }
  
  // Release orientation lock
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  }
  
  document.getElementById('beacon-page').style.display = 'flex';
  notify('info', 'Mode Conduite désactivé', 'Retour à l\'interface de balise');
}

function updateDriverMode() {
  if (!raceStartTime) return;
  
  // Update timer
  const elapsed = Date.now() - raceStartTime;
  document.getElementById('driver-timer').textContent = fmtTime(elapsed);
  
  // Update speed with animation
  if (speedHistory.length > 0) {
    const currentSpeed = speedHistory[speedHistory.length - 1] || 0;
    document.getElementById('driver-speed-val').textContent = Math.round(currentSpeed);
    
    // Animate the progress circle (0-250 km/h max)
    const maxDisplaySpeed = 250;
    const ratio = Math.min(currentSpeed / maxDisplaySpeed, 1);
    const circumference = 690; // 2 * PI * r (r=110)
    const offset = circumference * (1 - ratio);
    document.getElementById('driver-speed-fill').style.strokeDashoffset = offset;
  }
  
  // Update altitude
  if (lastPos && lastPos.altitude) {
    document.getElementById('driver-alt').textContent = Math.round(lastPos.altitude) + ' m';
  }
  
  // Update slope (pente)
  calculateAndDisplaySlope();
  
  // Update distance
  if (racePoints.length > 0) {
    const distKm = (totalDist / 1000).toFixed(2);
    document.getElementById('driver-distance').textContent = distKm + ' km';
  }
}

function calculateAndDisplaySlope() {
  if (racePoints.length < 2) {
    document.getElementById('driver-slope').textContent = '0°';
    return;
  }
  
  // Get last two points
  const current = racePoints[racePoints.length - 1];
  const previous = racePoints[racePoints.length - 2];
  
  if (!current || !previous) return;
  
  const {lat: lat2, lon: lon2, alt: alt2} = current;
  const {lat: lat1, lon: lon1, alt: alt1} = previous;
  
  // Calculate horizontal distance using haversine formula
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const horizontalDist = R * c;
  
  // Calculate vertical elevation difference
  const verticalDist = alt2 - alt1;
  
  // Calculate slope angle in degrees
  let slope = 0;
  if (horizontalDist > 1) {
    slope = Math.atan(verticalDist / horizontalDist) * 180 / Math.PI;
  }
  
  lastSlopeValue = slope;
  if (Math.abs(slope) > Math.abs(maxSlopeValue)) {
    maxSlopeValue = slope;
  }
  
  document.getElementById('driver-slope').textContent = slope.toFixed(1) + '°';
}

// ============================================================
//  INIT
// ============================================================
window.addEventListener('load', () => {
  if (!navigator.geolocation) {
    console.warn('GPS not available');
  }
  document.querySelectorAll('.role-card').forEach((c, i) => {
    c.style.opacity = '0';
    c.style.transform = 'translateY(24px)';
    setTimeout(() => {
      c.style.transition = 'opacity .5s, transform .5s';
      c.style.opacity = '1';
      c.style.transform = 'translateY(0)';
    }, 180 + i * 140);
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const input = document.getElementById('uuid-input');
    if (input && document.activeElement === input) connectToBeacon();
  }
  if (e.key === 'Escape') closeStatModal();
});
