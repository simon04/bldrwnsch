import Supercluster from 'supercluster';

let index;

function load(filter, filterInvert) {
  index = new Supercluster({
    radius: 24,
    extent: 256,
    maxZoom: 17
  });
  getJSON('https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.geojson.gz', function(geojson) {
    index.load(
      geojson.features.filter(function(feature) {
        return !(
          !!filterInvert ===
          !!(
            (feature.properties.title || '').match(filter) ||
            (feature.properties.description || '').match(filter)
          )
        );
      })
    );
    postMessage({ready: true});
  });
}

self.onmessage = function(e) {
  if (e.data.fetch) {
    load(e.data.filter, e.data.filterInvert);
  } else if (index && e.data.getClusterExpansionZoom) {
    postMessage({
      expansionZoom: index.getClusterExpansionZoom(e.data.getClusterExpansionZoom),
      center: e.data.center
    });
  } else if (index && e.data) {
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
