package main

import (
	"archive/zip"
	"compress/gzip"
	"io"
	"log"
	"os"
	"sync"

	"github.com/simon04/bldrwnsch/bldrwnsch"
)

func main() {
	var wg sync.WaitGroup

	channelGeoJSON := make(chan bldrwnsch.Bilderwunsch, 10)
	channelGPX := make(chan bldrwnsch.Bilderwunsch, 10)
	channelKML := make(chan bldrwnsch.Bilderwunsch, 10)
	channels := []chan bldrwnsch.Bilderwunsch{channelGeoJSON, channelGPX, channelKML}
	wg.Add(1)
	wg.Add(1)
	wg.Add(1)

	if u, _ := os.LookupEnv("MYSQL_USER"); u != "" {
		db := bldrwnsch.OpenDB()
		go db.SelectBilderwuensche(channels)
	} else {
		go bldrwnsch.ReadCsvFile("Bilderwuensche.tsv", channels)
	}
	go bldrwnsch.ConsumeFeatureAsGeoJSON("Bilderwuensche.geojson", channelGeoJSON, &wg)
	go bldrwnsch.ConsumeFeatureAsGPX("Bilderwuensche.gpx", channelGPX, &wg)
	go bldrwnsch.ConsumeFeatureAsKML("Bilderwuensche.kml", channelKML, &wg)

	wg.Wait()

	gzipFile("Bilderwuensche.geojson", "Bilderwuensche.geojson.gz")
	gzipFile("Bilderwuensche.gpx", "Bilderwuensche.gpx.gz")
	zipFile("Bilderwuensche.kml", "doc.kml", "Bilderwuensche.kmz")

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
