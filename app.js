var attribution = '<a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>';

L.TileLayer.OSM = L.TileLayer.extend({
  initialize: function(options) {
    L.TileLayer.prototype.initialize.call(
      this,
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options
    );
  },
  options: {
    maxZoom: 19,
    attribution: attribution
  }
});

L.TileLayer.WikimediaMaps = L.TileLayer.extend({
  initialize: function(options) {
    var scale = bracketDevicePixelRatio();
    var scalex = scale === 1 ? '' : '@' + scale + 'x';
    L.TileLayer.prototype.initialize.call(
      this,
      'https://maps.wikimedia.org/{style}/{z}/{x}/{y}' + scalex + '.png',
      options
    );

    function bracketDevicePixelRatio() {
      var brackets = [1, 1.3, 1.5, 2, 2.6, 3];
      var baseRatio = window.devicePixelRatio || 1;
      for (var i = 0; i < brackets.length; i++) {
        var scale = brackets[i];
        if (scale >= baseRatio || baseRatio - scale < 0.1) {
          return scale;
        }
      }
      return brackets[brackets.length - 1];
    }
  },

  options: {
    style: 'osm-intl',
    maxZoom: 18,
    attribution: 'Map data &copy; ' + attribution
  }
});

var baseLayers = {
  WikimediaMaps: new L.TileLayer.WikimediaMaps(),
  OSM: new L.TileLayer.OSM()
};
var map = L.map('map').setView([47.23, 11.3], 13);
L.control.layers(baseLayers).addTo(map);
baseLayers.WikimediaMaps.addTo(map);
map.attributionControl.setPrefix(false);
L.hash(map);
L.Control.geocoder({
  expand: 'click',
  position: 'topleft',
  defaultMarkGeocode: true
}).addTo(map);

var markers = new PruneClusterForLeaflet().addTo(map);
fetch('./Bilderwuensche.csv')
  .then(function(response) {
    return response.text();
  })
  .then(function(csv) {
    var parsed = Papa.parse(csv, {header: true, skipEmptyLines: true});
    parsed.data
      .map(function(row) {
        var lat = parseFloat(row.bw_location_lat);
        var lon = parseFloat(row.bw_location_lon);
        row.popup = popup;
        return new PruneCluster.Marker(lat, lon, row);
      })
      .forEach(function(marker) {
        markers.RegisterMarker(marker);
      });
    markers.ProcessView();
  });

function popup(row) {
  var description = (row.bw_location_desc || '').replace(/_/g, ' ');
  var title = (row.bw_location_title || '').replace(/_/g, ' ');
  return (
    (description ? description + '<br>' : '') +
    '<a href="https://de.wikipedia.org/wiki/' +
    title +
    '" target="_blank">' +
    title +
    '</a>'
  );
}
