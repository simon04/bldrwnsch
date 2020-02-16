TIPPECANOE = tippecanoe

all: Bilderwuensche.tsv Bilderwuensche.json Bilderwuensche.json.gz Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz Bilderwuensche.tiles

install: Bilderwuensche.tsv Bilderwuensche.json Bilderwuensche.json.gz Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz Bilderwuensche.tiles
	cp --force --recursive --preserve=all $^ $(DESTDIR)

clean:
	rm --force --recursive Bilderwuensche.*

.PHONY: all install clean

Bilderwuensche.tsv:
	cat updateBilderwuensche.sql | sql dewiki > $@

Bilderwuensche.geojson: Bilderwuensche.tsv Makefile updateBilderwuensche.js
	node updateBilderwuensche.js < $< >/dev/null

Bilderwuensche.json: Bilderwuensche.geojson Makefile

Bilderwuensche.tiles: Bilderwuensche.geojson Makefile
	$(TIPPECANOE) --no-progress-indicator --output-to-directory=$@ --force --layer=Bilderwuensche --maximum-zoom=10 --no-tile-compression $<

%.gpx: %.geojson Makefile
	ogr2ogr -f GPX -dsco GPX_USE_EXTENSIONS=YES $@ $<

%.kml: %.geojson Makefile
	ogr2ogr -f KML $@ $<

%.kmz: %.kml Makefile
	cp --link --force $< doc.kml
	zip $@ doc.kml
	rm doc.kml

%.gz: % Makefile
	gzip --force --keep $<
