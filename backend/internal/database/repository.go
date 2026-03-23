package database

import (
	"fmt"
	"log"
	"time"
	"wh2/internal/esi"
	"wh2/internal/models"

	"github.com/jmoiron/sqlx"
)

type Repository struct {
	DB *sqlx.DB
}

// GetChain retrieves all connections starting from a system recursively
func (r *Repository) GetChain(startSystemID int) ([]models.Connection, error) {
	query := `
	WITH RECURSIVE wh_chain AS (
		SELECT * FROM connections WHERE source_system_id = $1
		UNION
		SELECT c.* FROM connections c
		INNER JOIN wh_chain wc ON c.source_system_id = wc.target_system_id
		WHERE c.expires_at > NOW()
	)
	SELECT * FROM wh_chain;`
	
	var links []models.Connection
	err := r.DB.Select(&links, query, startSystemID)
	
	if err != nil {
		// THIS IS THE FIX: Print the error so you can see it in Docker logs!
		log.Printf("DATABASE ERROR in GetChain: %v", err)
		return nil, err
	}
	return links, nil
}

func (r *Repository) UpdateLocation(charID int, systemID int, esiClient *esi.Client) error {
	// 1. Ensure the system exists (using the helper that fetches the ESI name)
	if err := r.ensureSystemExists(systemID, esiClient); err != nil {
		return err
	}

	// 2. Now update the character location
	_, err := r.DB.Exec("UPDATE characters SET last_location_id = $1 WHERE id = $2", systemID, charID)
	return err
}

func (r *Repository) GetCharacter(charID int) (*models.Character, error) {
	var char models.Character
	query := `SELECT id, name, access_token, refresh_token, last_location_id FROM characters WHERE id = $1`
	
	err := r.DB.Get(&char, query, charID)
	if err != nil {
		return nil, err
	}
	
	return &char, nil
}

// GetAllActiveCharacters returns all characters who have logged in via SSO
func (r *Repository) GetAllActiveCharacters() ([]models.Character, error) {
	var chars []models.Character
	query := `SELECT id, name, access_token, refresh_token, last_location_id FROM characters`
	err := r.DB.Select(&chars, query)
	return chars, err
}

// DeleteExpiredLinks is called by the Janitor worker to keep the map clean
func (r *Repository) DeleteExpiredLinks() error {
	_, err := r.DB.Exec("DELETE FROM connections WHERE expires_at < NOW()")
	return err
}

// HandleJump determines if a move was a gate or a wormhole and records it
func (r *Repository) HandleJump(charID int, fromID int, toID int, esiClient *esi.Client) error {
	// 1. Ensure BOTH systems exist in the 'systems' table first
	if err := r.ensureSystemExists(fromID, esiClient); err != nil {
		return err
	}
	if err := r.ensureSystemExists(toID, esiClient); err != nil {
		return err
	}

	// 2. Check if this is a standard Stargate jump
	isGate, _ := r.CheckIfGateExists(fromID, toID)
	if isGate {
		return nil 
	}

	// 3. Create the Wormhole Connection
	var exists bool
	err := r.DB.Get(&exists, "SELECT EXISTS(SELECT 1 FROM connections WHERE source_system_id=$1 AND target_system_id=$2)", fromID, toID)
	
	if err == nil && !exists {
		query := `
			INSERT INTO connections (source_system_id, target_system_id, connection_type, expires_at, created_by_character_id)
			VALUES ($1, $2, 'wormhole', $3, $4)`
		
		expiresAt := time.Now().Add(24 * time.Hour)
		_, err = r.DB.Exec(query, fromID, toID, expiresAt, charID)
		if err == nil {
			log.Printf("Map Updated: Linked %d to %d (WH)", fromID, toID)
		}
		return err
	}

	return nil
}

// CheckIfGateExists is a helper (Ideally you seed this data from the EVE SDE)
func (r *Repository) CheckIfGateExists(fromID, toID int) (bool, error) {
	// For this example, we assume any jump involving a Wormhole System ID (31xxxxxx) is a WH
	// Real EVE Mappers use the SDE (Static Data Export) to verify gate connections.
	if (fromID >= 31000000 && fromID < 32000000) || (toID >= 31000000 && toID < 32000000) {
		return false, nil // It involves a J-System, so it's a WH
	}
	
	// Defaulting to true for K-Space to K-Space for now 
	// (You'll want a 'stargates' table for 100% accuracy)
	return true, nil 
}

func (r *Repository) SaveCharacter(char models.Character) error {
	query := `
		INSERT INTO characters (id, name, access_token, refresh_token)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO UPDATE SET 
			access_token = EXCLUDED.access_token, 
			refresh_token = EXCLUDED.refresh_token`
	_, err := r.DB.Exec(query, char.ID, char.Name, char.AccessToken, char.RefreshToken)
	return err
}

// Helper to auto-create a system if it doesn't exist
func (r *Repository) ensureSystemExists(id int, esiClient *esi.Client) error {
	var exists bool
	r.DB.Get(&exists, "SELECT EXISTS(SELECT 1 FROM systems WHERE id=$1)", id)
	if exists {
		return nil
	}

	// Not in DB? Fetch the real name from EVE
	name, err := esiClient.GetSystemName(id)
	if err != nil {
		name = fmt.Sprintf("Unknown %d", id)
	}

	isWormhole := id >= 31000000 && id < 32000000
	_, err = r.DB.Exec(`
		INSERT INTO systems (id, name, is_wormhole) 
		VALUES ($1, $2, $3) 
		ON CONFLICT (id) DO NOTHING`, 
		id, name, isWormhole)
	return err
}

func (r *Repository) UpdateConnection(id string, whSize string, expiresAt time.Time) error {
	query := `UPDATE connections SET wh_size = $1, expires_at = $2 WHERE id = $3`
	_, err := r.DB.Exec(query, whSize, expiresAt, id)
	return err
}

func (r *Repository) DeleteConnection(id string) error {
	_, err := r.DB.Exec("DELETE FROM connections WHERE id = $1", id)
	return err
}
