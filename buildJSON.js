#!/usr/bin/env node

const readline = require('readline');

var rd = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  console: false
});

const features = [];
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
    features.push(feature);
  }
});

rd.on('close', () => {
  console.log(features);
});
