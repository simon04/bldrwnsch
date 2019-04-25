all: Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz

install: Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz
	cp --force --preserve=all $^ $(DESTDIR)

clean:
	rm --force Bilderwuensche.*

.PHONY: all install clean

Bilderwuensche.tsv:
	echo "SELECT page.page_title, pagelinks.pl_title FROM pagelinks JOIN page ON pagelinks.pl_from = page.page_id WHERE pagelinks.pl_title LIKE 'Bilderwunsch/code%';" | sql dewiki > $@

Bilderwuensche.geojson: Bilderwuensche.tsv Makefile updateBilderwuensche.js
	node updateBilderwuensche.js < $< >/dev/null

Bilderwuensche.json: Bilderwuensche.geojson Makefile

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
