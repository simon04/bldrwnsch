#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs');
const readline = require('readline');

const rd = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  console: false,
});

/**
 * @type {GeoJSON.FeatureCollection}
 */
const geojson = {
  type: 'FeatureCollection',
  features: [],
};
const json = [];
rd.on('line', (line) => {
  if (line.startsWith('page_title')) {
    return;
  }
  const [title, data, gt_lat, gt_lng] = line.split('\t');
  const feature = {title};
  if (gt_lat !== 'NULL' && gt_lng !== 'NULL') {
    feature.lat = parseFloat(gt_lat);
    feature.lon = parseFloat(gt_lng);
  }
  data.split('!/').forEach((part) => {
    // https://de.wikipedia.org/w/index.php?title=Vorlage:Bilderwunsch/link&action=edit
    let match;
    if ((match = part.match(/O:(.*)/))) {
      feature.location = match[1];
    } else if ((match = part.match(/C:([+-]?[0-9.]+),([+-]?[0-9.]+)/))) {
      feature.lat = parseFloat(match[1]);
      feature.lon = parseFloat(match[2]);
    } else if ((match = part.match(/D:(.*)/))) {
      feature.description = match[1];
    } else if (part && part !== 'Bilderwunsch/code' && part !== 'guter_Parameter' && part !== '…') {
      console.warn(`Skipping [${part}]`);
    }
  });
  if (feature.lat !== undefined && feature.lon !== undefined) {
    json.push(feature);
    geojson.features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [feature.lon, feature.lat],
      },
      properties: {
        name: [feature.title, feature.location].filter((s) => !!s).join(' // '),
        title: feature.title,
        location: feature.location,
        description: feature.description,
      },
    });
  }
});

rd.on('close', () => {
  fs.writeFileSync('Bilderwuensche.json', JSON.stringify(json));
  fs.writeFileSync('Bilderwuensche.geojson', JSON.stringify(geojson));
});
