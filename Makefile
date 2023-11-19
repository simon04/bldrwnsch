TIPPECANOE = tippecanoe

all: Bilderwuensche.tsv Bilderwuensche.json Bilderwuensche.json.gz Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz Bilderwuensche.pmtiles Bilderwuensche.tiles
	@date -Is
	@echo 'Done :-)'

install: Bilderwuensche.tsv Bilderwuensche.json Bilderwuensche.json.gz Bilderwuensche.geojson Bilderwuensche.geojson.gz Bilderwuensche.gpx Bilderwuensche.gpx.gz Bilderwuensche.kml Bilderwuensche.kmz Bilderwuensche.pmtiles Bilderwuensche.pmtiles.gz Bilderwuensche.tiles
	cp --force --recursive --preserve=all $^ $(DESTDIR)
	rsync --archive --delete Bilderwuensche.tiles/ $(DESTDIR)/Bilderwuensche.tiles/

clean:
	rm --force --recursive Bilderwuensche.*

download:
	curl --fail --silent --remote-name-all https://bldrwnsch.toolforge.org/Bilderwuensche.gpx https://bldrwnsch.toolforge.org/Bilderwuensche.geojson https://bldrwnsch.toolforge.org/Bilderwuensche.kml https://bldrwnsch.toolforge.org/Bilderwuensche.kmz https://bldrwnsch.toolforge.org/Bilderwuensche.pmtiles

.PHONY: all install clean download

Bilderwuensche.tsv:
	@date -Is
	cat updateBilderwuensche.sql | sql dewiki > $@

Bilderwuensche.geojson: Bilderwuensche.tsv Makefile updateBilderwuensche.py
	@date -Is
	python3 updateBilderwuensche.py >/dev/null

Bilderwuensche.json: Bilderwuensche.geojson Makefile

Bilderwuensche.gpx: Bilderwuensche.geojson Makefile

Bilderwuensche.pmtiles: Bilderwuensche.geojson Makefile
	@date -Is
	$(TIPPECANOE) --no-progress-indicator --force --layer=Bilderwuensche --maximum-zoom=10 --no-tile-compression --output=$@ $<

Bilderwuensche.tiles: Bilderwuensche.geojson Makefile
	@date -Is
	$(TIPPECANOE) --no-progress-indicator --output-to-directory=$@ --force --layer=Bilderwuensche --maximum-zoom=10 --no-tile-compression $<

Bilderwuensche.kml: Bilderwuensche.geojson Makefile

Bilderwuensche.kmz: Bilderwuensche.geojson Makefile

%.gz: % Makefile
	gzip --force --keep $<
