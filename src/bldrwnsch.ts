import {
  AttributionControl,
  GeolocateControl,
  Map,
  NavigationControl,
  Popup,
  addProtocol,
  setWorkerUrl,
  type CircleLayerSpecification,
  type MapGeoJSONFeature,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {Protocol} from 'pmtiles';
import type {Point} from 'geojson';

import FeatureFilter from './bldrwnsch.filter';
import {SearchControl, SearchNominatimControl} from './bldrwnsch.controls';
import {getMapView, updatePermalink} from './bldrwnsch.mapview';

setWorkerUrl(maplibreWorkerUrl);
addProtocol('pmtiles', new Protocol().tile);

const BILDERWUENSCHE_LAYER = 'Bilderwuensche';
const HIT_TOLERANCE = 13;

const filter = new FeatureFilter().setFromLocation();

const attributions = [
  '<a href="https://github.com/simon04/bldrwnsch/" target="_blank">@simon04/bldrwnsch</a>',
  '(<a href="https://github.com/simon04/bldrwnsch/blob/master/LICENSE" target="_blank">GPL v3</a>, ',
  '<a href="/assets/license.txt" target="_blank">open source licenses</a>)',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.gpx" target="_blank">.gpx</a>',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.geojson" target="_blank">.geojson</a>',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.kml" target="_blank">.kml</a>',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.kmz" target="_blank">.kmz</a>',
  '<a href="https://bldrwnsch.toolforge.org/Bilderwuensche.pmtiles" target="_blank">.pmtiles</a>',
];

const bilderwuenscheLayer: CircleLayerSpecification = {
  id: BILDERWUENSCHE_LAYER,
  type: 'circle',
  source: 'Bilderwuensche',
  'source-layer': 'Bilderwuensche',
  paint: {
    'circle-radius': 5,
    'circle-color': '#8800cc',
    'circle-opacity': 0.125,
    'circle-stroke-color': '#8800cc',
    'circle-stroke-width': 1.25,
  },
};
const initialFilter = filter.filterSpecification();
if (initialFilter) {
  bilderwuenscheLayer.filter = initialFilter;
}

const style: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    },
    Bilderwuensche: {
      type: 'vector',
      url: 'pmtiles://https://bldrwnsch.toolforge.org/Bilderwuensche.pmtiles',
    },
  },
  layers: [{id: 'osm', type: 'raster', source: 'osm'}, bilderwuenscheLayer],
};

const {zoom, center} = getMapView();
const map = new Map({
  container: 'map',
  style,
  zoom,
  center,
  attributionControl: false,
});
map.dragRotate.disable();
map.touchZoomRotate.disableRotation();
map.keyboard.disableRotation();

let attributionControl = new AttributionControl({customAttribution: attributions});
map.addControl(attributionControl);
void fetch('https://bldrwnsch.toolforge.org/Bilderwuensche.geojson.gz', {method: 'HEAD'})
  .then((res) => res.headers.get('Last-Modified'))
  .then((header) => {
    if (!header) {
      return;
    }
    const date = new Date(header).toLocaleString();
    map.removeControl(attributionControl);
    attributionControl = new AttributionControl({
      customAttribution: [...attributions, `Update: ${date}`],
    });
    map.addControl(attributionControl);
  })
  .catch((e) => console.error('Failed loading Last-Modified from Bilderwuensche.geojson.gz', e));

map.addControl(new NavigationControl({showCompass: false}));
map.addControl(new GeolocateControl({trackUserLocation: true}));

const tooltip = new Popup({closeButton: false, closeOnClick: false});
const popup = new Popup();

map.on('click', (e) => showInfo(true, e));
map.on('mousemove', (e) => showInfo(false, e));
map.on('mouseout', () => tooltip.remove());
map.on('moveend', () => updatePermalink(map));

function showInfo(showPopup: boolean, event: MapMouseEvent): void {
  if (!map.getLayer(BILDERWUENSCHE_LAYER)) {
    return;
  }
  const {x, y} = event.point;
  const features = map.queryRenderedFeatures(
    [
      [x - HIT_TOLERANCE, y - HIT_TOLERANCE],
      [x + HIT_TOLERANCE, y + HIT_TOLERANCE],
    ],
    {layers: [BILDERWUENSCHE_LAYER]},
  );
  map.getCanvas().style.cursor = features.length ? 'pointer' : '';
  if (!features.length) {
    tooltip.remove();
    return;
  }
  const content = featureContent(features[0]);
  if (showPopup) {
    tooltip.remove();
    popup.setLngLat(event.lngLat).setHTML(content).addTo(map);
  } else {
    tooltip.setLngLat(event.lngLat).setHTML(content).addTo(map);
  }
}

function featureContent(feature: MapGeoJSONFeature): string {
  const properties = feature.properties as Record<string, string | undefined>;
  const [lon, lat] = (feature.geometry as Point).coordinates;
  const geo = `geo:${lat.toFixed(6)},${lon.toFixed(6)}`;
  return [
    properties.title,
    properties.description,
    properties.location,
    `<a href="${geo}(${encodeURIComponent(`${properties.title} / ${properties.description}`)})">${geo}</a>`,
  ]
    .filter((value, index, array) => value && (index === 0 || value !== array[index - 1]))
    .map((value, index) =>
      index === 0
        ? `<a href="https://de.wikipedia.org/wiki/${value!.replace(
            / /g,
            '_',
          )}" target="_blank">${value!.replace(/_/g, ' ')}</a>`
        : value!.replace(/_/g, ' '),
    )
    .join('<br>');
}

const geocoder = new SearchNominatimControl({
  url: 'https://nominatim.toolforge.org/search',
  label: 'Auf der Karte suchen…',
  placeholder: 'Auf der Karte suchen…',
  onSelect: (center) => map.flyTo({center, zoom: Math.max(map.getZoom(), 16)}),
});
map.addControl(geocoder);

const filterControl = new SearchControl({
  className: 'bldrwnsch-search-filter',
  label: 'Bilderwünsche filtern',
  placeholder: 'Bilderwünsche filtern…',
  debounce: 300,
  onInput: (value) => {
    filter.setFilter(value);
    if (map.getLayer(BILDERWUENSCHE_LAYER)) {
      map.setFilter(BILDERWUENSCHE_LAYER, filter.filterSpecification());
    }
    filter.updateLocation();
  },
});
map.addControl(filterControl);
filterControl.setValue(filter.text);
