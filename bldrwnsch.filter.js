import ControlGeocoder from 'leaflet-control-geocoder/src/index.js';

export default ControlGeocoder.extend({
  options: {
    filter: undefined,
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
  setFilter(filter) {
    this._input.value = filter;
    return this;
  },
  _geocode: function() {
    const filter = this._input.value;
    this.fire('filter', {filter: filter});
  }
});

export function getFilterFromLocation() {
  if (URLSearchParams) {
    // parse ?filter=foo from URL query
    const params = new URLSearchParams(location.search); // eslint-disable-line compat/compat
    if (params.has('filter')) {
      return params.get('filter');
    }
  }
}
