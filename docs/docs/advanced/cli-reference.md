# CLI Reference

`ihpp` can be customized using several command-line flags and environment variables.

## Command-Line Flags

### -listen `<address:port>`
The address for the management UI to listen on.
- **Default**: `:20003`

### -db `<path>`
The path to the SQLite database file where traffic history and bookmarks are stored.
- **Default**: `~/.proxy/proxy_logs.db`

### -config `<path>`
Path to the TOML configuration file for proxy settings.
- **Default**: Searches for `.proxy.config.toml` in the current directory.

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `IHPP_LISTEN` | Corresponds to `-listen` | `:20003` |
| `IHPP_DB` | Corresponds to `-db` | `~/.proxy/proxy_logs.db` |
| `IHPP_CONFIG` | Corresponds to `-config` | `.proxy.config.toml` |

## Log Control

### -log-dest `<console|null|file>`
Where to output application logs.
- **Default**: `console`

### -log-level `<debug|info|warn|error|disabled>`
Verbosity of the application logs.
- **Default**: `info`
