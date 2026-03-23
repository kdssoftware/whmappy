package models

type Character struct {
	ID           int    `json:"id" db:"id"`
	Name         string `json:"name" db:"name"`
	AccessToken  string `json:"access_token" db:"access_token"`
	RefreshToken string `json:"refresh_token" db:"refresh_token"`
	LastLocation *int   `json:"last_location_id" db:"last_location_id"`
}
