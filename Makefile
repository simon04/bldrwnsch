TIPPECANOE = tippecanoe

all: Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz Bilderwuensche.tiles

install: Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz Bilderwuensche.tiles
	cp --force --recursive --preserve=all $^ $(DESTDIR)

clean:
	rm --force --recursive Bilderwuensche.*

.PHONY: all install clean

Bilderwuensche.tsv:
	echo "SELECT page.page_title, pagelinks.pl_title FROM pagelinks JOIN page ON pagelinks.pl_from = page.page_id WHERE pagelinks.pl_title LIKE 'Bilderwunsch/code%';" | sql dewiki > $@

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
