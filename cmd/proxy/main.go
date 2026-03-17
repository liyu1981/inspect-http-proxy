package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"

	"github.com/liyu1981/inspect-http-proxy-plus/pkg/config"
	"github.com/liyu1981/inspect-http-proxy-plus/pkg/core"
	"github.com/liyu1981/inspect-http-proxy-plus/pkg/web"
)

func initFlags() {
	// Use pflag (POSIX compliant) for seamless Viper integration
	pflag.Bool("version", false, "Print version information")
	pflag.String("config", "", "Path to config file (default is ./.proxy.config.toml)")
	pflag.String("db-path", "", "Path to database file")
	pflag.Bool("in-memory", false, "Use in-memory database (no persistence)")
	pflag.String("log-level", "", "Log level: debug, info, warn, error, fatal, panic, disabled")
	pflag.String("log-dest", "", "Log destination: 'console', 'null', or a file path (default 'null', or 'console' in dev)")
	pflag.BoolP("daemon", "d", false, "Run in background as a daemon")

	pflag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Inspect HTTP Proxy Plus - A simple proxy to inspect and log HTTP requests.\n\n")
		fmt.Fprintf(os.Stderr, "Usage:\n  %s [options] [command] [proxy1] [proxy2] ...\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Options:\n")
		pflag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nCommands:\n")
		fmt.Fprintf(os.Stderr, "  stop      Stop the running daemon\n")
		fmt.Fprintf(os.Stderr, "  status    Show the status of the running daemon\n")
		fmt.Fprintf(os.Stderr, "\nProxy Format:\n")
		fmt.Fprintf(os.Stderr, "  target\n")
		fmt.Fprintf(os.Stderr, "  listen_port,target[,truncate]\n")
		fmt.Fprintf(os.Stderr, "  Example: :3000,http://localhost:8000,true\n")
		fmt.Fprintf(os.Stderr, "  Example: http://localhost:8000\n")
		fmt.Fprintf(os.Stderr, "  Multiple proxies: http://localhost:8000 http://localhost:8001\n")
	}
}

func handleSubcommands() bool {
	if pflag.NArg() == 0 {
		return false
	}

	cmd := pflag.Arg(0)
	switch cmd {
	case "stop":
		resp, err := core.SendDaemonCommand(core.DaemonCommand{Command: core.DaemonCommandStop})
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error stopping daemon: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("%s\n", resp.Message)
		os.Exit(0)
	case "status":
		resp, err := core.SendDaemonCommand(core.DaemonCommand{Command: core.DaemonCommandStatus})
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting daemon status: %v\n", err)
			os.Exit(1)
		}
		dataJson, _ := json.MarshalIndent(resp.Data, "", "  ")
		fmt.Printf("Daemon Status:\n%s\n", string(dataJson))
		os.Exit(0)
	default:
		// If it's not a known command, it might be a proxy argument
		return false
	}
	return false
}

func parseProxyFlag(proxyStr string, index int) (core.SysConfigProxyEntry, error) {
	parts := strings.Split(proxyStr, ",")

	var listen, target string
	truncate := true // Default to true as requested

	if len(parts) == 1 {
		// Only target provided, or only listen provided?
		// If it starts with http or contains :// it's likely a target
		if strings.Contains(parts[0], "://") || strings.HasPrefix(parts[0], "http") {
			target = strings.TrimSpace(parts[0])
			listen = fmt.Sprintf(":%d", 20003+index)
		} else {
			return core.SysConfigProxyEntry{}, fmt.Errorf("invalid proxy format: %s. If providing only one part, it must be the target URL", proxyStr)
		}
	} else {
		listen = strings.TrimSpace(parts[0])
		target = strings.TrimSpace(parts[1])
		if len(parts) >= 3 {
			truncateStr := strings.TrimSpace(parts[2])
			truncate = truncateStr == "true" || truncateStr == "1" || truncateStr == "yes"
		}
	}

	return core.SysConfigProxyEntry{
		Listen:          listen,
		Target:          target,
		TruncateLogBody: truncate,
	}, nil
}

