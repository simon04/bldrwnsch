#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs');
const readline = require('readline');

var rd = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  console: false
});

const geojson = {
  type: 'FeatureCollection',
  features: []
};
const json = [];
rd.on('line', line => {
  if (line === 'page_title	pl_title') {
    return;
  }
  const [title, data] = line.split('\tBilderwunsch/code');
  const feature = {title};
  data.split('!/').forEach(part => {
    // https://de.wikipedia.org/w/index.php?title=Vorlage:Bilderwunsch/link&action=edit
    let match;
    if ((match = part.match(/O:(.*)/))) {
      feature.location = match[1];
    } else if ((match = part.match(/C:([+-]?[0-9.]+),([+-]?[0-9.]+)/))) {
      feature.lat = parseFloat(match[1]);
      feature.lon = parseFloat(match[2]);
    } else if ((match = part.match(/D:(.*)/))) {
      feature.description = match[1];
    } else if (part) {
      console.warn(`Skipping [${part}]`);
    }
  });
  if (feature.lat !== undefined && feature.lon !== undefined) {
    json.push(feature);
    geojson.features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [feature.lon, feature.lat]
      },
      properties: {
        name: [feature.title, feature.location].filter(s => !!s).join(' // '),
        title: feature.title,
        location: feature.location,
        description: feature.description
      }
    });
  }
});

rd.on('close', () => {
  fs.writeFileSync('Bilderwuensche.json', JSON.stringify(json));
  fs.writeFileSync('Bilderwuensche.geojson', JSON.stringify(geojson));
});
