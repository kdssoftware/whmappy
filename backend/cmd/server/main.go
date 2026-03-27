// backend/cmd/server/main.go
package main

import (
	"log"
	"os"
	"wh2/internal/api"
	"wh2/internal/database"
	"wh2/internal/esi"
	"wh2/internal/worker"

	"github.com/gofiber/fiber/v2"
)

func main() {
	db := database.ConnectPostgres()
	rdb := database.ConnectRedis()
	repo := &database.Repository{DB: db}
	esiClient := esi.NewClient(os.Getenv("ESI_CLIENT_ID"), os.Getenv("ESI_SECRET"), rdb)

	go worker.StartPoller(repo, esiClient)
	go worker.StartJanitor(repo)

	app := fiber.New(fiber.Config{
		AppName: "Cult of Magik WH Mapper API",
	})

	api.SetupRoutes(app, repo, esiClient)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on https://api.wh.cultofmagik.org (port %s)", port)
	log.Fatal(app.Listen(":" + port))
}
