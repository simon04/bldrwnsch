import type {ExpressionSpecification, FilterSpecification} from 'maplibre-gl';

export default class FeatureFilter {
  text = '';
  invert = false;
  needle = '';

  setFilter(filter: string): this {
    this.text = filter;
    this.invert = filter.startsWith('!');
    this.needle = (this.invert ? filter.slice(1) : filter).toLowerCase();
    return this;
  }

  setFromLocation(): this {
    // parse ?filter=foo from URL query
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter) {
      this.setFilter(filter);
    }
    return this;
  }

  updateLocation(): this {
    history.replaceState(
      undefined,
      document.title,
      (this.text ? `?filter=${encodeURIComponent(this.text)}` : '/') + location.hash,
    );
    return this;
  }

  filterSpecification(): FilterSpecification | null {
    if (!this.needle) {
      return null;
    }
    const matches: ExpressionSpecification = [
      'any',
      ...(['title', 'description'] as const).map(
        (property): ExpressionSpecification => [
          '!=',
          ['index-of', this.needle, ['downcase', ['to-string', ['get', property]]]],
          -1,
        ],
      ),
    ];
    return this.invert ? ['!', matches] : matches;
  }
}
