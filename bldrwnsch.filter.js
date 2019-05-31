import {createDefaultStyle} from 'ol/style/Style';

export function getFilterFromLocation() {
  if (URLSearchParams) {
    // parse ?filter=foo from URL query
    const params = new URLSearchParams(location.search); // eslint-disable-line compat/compat
    if (params.has('filter')) {
      return params.get('filter');
    }
  }
}
export function setFilterInLocation(filter) {
  if (history && history.replaceState) {
    history.replaceState(
      {filter: filter},
      document.title,
      '?filter=' + encodeURIComponent(filter) + location.hash
    );
  }
}

export function getStyleForFilter(filter) {
  let filterInvert = false;
  if (filter && filter[0] === '!') {
    filter = filter.substring(1);
    filterInvert = true;
  }
  if (typeof filter === 'string') {
    filter = new RegExp(filter, 'i');
  }
  return function style(feature) {
    const properties = feature.getProperties();
    const match = !(
      !!filterInvert ===
      !!((properties.title || '').match(filter) || (properties.description || '').match(filter))
    );
    if (match) {
      return createDefaultStyle();
    }
  };
}
