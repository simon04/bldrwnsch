#!/bin/sh
# Updates Bilderwuensche.json.gz by fetching Bilderwuensche.csv, converting to JSON and gzipping
cd "$(dirname $0)"
curl --silent https://tools.wmflabs.org/request/bwAPI/export/Bilderwuensche.csv \
  | jq --raw-input --slurp --from-file csv2json.jq --compact-output \
  | gzip > Bilderwuensche.json.gz
