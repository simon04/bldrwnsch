import {createDefaultStyle} from 'ol/style/Style';

export default class FeatureFilter {
  setFilter(filter) {
    this.text = filter;
    this.invert = false;
    if (filter && filter[0] === '!') {
      filter = filter.substring(1);
      this.invert = true;
    }
    this.regex = new RegExp(filter, 'i');
  }

  setFromLocation() {
    if (URLSearchParams) {
      // parse ?filter=foo from URL query
      const params = new URLSearchParams(location.search); // eslint-disable-line compat/compat
      if (params.has('filter')) {
        this.setFilter(params.get('filter'));
      }
    }
    return this;
  }

  updateLocation() {
    if (history && history.replaceState) {
      history.replaceState(
        {filter: this.text},
        document.title,
        '?filter=' + encodeURIComponent(this.text) + location.hash
      );
    }
    return this;
  }

  style(feature) {
    const properties = feature.getProperties();
    const match = !(
      !!this.invert ===
      !!(
        (properties.title || '').match(this.regex) ||
        (properties.description || '').match(this.regex)
      )
    );
    if (match) {
      return createDefaultStyle();
    }
  }
}
