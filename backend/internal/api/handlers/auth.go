package handlers

import (
	"encoding/json"
	"fmt"
	"log"
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

// Cult of Magik Alliance ID
const TargetAllianceID = 99014712

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

		// 1. Exchange Code for Access Token
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

		// 2. Verify Character Identity
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

		// 3. GATEKEEPER: Check Alliance Membership
		// We fetch the public character info to see their alliance_id
		allianceURL := fmt.Sprintf("https://esi.evetech.net/latest/characters/%d/", identity.CharacterID)
		allianceResp, err := http.Get(allianceURL)
		if err != nil || allianceResp.StatusCode != 200 {
			return c.Status(500).SendString("Failed to verify alliance membership via ESI")
		}
		defer allianceResp.Body.Close()

		var charInfo struct {
			AllianceID int `json:"alliance_id"`
		}
		json.NewDecoder(allianceResp.Body).Decode(&charInfo)

		if charInfo.AllianceID != TargetAllianceID {
			log.Printf("Login Rejected: %s (%d) is in alliance %d, not %d", identity.CharacterName, identity.CharacterID, charInfo.AllianceID, TargetAllianceID)
			return c.Status(403).JSON(fiber.Map{
				"error":   "Forbidden",
				"message": "Access restricted to Cult of Magik members only.",
			})
		}

		// 4. Success: Save and Set Session
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

		// Set secure, cross-subdomain cookie
		c.Cookie(&fiber.Cookie{
			Name:     "session_id",
			Value:    fmt.Sprintf("%d", char.ID),
			Expires:  time.Now().Add(72 * time.Hour),
			HTTPOnly: true,
			Secure:   true,
			SameSite: "None",
			Domain:   ".cultofmagik.org", // Allow dev.wh and wh to share
			Path:     "/",
		})

		frontendURL := os.Getenv("FRONTEND_URL")
		return c.Redirect("https://" + frontendURL)
	}
}

func GetCurrentUsers(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		sessionID := c.Cookies("session_id")

		if sessionID == "" {
			return c.JSON([]interface{}{})
		}

		sesID, err := strconv.Atoi(sessionID)
		if err != nil {
			return c.JSON([]interface{}{})
		}

		char, err := repo.GetCharacter(sesID)
		if err != nil {
			return c.JSON([]interface{}{})
		}

		return c.JSON([]models.Character{*char})
	}
}

func Logout(repo *database.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.ClearCookie("session_id", "session_id") // Pass key twice for cross-domain clearing in some browsers
		return c.SendStatus(200)
	}
}
