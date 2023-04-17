#!/usr/bin/env python3

import csv
from dataclasses import dataclass
import json
import logging
import math
import sys
from typing import Dict, List, Optional, TextIO
import xml.etree.ElementTree as ET


@dataclass
class GeoJSONPoint:
    """A Geometry object represents points, curves, and surfaces in coordinate space.
    https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.2"""

    coordinates: List[float]
    type: str = "Point"


@dataclass
class GeoJSONFeature:
    """A Feature object represents a spatially bounded thing.
    https://datatracker.ietf.org/doc/html/rfc7946#section-3.2"""

    geometry: GeoJSONPoint
    properties: Dict
    type: str = "Feature"


@dataclass
class GeoJSONFeatureCollection:
    """A GeoJSON object with the type "FeatureCollection" is a FeatureCollection object.
    https://datatracker.ietf.org/doc/html/rfc7946#section-3.3"""

    features: List[GeoJSONFeature]
    type: str = "FeatureCollection"


@dataclass
class BilderwunschFeature:
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

    @property
    def name(self):
        if self.title and self.location and self.title != self.location:
            return f"{self.title} // {self.location}"
        else:
            return self.title

    @property
    def desc(self):
        return f"{self.description or ''} // {self.location or ''}"

    def to_geojson(self):
        return GeoJSONFeature(
            geometry=GeoJSONPoint(coordinates=[self.lon, self.lat]),
            properties={
                "name": self.name,
                "title": self.title,
                "description": self.description,
                "location": self.location,
            },
        )

    def to_gpx(self):
        wpt = ET.Element("wpt", lat=str(self.lat), lon=str(self.lon))
        ET.SubElement(wpt, "name").text = self.name
        ET.SubElement(wpt, "desc").text = self.desc
        return wpt

    def has_lat_lon(self):
        return (
            self.lat is not None
            and self.lon is not None
            and math.isfinite(self.lat)
            and math.isfinite(self.lon)
        )

    @classmethod
    def parse_row(cls, row: str):
        title = row["page_title"]
        feature = BilderwunschFeature(title=title)
        if row["gt_lat"] != "NULL" and row["gt_lon"] != "NULL":
            feature.lat = float(row["gt_lat"])
            feature.lon = float(row["gt_lon"])
        for code in row["pl_title"].split("!/"):
            if code.startswith("O:"):
                feature.location = code[2:]
            elif code.startswith("D:"):
                feature.description = code[2:]
            elif code.startswith("C:") and "," in code[2:]:
                try:
                    [feature.lat, feature.lon] = [
                        float(s) for s in code[2:].split(",", maxsplit=1)
                    ]
                except ValueError:
                    logging.warning("Failed to parse lat/lon from [%s]", code)
            elif code in ["Bilderwunsch/code", "guter_Parameter", "…"]:
                continue
            elif code:
                logging.warning("Skipping [%s]", code)
        return feature


@dataclass
class BilderwunschFeatures:
    features: List[BilderwunschFeature]

    def to_geojson(self):
        return GeoJSONFeatureCollection(
            features=[f.to_geojson() for f in self.features if f.has_lat_lon()]
        )

    def to_gpx(self):
        gpx = ET.Element(
            "gpx",
            {
                "version": "1.1",
                "creator": "@simon04/bldrwnsch",
                "xmlns": "http://www.topografix.com/GPX/1/1",
            },
        )
        gpx.extend(f.to_gpx() for f in self.features if f.has_lat_lon())
        return gpx

    @classmethod
    def parse_all(cls, fp: TextIO):
        logging.info("Reading %s", fp.name)
        features = [
            BilderwunschFeature.parse_row(row)
            for row in csv.DictReader(fp, delimiter="\t")
        ]
        return BilderwunschFeatures(features)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] {%(module)s:%(lineno)d} %(levelname)s - %(message)s",
    )

    features = BilderwunschFeatures.parse_all(sys.stdin)
    with open("Bilderwuensche.json", "w") as fp:
        logging.info("Writing %s", fp.name)
        json.dump(features.features, fp=fp, default=lambda o: o.__dict__)

    geojson = features.to_geojson()
    with open("Bilderwuensche.geojson", "w") as fp:
        logging.info("Writing %s", fp.name)
        json.dump(geojson, fp=fp, default=lambda o: o.__dict__)

    gpx = features.to_gpx()
    with open("Bilderwuensche.gpx", "wb") as fp:
        logging.info("Writing %s", fp.name)
        ET.ElementTree(gpx).write(fp)
