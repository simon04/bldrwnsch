import {default as L} from 'leaflet';
import {Spinner} from 'spin.js';

export default L.GeoJSON.extend({
  options: {
    attribution: [
      '<a href="https://de.wikipedia.org/wiki/Wikipedia:Bilderwünsche" target="_blank">',
      'Wikipedia:Bilderwünsche</a>'
    ].join('')
  },
  initialize: function() {
    L.GeoJSON.prototype.initialize.call(this, null, {
      pointToLayer: function(feature, latlng) {
        if (feature.properties.cluster) {
          return this.createClusterIcon(feature, latlng);
        } else {
          return this.createIcon(feature, latlng);
        }
      }.bind(this)
    });
  },
  onAdd: function(map) {
    this._spinner = new Spinner();
    const worker = new Worker('./bldrwnsch.cluster.js');
    this._worker = worker;
    worker.onmessage = function(e) {
      if (e.data.ready) {
        this._spinner.stop();
        map.on('moveend', update);
        update();
      } else if (e.data.expansionZoom) {
        map.flyTo(e.data.center, e.data.expansionZoom);
      } else {
        this.clearLayers();
        this.addData(e.data);
      }
    }.bind(this);
    worker.onerror = function(e) {
      this._spinner.stop();
      console.warn(e);
    }.bind(this);
    function update() {
      const bounds = map.getBounds();
      worker.postMessage({
        bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom: map.getZoom()
      });
    }
    this.on('click', function(e) {
      if (e.layer.feature.properties.cluster_id) {
        worker.postMessage({
          getClusterExpansionZoom: e.layer.feature.properties.cluster_id,
          center: e.latlng
        });
      }
    });
  },
  fetch: function(filter) {
    let filterInvert = false;
    if (filter && filter[0] === '!') {
      filter = filter.substring(1);
      filterInvert = true;
    }
    if (typeof filter === 'string') {
      filter = new RegExp(filter, 'i');
    }
    this._spinner.spin(document.getElementById('map'));
    this._worker.postMessage({fetch: true, filter: filter, filterInvert: filterInvert});
    return this;
  },
  createClusterIcon: function(feature, latlng) {
    const count = feature.properties.point_count;
    const size = count < 100 ? 'small' : count < 1000 ? 'medium' : 'large';
    const icon = L.divIcon({
      html: `<div><span>${feature.properties.point_count_abbreviated}</span></div>`,
      className: `marker-cluster marker-cluster-${size}`,
      iconSize: L.point(40, 40)
    });
    return L.marker(latlng, {icon: icon});
  },
  createIcon: function(feature, latlng) {
    const camera =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Photo-request.svg/24px-Photo-request.svg.png';
    const icon = L.icon({
      iconUrl: camera,
      iconSize: [24, 24],
      iconAnchor: [8, 13]
    });
    const marker = L.marker(latlng, {icon: icon});
    const data = feature.properties;
    const description = data.description ? data.description.replace(/_/g, ' ') + '<br>' : '';
    const title = data.title ? data.title.replace(/_/g, ' ') : '';
    const geo = `<a href="geo:${latlng.lat},${latlng.lng}">geo:</a><br>`;
    const link = `<a href="https://de.wikipedia.org/wiki/${title}" target="_blank">${title}</a>`;
    if (L.Browser.mobile) {
      marker.bindPopup(description + geo + link);
    } else {
      marker.bindTooltip(description + title);
      marker.bindPopup(description + geo + link);
    }
    return marker;
  }
});
