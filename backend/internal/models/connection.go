package models

import (
	"time"
)

type Connection struct {
	ID             string `json:"id" db:"id"`
	SourceSystemID int    `json:"source_id" db:"source_system_id"`
	TargetSystemID int    `json:"target_id" db:"target_system_id"`
	// This is the missing field causing your 500 error!
	Type            string    `json:"type" db:"connection_type"`
	WHSize          string    `json:"wh_size" db:"wh_size"`
	CustomName      *string   `json:"custom_name" db:"custom_name"` // Using pointer for nullability
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	ExpiresAt       time.Time `json:"expires_at" db:"expires_at"`
	CreatedByCharID *int      `json:"created_by" db:"created_by_character_id"`
}
