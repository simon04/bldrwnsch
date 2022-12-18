import Search from 'ol-ext/control/Search';
import SearchNominatim from 'ol-ext/control/SearchNominatim';
import Popup from 'ol-ext/overlay/Popup';
import Map from 'ol/Map';
import MVT from 'ol/format/MVT';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import OSM from 'ol/source/OSM';
import VectorTileSource from 'ol/source/VectorTile';
import RenderFeature from 'ol/render/Feature';
import {toLonLat} from 'ol/proj';
import {format as formatCoordinate} from 'ol/coordinate';

import FeatureFilter from './bldrwnsch.filter';
import {updatePermalink, getMapView} from './bldrwnsch.mapview';

import 'ol/ol.css';
import 'ol-ext/dist/ol-ext.css';
import './style.css';
import {MapBrowserEvent} from 'ol';

const popup = new Popup({
  popupClass: 'default',
  closeBox: true,
  positioning: 'auto',
});

const filter = new FeatureFilter().setFromLocation();
const pbfSourceAttributions = [
  '<a href="https://github.com/simon04/bldrwnsch/" target="_blank">@simon04/bldrwnsch</a>',
  '(<a href="https://github.com/simon04/bldrwnsch/blob/master/LICENSE" target="_blank">GPL v3</a>)',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.gpx" target="_blank">.gpx</a>',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.geojson" target="_blank">.geojson</a>',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.kml" target="_blank">.kml</a>',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.kmz" target="_blank">.kmz</a>',
];
const pbfSource = new VectorTileSource({
  attributions: pbfSourceAttributions,
  format: new MVT(),
  maxZoom: 10,
  url: 'https://bldrwnsch.toolforge.org/Bilderwuensche.tiles/{z}/{x}/{y}.pbf',
});
fetch('https://bldrwnsch.toolforge.org/Bilderwuensche.geojson.gz', {method: 'HEAD'})
  .then((res) => res.headers.get('Last-Modified'))
  .then((header) => {
    if (!header) {
      return;
    }
    const date = new Date(header).toLocaleString();
    pbfSource.setAttributions([...pbfSourceAttributions, 'Update: ' + date]);
  });

const map = new Map({
  target: 'map',
  keyboardEventTarget: document,
  view: getMapView(),
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    new VectorTileLayer({
      style: (feature) => filter.style(feature),
      source: pbfSource,
    }),
  ],
  overlays: [popup],
});

map.on('click', (e) => showInfo(true, e));
map.on('pointermove', (e) => showInfo(false, e));
map.on('moveend', () => updatePermalink(map));

const info = document.getElementById('info')!;
function showInfo(showPopup: boolean, event: MapBrowserEvent<MouseEvent>) {
  const features = map.getFeaturesAtPixel(event.pixel, {
    layerFilter: () => true,
    hitTolerance: 13,
  });
  if (!features || !features.length) {
    info.innerText = '';
    info.style.opacity = '0';
    return;
  }
  const properties = features[0].getProperties();
  const geometry = features[0].getGeometry() as RenderFeature;
  const coordinate = toLonLat(geometry.getFlatInteriorPoint());
  const geo = 'geo:' + formatCoordinate(coordinate, '{y},{x}', 6);
  const content = [
    properties.title,
    properties.description,
    properties.location,
    '<a href="' + geo + '">' + geo + '</a>',
  ]
    .filter((value, index, array) => value && (index === 0 || value !== array[index - 1]))
    .map((value, index) =>
      index === 0
        ? '<a href="https://de.wikipedia.org/wiki/' +
          value.replace(/ /g, '_') +
          '" target="_blank">' +
          value +
          '</a>'
        : value
    )
    .join('<br>')
    .replace(/_/g, ' ');
  info.innerHTML = content;
  info.style.opacity = '1';
  if (showPopup) {
    popup.show(event.coordinate, content);
  }
}

const geocoder = new SearchNominatim({
  label: 'Auf der Karte suchen…',
  placeholder: 'Auf der Karte suchen…',
  url: 'https://nominatim.toolforge.org/search',
  position: true,
});
map.addControl(geocoder);
geocoder.on('select', (e: any) => {
  map.getView().animate({
    center: e.coordinate,
    zoom: Math.max(map.getView().getZoom() ?? 0, 16),
  });
});

const filterControl = new Search({
  label: 'Bilderwünsche filtern',
  placeholder: 'Bilderwünsche filtern…',
  className: 'filter',
});
map.addControl(filterControl);
filterControl._input.value = filter.text || '';
filterControl.on('change:input', (e: HTMLInputElement) => {
  filter.setFilter(e.value);
  pbfSource.changed();
  filter.updateLocation();
});
