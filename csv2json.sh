#!/bin/sh
jq --raw-input --slurp --from-file csv2json.jq --compact-output
