import {default as L} from 'leaflet';
import 'leaflet-control-geocoder/src/index.js';
import 'leaflet-hash';
import 'leaflet-providers';
import 'leaflet.locatecontrol';
import {Spinner} from 'spin.js';

import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import 'spin.js/spin.css';
import './style.css';

if (location.host === 'tools.wmflabs.org' && location.protocol !== 'https:') {
  location.href = 'https:' + location.href.substring(location.protocol.length);
}

var baseLayers = {
  Wikimedia: L.tileLayer.provider('Wikimedia'),
  OpenStreetMap: L.tileLayer.provider('OpenStreetMap')
};

var map = L.map('map').setView([47.23, 11.3], 13);
L.control.layers(baseLayers).addTo(map);
baseLayers.Wikimedia.addTo(map);
map.attributionControl.setPrefix(
  [
    '<a href="https://github.com/simon04/bldrwnsch/" target="_blank">@simon04/bldrwnsch</a>',
    '(<a href="https://github.com/simon04/bldrwnsch/blob/master/LICENSE" target="_blank">GPL v3</a>)'
  ].join(' ')
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

var BldrwnschLayer = L.GeoJSON.extend({
  initialize: function() {
    L.GeoJSON.prototype.initialize.call(this, null, {
      pointToLayer: function(feature, latlng) {
        if (feature.properties.cluster) {
          return this.createClusterIcon(feature, latlng);
        } else {
          return this.createIcon(feature, latlng);
        }
      }.bind(this)
    });
  },
  onAdd: function(map) {
    var spinner = new Spinner().spin(document.getElementById('map'));
    var worker = new Worker('./bundle.cluster.js');
    worker.onmessage = function(e) {
      if (e.data.ready) {
        spinner.stop();
        map.on('moveend', update);
        update();
      } else if (e.data.expansionZoom) {
        map.flyTo(e.data.center, e.data.expansionZoom);
      } else {
        this.clearLayers();
        this.addData(e.data);
      }
    }.bind(this);
    worker.onerror = function(e) {
      spinner.stop();
      console.warn(e);
    };
    function update() {
      var bounds = map.getBounds();
      worker.postMessage({
        bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom: map.getZoom()
      });
    }
    this.on('click', function(e) {
      if (e.layer.feature.properties.cluster_id) {
        worker.postMessage({
          getClusterExpansionZoom: e.layer.feature.properties.cluster_id,
          center: e.latlng
        });
      }
    });
  },
  createClusterIcon: function(feature, latlng) {
    var count = feature.properties.point_count;
    var size = count < 100 ? 'small' : count < 1000 ? 'medium' : 'large';
    var icon = L.divIcon({
      html: `<div><span>${feature.properties.point_count_abbreviated}</span></div>`,
      className: `marker-cluster marker-cluster-${size}`,
      iconSize: L.point(40, 40)
    });
    return L.marker(latlng, {icon: icon});
  },
  createIcon: function(feature, latlng) {
    var camera =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Photo-request.svg/24px-Photo-request.svg.png';
    var icon = L.icon({
      iconUrl: camera,
      iconSize: [24, 24],
      iconAnchor: [8, 13],
      popupAnchor: [8, 13]
    });
    var marker = L.marker(latlng, {icon: icon});
    var data = feature.properties;
    var description = data.description ? data.description.replace(/_/g, ' ') + '<br>' : '';
    var title = data.title ? data.title.replace(/_/g, ' ') : '';
    var geo = `<a href="geo:${latlng.lat},${latlng.lng}">geo:</a><br>`;
    var link = `<a href="https://de.wikipedia.org/wiki/${title}" target="_blank">${title}</a>`;
    if (L.Browser.mobile) {
      marker.bindPopup(description + geo + link);
    } else {
      marker.bindTooltip(description + title);
      marker.bindPopup(description + geo + link);
    }
    return marker;
  }
});

new BldrwnschLayer().addTo(map);
