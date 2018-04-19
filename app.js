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
L.control
  .locate({
    locateOptions: {
      watch: true,
      enableHighAccuracy: true
    }
  })
  .addTo(map);

L.BldrwnschLayer = PruneClusterForLeaflet.extend({
  PrepareLeafletMarker: function(marker, row) {
    var camera =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Photo-request.svg/32px-Photo-request.svg.png';
    marker.setIcon(
      L.icon({
        iconUrl: camera
      })
    );
    var link =
      '<a href="https://de.wikipedia.org/wiki/' +
      row.title +
      '" target="_blank">' +
      row.title +
      '</a>';
    if (row.description && L.Browser.mobile) {
      marker.bindPopup(row.description + '<br>' + link);
    } else if (row.description) {
      marker.bindTooltip(row.description + '<br>' + row.title);
      marker.bindPopup(row.description + '<br>' + link);
    } else if (L.Browser.mobile) {
      marker.bindPopup(link);
    } else {
      marker.bindTooltip(row.title);
      marker.bindPopup(link);
    }
  },
  fetchData: function() {
    var cluster = this;
    fetch('https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.json.gz')
      .then(function(response) {
        return response.json();
      })
      .then(function(json) {
        json.forEach(function(row) {
          var data = {
            description: (row.description || '').replace(/_/g, ' '),
            title: (row.title || '').replace(/_/g, ' ')
          };
          var marker = new PruneCluster.Marker(row.lat, row.lon, data);
          cluster.RegisterMarker(marker);
        });
        cluster.ProcessView();
      });
  }
});

new L.BldrwnschLayer().addTo(map).fetchData();
