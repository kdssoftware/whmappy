package api

import (
	"wh2/internal/api/handlers"
	"wh2/internal/database"
	"wh2/internal/esi"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
)

func SetupRoutes(app *fiber.App, repo *database.Repository, esiClient *esi.Client) {
app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New())

	api := app.Group("/api")

	// Auth
	api.Get("/auth/login", handlers.Login) // ??
	api.Get("/auth/callback", handlers.Callback(repo))

	// Map
	api.Get("/map/:id", handlers.GetSystemMap(repo))
	
	// Navigation (Passes both repo and esiClient)
	api.Post("/waypoint/:system_id", handlers.SetWaypoint(repo, esiClient))

	api.Get("/auth/me", handlers.GetCurrentUsers(repo))
	api.Post("/auth/logout", handlers.Logout(repo))
}
