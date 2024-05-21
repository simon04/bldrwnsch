package bldrwnsch

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"math"
	"os"
	"strconv"
	"strings"
)

type Bilderwunsch struct {
	title       string
	description string
	name        string
	location    string
	lat         float64
	lon         float64
}

func parseFeature(record []string) Bilderwunsch {
	feature := Bilderwunsch{
		title: record[0],
		lat:   math.NaN(),
		lon:   math.NaN(),
	}
	lt_title := record[1]
	gt_lat := record[2]
	gt_lon := record[3]

	if gt_lat != "" && gt_lat != "NULL" {
		feature.lat, _ = strconv.ParseFloat(gt_lat, 64)
	}

	if gt_lon != "" && gt_lon != "NULL" {
		feature.lon, _ = strconv.ParseFloat(gt_lon, 64)
	}

	feature.parseCode(lt_title)
	return feature
}

func (f *Bilderwunsch) parseCode(lt_title string) {
	for _, code := range strings.Split(lt_title, "!/") {
		if strings.HasPrefix(code, "O:") {
			f.location = code[2:]
		} else if strings.HasPrefix(code, "D:") {
			f.description = code[2:]
		} else if strings.HasPrefix(code, "C:") && strings.Contains(code, ",") {
			gt_lat, gt_lon, _ := strings.Cut(code[2:], ",")
			f.lat, _ = strconv.ParseFloat(gt_lat, 64)
			f.lon, _ = strconv.ParseFloat(gt_lon, 64)
		}
	}
	f.name = f.title
	if f.title != "" && f.location != "" && f.title != f.location {
		f.name = fmt.Sprintf("%s / %s", f.title, f.description)
	}
}

func ReadCsvFile(filePath string, channels []chan Bilderwunsch) {
	f, err := os.Open(filePath)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.Comma = '\t'
	r.FieldsPerRecord = 5
	r.LazyQuotes = true
	r.ReuseRecord = true
	_, _ = r.Read() // ignore header line
	log.Printf("Reading features from %s", filePath)
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("Skipping line [%s]: %v", record, err)
			continue
		}
		bldrwnsch := parseFeature(record)
		for _, ch := range channels {
			ch <- bldrwnsch
		}
	}

	for _, ch := range channels {
		close(ch)
	}
}
