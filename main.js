/* global ol */

// Base map and vector layer
const vectorSource = new ol.source.Vector();
const vectorLayer = new ol.layer.Vector({
  source: vectorSource,
});

const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({ source: new ol.source.OSM() }),
    vectorLayer,
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-75.02, -9.19]),
    zoom: 6,
    minZoom: 3,
    maxZoom: 18,
  }),
});

// Popup overlay
const popupEl = document.getElementById('popup');
const popupContentEl = document.getElementById('popup-content');
const popupCloserEl = document.getElementById('popup-closer');
const popupOverlay = new ol.Overlay({
  element: popupEl,
  autoPan: { animation: { duration: 250 } },
  stopEvent: true,
});
map.addOverlay(popupOverlay);

popupCloserEl.onclick = function () {
  popupOverlay.setPosition(undefined);
  popupEl.style.display = 'none';
  return false;
};

// Data state
let allPoints = [];
let catalog = { regions: [], provincias: [], distritos: [] };

// UI elements
const regionSelect = document.getElementById('regionSelect');
const provinciaSelect = document.getElementById('provinciaSelect');
const distritoSelect = document.getElementById('distritoSelect');

// Utilities
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

function styleForPoint(p) {
  if (p.imagen) {
    return new ol.style.Style({
      image: new ol.style.Icon({
        src: p.imagen,
        anchor: [0.5, 1],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        scale: 1,
      }),
    });
  }
  return new ol.style.Style({
    image: new ol.style.Circle({
      radius: 6,
      fill: new ol.style.Fill({ color: '#1e88e5' }),
      stroke: new ol.style.Stroke({ color: '#0d47a1', width: 2 }),
    }),
  });
}

function featureFromPoint(p) {
  const feature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat([p.lon, p.lat])),
    descripcion: p.descripcion,
    ubigeo: p.ubigeo,
    lat: p.lat,
    lon: p.lon,
    imagen: p.imagen,
  });
  feature.setStyle(styleForPoint(p));
  return feature;
}

function renderFeatures(points) {
  vectorSource.clear();
  const valid = points.filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number');
  valid.forEach((p) => vectorSource.addFeature(featureFromPoint(p)));
  if (vectorSource.getFeatures().length > 0) {
    map.getView().fit(vectorSource.getExtent(), { padding: [50, 50, 50, 50], duration: 250, maxZoom: 14 });
  }
}

function getRegionCode(ubigeo) { return typeof ubigeo === 'string' ? ubigeo.slice(0, 2) : ''; }
function getProvinciaCode(ubigeo) { return typeof ubigeo === 'string' ? ubigeo.slice(0, 4) : ''; }
function getDistritoCode(ubigeo) { return typeof ubigeo === 'string' ? ubigeo.slice(0, 6) : ''; }

function unique(array) { return Array.from(new Set(array)).sort(); }

function populateRegions(points) {
  const regionCodes = unique(points.map((p) => getRegionCode(p.ubigeo)).filter(Boolean));
  const codeToName = new Map(catalog.regions.map((r) => [r.code, r.name]));
  regionSelect.innerHTML = '<option value="">Todas</option>' + regionCodes.map((r) => {
    const name = codeToName.get(r) || r;
    return `<option value="${r}">${name}</option>`;
  }).join('');
  provinciaSelect.innerHTML = '<option value="">Todas</option>';
  provinciaSelect.disabled = true;
  distritoSelect.innerHTML = '<option value="">Todos</option>';
  distritoSelect.disabled = true;
}

function populateProvincias(points, regionCode) {
  const provinciaCodes = unique(points.filter((p) => getRegionCode(p.ubigeo) === regionCode).map((p) => getProvinciaCode(p.ubigeo)).filter(Boolean));
  const codeToName = new Map(catalog.provincias.map((r) => [r.code, r.name]));
  provinciaSelect.innerHTML = '<option value="">Todas</option>' + provinciaCodes.map((c) => {
    const name = codeToName.get(c) || c;
    return `<option value="${c}">${name}</option>`;
  }).join('');
  provinciaSelect.disabled = false;
  distritoSelect.innerHTML = '<option value="">Todos</option>';
  distritoSelect.disabled = true;
}

function populateDistritos(points, provinciaCode) {
  const distritoCodes = unique(points.filter((p) => getProvinciaCode(p.ubigeo) === provinciaCode).map((p) => getDistritoCode(p.ubigeo)).filter(Boolean));
  const codeToName = new Map(catalog.distritos.map((r) => [r.code, r.name]));
  distritoSelect.innerHTML = '<option value="">Todos</option>' + distritoCodes.map((c) => {
    const name = codeToName.get(c) || c;
    return `<option value="${c}">${name}</option>`;
  }).join('');
  distritoSelect.disabled = false;
}

function applyFilter() {
  const r = regionSelect.value;
  const p = provinciaSelect.value;
  const d = distritoSelect.value;
  let filtered = allPoints;
  if (d) filtered = allPoints.filter((x) => getDistritoCode(x.ubigeo) === d);
  else if (p) filtered = allPoints.filter((x) => getProvinciaCode(x.ubigeo) === p);
  else if (r) filtered = allPoints.filter((x) => getRegionCode(x.ubigeo) === r);
  renderFeatures(filtered);
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

distritoSelect.addEventListener('change', () => applyFilter());

// Feature click handling for popup
map.on('singleclick', function (evt) {
  let found = null;
  map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    found = feature;
    return true;
  });
  if (found) {
    const props = found.getProperties();
    popupContentEl.innerHTML = buildPopup(props);
    popupOverlay.setPosition(evt.coordinate);
    popupEl.style.display = 'block';
  } else {
    popupOverlay.setPosition(undefined);
    popupEl.style.display = 'none';
  }
});

map.on('pointermove', function (evt) {
  const hit = map.hasFeatureAtPixel(evt.pixel);
  map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});

async function loadData() {
  try {
    const [resPts, resCat] = await Promise.all([
      fetch('./puntos.json'),
      fetch('./ubigeo.json'),
    ]);
    const [dataPts, dataCat] = await Promise.all([
      resPts.json(),
      resCat.json(),
    ]);
    allPoints = Array.isArray(dataPts) ? dataPts : [];
    catalog = dataCat || catalog;
    populateRegions(allPoints);
    renderFeatures(allPoints);
  } catch (err) {
    console.error('Error cargando puntos.json', err);
  }
}

loadData();

