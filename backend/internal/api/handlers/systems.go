package handlers

import (
	"time"
	"wh2/internal/database"
	"wh2/internal/models"

	"github.com/gofiber/fiber/v2"
)

func GetSystemMap(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		systemID, _ := c.ParamsInt("id")
		
		// Fix: Initialize as an empty slice instead of just declaring it
		chain, err := repo.GetChain(systemID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		if chain == nil {
			return c.JSON([]models.Connection{}) // Return [] instead of null
		}
		
		return c.JSON(chain)
	}
}

func GetAllConnections(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var links []models.Connection
		
		// This query joins the connections table with the systems table TWICE
		// Once for the source name, once for the target name
		query := `
			SELECT 
				c.*, 
				s1.name as source_name, 
				s2.name as target_name 
			FROM connections c
			JOIN systems s1 ON c.source_system_id = s1.id
			JOIN systems s2 ON c.target_system_id = s2.id
			WHERE c.expires_at > NOW()
		`
		err := repo.DB.Select(&links, query)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(links)
	}
}

func UpdateConnection(repo *database.Repository) fiber.Handler {
	type UpdateRequest struct {
		WHSize    string    `json:"wh_size"`
		ExpiresAt time.Time `json:"expires_at"`
	}

	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		var req UpdateRequest
		
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		err := repo.UpdateConnection(id, req.WHSize, req.ExpiresAt)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		return c.SendStatus(204)
	}
}
func DeleteConnection(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")

		err := repo.DeleteConnection(id)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		return c.SendStatus(204)
	}
}