func main() {
	initFlags()
	pflag.Parse()

	if ver, _ := pflag.CommandLine.GetBool("version"); ver {
		fmt.Printf("Inspect HTTP Proxy Plus version %s\n", core.Version)
		return
	}

	if handleSubcommands() {
		return
	}

	// Check for updates
	core.CheckForUpdates()

	// Load the config file (bootstrap for db-path and initial settings)
	config.LoadConfig()

	// Unmarshal into typed SysConfig struct
	var sysConfig core.SysConfig
	if err := viper.Unmarshal(&sysConfig); err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: Failed to unmarshal system configuration: %v\n", err)
		log.Fatal().Err(err).Msg("Failed to unmarshal system configuration")
	}

	// Handle in-memory flag
	if sysConfig.InMemory {
		sysConfig.DBPath = ":memory:"
	}
	if sysConfig.DBPath == "" {
		sysConfig.DBPath = core.DefaultDbPath()
	}

	// Override with command-line proxy positional arguments if provided
	proxyArgs := pflag.Args()
	if len(proxyArgs) > 0 {
		sysConfig.Proxies = make([]core.SysConfigProxyEntry, 0, len(proxyArgs))
		for i, proxyStr := range proxyArgs {
			entry, err := parseProxyFlag(proxyStr, i)
			if err != nil {
				fmt.Fprintf(os.Stderr, "FATAL: Failed to parse proxy argument '%s': %v\n", proxyStr, err)
				log.Fatal().Err(err).Str("proxy", proxyStr).Msg("Failed to parse proxy argument")
			}
			sysConfig.Proxies = append(sysConfig.Proxies, entry)
		}
	}

	// Check if daemon is already running and handle proxy merging
	daemonCheck, err := core.CheckDaemonAndGetNewProxies(sysConfig.Proxies)
	if err == nil && daemonCheck.IsRunning {
		fmt.Print(daemonCheck.ResponseMsg)

		if len(daemonCheck.NewProxies) > 0 {
			fmt.Printf("%d new/different proxies found. Do you want to merge them into the existing instance? (y/n): ", len(daemonCheck.NewProxies))
			var response string
			fmt.Scanln(&response)
			if strings.ToLower(response) == "y" || strings.ToLower(response) == "yes" {
				resp, err := core.MergeProxiesIntoDaemon(daemonCheck.MergeProxies)
				if err != nil {
					fmt.Fprintf(os.Stderr, "Error merging proxies: %v\n", err)
					os.Exit(1)
				}
				dataJson, _ := json.MarshalIndent(resp.Data, "", "  ")
				fmt.Printf("%s\n%s\n", resp.Message, string(dataJson))
				os.Exit(0)
			}
		}
		os.Exit(0)
	}

	core.CleanupStaleSocket()

	daemonFlag, _ := pflag.CommandLine.GetBool("daemon")
	if daemonFlag {
		if err := core.Daemonize(); err != nil {
			fmt.Fprintf(os.Stderr, "Error starting daemon: %v\n", err)
			os.Exit(1)
		}
	}

	if err := core.WritePIDFile(); err != nil {
		log.Warn().Err(err).Msg("Failed to write PID file")
	}
	defer core.RemovePIDFile()

	// Initialize database (needed for persistent settings)
	// Use resolved settings from config/flags for bootstrap
	db, err := core.InitDatabase(sysConfig.DBPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: Database initialization failed: %v\n", err)
		log.Fatal().Err(err).Msg("Database initialization failed")
	}

	// Load persistent settings from DB, falling back to config file/defaults
	config.LoadSettingsFromDB(db, &sysConfig)

	// Setup logger and global config early with final settings from DB
	log.Debug().Interface("sysConfig", sysConfig).Msg("System config")
	core.GlobalVar.SetSysConfig(&sysConfig)

	// Validate proxy entries
	if len(sysConfig.Proxies) == 0 {
		log.Warn().Msg("No [[proxies]] entries found in configuration. Only UI server will be active.")
	}

	startTime := time.Now()

	// Initialize single shared UI server
	uiServer, err := web.StartUIServer(db, sysConfig.APIAddr)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to start UI server")
	}
	if uiServer != nil {
		fmt.Printf("%sUI Server:%s http://%s\n", core.ColorCyan, core.ColorReset, sysConfig.APIAddr)
	}

	// Start the reaper
	publishFunc := func(topic string, v any) {
		if uiServer != nil && uiServer.ApiHandler != nil {
			uiServer.ApiHandler.Publish(topic, v)
		}
	}
	reaper := core.NewMaxSessionRowsReaper(db, publishFunc)
	reaper.Start(5 * time.Minute)

	// Loop through all proxy entries and create corresponding threads
	for i, proxyEntry := range sysConfig.Proxies {
		err := core.StartProxyServer(i, proxyEntry, db, publishFunc)
		if err != nil {
			fmt.Fprintf(os.Stderr, "WARNING: Skipping proxy entry %d due to error: %v\n", i, err)
			log.Warn().Err(err).Int("index", i).Msg("Skipping malformed proxy entry")
		}
	}

	// Graceful shutdown handler
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	// Start Daemon Listener
	err = core.StartDaemonListener(
		func() {
			shutdown <- syscall.SIGTERM
		},
		func(newProxies []core.SysConfigProxyEntry) any {
			results := make([]map[string]any, 0)
			for _, newProxy := range newProxies {
				found := false
				for _, existing := range sysConfig.Proxies {
					if existing.Listen == newProxy.Listen {
						if existing.Target == newProxy.Target {
							results = append(results, map[string]any{
								"proxy":  newProxy.Listen,
								"result": "ignored",
								"reason": "identical config exists",
							})
						} else {
							results = append(results, map[string]any{
								"proxy":  newProxy.Listen,
								"result": "conflict",
								"reason": "port already in use by another target",
							})
						}
						found = true
						break
					}
				}
				if !found {
					err := core.StartProxyServer(len(sysConfig.Proxies), newProxy, db, publishFunc)
					if err != nil {
						results = append(results, map[string]any{
							"proxy":  newProxy.Listen,
							"result": "error",
							"reason": err.Error(),
						})
						newProxy.Active = false
						newProxy.Error = err.Error()
					} else {
						results = append(results, map[string]any{
							"proxy":  newProxy.Listen,
							"result": "success",
						})
						newProxy.Active = true
					}
					sysConfig.Proxies = append(sysConfig.Proxies, newProxy)
				}
			}
			return results
		},
		func() any {
			// Enrich with active status from GlobalVarStore
			allServers := core.GlobalVar.GetAllProxyServers()
			enrichedProxies := make([]map[string]any, 0)

			// Get actual proxy configs from GlobalVarStore to see their IDs and settings
			idToConfig := core.GlobalVar.GetAllProxyConfigs()

			for id, config := range idToConfig {
				active := false
				if _, ok := allServers[id]; ok {
					active = true
				}
				enrichedProxies = append(enrichedProxies, map[string]any{
					"config_id": id,
					"listen":    config.ListenAddr,
					"target":    config.TargetURL.String(),
					"active":    active,
				})
			}

			return map[string]any{
				"pid":      os.Getpid(),
				"uptime":   time.Since(startTime).String(),
				"db_path":  sysConfig.DBPath,
				"api_addr": sysConfig.APIAddr,
				"proxies":  enrichedProxies,
			}
		},
	)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to start daemon listener")
	}

	<-shutdown
	log.Info().Msg("Shutting down...")

	// Close all proxy servers from GlobalVarStore
	allProxyServers := core.GlobalVar.GetAllProxyServers()
	for configID, srv := range allProxyServers {
		log.Info().Str("config_id", configID).Msg("Closing proxy server")
		srv.Close()
	}

	// Close UI server
	if uiServer != nil {
		log.Info().Msg("Closing UI server")
		uiServer.Shutdown()
	}

	log.Info().Msg("Shutdown complete")
}
