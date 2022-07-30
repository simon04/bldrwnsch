# bldrwnsch

Interactive map of image requests of the German Wikipedia (from [{{Bilderwunsch}}](https://de.wikipedia.org/wiki/Vorlage:Bilderwunsch) usages).

## Usage

- https://bldrwnsch.toolforge.org/
- https://bldrwnsch.toolforge.org/?filter=denkmal

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

Dependencies:

- [`make(1)`](https://man.archlinux.org/man/make.1)
- [Python 3](https://www.python.org/)
- [`tippecanoe`](https://github.com/mapbox/tippecanoe)
- [`ogr2ogr` from GDAL](https://gdal.org/programs/ogr2ogr.html)

## Data download

- https://bldrwnsch.toolforge.org/Bilderwuensche.gpx
- https://bldrwnsch.toolforge.org/Bilderwuensche.geojson
- https://bldrwnsch.toolforge.org/Bilderwuensche.json
- https://bldrwnsch.toolforge.org/Bilderwuensche.kml
- https://bldrwnsch.toolforge.org/Bilderwuensche.kmz

## Author and License

- Author: [simon04](https://github.com/simon04)
- License: [GPL v3](https://github.com/simon04/bldrwnsch/blob/gh-pages/LICENSE)
