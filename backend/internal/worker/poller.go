// backend/internal/worker/poller.go
package worker

import (
	"fmt"
	"log"
	"time"
	"wh2/internal/database"
	"wh2/internal/esi"
)

func StartPoller(repo *database.Repository, esiClient *esi.Client) {
	ticker := time.NewTicker(5 * time.Second)
	for range ticker.C {
		chars, err := repo.GetAllActiveCharacters()
		if err != nil {
			log.Printf("Poller: Error fetching characters: %v", err)
			continue
		}

		for _, char := range chars {
			token, err := esiClient.GetValidToken(repo, char.ID)
			if err != nil {
				log.Printf("Poller: Token refresh failed for %s: %v", char.Name, err)
				continue
			}

			currLoc, err := esiClient.GetLocation(char.ID, token)
			if err != nil {
				continue
			}

			exists, _ := repo.SystemExists(currLoc)
			if !exists {
				name, _ := esiClient.GetSystemName(currLoc)
				if name == "" {
					name = fmt.Sprintf("Unknown %d", currLoc)
				}
				repo.AddSystem(currLoc, name)
			}

			if char.LastLocation == nil {
				log.Printf("Poller: Initializing location for %s at %d", char.Name, currLoc)
				repo.UpdateLocation(char.ID, currLoc)
				continue
			}

			lastLocID := *char.LastLocation

			if lastLocID != currLoc {
				log.Printf("Poller: Jump detected for %s! %d -> %d", char.Name, lastLocID, currLoc)

				prevExists, _ := repo.SystemExists(lastLocID)
				if !prevExists {
					name, _ := esiClient.GetSystemName(lastLocID)
					repo.AddSystem(lastLocID, name)
				}

				err = repo.HandleJump(char.ID, lastLocID, currLoc)
				if err == nil {
					repo.UpdateLocation(char.ID, currLoc)
				}
			}
		}
	}
}
