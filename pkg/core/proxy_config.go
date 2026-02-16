package core

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/pelletier/go-toml/v2"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"gorm.io/gorm"
)

// RegisterConfiguration handles the registration of current configuration with the database
// Returns the configuration ID that can be used to link proxy sessions
func RegisterConfiguration(db *gorm.DB, proxyEntry SysConfigProxyEntry) (string, error) {
	if db == nil {
		return "", nil
	}

	sourcePath := viper.ConfigFileUsed()
	if sourcePath == "" {
		sourcePath = "cli-flags"
	}

	cwd, err := os.Getwd()
	if err != nil {
		log.Warn().Err(err).Msg("Could not determine current working directory")
		cwd = "."
	}

	// Generate JSON representation of all current settings
	settingsMap := proxyEntry
	settingsBytes, err := json.Marshal(settingsMap)
	if err != nil {
		return "", err
	}
	configJSON := string(settingsBytes)

	// Get or Create Config Row
	configRow, err := GetOrCreateConfigRow(db, sourcePath, cwd, configJSON)
	if err != nil {
		return "", err
	}

	log.Info().Str("config_id", configRow.ID).Msg("Configuration session initialized")
	return configRow.ID, nil
}

// ExportCurrentProxiesToConfig surgically updates the current config file with active proxies
func ExportCurrentProxiesToConfig() error {
	configFile := viper.ConfigFileUsed()
	if configFile == "" {
		return fmt.Errorf("no config file currently in use")
	}

	// Read existing content
	content, err := os.ReadFile(configFile)
	if err != nil {
		return fmt.Errorf("failed to read config file: %w", err)
	}

	var data map[string]any
	if err := toml.Unmarshal(content, &data); err != nil {
		return fmt.Errorf("failed to parse TOML: %w", err)
	}

	// Get active proxies
	activeIDs := GlobalVar.ConfigGetAll()
	var activeProxies []SysConfigProxyEntry
	for _, id := range activeIDs {
		pc := GlobalVar.GetProxyConfig(id)
		if pc != nil && GlobalVar.HasProxyServer(id) {
			activeProxies = append(activeProxies, SysConfigProxyEntry{
				Listen:          pc.ListenAddr,
				Target:          pc.TargetURL.String(),
				TruncateLogBody: pc.TruncateLogBody,
			})
		}
	}

	// Update only the proxies field
	data["proxies"] = activeProxies

	// Update in-memory GlobalVar sysConfig too
	sysConfig := GlobalVar.GetSysConfig()
	if sysConfig != nil {
		sysConfig.Proxies = activeProxies
		GlobalVar.SetSysConfig(sysConfig)
	}

	// Write back
	newContent, err := toml.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal TOML: %w", err)
	}

	if err := os.WriteFile(configFile, newContent, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}
