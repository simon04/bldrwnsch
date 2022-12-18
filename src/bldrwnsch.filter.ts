import CircleStyle from 'ol/style/Circle';
import Feature from 'ol/Feature';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import RenderFeature from 'ol/render/Feature';
import Geometry from 'ol/geom/Geometry';

export default class FeatureFilter {
  defaultStyle: Style[];
  text = '';
  invert = false;
  regex = new RegExp('');

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

  setFilter(filter: string): this {
    this.text = filter;
    this.invert = false;
    if (filter && filter[0] === '!') {
      filter = filter.substring(1);
      this.invert = true;
    }
    this.regex = new RegExp(filter, 'i');
    return this;
  }

  setFromLocation(): this {
    if (!URLSearchParams) {
      return this;
    }
    // parse ?filter=foo from URL query
    const params = new URLSearchParams(location.search); // eslint-disable-line compat/compat
    const filter = params.get('filter');
    if (filter) {
      this.setFilter(filter);
    }
    return this;
  }

  updateLocation(): this {
    if (history && history.replaceState) {
      history.replaceState(
        undefined,
        document.title,
        (this.text ? '?filter=' + encodeURIComponent(this.text) : '/') + location.hash
      );
    }
    return this;
  }

  style(feature: Feature<Geometry> | RenderFeature): Style[] {
    const properties = feature.getProperties();
    const match =
      this.regex.test(properties.title || '') || this.regex.test(properties.description || '');
    if (this.invert !== match) {
      return this.defaultStyle;
    } else {
      return [];
    }
  }
}
