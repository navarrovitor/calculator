// Command server runs the calculator HTTP API. It listens on PORT (default
// 8080).
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/navarrovitor/calculator/backend/internal/api"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	srv := &http.Server{
		Addr:              addr,
		Handler:           api.NewMux(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("calculator API listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
