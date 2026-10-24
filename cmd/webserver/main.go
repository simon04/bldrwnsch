// Serves the frontend (dist/) and the generated Bilderwuensche.* data files
// (from $TOOL_DATA_DIR/public_html) on Toolforge.
package main

import (
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

func init() {
	mime.AddExtensionType(".geojson", "application/geo+json")
	mime.AddExtensionType(".gpx", "application/gpx+xml")
	mime.AddExtensionType(".kml", "application/vnd.google-earth.kml+xml")
	mime.AddExtensionType(".kmz", "application/vnd.google-earth.kmz")
	mime.AddExtensionType(".pbf", "application/x-protobuf")
	mime.AddExtensionType(".pmtiles", "application/octet-stream")
	mime.AddExtensionType(".tsv", "text/tab-separated-values; charset=utf-8")
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	port := getenv("PORT", "8000")
	distDir := getenv("DIST_DIR", "dist")
	dataDir := getenv("DATA_DIR", filepath.Join(os.Getenv("TOOL_DATA_DIR"), "public_html"))

	dist := http.FileServer(http.Dir(distDir))
	data := http.FileServer(http.Dir(dataDir))

	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		name := path.Clean(r.URL.Path)
		if _, err := os.Stat(filepath.Join(distDir, filepath.FromSlash(name))); err == nil {
			dist.ServeHTTP(w, r)
			return
		}
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", "*")
		h.Set("Cache-Control", "max-age=3600, public")
		if base, ok := strings.CutSuffix(name, ".gz"); ok {
			h.Set("Content-Encoding", "gzip")
			if t := mime.TypeByExtension(path.Ext(base)); t != "" {
				h.Set("Content-Type", t)
			}
		}
		data.ServeHTTP(w, r)
	})

	log.Printf("Serving %s and %s on :%s", distDir, dataDir, port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
