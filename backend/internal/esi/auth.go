// backend/internal/esi/auth.go
package esi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

func (c *Client) RefreshToken(refreshToken string) (string, error) {
	cacheKey := fmt.Sprintf("esi:refresh:%s", refreshToken)
	return withCache(c, cacheKey, func() (string, error) {
		endpoint := "https://login.eveonline.com/v2/oauth/token"

		data := url.Values{}
		data.Set("grant_type", "refresh_token")
		data.Set("refresh_token", refreshToken)

		req, _ := http.NewRequest("POST", endpoint, strings.NewReader(data.Encode()))
		req.SetBasicAuth(c.ClientID, c.SecretKey)
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("Host", "login.eveonline.com")

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("token refresh failed: %d", resp.StatusCode)
		}

		var result struct {
			AccessToken string `json:"access_token"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return "", err
		}

		return result.AccessToken, nil
	})
}
