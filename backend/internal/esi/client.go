package esi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Client is the main struct for interacting with EVE ESI
type Client struct {
	ClientID   string
	SecretKey  string
	HTTPClient *http.Client
}

// NewClient initializes the ESI client
func NewClient(clientID, secret string) *Client {
	return &Client{
		ClientID:  clientID,
		SecretKey: secret,
		HTTPClient: &http.Client{
			Timeout: time.Second * 10,
		},
	}
}

// GetLocation calls /characters/{id}/location/
func (c *Client) GetLocation(charID int, token string) (int, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://esi.evetech.net/latest/characters/%d/location/", charID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	//req.Header.Set("User-Agent", "Your-Alliance-Mapper-v1")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("ESI returned status: %d", resp.StatusCode)
	}

	var data struct {
		SolarSystemID int `json:"solar_system_id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, err
	}

	return data.SolarSystemID, nil
}

func (c *Client) SetWaypoint(charID int, destinationID int, token string) error {
	// ESI Endpoint: POST /ui/autopilot/waypoint/
	// Params: add_to_beginning=false, clear_other_waypoints=false, destination_id=...
	url := fmt.Sprintf("https://esi.evetech.net/latest/ui/autopilot/waypoint/?add_to_beginning=false&clear_other_waypoints=false&destination_id=%d", destinationID)

	req, _ := http.NewRequest("POST", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("ESI waypoint error: %d", resp.StatusCode)
	}

	return nil
}
