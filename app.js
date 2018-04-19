var attribution = '<a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>';
var baseLayers = {
  WikimediaMaps: new L.TileLayer('https://maps.wikimedia.org/{style}/{z}/{x}/{y}.png', {
    style: 'osm-intl',
    maxZoom: 18,
    attribution: 'Map data &copy; ' + attribution
  }),
  OSM: new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: attribution
  })
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
  PrepareLeafletMarker: function(marker, data) {
    var camera =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Photo-request.svg/32px-Photo-request.svg.png';
    marker.setIcon(
      L.icon({
        iconUrl: camera
      })
    );
    var description = data.description ? data.description.replace(/_/g, ' ') + '<br>' : '';
    var title = data.title ? data.title.replace(/_/g, ' ') : '';
    var link =
      '<a href="https://de.wikipedia.org/wiki/' + title + '" target="_blank">' + title + '</a>';
    if (L.Browser.mobile) {
      marker.bindPopup(description + link);
    } else {
      marker.bindTooltip(description + title);
      marker.bindPopup(description + link);
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
          var marker = new PruneCluster.Marker(row.lat, row.lon, row);
          cluster.RegisterMarker(marker);
        });
        cluster.ProcessView();
      });
  }
});

new L.BldrwnschLayer().addTo(map).fetchData();
