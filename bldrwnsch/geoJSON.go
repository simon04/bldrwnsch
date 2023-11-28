package bldrwnsch

import (
	"encoding/json"
	"log"
	"os"
	"sync"
)

func ConsumeFeatureAsGeoJSON(filePath string, ch <-chan Bilderwunsch, wg *sync.WaitGroup) {
	defer wg.Done()
	f, err := os.Create(filePath)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	i := 0
	f.Write([]byte(`{"type":"FeatureCollection","properties":{"creator":"@simon04/bldrwnsch"},"features": [` + "\n"))
	for bldrwnsch := range ch {
		if i > 0 {
			f.Write([]byte(",\n"))
		}
		feature := newFeature(bldrwnsch)
		bytes, _ := json.Marshal(feature)
		f.Write(bytes)
		i = i + 1
	}
	f.Write([]byte("]}\n"))
	log.Printf("Written %d features to %s", i, filePath)
}

func newFeature(feature Bilderwunsch) Feature {
	geojson := Feature{
		Type: "Feature",
		Geometry: Geometry{
			Type:        "Point",
			Coordinates: []float64{feature.lon, feature.lat},
		},
		Properties: Properties{
			Name:        feature.name,
			Title:       feature.title,
			Description: feature.description,
			Location:    feature.location,
		},
	}
	return geojson
}

type GeoJSON FeatureCollection

type FeatureCollection struct {
	Type     string    `json:"type"`
	Features []Feature `json:"features"`
}

type Feature struct {
	Type       string     `json:"type"`
	Geometry   Geometry   `json:"geometry"`
	Properties Properties `json:"properties"`
}

type Geometry struct {
	Type        string    `json:"type"`
	Coordinates []float64 `json:"coordinates"`
}

type Properties struct {
	Name        string `json:"name"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Location    string `json:"location"`
}
