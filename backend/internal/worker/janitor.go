// backend/internal/worker/janitor.go
package worker

import (
	"log"
	"time"
	"wh2/internal/database"
)

func StartJanitor(repo *database.Repository) {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			log.Println("Janitor: Cleaning up expired wormholes...")
			err := repo.DeleteExpiredLinks()
			if err != nil {
				log.Printf("Janitor Error (links): %v", err)
			}

			// Deletes unpinned J-space systems that are totally disconnected from the map
			err = repo.CleanOrphanedSystems()
			if err != nil {
				log.Printf("Janitor Error (systems): %v", err)
			}
		}
	}()
}
