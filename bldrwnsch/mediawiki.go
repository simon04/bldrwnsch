package bldrwnsch

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

type MediawikiDB struct {
	db *sql.DB
}

func OpenDB() *MediawikiDB {
	dsn := os.ExpandEnv("${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(${MYSQL_HOST}:3306)/${MYSQL_DATABASE}")
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		panic(err)
	}
	return &MediawikiDB{db}
}

func (db *MediawikiDB) CloseDB() {
	db.db.Close()
}

func (db *MediawikiDB) SelectBilderwuensche(channels []chan Bilderwunsch) {
	log.Println("Reading Bilderwuensche from database")
	query, err := os.ReadFile("updateBilderwuensche.sql")
	if err != nil {
		panic(err)
	}
	rows, err := db.db.Query(string(query))
	if err != nil {
		panic(err)
	}
	defer rows.Close()
	for rows.Next() {
		var f Bilderwunsch
		var pl_title string
		var gt_lat sql.NullFloat64
		var gt_lon sql.NullFloat64

		err = rows.Scan(&f.title, &pl_title, &gt_lat, &gt_lon)
		if err != nil {
			panic(err)
		}
		if gt_lat.Valid && gt_lon.Valid {
			f.lat = gt_lat.Float64
			f.lon = gt_lon.Float64
		}
		f.parseCode(pl_title)
		for _, ch := range channels {
			ch <- f
		}
	}
	for _, ch := range channels {
		close(ch)
	}
}
