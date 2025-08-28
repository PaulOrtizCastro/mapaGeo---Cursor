/* global L */

const map = L.map('map', {
  center: [-9.19, -75.02],
  zoom: 6,
  minZoom: 3,
  maxZoom: 18,
  worldCopyJump: true,
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

// Data state
let allPoints = [];
let markerLayer = L.layerGroup().addTo(map);

// UI elements
const regionSelect = document.getElementById('regionSelect');
const provinciaSelect = document.getElementById('provinciaSelect');
const distritoSelect = document.getElementById('distritoSelect');

// Utilities
function createIcon(url) {
  return L.icon({
    iconUrl: url,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
}

function buildPopup(p) {
  const safeDesc = String(p.descripcion || '').slice(0, 300);
  const img = p.imagen ? `<img src="${p.imagen}" alt="icono" />` : '';
  return `
    <div class="popup-header">
      ${img}
      <div>
        <div class="popup-title">${safeDesc || 'Sin descripción'}</div>
        <div><strong>UBIGEO:</strong> ${p.ubigeo || '-'}</div>
        <div><strong>Coordenadas:</strong> ${p.lat?.toFixed?.(5) ?? p.lat}, ${p.lon?.toFixed?.(5) ?? p.lon}</div>
      </div>
    </div>
  `;
}

function clearMarkers() {
  markerLayer.clearLayers();
}

function renderMarkers(points) {
  clearMarkers();
  const bounds = L.latLngBounds();
  points.forEach((p) => {
    if (typeof p.lat !== 'number' || typeof p.lon !== 'number') return;
    const marker = L.marker([p.lat, p.lon], {
      icon: p.imagen ? createIcon(p.imagen) : undefined,
      title: p.descripcion || '',
    });
    marker.bindPopup(buildPopup(p));
    marker.addTo(markerLayer);
    bounds.extend([p.lat, p.lon]);
  });
  if (points.length > 0 && bounds.isValid()) {
    map.fitBounds(bounds.pad(0.2));
  }
}

function getRegionCode(ubigeo) {
  return typeof ubigeo === 'string' ? ubigeo.slice(0, 2) : '';
}
function getProvinciaCode(ubigeo) {
  return typeof ubigeo === 'string' ? ubigeo.slice(0, 4) : '';
}
function getDistritoCode(ubigeo) {
  return typeof ubigeo === 'string' ? ubigeo.slice(0, 6) : '';
}

function unique(array) {
  return Array.from(new Set(array)).sort();
}

function populateRegions(points) {
  const regions = unique(points.map((p) => getRegionCode(p.ubigeo)).filter(Boolean));
  regionSelect.innerHTML = '<option value="">Todas</option>' +
    regions.map((r) => `<option value="${r}">${r}</option>`).join('');
  provinciaSelect.innerHTML = '<option value="">Todas</option>';
  provinciaSelect.disabled = true;
  distritoSelect.innerHTML = '<option value="">Todos</option>';
  distritoSelect.disabled = true;
}

function populateProvincias(points, regionCode) {
  const provincias = unique(points
    .filter((p) => getRegionCode(p.ubigeo) === regionCode)
    .map((p) => getProvinciaCode(p.ubigeo))
    .filter(Boolean)
  );
  provinciaSelect.innerHTML = '<option value="">Todas</option>' +
    provincias.map((c) => `<option value="${c}">${c}</option>`).join('');
  provinciaSelect.disabled = false;
  distritoSelect.innerHTML = '<option value="">Todos</option>';
  distritoSelect.disabled = true;
}

function populateDistritos(points, provinciaCode) {
  const distritos = unique(points
    .filter((p) => getProvinciaCode(p.ubigeo) === provinciaCode)
    .map((p) => getDistritoCode(p.ubigeo))
    .filter(Boolean)
  );
  distritoSelect.innerHTML = '<option value="">Todos</option>' +
    distritos.map((c) => `<option value="${c}">${c}</option>`).join('');
  distritoSelect.disabled = false;
}

function applyFilter() {
  const r = regionSelect.value;
  const p = provinciaSelect.value;
  const d = distritoSelect.value;

  let filtered = allPoints;
  if (d) {
    filtered = allPoints.filter((x) => getDistritoCode(x.ubigeo) === d);
  } else if (p) {
    filtered = allPoints.filter((x) => getProvinciaCode(x.ubigeo) === p);
  } else if (r) {
    filtered = allPoints.filter((x) => getRegionCode(x.ubigeo) === r);
  }
  renderMarkers(filtered);
}

regionSelect.addEventListener('change', () => {
  const r = regionSelect.value;
  if (r) {
    populateProvincias(allPoints, r);
  } else {
    provinciaSelect.innerHTML = '<option value="">Todas</option>';
    provinciaSelect.disabled = true;
    distritoSelect.innerHTML = '<option value="">Todos</option>';
    distritoSelect.disabled = true;
  }
  applyFilter();
});

provinciaSelect.addEventListener('change', () => {
  const p = provinciaSelect.value;
  if (p) {
    populateDistritos(allPoints, p);
  } else {
    distritoSelect.innerHTML = '<option value="">Todos</option>';
    distritoSelect.disabled = true;
  }
  applyFilter();
});

distritoSelect.addEventListener('change', () => {
  applyFilter();
});

async function loadData() {
  try {
    const res = await fetch('./puntos.json');
    const data = await res.json();
    allPoints = Array.isArray(data) ? data : [];
    populateRegions(allPoints);
    renderMarkers(allPoints);
  } catch (err) {
    console.error('Error cargando puntos.json', err);
  }
}

loadData();

