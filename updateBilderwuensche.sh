#!/bin/sh
# Updates Bilderwuensche.json.gz by fetching Bilderwuensch/code pagelinks, converting to JSON and gzipping
set -e
cd "$(dirname "$0")"

echo "
select page.page_title, pagelinks.pl_title
from pagelinks
join page on pagelinks.pl_from = page.page_id
where pagelinks.pl_title like 'Bilderwunsch/code%';
" | sql dewiki > Bilderwuensche.tsv

node updateBilderwuensche.js < Bilderwuensche.tsv >/dev/null
gzip --force --keep Bilderwuensche.json
gzip --force --keep Bilderwuensche.geojson

ogr2ogr -f GPX -overwrite -dsco GPX_USE_EXTENSIONS=YES Bilderwuensche.gpx Bilderwuensche.geojson
gzip --force --keep Bilderwuensche.gpx
