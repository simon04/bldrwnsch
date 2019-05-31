import SearchNominatim from 'ol-ext/control/SearchNominatim';
import Map from 'ol/Map';
import View from 'ol/View';
import MVT from 'ol/format/MVT';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import OSM from 'ol/source/OSM';
import VectorTileSource from 'ol/source/VectorTile';
import {fromLonLat} from 'ol/proj';

import {getFilterFromLocation, getStyleForFilter} from './bldrwnsch.filter';

import 'ol/ol.css';
import 'ol-ext/dist/ol-ext.css';
import './style.css';

const filter = getFilterFromLocation();
const map = new Map({
  target: 'map',
  view: new View({
    center: fromLonLat([12.694, 47.075]),
    zoom: 8
  }),
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    new VectorTileLayer({
      style: getStyleForFilter(filter),
      source: new VectorTileSource({
        format: new MVT(),
        maxZoom: 10,
        url: '/Bilderwuensche.tiles/{z}/{x}/{y}.pbf'
      })
    })
  ]
});

map.on('click', showInfo);
map.on('pointermove', showInfo);

const info = document.getElementById('info');
function showInfo(event) {
  const features = map.getFeaturesAtPixel(event.pixel, {hitTolerance: 13});
  if (!features) {
    info.innerText = '';
    info.style.opacity = 0;
    return;
  }
  const properties = features[0].getProperties();
  info.innerText = JSON.stringify(properties, null, 2);
  info.style.opacity = 1;
}

// TODO https://openlayers.org/en/latest/examples/permalink.html

const geocoder = new SearchNominatim({
  url: 'https://tools.wmflabs.org/nominatim/search',
  position: true
});
map.addControl(geocoder);
geocoder.on('select', function(e) {
  map.getView().animate({
    center: e.coordinate,
    zoom: Math.max(map.getView().getZoom(), 16)
  });
});
