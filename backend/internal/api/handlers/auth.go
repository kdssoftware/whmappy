package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"wh2/internal/database"
	"wh2/internal/models"

	"github.com/gofiber/fiber/v2"
)

// Login redirects the user to EVE Online SSO
func Login(c *fiber.Ctx) error {
	clientID := os.Getenv("ESI_CLIENT_ID")
	callback := os.Getenv("ESI_CALLBACK_URL")
	scopes := "esi-location.read_location.v1 esi-ui.write_waypoint.v1"
	state := "unique-state-string" // In production, use a random string + session

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
		code := c.Query("code")
		if code == "" {
			return c.Status(400).SendString("No code provided from CCP")
		}

		// 1. Swap Code for Tokens
		formData := url.Values{}
		formData.Set("grant_type", "authorization_code")
		formData.Set("code", code)

		req, _ := http.NewRequest("POST", "https://login.eveonline.com/v2/oauth/token", strings.NewReader(formData.Encode()))
		req.SetBasicAuth(os.Getenv("ESI_CLIENT_ID"), os.Getenv("ESI_SECRET"))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		resp, err := http.DefaultClient.Do(req)
		if err != nil || resp.StatusCode != 200 {
			log.Printf("Token Exchange Failed: %v", err)
			return c.Status(500).SendString("Failed to swap code for tokens")
		}
		defer resp.Body.Close()

		var tokenResp struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
		}
		json.NewDecoder(resp.Body).Decode(&tokenResp)

		// 2. NEW: Get Character ID and Name from EVE SSO Verify
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

		// 3. Save to Database
		char := models.Character{
			ID:           identity.CharacterID,
			Name:         identity.CharacterName,
			AccessToken:  tokenResp.AccessToken,
			RefreshToken: tokenResp.RefreshToken,
		}

		log.Printf("Saving Character: %s (%d)", char.Name, char.ID)
		err = repo.SaveCharacter(char)
		if err != nil {
			log.Printf("DB Error saving character: %v", err)
			return c.Status(500).SendString("Database error saving character")
		}

		// 4. Redirect back to React
		return c.Redirect("https://dev.wh.cultofmagik.org")
	}
}

func GetCurrentUsers(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		log.Println("hellothere\n")
		chars, err := repo.GetAllActiveCharacters()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(chars)
	}
}

func Logout(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		charID := c.Get("X-Character-ID")
		if charID != "" {
			// Delete character from DB so they don't auto-login
			repo.DB.Exec("DELETE FROM characters WHERE id = $1", charID)
		}
		return c.SendStatus(200)
	}
}
