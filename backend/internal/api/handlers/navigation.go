// backend/internal/api/handlers/navigation.go
package handlers

import (
	"strconv"
	"wh2/internal/database"
	"wh2/internal/esi"
	"wh2/internal/models"

	"github.com/gofiber/fiber/v2"
)

func SetWaypoint(repo *database.Repository, esiClient *esi.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		systemID, _ := strconv.Atoi(c.Params("system_id"))

		charIDStr := c.Get("X-Character-ID")
		if charIDStr == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Missing Character ID header"})
		}

		charID, _ := strconv.Atoi(charIDStr)

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

type RouteResult struct {
	TotalJumps int      `json:"total_jumps"`
	RouteType  string   `json:"route_type"`
	Entrance   string   `json:"entrance,omitempty"`
	Exit       string   `json:"exit,omitempty"`
	WHPath     []string `json:"wh_path,omitempty"`
}

func CalculateHubRoute(repo *database.Repository, esiClient *esi.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		fromID, err1 := strconv.Atoi(c.Query("from"))
		toID, err2 := strconv.Atoi(c.Query("to"))

		if err1 != nil || err2 != nil || fromID == toID {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid or identical locations selected"})
		}

		var links []models.Connection
		query := `SELECT c.*, s1.name as source_name, s2.name as target_name 
                  FROM connections c
                  JOIN systems s1 ON c.source_system_id = s1.id
                  JOIN systems s2 ON c.target_system_id = s2.id`
		repo.DB.Select(&links, query)

		graph := make(map[int][]int)
		kSpaceNodes := make(map[int]string)
		systemNames := make(map[int]string)

		for _, l := range links {
			graph[l.SourceSystemID] = append(graph[l.SourceSystemID], l.TargetSystemID)
			graph[l.TargetSystemID] = append(graph[l.TargetSystemID], l.SourceSystemID)

			systemNames[l.SourceSystemID] = l.SourceName
			systemNames[l.TargetSystemID] = l.TargetName

			if l.SourceSystemID < 31000000 {
				kSpaceNodes[l.SourceSystemID] = l.SourceName
			}
			if l.TargetSystemID < 31000000 {
				kSpaceNodes[l.TargetSystemID] = l.TargetName
			}
		}

		type bfsNode struct {
			id   int
			path []string
		}

		whPaths := make(map[int]map[int][]string)

		for startNode := range kSpaceNodes {
			whPaths[startNode] = make(map[int][]string)
			queue := []bfsNode{{id: startNode, path: []string{}}}
			visited := map[int]bool{startNode: true}

			for len(queue) > 0 {
				curr := queue[0]
				queue = queue[1:]

				if curr.id < 31000000 && curr.id != startNode {
					whPaths[startNode][curr.id] = curr.path
					continue
				}

				for _, nxt := range graph[curr.id] {
					if !visited[nxt] {
						visited[nxt] = true

						newPath := make([]string, len(curr.path))
						copy(newPath, curr.path)
						if nxt >= 31000000 {
							newPath = append(newPath, systemNames[nxt])
						}

						queue = append(queue, bfsNode{id: nxt, path: newPath})
					}
				}
			}
		}

		directShortest, _ := esiClient.GetRouteDistance(fromID, toID, "shortest")
		directSecure, _ := esiClient.GetRouteDistance(fromID, toID, "secure")

		bestShortest := RouteResult{TotalJumps: directShortest, RouteType: "Direct"}
		bestSecure := RouteResult{TotalJumps: directSecure, RouteType: "Direct"}

		for e1, name1 := range kSpaceNodes {
			for e2, name2 := range kSpaceNodes {
				pathWH, ok := whPaths[e1][e2]
				if !ok {
					continue
				}

				distWH := len(pathWH) + 1

				d1Short, err1 := esiClient.GetRouteDistance(fromID, e1, "shortest")
				d2Short, err2 := esiClient.GetRouteDistance(e2, toID, "shortest")
				if err1 == nil && err2 == nil {
					tot := d1Short + distWH + d2Short
					if tot < bestShortest.TotalJumps {
						bestShortest = RouteResult{
							TotalJumps: tot,
							RouteType:  "Wormhole",
							Entrance:   name1,
							Exit:       name2,
							WHPath:     pathWH,
						}
					}
				}

				d1Sec, err3 := esiClient.GetRouteDistance(fromID, e1, "secure")
				d2Sec, err4 := esiClient.GetRouteDistance(e2, toID, "secure")
				if err3 == nil && err4 == nil && d1Sec < 900 && d2Sec < 900 {
					totSec := d1Sec + distWH + d2Sec
					if totSec < bestSecure.TotalJumps {
						bestSecure = RouteResult{
							TotalJumps: totSec,
							RouteType:  "Wormhole",
							Entrance:   name1,
							Exit:       name2,
							WHPath:     pathWH,
						}
					}
				}
			}
		}

		if bestSecure.TotalJumps >= 900 {
			bestSecure.TotalJumps = -1
		}
		if bestShortest.TotalJumps >= 900 {
			bestShortest.TotalJumps = -1
		}

		return c.JSON(fiber.Map{
			"shortest": bestShortest,
			"secure":   bestSecure,
		})
	}
}
