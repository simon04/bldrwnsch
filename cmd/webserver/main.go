// Serves the frontend (dist/) and the generated Bilderwuensche.* data files
// (from $TOOL_DATA_DIR/public_html) on Toolforge.
package main

import (
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
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

	dist := precompressed(distDir)
	data := precompressed(dataDir)

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
		data.ServeHTTP(w, r)
	})

	log.Printf("Serving %s and %s on :%s", distDir, dataDir, port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// precompressed serves the files from root. For a requested file X, it serves X.zst or X.gz
// instead (with Content-Encoding and the Content-Type of X) if present and accepted by the client.
func precompressed(root string) http.Handler {
	fsys := os.DirFS(root)
	fileServer := http.FileServerFS(fsys)
	// sidecar files in order of preference, like Caddy's file_server precompressed
	encodings := []struct{ name, ext string }{
		{"zstd", ".zst"},
		{"gzip", ".gz"},
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if info, err := fs.Stat(fsys, name); err == nil && info.Mode().IsRegular() {
			// browsers and curl send e.g. "gzip, deflate, br, zstd", no need for parsing q-values
			accepted := r.Header.Get("Accept-Encoding")
			w.Header().Set("Vary", "Accept-Encoding")
			for _, enc := range encodings {
				sidecar, err := fs.Stat(fsys, name+enc.ext)
				if err != nil {
					continue
				}
				// byte ranges (e.g. PMTiles) refer to the uncompressed file
				if r.Header.Get("Range") != "" || !strings.Contains(accepted, enc.name) {
					continue
				}
				// otherwise ServeFileFS would use the type of the .zst/.gz extension
				ctype := mime.TypeByExtension(path.Ext(name))
				if ctype == "" {
					ctype = "application/octet-stream"
				}
				w.Header().Set("Content-Type", ctype)
				w.Header().Set("Content-Encoding", enc.name)
				// not set by ServeFileFS if Content-Encoding is set
				w.Header().Set("Content-Length", strconv.FormatInt(sidecar.Size(), 10))
				http.ServeFileFS(w, r, fsys, name+enc.ext)
				return
			}
		}
		fileServer.ServeHTTP(w, r)
	})
}
