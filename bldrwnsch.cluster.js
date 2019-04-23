import Supercluster from 'supercluster';

var index = new Supercluster({
  radius: 24,
  extent: 256,
  maxZoom: 17
});

getJSON('https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.geojson.gz', function(geojson) {
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

function getJSON(url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'json';
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.onload = function() {
    if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300 && xhr.response) {
      callback(xhr.response);
    }
  };
  xhr.send();
}
