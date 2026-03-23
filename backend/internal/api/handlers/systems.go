package handlers

import (
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
