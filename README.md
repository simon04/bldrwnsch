# bldrwnsch

Interactive map of image requests of the German Wikipedia (from [{{Bilderwunsch}}](https://de.wikipedia.org/wiki/Vorlage:Bilderwunsch) usages).

## Usage

→ https://tools.wmflabs.org/bldrwnsch/

## Frontend development

```sh
yarn
yarn build # or: yarn build -- --watch
npx http-server dist/ -o
```

## Data extraction

```sh
make
```

## Data download

- https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.gpx
- https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.geojson
- https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.json
- https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.kml
- https://tools.wmflabs.org/bldrwnsch/Bilderwuensche.kmz

## Author and License

- Author: [simon04](https://github.com/simon04)
- License: [GPL v3](https://github.com/simon04/bldrwnsch/blob/gh-pages/LICENSE)
