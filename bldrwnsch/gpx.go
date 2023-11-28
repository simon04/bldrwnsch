package bldrwnsch

import (
	"encoding/xml"
	"fmt"
	"log"
	"os"
	"sync"
)

func ConsumeFeatureAsGPX(filePath string, ch <-chan Bilderwunsch, wg *sync.WaitGroup) {
	defer wg.Done()
	f, err := os.Create(filePath)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	i := 0
	f.Write([]byte(`<gpx version="1.1" creator="@simon04/bldrwnsch" xmlns="http://www.topografix.com/GPX/1/1">` + "\n"))
	for bldrwnsch := range ch {
		wpt := newWpt(bldrwnsch)
		bytes, _ := xml.Marshal(wpt)
		f.Write(bytes)
		f.Write([]byte("\n"))
		i = i + 1
	}
	f.Write([]byte("</gpx>\n"))
	log.Printf("Written %d features to %s", i, filePath)
}

func newWpt(feature Bilderwunsch) Wpt {
	wpt := Wpt{
		Name: feature.name,
		Desc: fmt.Sprintf("%s/ %s", feature.description, feature.location),
		Text: "",
		Lat:  feature.lat,
		Lon:  feature.lon,
	}
	return wpt
}

type Gpx struct {
	XMLName xml.Name `xml:"gpx"`
	Text    string   `xml:",chardata"`
	Xmlns   string   `xml:"xmlns,attr"`
	Version string   `xml:"version,attr"`
	Creator string   `xml:"creator,attr"`
	Wpt     []Wpt    `xml:"wpt"`
}

type Wpt struct {
	Text string  `xml:",chardata"`
	Name string  `xml:"name"`
	Desc string  `xml:"desc"`
	Lon  float64 `xml:"lon,attr"`
	Lat  float64 `xml:"lat,attr"`
}
