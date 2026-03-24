// backend/internal/esi/client.go
package esi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"wh2/internal/database"
)

type Client struct {
	ClientID   string
	SecretKey  string
	HTTPClient *http.Client
	routeCache map[string]int
}

func NewClient(clientID, secret string) *Client {
	return &Client{
		ClientID:   clientID,
		SecretKey:  secret,
		routeCache: make(map[string]int),
		HTTPClient: &http.Client{
			Timeout: time.Second * 10,
		},
	}
}

func (c *Client) GetLocation(charID int, token string) (int, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://esi.evetech.net/latest/characters/%d/location/", charID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("User-Agent", "WH-Mapper-v2")

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

func (e *Client) GetSystemName(id int) (string, error) {
	url := "https://esi.evetech.net/latest/universe/names/"
	body, _ := json.Marshal([]int{id})

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var results []struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	}
	json.NewDecoder(resp.Body).Decode(&results)

	if len(results) > 0 {
		return results[0].Name, nil
	}
	return "Unknown System", nil
}

func (c *Client) GetRouteDistance(fromID, toID int, flag string) (int, error) {
	cacheKey := fmt.Sprintf("%d-%d-%s", fromID, toID, flag)
	if dist, ok := c.routeCache[cacheKey]; ok {
		return dist, nil
	}

	url := fmt.Sprintf("https://esi.evetech.net/latest/route/%d/%d/?datasource=tranquility&flag=%s", fromID, toID, flag)
	req, _ := http.NewRequest("GET", url, nil)
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusNotFound {
			c.routeCache[cacheKey] = 999 // No route exists
			return 999, nil
		}
		return 0, fmt.Errorf("error %d", resp.StatusCode)
	}

	var path []int
	json.NewDecoder(resp.Body).Decode(&path)

	dist := 0
	if len(path) > 1 {
		dist = len(path) - 1
	}

	c.routeCache[cacheKey] = dist
	return dist, nil
}

func (c *Client) GetCharacterAlliance(charID int) (int, error) {
	url := fmt.Sprintf("https://esi.evetech.net/latest/characters/%d/", charID)

	resp, err := c.HTTPClient.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("failed to fetch character info: %d", resp.StatusCode)
	}

	var data struct {
		AllianceID int `json:"alliance_id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, err
	}

	return data.AllianceID, nil
}

func (c *Client) GetValidToken(repo *database.Repository, charID int) (string, error) {
	char, err := repo.GetCharacter(charID)
	if err != nil {
		return "", err
	}

	newToken, err := c.RefreshToken(char.RefreshToken)
	if err != nil {
		return "", err
	}

	char.AccessToken = newToken
	repo.SaveCharacter(*char)

	return newToken, nil
}
