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

			if char.LastLocation == nil {
				repo.UpdateLocation(char.ID, currLoc, esiClient)
				continue
			}

			lastLocValue := *char.LastLocation

			if currLoc != lastLocValue {
				log.Printf("Poller: Jump detected for %s! %d -> %d", char.Name, lastLocValue, currLoc)
				err = repo.HandleJump(char.ID, lastLocValue, currLoc, esiClient)
				if err == nil {
					repo.UpdateLocation(char.ID, currLoc, esiClient)
				}
			}
		}
	}
}
