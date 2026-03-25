// backend/internal/models/connection.go
package models

import (
	"time"
)

type Connection struct {
	ID              string    `json:"id" db:"id"`
	SourceSystemID  int       `json:"source_id" db:"source_system_id"`
	TargetSystemID  int       `json:"target_id" db:"target_system_id"`
	Type            string    `json:"type" db:"connection_type"`
	WHSize          string    `json:"wh_size" db:"wh_size"`
	CustomName      *string   `json:"custom_name" db:"custom_name"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	ExpiresAt       time.Time `json:"expires_at" db:"expires_at"`
	CreatedByCharID *int      `json:"created_by" db:"created_by_character_id"`

	SourceName string `json:"source_name" db:"source_name"`
	TargetName string `json:"target_name" db:"target_name"`
}
