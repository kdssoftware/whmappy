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
	// 1. Init DB
	db := database.ConnectPostgres()
	repo := &database.Repository{DB: db}

	esiClient := esi.NewClient(os.Getenv("ESI_CLIENT_ID"), os.Getenv("ESI_SECRET"))

	// 2. Start Background Workers
	go worker.StartPoller(repo, esiClient)
	go worker.StartJanitor(repo) // Deletes expired WHs

	// 3. Setup API
	app := fiber.New()
	api.SetupRoutes(app, repo, esiClient)

	log.Fatal(app.Listen(":"+os.Getenv("PORT")))
}
