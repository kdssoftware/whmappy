// backend/internal/api/handlers/auth.go
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	"wh2/internal/database"
	"wh2/internal/models"

	"github.com/gofiber/fiber/v2"
)

const TargetAllianceID = 99014712

func generateRandomState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func Login(c *fiber.Ctx) error {
	clientID := os.Getenv("ESI_CLIENT_ID")
	callback := os.Getenv("ESI_CALLBACK_URL")
	scopes := "esi-location.read_location.v1 esi-ui.write_waypoint.v1"
	state := generateRandomState()

	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Expires:  time.Now().Add(15 * time.Minute),
		HTTPOnly: true,
		Secure:   true,
		SameSite: "None",
		Domain:   os.Getenv("COOKIE_DOMAIN"),
		Path:     "/",
	})

	authURL := fmt.Sprintf(
		"https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=%s&client_id=%s&scope=%s&state=%s",
		url.QueryEscape(callback),
		clientID,
		url.QueryEscape(scopes),
		state,
	)

	return c.Redirect(authURL)
}

func Callback(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		state := c.Query("state")
		savedState := c.Cookies("oauth_state")

		if state == "" || (state != savedState && os.Getenv("ENVIRONMENT") != "local") {
			fmt.Println("here")
			return c.Status(403).SendString("Security check failed: State mismatch.")
		}
		c.ClearCookie("oauth_state")

		code := c.Query("code")
		if code == "" {
			return c.Status(400).SendString("No code provided from CCP")
		}

		formData := url.Values{}
		formData.Set("grant_type", "authorization_code")
		formData.Set("code", code)

		req, _ := http.NewRequest("POST", "https://login.eveonline.com/v2/oauth/token", strings.NewReader(formData.Encode()))
		req.SetBasicAuth(os.Getenv("ESI_CLIENT_ID"), os.Getenv("ESI_SECRET"))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		resp, err := http.DefaultClient.Do(req)
		if err != nil || resp.StatusCode != 200 {
			return c.Status(500).SendString("Failed to swap code for tokens")
		}
		defer resp.Body.Close()

		var tokenResp struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
		}
		json.NewDecoder(resp.Body).Decode(&tokenResp)

		verifyReq, _ := http.NewRequest("GET", "https://login.eveonline.com/oauth/verify", nil)
		verifyReq.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

		verifyResp, err := http.DefaultClient.Do(verifyReq)
		if err != nil || verifyResp.StatusCode != 200 {
			return c.Status(500).SendString("Failed to verify character identity")
		}
		defer verifyResp.Body.Close()

		var identity struct {
			CharacterID   int    `json:"CharacterID"`
			CharacterName string `json:"CharacterName"`
		}
		json.NewDecoder(verifyResp.Body).Decode(&identity)

		allianceURL := fmt.Sprintf("https://esi.evetech.net/latest/characters/%d/", identity.CharacterID)
		allianceResp, err := http.Get(allianceURL)
		if err != nil || allianceResp.StatusCode != 200 {
			return c.Status(500).SendString("Failed to verify alliance membership")
		}
		defer allianceResp.Body.Close()

		var charInfo struct {
			AllianceID int `json:"alliance_id"`
		}
		json.NewDecoder(allianceResp.Body).Decode(&charInfo)

		if charInfo.AllianceID != TargetAllianceID {
			return c.Status(403).JSON(fiber.Map{
				"error":   "Forbidden",
				"message": "Access restricted to Cult of Magik members only.",
			})
		}

		char := models.Character{
			ID:           identity.CharacterID,
			Name:         identity.CharacterName,
			AccessToken:  tokenResp.AccessToken,
			RefreshToken: tokenResp.RefreshToken,
		}

		if err := repo.SaveCharacter(char); err != nil {
			return c.Status(500).SendString("Database error saving character")
		}

		c.Cookie(&fiber.Cookie{
			Name:     "session_id",
			Value:    fmt.Sprintf("%d", char.ID),
			Expires:  time.Now().Add(30 * 24 * time.Hour),
			HTTPOnly: true,
			Secure:   true,
			SameSite: "None",
			Domain:   os.Getenv("COOKIE_DOMAIN"),
			Path:     "/",
		})

		return c.Redirect(os.Getenv("FRONTEND_URL"))
	}
}

func GetCurrentUsers(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if os.Getenv("ENVIRONMENT") == "local" {
			chars, err := repo.GetAllActiveCharacters()
			if err != nil {
				return c.JSON([]interface{}{})
			}
			return c.JSON([]models.Character{chars[0]})

		}
		sessionID := c.Cookies("session_id")
		if sessionID == "" {
			return c.JSON([]interface{}{})
		}

		sesID, _ := strconv.Atoi(sessionID)
		char, err := repo.GetCharacter(sesID)
		if err != nil {
			return c.JSON([]interface{}{})
		}

		return c.JSON([]models.Character{*char})
	}
}

func Logout(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.ClearCookie("session_id")
		return c.SendStatus(200)
	}
}
