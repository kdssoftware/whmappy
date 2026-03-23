package handlers

import (
	"strconv"
	"wh2/internal/database"
	"wh2/internal/esi"

	"github.com/gofiber/fiber/v2"
)

func SetWaypoint(repo *database.Repository, esiClient *esi.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		systemID, _ := strconv.Atoi(c.Params("system_id"))
		
		// Get the specific character ID from the request header
		charIDStr := c.Get("X-Character-ID")
		if charIDStr == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Missing Character ID header"})
		}

		charID, _ := strconv.Atoi(charIDStr)
		
		// Fetch specifically your character
		char, err := repo.GetCharacter(charID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Character not found in database"})
		}

		err = esiClient.SetWaypoint(char.ID, systemID, char.AccessToken)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "ESI Rejected Waypoint. Token might be expired."})
		}

		return c.SendStatus(204)
	}
}
