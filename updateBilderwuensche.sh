#!/usr/bin/env bash

set -Eeuo pipefail

SRCDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESTDIR="${TOOL_DATA_DIR:-/data/project/bldrwnsch}/public_html"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
cd "$WORKDIR"
cp "$SRCDIR/updateBilderwuensche.sql" .

# binary built by the Go buildpack (root package of github.com/simon04/bldrwnsch)
UPDATE_BILDERWUENSCHE="$(command -v bldrwnsch || echo "$SRCDIR/updateBilderwuensche")"

# toolforge envvars list
MYSQL_USER=$TOOL_REPLICA_USER MYSQL_PASSWORD=$TOOL_REPLICA_PASSWORD MYSQL_HOST=dewiki.analytics.db.svc.wikimedia.cloud MYSQL_DATABASE=dewiki_p "$UPDATE_BILDERWUENSCHE"

echo $(date -Is) Building Bilderwuensche.tiles
tippecanoe --no-progress-indicator --output-to-directory=Bilderwuensche.tiles --force --layer=Bilderwuensche --maximum-zoom=10 --no-tile-compression Bilderwuensche.geojson
echo $(date -Is) Building Bilderwuensche.pmtiles
tippecanoe --no-progress-indicator --force --layer=Bilderwuensche --maximum-zoom=10 --no-tile-compression --output=Bilderwuensche.pmtiles Bilderwuensche.geojson
gzip --force --keep Bilderwuensche.pmtiles

echo $(date -Is) Copying Bilderwuensche to $DESTDIR
mkdir -p "$DESTDIR"
cp --force --recursive --preserve=all Bilderwuensche.tsv Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz Bilderwuensche.pmtiles Bilderwuensche.pmtiles.gz "$DESTDIR"
rm -rf "$DESTDIR/Bilderwuensche.tiles.new/"
cp --recursive Bilderwuensche.tiles/ "$DESTDIR/Bilderwuensche.tiles.new/"
rm -rf "$DESTDIR/Bilderwuensche.tiles/"
mv "$DESTDIR/Bilderwuensche.tiles.new/" "$DESTDIR/Bilderwuensche.tiles/"

curl -sS --max-time 3 "https://hc-ping.com/ab41e9ba-b103-40ae-85ed-842ceae93a4f"
