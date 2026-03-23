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

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "https://wh.cultofmagik.org, https://dev.wh.cultofmagik.org",
		AllowHeaders:     "Origin, Content-Type, Accept, X-Character-ID",
		AllowMethods:     "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
		AllowCredentials: true,
	}))

	api := app.Group("/api")
	api.Get("/auth/login", handlers.Login)
	api.Get("/auth/callback", handlers.Callback(repo))
	api.Get("/auth/me", handlers.GetCurrentUsers(repo))
	api.Post("/auth/logout", handlers.Logout(repo))

	api.Get("/map/all", handlers.GetAllConnections(repo, esiClient))
	api.Get("/map/:id", handlers.GetSystemMap(repo))

	api.Post("/waypoint/:system_id", handlers.SetWaypoint(repo, esiClient))
	api.Patch("/connections/:id", handlers.UpdateConnection(repo))
	api.Delete("/connections/:id", handlers.DeleteConnection(repo))
}
