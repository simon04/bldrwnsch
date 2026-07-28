import type {IControl, Map} from 'maplibre-gl';

type SearchControlOptions = {
  className: string;
  label: string;
  placeholder: string;
  debounce?: number;
  onInput: (value: string) => void;
};

export class SearchControl implements IControl {
  readonly input = document.createElement('input');
  protected readonly container = document.createElement('div');
  protected readonly results = document.createElement('ul');
  private readonly options: SearchControlOptions;
  private timeout: ReturnType<typeof setTimeout> | undefined;

  constructor(options: SearchControlOptions) {
    this.options = options;

    this.container.className = `maplibregl-ctrl maplibregl-ctrl-group bldrwnsch-search ${options.className}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.title = options.label;
    button.setAttribute('aria-label', options.label);
    const icon = document.createElement('span');
    icon.className = 'maplibregl-ctrl-icon';
    button.append(icon);
    button.addEventListener('click', () => this.toggle());
    this.container.append(button);

    this.input.type = 'search';
    this.input.placeholder = options.placeholder;
    this.input.setAttribute('aria-label', options.label);
    this.input.addEventListener('input', () => this.onInput());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggle(false);
      }
    });
    this.container.append(this.input);

    this.container.append(this.results);
  }

  onAdd(_map: Map): HTMLElement {
    return this.container;
  }

  onRemove(): void {
    this.container.remove();
  }

  getDefaultPosition(): 'top-left' {
    return 'top-left';
  }

  toggle(expanded = !this.container.classList.contains('expanded')): void {
    this.container.classList.toggle('expanded', expanded);
    if (expanded) {
      this.input.focus();
    } else {
      this.clearResults();
    }
  }

  setValue(value: string): this {
    this.input.value = value;
    this.container.classList.toggle('expanded', !!value);
    return this;
  }

  protected clearResults(): void {
    this.results.replaceChildren();
  }

  protected setResults(items: {label: string; onSelect: () => void}[]): void {
    this.results.replaceChildren(
      ...items.map(({label, onSelect}) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', () => {
          this.clearResults();
          onSelect();
        });
        li.append(button);
        return li;
      }),
    );
  }

  private onInput(): void {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.options.onInput(this.input.value), this.options.debounce);
  }
}

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export class SearchNominatimControl extends SearchControl {
  constructor(options: {
    url: string;
    label: string;
    placeholder: string;
    onSelect: (center: [number, number]) => void;
  }) {
    super({
      className: 'bldrwnsch-search-nominatim',
      label: options.label,
      placeholder: options.placeholder,
      debounce: 500,
      onInput: (value) => {
        if (value.length < 3) {
          this.clearResults();
          return;
        }
        const url = `${options.url}?format=jsonv2&limit=10&q=${encodeURIComponent(value)}`;
        void fetch(url)
          .then((res) => res.json() as Promise<NominatimResult[]>)
          .then((results) =>
            this.setResults(
              results.map((result) => ({
                label: result.display_name,
                onSelect: () => {
                  this.input.value = result.display_name;
                  options.onSelect([+result.lon, +result.lat]);
                },
              })),
            ),
          )
          .catch((e) => console.error('Failed searching via Nominatim', e));
      },
    });
  }
}
