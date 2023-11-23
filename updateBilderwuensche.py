#!/usr/bin/env python3

import argparse
import configparser
import decimal
import os
import csv
from dataclasses import dataclass
import json
import logging
import math
import pathlib
import zipfile
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

    def to_kml(self):
        placemark = ET.Element("Placemark")
        ET.SubElement(placemark, "name").text = self.name
        ET.SubElement(placemark, "description").text = self.desc
        point = ET.SubElement(placemark, "Point")
        ET.SubElement(point, "coordinates").text = f"{self.lon},{self.lat}"
        return placemark

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

    def to_kml(self):
        kml = ET.Element(
            "kml",
            {"xmlns": "http://www.opengis.net/kml/2.2"},
        )
        document = ET.SubElement(kml, "Document")
        folder = ET.SubElement(document, "Folder")
        ET.SubElement(folder, "name").text = "Bilderwuensche"
        folder.extend(f.to_kml() for f in self.features if f.has_lat_lon())
        return kml

    @classmethod
    def parse_all(cls, fp: TextIO):
        logging.info("Reading %s", fp.name)
        features = [
            BilderwunschFeature.parse_row(row)
            for row in csv.DictReader(fp, delimiter="\t")
        ]
        return BilderwunschFeatures(features)


def convert():
    with open("Bilderwuensche.tsv", encoding="utf-8") as fp:
        features = BilderwunschFeatures.parse_all(fp)

    with open("Bilderwuensche.json", "w", encoding="utf-8") as fp:
        logging.info("Writing %s", fp.name)
        json.dump(features.features, fp=fp, default=lambda o: o.__dict__)

    with open("Bilderwuensche.geojson", "w", encoding="utf-8") as fp:
        geojson = features.to_geojson()
        logging.info("Writing %s", fp.name)
        json.dump(geojson, fp=fp, default=lambda o: o.__dict__)

    with open("Bilderwuensche.gpx", "wb") as fp:
        gpx = features.to_gpx()
        logging.info("Writing %s", fp.name)
        ET.ElementTree(gpx).write(fp, encoding="utf-8")

    with open("Bilderwuensche.kml", "wb") as fp:
        kml = features.to_kml()
        logging.info("Writing %s", fp.name)
        ET.ElementTree(kml).write(fp, encoding="utf-8")

    with zipfile.ZipFile("Bilderwuensche.kmz", "w") as zip:
        logging.info("Writing %s", zip.filename)
        zip.write("Bilderwuensche.kml", arcname="doc.kml")


def query():
    import pymysql

    sql = pathlib.Path(__file__).with_name("updateBilderwuensche.sql").read_text()
    with pathlib.Path.home().joinpath("replica.my.cnf").open(encoding="utf-8") as fp:
        logging.info("Reading %s", fp.name)
        config = configparser.ConfigParser()
        config.read_file(fp)
    with pymysql.connect(
        host="dewiki.analytics.db.svc.wikimedia.cloud",
        database="dewiki_p",
        user=config.get("client", "user"),
        password=config.get("client", "password"),
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            with pathlib.Path("Bilderwuensche.tsv").open("wb") as fp:
                logging.info("Writing %s to %s", cursor, fp.name)
                fp.write(b"page_title\tpl_title\tgt_lat\tgt_lon\n")
                for row in cursor:
                    for cell in row:
                        if isinstance(cell, decimal.Decimal):
                            cell = str(cell)
                        if isinstance(cell, str):
                            cell = cell.encode()
                        fp.write(cell or b"NULL")
                        fp.write(b"\t")
                    fp.write(b"\n")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] {%(module)s:%(lineno)d} %(levelname)s - %(message)s",
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", action="store_true")
    parser.add_argument("--convert", action="store_true")
    args = parser.parse_args()
    if args.query:
        query()
    if args.convert:
        convert()
