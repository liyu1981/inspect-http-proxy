package log

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/liyu1981/inspect-http-proxy-plus/pkg/core"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"gopkg.in/natefinch/lumberjack.v2"
)

func ResolveLogSettings() (string, string) {
	level := viper.GetString("log-level")
	dest := viper.GetString("log-dest")

	if dest == "" {
		if core.IsDev() {
			dest = "console"
		} else {
			dest = "default"
		}
	}

	if level == "" {
		if core.IsDev() {
			level = "debug"
		} else {
			level = core.LogLevelDisabled
		}
	}

	return level, dest
}

func getLogFilePath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	logDir := filepath.Join(home, ".ihpp", "logs")
	_ = os.MkdirAll(logDir, 0700)
	return filepath.Join(logDir, "ihpp.log")
}

func SetupLogger(logLevel string, logDest string) {
	if logLevel == core.LogLevelDisabled {
		zerolog.SetGlobalLevel(zerolog.Disabled)
		return
	}
	level, err := zerolog.ParseLevel(logLevel)
	if err != nil {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)

	var out io.Writer
	switch logDest {
	case "console":
		out = zerolog.ConsoleWriter{
			Out:        os.Stderr,
			TimeFormat: time.RFC3339,
		}
	case "default":
		if core.IsDev() {
			out = zerolog.ConsoleWriter{
				Out:        os.Stderr,
				TimeFormat: time.RFC3339,
			}
		} else {
			logFile := getLogFilePath()
			if logFile != "" {
				out = &lumberjack.Logger{
					Filename:   logFile,
					MaxSize:    20,
					MaxBackups: 3,
					LocalTime:  true,
					Compress:   true,
				}
			} else {
				out = zerolog.ConsoleWriter{
					Out:        os.Stderr,
					TimeFormat: time.RFC3339,
				}
			}
		}
	case "":
		if core.IsDev() {
			out = zerolog.ConsoleWriter{
				Out:        os.Stderr,
				TimeFormat: time.RFC3339,
			}
		} else {
			logFile := getLogFilePath()
			if logFile != "" {
				out = &lumberjack.Logger{
					Filename:   logFile,
					MaxSize:    20,
					MaxBackups: 3,
					LocalTime:  true,
					Compress:   true,
				}
			} else {
				out = zerolog.ConsoleWriter{
					Out:        os.Stderr,
					TimeFormat: time.RFC3339,
				}
			}
		}
	default:
		f, err := os.OpenFile(logDest, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error opening log file %s: %v. Falling back to console.\n", logDest, err)
			out = zerolog.ConsoleWriter{
				Out:        os.Stderr,
				TimeFormat: time.RFC3339,
			}
		} else {
			out = f
		}
	}

	log.Logger = log.Output(out).With().Caller().Logger()
}
