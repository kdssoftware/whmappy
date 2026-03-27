// backend/internal/models/system.go
package models

import "time"

type System struct {
	ID         int    `json:"id" db:"id"`
	Name       string `json:"name" db:"name"`
	IsWormhole bool   `json:"is_wormhole" db:"is_wormhole"`
	IsPinned   bool   `json:"is_pinned" db:"is_pinned"`
}

type Tag struct {
	ID        int       `json:"id" db:"id"`
	SystemID  int       `json:"system_id" db:"system_id"`
	TagName   string    `json:"tag_name" db:"tag_name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
