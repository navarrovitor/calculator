// Command server runs the calculator HTTP API. It listens on PORT (default
// 8080).
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/navarrovitor/calculator/backend/internal/api"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	log.Printf("calculator API listening on %s", addr)
	if err := http.ListenAndServe(addr, api.NewMux()); err != nil {
		log.Fatal(err)
	}
}
