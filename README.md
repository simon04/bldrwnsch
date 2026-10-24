# bldrwnsch

Interactive map of image requests of the German Wikipedia (from [{{Bilderwunsch}}](https://de.wikipedia.org/wiki/Vorlage:Bilderwunsch) usages).

## Usage

- https://bldrwnsch.toolforge.org/
- https://bldrwnsch.toolforge.org/?filter=denkmal

## Frontend development

```sh
pnpm install
pnpm dev
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

Deployed using [Toolforge components](https://wikitech.wikimedia.org/wiki/Help:Toolforge/Deploy_your_tool), see `toolforge.yaml` and `Procfile`:

- `web`: Go webserver (`cmd/webserver`) serving the frontend and `$TOOL_DATA_DIR/public_html`
- `bldrwnsch`: hourly job running `updateBilderwuensche.sh`

```sh
toolforge components config create toolforge.yaml  # once, afterwards fetched from source_url
toolforge components deployment create
```

GitHub Actions (`.github/workflows/deploy.yml`) deploys after a successful Node CI run on `master`.
It requires the repository secret `TOOLS_DEPLOY_TOKEN` from `toolforge components deploy-token create`.

Dashboard: https://grafana.wmcloud.org/d/TJuKfnt4z/kubernetes-namespace?orgId=1&var-namespace=tool-bldrwnsch

## Data download

- https://bldrwnsch.toolforge.org/Bilderwuensche.gpx
- https://bldrwnsch.toolforge.org/Bilderwuensche.geojson
- https://bldrwnsch.toolforge.org/Bilderwuensche.kml
- https://bldrwnsch.toolforge.org/Bilderwuensche.kmz

## Author and License

- Author: [simon04](https://github.com/simon04)
- License: [GPL v3](https://github.com/simon04/bldrwnsch/blob/gh-pages/LICENSE)
