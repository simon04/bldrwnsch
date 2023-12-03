#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

DESTDIR=/data/project/bldrwnsch/public_html/
TIPPECANOE=/data/project/bldrwnsch/tippecanoe/tippecanoe
SENTRY_INGEST="https://o323093.ingest.sentry.io"
SENTRY_CRONS="${SENTRY_INGEST}/api/4504539612512256/cron/updatebilderwuensche/b45aa928c00e436ba6040e111f966ccb/"

curl -sS --max-time 3 "${SENTRY_CRONS}?status=in_progress"

# toolforge envvars list
MYSQL_USER=$TOOL_REPLICA_USER MYSQL_PASSWORD=$TOOL_REPLICA_PASSWORD MYSQL_HOST=dewiki.analytics.db.svc.wikimedia.cloud MYSQL_DATABASE=dewiki_p ./updateBilderwuensche

echo $(date -Is) Building Bilderwuensche.tiles
$TIPPECANOE --no-progress-indicator --output-to-directory=Bilderwuensche.tiles --force --layer=Bilderwuensche --maximum-zoom=10 --no-tile-compression Bilderwuensche.geojson
echo $(date -Is) Building Bilderwuensche.pmtiles
$TIPPECANOE --no-progress-indicator --force --layer=Bilderwuensche --maximum-zoom=10 --no-tile-compression --output=Bilderwuensche.pmtiles Bilderwuensche.geojson
gzip --force --keep Bilderwuensche.pmtiles

echo $(date -Is) Copying Bilderwuensche to $DESTDIR
cp --force --recursive --preserve=all Bilderwuensche.tsv Bilderwuensche.json Bilderwuensche.json.gz Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz Bilderwuensche.pmtiles Bilderwuensche.pmtiles.gz $DESTDIR
rm -rf $DESTDIR/Bilderwuensche.tiles/
mv Bilderwuensche.tiles/ $DESTDIR/Bilderwuensche.tiles/

curl -sS --max-time 3 "${SENTRY_CRONS}?status=ok"
curl -sS --max-time 3 "https://hc-ping.com/ab41e9ba-b103-40ae-85ed-842ceae93a4f"
