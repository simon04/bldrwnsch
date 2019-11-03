import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';

export default class FeatureFilter {
  constructor() {
    const fill = new Fill({
      color: 'rgba(255,255,255,0.4)'
    });
    const stroke = new Stroke({
      color: '#FF6200',
      width: 1.25
    });
    this.defaultStyle = [
      new Style({
        image: new CircleStyle({
          fill: fill,
          stroke: stroke,
          radius: 5
        }),
        fill: fill,
        stroke: stroke
      })
    ];
  }
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
      return this.defaultStyle;
    }
  }
}
