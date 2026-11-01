// Serves the frontend (dist/) and the generated Bilderwuensche.* data files
// (from $TOOL_DATA_DIR/public_html) on Toolforge.
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
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

	http.Handle("/healthz", &healthz{file: filepath.Join(dataDir, "Bilderwuensche.geojson")})
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

// healthz responds in the application/health+json format (draft-inadarei-api-health-check),
// reporting the age and number of features of the GeoJSON file written by the job.
// It always responds with 200 OK (used by the Toolforge health check), a missing file is a "warn".
type healthz struct {
	file     string
	mu       sync.Mutex
	modTime  time.Time
	features int
	err      error
}

type healthCheck struct {
	ComponentType string    `json:"componentType"`
	ObservedValue any       `json:"observedValue"`
	ObservedUnit  string    `json:"observedUnit,omitempty"`
	Status        string    `json:"status"`
	Time          time.Time `json:"time"`
}

type healthResponse struct {
	Status string                   `json:"status"`
	Output string                   `json:"output,omitempty"`
	Checks map[string][]healthCheck `json:"checks,omitempty"`
}

func (h *healthz) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	resp := healthResponse{Status: "pass"}
	name := filepath.Base(h.file)
	if info, err := os.Stat(h.file); err != nil {
		resp.Status, resp.Output = "warn", err.Error()
	} else if features, err := h.countFeatures(info.ModTime()); err != nil {
		resp.Status, resp.Output = "warn", err.Error()
	} else {
		modTime, now := info.ModTime().UTC(), time.Now().UTC()
		resp.Checks = map[string][]healthCheck{
			name + ":age": {{
				ComponentType: "component",
				ObservedValue: int(now.Sub(modTime).Seconds()),
				ObservedUnit:  "s",
				Status:        "pass",
				Time:          now.Truncate(time.Second),
			}},
			name + ":features": {{
				ComponentType: "component",
				ObservedValue: features,
				Status:        "pass",
				Time:          modTime.Truncate(time.Second),
			}},
		}
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/health+json")
	json.NewEncoder(w).Encode(resp)
}

// countFeatures counts the features of h.file, cached (including errors) by modification time.
func (h *healthz) countFeatures(modTime time.Time) (int, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if !modTime.Equal(h.modTime) {
		h.features, h.err = countLines(h.file, []byte(`{"type":"Feature",`))
		h.modTime = modTime
	}
	return h.features, h.err
}

// countLines counts the lines of file starting with prefix (one GeoJSON feature per line).
func countLines(file string, prefix []byte) (int, error) {
	f, err := os.Open(file)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	n := 0
	scanner := bufio.NewScanner(f)
	scanner.Buffer(nil, 1<<20)
	for scanner.Scan() {
		if bytes.HasPrefix(scanner.Bytes(), prefix) {
			n++
		}
	}
	return n, scanner.Err()
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
