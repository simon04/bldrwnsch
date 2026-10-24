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

## How it works

### Vorlage:Bilderwunsch

Authors place [{{Bilderwunsch}}](https://de.wikipedia.org/wiki/Vorlage:Bilderwunsch) in an article to request an image:

```wikitext
{{Bilderwunsch|hier|Ansicht von Süden}}
{{Bilderwunsch|Koordinaten|Kirchturm|Breitengrad=48.2085|Längengrad=16.3731}}
{{Bilderwunsch|Stephansdom|Nordturm}}
{{Bilderwunsch|egal|Porträt}}
```

The first parameter determines the location:

- `hier`: the subject of the article itself (location = page name)
- `Koordinaten`: the given `Breitengrad`/`Längengrad`
- any other value: the named page (location = that page name)
- `egal`: no specific location

The second parameter is the motif (description).

### Encoding

Since template parameters are not queryable from the database replicas, the template encodes them into a hidden wikilink.
[Vorlage:Bilderwunsch/encode](https://de.wikipedia.org/wiki/Vorlage:Bilderwunsch/encode) (only in namespaces 0 and 1, only for location-bound requests) emits

```wikitext
<span style="display:none">[[Vorlage:Bilderwunsch/code!/O:…!/C:lat,lon!/D:…!/|BW]]</span>
```

where the link target is built by [Vorlage:Bilderwunsch/link](https://de.wikipedia.org/wiki/Vorlage:Bilderwunsch/link) from `!/`-separated fields:

- `O:` location (page name, without anchor)
- `C:` coordinates as decimal `lat,lon` (`0,0` if invalid)
- `D:` description, with wikilinks reduced to plain text and external link targets appended in parentheses; tabs and line feeds replaced by spaces

The encoded link must stay short enough to be a valid page title (the template reports an error above 263 characters).
Additionally, the template adds the page to [Kategorie:Wikipedia:Bilderwunsch an bestimmtem Ort](https://de.wikipedia.org/wiki/Kategorie:Wikipedia:Bilderwunsch_an_bestimmtem_Ort) (or `… an beliebigem Ort` for `egal`).

Example: `{{Bilderwunsch|Koordinaten|Kirchturm|Breitengrad=48.2085|Längengrad=16.3731}}` on page `Wien` yields the link target `Vorlage:Bilderwunsch/code!/C:48.2085,16.3731!/D:Kirchturm!/`.

### Extraction

[`updateBilderwuensche.sql`](updateBilderwuensche.sql) queries the `dewiki_p` replica for all pages in a category `Wikipedia:Bilderwunsch*` and their `pagelinks` to `Bilderwunsch/code*` targets, together with the page's primary coordinates from `geo_tags` (if any).
Each row (`page_title`, `lt_title`, `gt_lat`, `gt_lon`) becomes one image request.

[`bldrwnsch/bilderwunsch.go`](bldrwnsch/bilderwunsch.go) decodes `lt_title` by splitting at `!/` and reading the `O:`, `D:` and `C:` fields.
Coordinates from `C:` take precedence over the page's coordinates.
Each request is written to GeoJSON, GPX and KML (with properties `name`, `title`, `description`, `location`), which `tippecanoe` converts to vector tiles and PMTiles for the map.

Without `MYSQL_USER` set, `updateBilderwuensche` reads the rows from a local `Bilderwuensche.tsv` instead.

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
