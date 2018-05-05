importScripts('node_modules/supercluster/dist/supercluster.js');

var index = supercluster({
  radius: 60,
  extent: 256,
  maxZoom: 17
});

fetch('https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.json.gz')
  .then(function(response) {
    if (!response.ok) {
      throw response.statusText;
    }
    return response.json();
  })
  .then(function(json) {
    var features = json.map(function(row) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [row.lon, row.lat]
        },
        properties: row
      };
    });
    return {
      type:'FeatureCollection',
      features: features
    };
  }).then(function(geojson) {
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
