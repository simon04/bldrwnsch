// Extracts all Bilderwünsche, converts them to GeoJSON/GPX/KML and vector tiles,
// and publishes the results to $DATA_DIR. Configured via environment variables,
// see README.md.
package main

import (
	"archive/zip"
	"compress/gzip"
	_ "embed"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/simon04/bldrwnsch/bldrwnsch"
)

//go:embed updateBilderwuensche.sql
var defaultQuery string

const defaultTippecanoeArgs = "--no-progress-indicator --force --layer=Bilderwuensche --maximum-zoom=10 --no-tile-compression"

const defaultHealthcheckURL = "https://hc-ping.com/ab41e9ba-b103-40ae-85ed-842ceae93a4f"

// files published to $DATA_DIR (in addition to the Bilderwuensche.tiles directory)
var publishedFiles = []string{
	"Bilderwuensche.geojson",
	"Bilderwuensche.geojson.gz",
	"Bilderwuensche.gpx",
	"Bilderwuensche.gpx.gz",
	"Bilderwuensche.kml",
	"Bilderwuensche.kmz",
	"Bilderwuensche.pmtiles",
	"Bilderwuensche.pmtiles.gz",
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

type config struct {
	dataDir        string
	workDir        string
	query          string
	tsvFile        string
	mysql          *mysql.Config
	tippecanoe     string
	tippecanoeArgs []string
	healthcheckURL string
	skip           []string
}

func loadConfig() (*config, error) {
	c := &config{
		dataDir:        getenv("DATA_DIR", filepath.Join(getenv("TOOL_DATA_DIR", "/data/project/bldrwnsch"), "public_html")),
		workDir:        os.Getenv("WORK_DIR"),
		query:          defaultQuery,
		tippecanoe:     getenv("TIPPECANOE", "tippecanoe"),
		tippecanoeArgs: strings.Fields(getenv("TIPPECANOE_ARGS", defaultTippecanoeArgs)),
		healthcheckURL: defaultHealthcheckURL,
		skip:           strings.Split(os.Getenv("SKIP"), ","),
	}
	if v, ok := os.LookupEnv("HEALTHCHECK_URL"); ok {
		c.healthcheckURL = v // empty disables the healthcheck
	}
	if f := os.Getenv("SQL_FILE"); f != "" {
		query, err := os.ReadFile(f)
		if err != nil {
			return nil, err
		}
		c.query = string(query)
	}
	// resolve relative paths before changing to the work directory
	var err error
	if c.dataDir, err = filepath.Abs(c.dataDir); err != nil {
		return nil, err
	}
	if c.tsvFile, err = filepath.Abs(getenv("TSV_FILE", "Bilderwuensche.tsv")); err != nil {
		return nil, err
	}
	if user := getenv("MYSQL_USER", os.Getenv("TOOL_REPLICA_USER")); user != "" {
		c.mysql = mysql.NewConfig()
		c.mysql.User = user
		c.mysql.Passwd = getenv("MYSQL_PASSWORD", os.Getenv("TOOL_REPLICA_PASSWORD"))
		c.mysql.Net = "tcp"
		c.mysql.Addr = getenv("MYSQL_HOST", "dewiki.analytics.db.svc.wikimedia.cloud") + ":3306"
		c.mysql.DBName = getenv("MYSQL_DATABASE", "dewiki_p")
	}
	return c, nil
}

func (c *config) skipped(step string) bool {
	if slices.Contains(c.skip, step) {
		log.Printf("Skipping %s", step)
		return true
	}
	return false
}

func main() {
	c, err := loadConfig()
	if err != nil {
		log.Fatal(err)
	}
	if err := run(c); err != nil {
		log.Fatal(err)
	}
}

func run(c *config) error {
	if c.workDir == "" {
		workDir, err := os.MkdirTemp("", "bldrwnsch-")
		if err != nil {
			return err
		}
		defer os.RemoveAll(workDir)
		c.workDir = workDir
	} else if err := os.MkdirAll(c.workDir, 0o755); err != nil {
		return err
	}
	if err := os.Chdir(c.workDir); err != nil {
		return err
	}
	log.Printf("Working in %s", c.workDir)

	extract(c)
	gzipFile("Bilderwuensche.geojson", "Bilderwuensche.geojson.gz")
	gzipFile("Bilderwuensche.gpx", "Bilderwuensche.gpx.gz")
	zipFile("Bilderwuensche.kml", "doc.kml", "Bilderwuensche.kmz")

	if !c.skipped("tiles") {
		if err := c.runTippecanoe("--output-to-directory=Bilderwuensche.tiles"); err != nil {
			return err
		}
	}
	if !c.skipped("pmtiles") {
		if err := c.runTippecanoe("--output=Bilderwuensche.pmtiles"); err != nil {
			return err
		}
		gzipFile("Bilderwuensche.pmtiles", "Bilderwuensche.pmtiles.gz")
	}
	if !c.skipped("publish") {
		if err := c.publish(); err != nil {
			return err
		}
	}
	if !c.skipped("healthcheck") && c.healthcheckURL != "" {
		pingHealthcheck(c.healthcheckURL)
	}
	return nil
}

func extract(c *config) {
	var wg sync.WaitGroup

	channelGeoJSON := make(chan bldrwnsch.Bilderwunsch, 10)
	channelGPX := make(chan bldrwnsch.Bilderwunsch, 10)
	channelKML := make(chan bldrwnsch.Bilderwunsch, 10)
	channels := []chan bldrwnsch.Bilderwunsch{channelGeoJSON, channelGPX, channelKML}
	wg.Add(3)

	if c.mysql != nil {
		db := bldrwnsch.OpenDB(c.mysql.FormatDSN())
		defer db.CloseDB()
		go db.SelectBilderwuensche(c.query, channels)
	} else {
		go bldrwnsch.ReadCsvFile(c.tsvFile, channels)
	}
	go bldrwnsch.ConsumeFeatureAsGeoJSON("Bilderwuensche.geojson", channelGeoJSON, &wg)
	go bldrwnsch.ConsumeFeatureAsGPX("Bilderwuensche.gpx", channelGPX, &wg)
	go bldrwnsch.ConsumeFeatureAsKML("Bilderwuensche.kml", channelKML, &wg)

	wg.Wait()
}

func (c *config) runTippecanoe(output string) error {
	args := append(slices.Clone(c.tippecanoeArgs), output, "Bilderwuensche.geojson")
	log.Printf("Running %s %s", c.tippecanoe, strings.Join(args, " "))
	cmd := exec.Command(c.tippecanoe, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s %s: %w", c.tippecanoe, output, err)
	}
	return nil
}

// publish copies the results to c.dataDir, replacing each file and the tiles directory atomically.
func (c *config) publish() error {
	log.Printf("Copying Bilderwuensche to %s", c.dataDir)
	if err := os.MkdirAll(c.dataDir, 0o755); err != nil {
		return err
	}
	for _, name := range publishedFiles {
		if _, err := os.Stat(name); os.IsNotExist(err) {
			log.Printf("Not publishing missing %s", name)
			continue
		}
		dest := filepath.Join(c.dataDir, name)
		if err := copyFile(name, dest+".new"); err != nil {
			return err
		}
		if err := os.Rename(dest+".new", dest); err != nil {
			return err
		}
	}

	if _, err := os.Stat("Bilderwuensche.tiles"); os.IsNotExist(err) {
		return nil
	}
	dest := filepath.Join(c.dataDir, "Bilderwuensche.tiles")
	if err := os.RemoveAll(dest + ".new"); err != nil {
		return err
	}
	if err := os.CopyFS(dest+".new", os.DirFS("Bilderwuensche.tiles")); err != nil {
		return err
	}
	if err := os.RemoveAll(dest + ".old"); err != nil {
		return err
	}
	if err := os.Rename(dest, dest+".old"); err != nil && !os.IsNotExist(err) {
		return err
	}
	if err := os.Rename(dest+".new", dest); err != nil {
		return err
	}
	return os.RemoveAll(dest + ".old")
}

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	if err := out.Close(); err != nil {
		return err
	}
	if info, err := in.Stat(); err == nil {
		return os.Chtimes(dest, info.ModTime(), info.ModTime())
	}
	return nil
}

