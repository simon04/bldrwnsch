package bldrwnsch

import (
	"encoding/xml"
	"fmt"
	"log"
	"os"
	"sync"
)

func ConsumeFeatureAsKML(filePath string, ch <-chan Bilderwunsch, wg *sync.WaitGroup) {
	defer wg.Done()
	f, err := os.Create(filePath)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	i := 0
	f.Write([]byte(`<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Folder><name>Bilderwuensche</name>` + "\n"))
	for bldrwnsch := range ch {
		placemark := newPlacemark(bldrwnsch)
		bytes, _ := xml.Marshal(placemark)
		f.Write(bytes)
		f.Write([]byte("\n"))
		i = i + 1
	}
	f.Write([]byte("</Folder></Document></kml>\n"))
	log.Printf("Written %d features to %s", i, filePath)
}

func newPlacemark(feature Bilderwunsch) Placemark {
	return Placemark{
		Name:        feature.name,
		Description: fmt.Sprintf("%s/ %s", feature.description, feature.location),
		Point: Point{
			Coordinates: fmt.Sprintf("%f,%f", feature.lon, feature.lat),
		},
	}
}

type Kml struct {
	XMLName  xml.Name `xml:"kml"`
	Text     string   `xml:",chardata"`
	Xmlns    string   `xml:"xmlns,attr"`
	Document struct {
		Text   string `xml:",chardata"`
		Folder struct {
			Text      string      `xml:",chardata"`
			Name      string      `xml:"name"`
			Placemark []Placemark `xml:"Placemark"`
		} `xml:"Folder"`
	} `xml:"Document"`
}

type Placemark struct {
	Text        string `xml:",chardata"`
	Name        string `xml:"name"`
	Description string `xml:"description"`
	Point       Point  `xml:"Point"`
}

type Point struct {
	Text        string `xml:",chardata"`
	Coordinates string `xml:"coordinates"`
}
