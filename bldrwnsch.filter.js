import ControlGeocoder from 'leaflet-control-geocoder/src/index.js';

export default ControlGeocoder.extend({
  options: {
    expand: 'click',
    suggestMinLength: Number.POSITIVE_INFINITY,
    position: 'topright',
    placeholder: 'Filter...'
  },
  onAdd: function(map) {
    const container = ControlGeocoder.prototype.onAdd.call(this, map);
    container.title = 'Filter shown markers...';
    const icon = container.querySelector('.leaflet-control-geocoder-icon');
    icon.style.backgroundImage = 'none';
    icon.innerHTML = 'F';
    return container;
  },
  _geocode: function() {
    const filter = this._input.value;
    this.options.fetch(filter);
  }
});
