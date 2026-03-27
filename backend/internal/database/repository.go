// backend/internal/database/repository.go
package database

import (
	"fmt"
	"log"
	"time"
	"wh2/internal/models"

	"github.com/jmoiron/sqlx"
)

type Repository struct {
	DB *sqlx.DB
}

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
	return links, err
}

func (r *Repository) UpdateLocation(charID int, systemID int) error {
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

func (r *Repository) GetAllActiveCharacters() ([]models.Character, error) {
	var chars []models.Character
	query := `SELECT id, name, access_token, refresh_token, last_location_id FROM characters`
	err := r.DB.Select(&chars, query)
	return chars, err
}

func (r *Repository) HandleJump(charID int, fromID int, toID int) error {
	isGate, _ := r.CheckIfGateExists(fromID, toID)
	if isGate {
		return nil
	}

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

func (r *Repository) CheckIfGateExists(fromID, toID int) (bool, error) {
	// Simple logic: if both are K-space, it's a gate. J-space IDs are 31xxxxxx
	if (fromID >= 31000000 && fromID < 32000000) || (toID >= 31000000 && toID < 32000000) {
		return false, nil
	}
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

func (r *Repository) SystemExists(id int) (bool, error) {
	var exists bool
	err := r.DB.Get(&exists, "SELECT EXISTS(SELECT 1 FROM systems WHERE id=$1)", id)
	return exists, err
}

func (r *Repository) AddSystem(id int, name string) error {
	isWormhole := id >= 31000000 && id < 32000000
	_, err := r.DB.Exec(`
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

func (r *Repository) DeleteExpiredLinks() error {
	_, err := r.DB.Exec("DELETE FROM connections WHERE expires_at < NOW()")
	return err
}

func (r *Repository) GetTags(systemID int) ([]models.Tag, error) {
	var tags []models.Tag
	err := r.DB.Select(&tags, "SELECT * FROM system_tags WHERE system_id = $1", systemID)
	return tags, err
}

func (r *Repository) AddTag(systemID int, tagName string) error {
	var count int
	err := r.DB.Get(&count, "SELECT COUNT(*) FROM system_tags WHERE system_id = $1", systemID)
	if err != nil {
		return err
	}
	if count >= 2 {
		return fmt.Errorf("limit of 2 tags reached")
	}

	_, err = r.DB.Exec("INSERT INTO system_tags (system_id, tag_name) VALUES ($1, $2)", systemID, tagName)
	return err
}

func (r *Repository) DeleteTag(tagID int) error {
	_, err := r.DB.Exec("DELETE FROM system_tags WHERE id = $1", tagID)
	return err
}

func (r *Repository) GetAllTags() ([]models.Tag, error) {
	var tags []models.Tag
	err := r.DB.Select(&tags, "SELECT * FROM system_tags")
	return tags, err
}

func (r *Repository) SetSystemPin(id int, pinned bool) error {
	_, err := r.DB.Exec("UPDATE systems SET is_pinned = $1 WHERE id = $2", pinned, id)
	return err
}

func (r *Repository) GetPinnedSystems() ([]models.System, error) {
	var sys []models.System
	err := r.DB.Select(&sys, "SELECT id, name, is_wormhole, is_pinned FROM systems WHERE is_pinned = true")
	return sys, err
}

func (r *Repository) CleanOrphanedSystems() error {
	_, err := r.DB.Exec(`
		DELETE FROM systems 
		WHERE is_wormhole = true 
		AND is_pinned = false 
		AND id NOT IN (SELECT source_system_id FROM connections)
		AND id NOT IN (SELECT target_system_id FROM connections)
		AND id NOT IN (SELECT last_location_id FROM characters WHERE last_location_id IS NOT NULL)
	`)
	return err
}
