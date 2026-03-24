// backend/internal/api/handlers/systems.go

package handlers

import (
	"time"
	"wh2/internal/database"
	"wh2/internal/esi"
	"wh2/internal/models"

	"github.com/gofiber/fiber/v2"
)

func GetSystemMap(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		systemID, _ := c.ParamsInt("id")

		chain, err := repo.GetChain(systemID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		if chain == nil {
			return c.JSON([]models.Connection{})
		}

		return c.JSON(chain)
	}
}

func GetAllConnections(repo *database.Repository, esiClient *esi.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var links []models.Connection
		query := `SELECT c.*, s1.name as source_name, s2.name as target_name 
                  FROM connections c
                  JOIN systems s1 ON c.source_system_id = s1.id
                  JOIN systems s2 ON c.target_system_id = s2.id`
		repo.DB.Select(&links, query)

		jRoots := make(map[int]string)
		for _, l := range links {
			if l.SourceSystemID >= 31000000 {
				jRoots[l.SourceSystemID] = l.SourceName
			}
			if l.TargetSystemID >= 31000000 {
				jRoots[l.TargetSystemID] = l.TargetName
			}
		}

		results := make(map[int][]HubRoute)
		hubs := map[string]int{"Jita": Jita, "Amarr": Amarr, "Dodixie": Dodixie, "Hek": Hek}

		for rootID := range jRoots {
			exits := findExits(rootID, links)
			if len(exits) == 0 {
				continue
			}

			for hubName, hubID := range hubs {
				bestShortestTotal := 999
				bestShortestExit := ""

				bestSafeTotal := 999
				bestSafeExit := ""

				for exitID, whJumps := range exits {
					// 1. Calculate SHORTEST (Any Sec)
					gateJumps, err := esiClient.GetRouteDistance(exitID, hubID, "shortest")
					if err == nil {
						total := whJumps + gateJumps
						if total < bestShortestTotal {
							bestShortestTotal = total
							name, _ := esiClient.GetSystemName(exitID)
							bestShortestExit = name
						}
					}

					// 2. Calculate SAFE (High-Sec Only)
					safeGateJumps, err := esiClient.GetRouteDistance(exitID, hubID, "secure")
					if err == nil && safeGateJumps < 900 { // 999 means no HS route
						total := whJumps + safeGateJumps
						if total < bestSafeTotal {
							bestSafeTotal = total
							name, _ := esiClient.GetSystemName(exitID)
							bestSafeExit = name
						}
					}
				}

				if bestShortestExit != "" {
					results[rootID] = append(results[rootID], HubRoute{
						HubName:        hubName,
						TotalJumps:     bestShortestTotal,
						ExitSystem:     bestShortestExit,
						TotalSafeJumps: bestSafeTotal,
						SafeExitSystem: bestSafeExit,
					})
				}
			}
		}

		return c.JSON(fiber.Map{
			"connections": links,
			"hub_routes":  results,
		})
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

const (
	Jita    = 30000142
	Amarr   = 30002187
	Dodixie = 30002659
	Hek     = 30002053
)

type HubRoute struct {
	HubName        string `json:"hub_name"`
	TotalJumps     int    `json:"total_jumps"`
	ExitSystem     string `json:"exit_system"`
	TotalSafeJumps int    `json:"total_safe_jumps"`
	SafeExitSystem string `json:"safe_exit_system"`
}

// Helper to find all K-space systems reachable from a J-Root via the alliance map
func findExits(rootID int, allLinks []models.Connection) map[int]int {
	exits := make(map[int]int) // SystemID -> WH Jumps from Root
	queue := []struct {
		id    int
		depth int
	}{{rootID, 0}}
	visited := map[int]bool{rootID: true}

	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]

		// If it's K-space, record it as a potential exit
		if curr.id < 31000000 {
			if oldDepth, exists := exits[curr.id]; !exists || curr.depth < oldDepth {
				exits[curr.id] = curr.depth
			}
			continue // Don't explore further from a K-space system for this logic
		}

		// Check all connections involving this system
		for _, link := range allLinks {
			var nextID int
			if link.SourceSystemID == curr.id {
				nextID = link.TargetSystemID
			} else if link.TargetSystemID == curr.id {
				nextID = link.SourceSystemID
			} else {
				continue
			}

			if !visited[nextID] {
				visited[nextID] = true
				queue = append(queue, struct {
					id    int
					depth int
				}{nextID, curr.depth + 1})
			}
		}
	}
	return exits
}
