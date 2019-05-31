import Search from 'ol-ext/control/Search';
import SearchNominatim from 'ol-ext/control/SearchNominatim';
import Popup from 'ol-ext/overlay/Popup';
import Map from 'ol/Map';
import View from 'ol/View';
import MVT from 'ol/format/MVT';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import OSM from 'ol/source/OSM';
import VectorTileSource from 'ol/source/VectorTile';
import {fromLonLat} from 'ol/proj';

import FeatureFilter from './bldrwnsch.filter';

import 'ol/ol.css';
import 'ol-ext/dist/ol-ext.css';
import './style.css';

const popup = new Popup({
  popupClass: 'default',
  closeBox: true,
  positioning: 'auto'
});

const filter = new FeatureFilter().setFromLocation();
let pbfSource;
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
      style: filter.style.bind(filter),
      source: (pbfSource = new VectorTileSource({
        format: new MVT(),
        maxZoom: 10,
        url: '/Bilderwuensche.tiles/{z}/{x}/{y}.pbf'
      }))
    })
  ],
  overlays: [popup]
});

map.on('click', showInfo.bind(undefined, true));
map.on('pointermove', showInfo.bind(undefined, false));

const info = document.getElementById('info');
function showInfo(showPopup, event) {
  const features = map.getFeaturesAtPixel(event.pixel, {hitTolerance: 13});
  if (!features) {
    info.innerText = '';
    info.style.opacity = 0;
    return;
  }
  const properties = features[0].getProperties();
  info.innerText = JSON.stringify(properties, null, 2);
  info.style.opacity = 1;
  if (showPopup) {
    popup.show(
      event.coordinate,
      [properties.name, properties.description].join('<br>').replace(/_/g, ' ')
    );
  }
}

// TODO https://openlayers.org/en/latest/examples/permalink.html

const geocoder = new SearchNominatim({
  label: 'Auf der Karte suchen…',
  placeholder: 'Auf der Karte suchen…',
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

const filterControl = new Search({
  label: 'Bilderwünsche filtern',
  placeholder: 'Bilderwünsche filtern…',
  className: 'filter'
});
map.addControl(filterControl);
filterControl._input.value = filter.text;
filterControl.on('change:input', function(e) {
  filter.setFilter(e.value);
  pbfSource.changed();
  filter.updateLocation();
});
