import 'whatwg-fetch';
import 'promise-polyfill';
import Supercluster from 'supercluster';

var index = new Supercluster({
  radius: 24,
  extent: 256,
  maxZoom: 17
});

fetch('https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.geojson.gz')
  .then(function(response) {
    if (!response.ok) {
      throw response.statusText;
    }
    return response.json();
  })
  .then(function(geojson) {
    index.load(geojson.features);
    postMessage({ready: true});
  });

self.onmessage = function(e) {
  if (e.data.getClusterExpansionZoom) {
    postMessage({
      expansionZoom: index.getClusterExpansionZoom(e.data.getClusterExpansionZoom),
      center: e.data.center
    });
  } else if (e.data) {
    postMessage(index.getClusters(e.data.bbox, e.data.zoom));
  }
};
