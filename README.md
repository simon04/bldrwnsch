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
go build -o ./updateBilderwuensche
./updateBilderwuensche.sh
```

Dependencies:

- [Go](https://go.dev/)
- [go-sql-driver/mysql](https://pkg.go.dev/github.com/go-sql-driver/mysql)
- [`tippecanoe`](https://github.com/felt/tippecanoe)

## Deployment

See [Help:Toolforge/Jobs framework](https://wikitech.wikimedia.org/wiki/Help:Toolforge/Jobs_framework) and `updateBilderwuensche.sh`

```sh
webservice --backend=kubernetes php8.2 start

toolforge jobs run bldrwnsch --command ./bldrwnsch/updateBilderwuensche.sh --image golang1.11 --schedule "@hourly" --emails onfailure --mem 1G
```

Dashboard: https://grafana.wmcloud.org/d/TJuKfnt4z/kubernetes-namespace?orgId=1&var-namespace=tool-bldrwnsch

## Data download

- https://bldrwnsch.toolforge.org/Bilderwuensche.gpx
- https://bldrwnsch.toolforge.org/Bilderwuensche.geojson
- https://bldrwnsch.toolforge.org/Bilderwuensche.json
- https://bldrwnsch.toolforge.org/Bilderwuensche.kml
- https://bldrwnsch.toolforge.org/Bilderwuensche.kmz

## Author and License

- Author: [simon04](https://github.com/simon04)
- License: [GPL v3](https://github.com/simon04/bldrwnsch/blob/gh-pages/LICENSE)
