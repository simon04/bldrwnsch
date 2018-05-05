var attribution = '<a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>';
var baseLayers = {
  WikimediaMaps: new L.TileLayer('https://maps.wikimedia.org/{style}/{z}/{x}/{y}.png', {
    style: 'osm-intl',
    maxZoom: 18,
    attribution: 'Map data &copy; ' + attribution
  }),
  OSM: new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: attribution
  })
};

var map = L.map('map').setView([47.23, 11.3], 13);
L.control.layers(baseLayers).addTo(map);
baseLayers.WikimediaMaps.addTo(map);
map.attributionControl.setPrefix(
  [
    '<a href="https://github.com/simon04/bldrwnsch">Bldrwnsch</a> by simon04',
    '<a href="https://github.com/simon04/bldrwnsch/blob/gh-pages/LICENSE">GPL v3</a>'
  ].join(', ')
);
L.hash(map);
L.Control.geocoder({
  expand: 'click',
  position: 'topleft',
  defaultMarkGeocode: true
}).addTo(map);
L.control
  .locate({
    locateOptions: {
      watch: true,
      enableHighAccuracy: true
    }
  })
  .addTo(map);

var markers = L.geoJson(null, {
  pointToLayer: pointToLayer
}).addTo(map);

var worker = new Worker('bldrwnschCluster.js');

worker.onmessage = function(e) {
  if (e.data.ready) {
    map.on('moveend', update);
    update();
  } else if (e.data.expansionZoom) {
    map.flyTo(e.data.center, e.data.expansionZoom);
  } else {
    markers.clearLayers();
    markers.addData(e.data);
  }
};

function update() {
  var bounds = map.getBounds();
  worker.postMessage({
    bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
    zoom: map.getZoom()
  });
}

worker.onerror = function(e) {
  console.warn(e);
};

function pointToLayer(feature, latlng) {
  if (feature.properties.cluster) {
    return createClusterIcon(feature, latlng);
  } else {
    return createIcon(feature, latlng);
  }
}

function createClusterIcon(feature, latlng) {
  var count = feature.properties.point_count;
  var size = count < 100 ? 'small' : count < 1000 ? 'medium' : 'large';
  var icon = L.divIcon({
    html: '<div><span>' + feature.properties.point_count_abbreviated + '</span></div>',
    className: 'marker-cluster marker-cluster-' + size,
    iconSize: L.point(40, 40)
  });
  return L.marker(latlng, {icon: icon});
}

function createIcon(feature, latlng) {
  var camera =
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Photo-request.svg/32px-Photo-request.svg.png';
  var icon = L.icon({iconUrl: camera});
  var marker = L.marker(latlng, {icon: icon});
  var data = feature.properties;
  var description = data.description ? data.description.replace(/_/g, ' ') + '<br>' : '';
  var title = data.title ? data.title.replace(/_/g, ' ') : '';
  var link =
    '<a href="https://de.wikipedia.org/wiki/' + title + '" target="_blank">' + title + '</a>';
  if (L.Browser.mobile) {
    marker.bindPopup(description + link);
  } else {
    marker.bindTooltip(description + title);
    marker.bindPopup(description + link);
  }
  return marker;
}

markers.on('click', function(e) {
  if (e.layer.feature.properties.cluster_id) {
    worker.postMessage({
      getClusterExpansionZoom: e.layer.feature.properties.cluster_id,
      center: e.latlng
    });
  }
});
