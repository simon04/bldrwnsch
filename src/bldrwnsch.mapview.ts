import type {Map} from 'maplibre-gl';

export type MapView = {zoom: number; center: [number, number]};

export function getMapView(): MapView {
  let zoom = 8;
  let center: [number, number] = [12.694, 47.075];
  if (window.location.hash) {
    const hash = window.location.hash.replace('#map=', '');
    const parts = hash.split('/');
    if (parts.length === 3) {
      zoom = +parts[0];
      center = [+parts[1], +parts[2]];
    }
  }
  return {zoom, center};
}

export function updatePermalink(map: Map): void {
  const center = map.getCenter();
  const zoom = map.getZoom();
  window.location.hash = `#map=${zoom.toFixed(2)}/${center.lng.toFixed(4)}/${center.lat.toFixed(4)}`;
}
