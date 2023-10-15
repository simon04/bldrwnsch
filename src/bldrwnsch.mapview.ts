import Map from 'ol/Map';
import {View} from 'ol';
import {toLonLat, fromLonLat} from 'ol/proj';
import {format as formatCoordinate} from 'ol/coordinate';

// based on https://openlayers.org/en/latest/examples/permalink.html

export function getMapView(): View {
  let zoom = 8;
  let center = [12.694, 47.075];
  if (window.location.hash) {
    const hash = window.location.hash.replace('#map=', '');
    const parts = hash.split('/');
    if (parts.length === 3) {
      zoom = parseInt(parts[0], 10);
      center = [parseFloat(parts[1]), parseFloat(parts[2])];
    }
  }
  return new View({
    zoom: zoom,
    center: fromLonLat(center),
    enableRotation: false,
  });
}

export function updatePermalink(map: Map): void {
  const view = map.getView();
  const viewCenter = view.getCenter();
  if (!viewCenter) {
    return;
  }
  const center = toLonLat(viewCenter);
  const hash = view.getZoom() + '/' + formatCoordinate(center, '{x}/{y}', 4);
  window.location.hash = '#map=' + hash;
}
