# bldrwnsch

Interactive map of image requests of the German Wikipedia (from [{{Bilderwunsch}}](https://de.wikipedia.org/wiki/Vorlage:Bilderwunsch) usages).

## Usage

- https://bldrwnsch.toolforge.org/
- https://bldrwnsch.toolforge.org/?filter=denkmal

## Frontend development

```sh
yarn
yarn dev
open http://localhost:3000
```

## Data extraction

```sh
virtualenv .venv
source .venv/bin/activate
pip install -r requirements.txt

python updateBilderwuensche.py --query --convert
```

Dependencies:

- [Python 3](https://www.python.org/)
- [PyMySQL](https://github.com/PyMySQL/PyMySQL)
- [`tippecanoe`](https://github.com/mapbox/tippecanoe)

## Data download

- https://bldrwnsch.toolforge.org/Bilderwuensche.gpx
- https://bldrwnsch.toolforge.org/Bilderwuensche.geojson
- https://bldrwnsch.toolforge.org/Bilderwuensche.json
- https://bldrwnsch.toolforge.org/Bilderwuensche.kml
- https://bldrwnsch.toolforge.org/Bilderwuensche.kmz

## Author and License

- Author: [simon04](https://github.com/simon04)
- License: [GPL v3](https://github.com/simon04/bldrwnsch/blob/gh-pages/LICENSE)
