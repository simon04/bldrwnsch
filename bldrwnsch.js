import {default as L} from 'leaflet';
import 'leaflet-control-geocoder/src/index.js';
import 'leaflet-hash';
import 'leaflet-providers';
import 'leaflet.locatecontrol';

import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import 'spin.js/spin.css';
import './style.css';

import BldrwnschLayer from './bldrwnsch.layer.js';
import FilterControl, {getFilterFromLocation} from './bldrwnsch.filter.js';

if (location.host === 'tools.wmflabs.org' && location.protocol !== 'https:') {
  location.href = 'https:' + location.href.substring(location.protocol.length);
}

const baseLayers = {
  Wikimedia: L.tileLayer.provider('Wikimedia'),
  OpenStreetMap: L.tileLayer.provider('OpenStreetMap')
};

const map = L.map('map').setView([47.23, 11.3], 13);
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

const initialFilter = getFilterFromLocation() || '';
const bldrwnschLayer = new BldrwnschLayer().addTo(map).fetch(initialFilter);
new FilterControl({filter: initialFilter})
  .addTo(map)
  .setFilter(initialFilter)
  .on('filter', function(event) {
    bldrwnschLayer.fetch(event.filter);
  });
