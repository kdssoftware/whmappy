package worker

import (
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
			currLoc, err := esiClient.GetLocation(char.ID, char.AccessToken)
			if err != nil {
				// If token is expired, you'd handle RefreshToken here
				continue
			}

			// 1. Handle first-run case (LastLocation is NULL/nil in DB)
			if char.LastLocation == nil {
				repo.UpdateLocation(char.ID, currLoc)
				continue
			}

			// 2. Safely dereference the pointer for comparison
			lastLocValue := *char.LastLocation

			// 3. Check if they moved
			if currLoc != lastLocValue {
				log.Printf("Poller: Jump detected for %s! %d -> %d", char.Name, lastLocValue, currLoc)
				
				// A jump happened! Call HandleJump with actual int values
				err = repo.HandleJump(char.ID, lastLocValue, currLoc)
				if err == nil {
					repo.UpdateLocation(char.ID, currLoc)
				} else {
					log.Printf("Poller: Error recording jump: %v", err)
				}
			}
		}
	}
}