// pingHealthcheck notifies the healthcheck; failures are logged and do not fail the job.
func pingHealthcheck(url string) {
	client := http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		log.Printf("Healthcheck failed: %v", err)
		return
	}
	resp.Body.Close()
	log.Printf("Healthcheck: %s", resp.Status)
}

func gzipFile(inputFilePath, outputFilePath string) {
	inputFile, err := os.Open(inputFilePath)
	if err != nil {
		panic(err)
	}
	defer inputFile.Close()

	outputFile, err := os.Create(outputFilePath)
	if err != nil {
		panic(err)
	}
	defer outputFile.Close()

	gzipWriter := gzip.NewWriter(outputFile)
	defer gzipWriter.Close()

	_, err = io.Copy(gzipWriter, inputFile)
	if err != nil {
		panic(err)
	}
	log.Printf("Written %s", outputFilePath)
}

func zipFile(inputFilePath, entryName, outputFilePath string) {
	inputFile, err := os.Open(inputFilePath)
	if err != nil {
		panic(err)
	}
	defer inputFile.Close()

	outputFile, err := os.Create(outputFilePath)
	if err != nil {
		panic(err)
	}
	defer outputFile.Close()

	zipWriter := zip.NewWriter(outputFile)
	defer zipWriter.Close()

	entryWriter, err := zipWriter.CreateHeader(&zip.FileHeader{
		Name:   entryName,
		Method: zip.Deflate,
	})
	if err != nil {
		panic(err)
	}

	_, err = io.Copy(entryWriter, inputFile)
	if err != nil {
		panic(err)
	}
	log.Printf("Written %s", outputFilePath)
}
