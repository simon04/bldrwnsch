import CircleStyle from 'ol/style/Circle';
import Feature from 'ol/Feature';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';

export default class FeatureFilter {
  defaultStyle: Style[];
  text = '';
  invert = false;
  regex: RegExp;

  constructor() {
    const fill = new Fill({
      color: '#8800cc20',
    });
    const stroke = new Stroke({
      color: '#8800cc',
      width: 1.25,
    });
    this.defaultStyle = [
      new Style({
        image: new CircleStyle({
          fill: fill,
          stroke: stroke,
          radius: 5,
        }),
        fill: fill,
        stroke: stroke,
      }),
    ];
  }
  setFilter(filter: string) {
    this.text = filter;
    this.invert = false;
    if (filter && filter[0] === '!') {
      filter = filter.substring(1);
      this.invert = true;
    }
    this.regex = new RegExp(filter, 'i');
    return this;
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
        undefined,
        document.title,
        (this.text ? '?filter=' + encodeURIComponent(this.text) : '/') + location.hash
      );
    }
    return this;
  }

  style(feature: Feature) {
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
