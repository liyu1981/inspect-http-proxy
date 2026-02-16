# Design: Proxy Server Management Refactor (Revised)

This document outlines the refactor of proxy server management to allow dynamic creation, starting from historical configurations, and exporting current state to configuration files.

## 1. Core Changes: Strict Startup & Initialization

- Maintain current behavior: only start proxies specified in flags or config files at startup.
- Update `GlobalVarStore` to track whether a running proxy is "Persistent" (matches an entry in the current config file) or "Ephemeral/Dynamic" (created via UI).

## 2. Backend API Extensions

### New Endpoints:
- `GET /api/configs/history`: 
    - Default: returns last 10 unique configurations DESC by `created_at`.
    - Query Param: `q` for searching within `target_url` using SQL `LIKE`.
- `POST /api/proxyserver/create`: 
    - Create and start a new proxy server.
    - Set `SourcePath` to the current config file path (from `viper.ConfigFileUsed()`).
- `POST /api/proxyserver/export`: 
    - Surgical update of the current `.toml` file.
    - Preserves existing top-level settings (log level, etc.).
    - Overwrites only the `[[proxies]]` array with currently running servers.
- `GET /api/proxyserver/check-port/{port}`: Check if a port is in use.

## 3. Frontend UI Enhancements (`frontend/src/app/proxies/`)

### A. New Proxy Creation:
- Card at the top with `Listen Port`, `Target URL`, and `Truncate Body`.
- "Save & Start" button.

### B. History Dropdown (Type-ahead):
- Integrates with the "Create Proxy" form.
- Default: Show last 10 histories.
- Behavior: Search starts after 3 characters, debounced.
- Selecting an item populates the creation form.

### C. Config Cards:
- Maintain current "Stop" and "Start" style.
- **Unsaved Highlight**: Display a "Not Saved to Config" badge or icon for proxies that are running but not present in the current `.toml` file.

## 4. Implementation Details

### TOML Surgical Update:
- Use `github.com/pelletier/go-toml/v2`.
- Load current file into a map or document object.
- Update the `proxies` key with the list of currently running `SysConfigProxyEntry`.
- Save back to disk.

### History Search Logic:
- Since `ConfigJSON` stores the proxy details, the search will query the `proxy_configs` table.
- Use `json_extract(ConfigJSON, '$.target')` for precise searching if SQLite supports it, or `ConfigJSON LIKE %q%`.

## 5. Implementation Plan

1. **Backend: History API**
   - `handleConfigHistory` with search and limit logic.
2. **Backend: Dynamic Creation**
   - `handleProxyServerCreate` using current config path as `SourcePath`.
3. **Backend: Surgical Export**
   - `handleExportConfig` using `go-toml/v2`.
4. **Frontend: History Dropdown**
   - Implement `HistorySelector` component with debounce and type-ahead.
5. **Frontend: Create Card**
   - Implement `CreateProxyCard` and integrate with history.
6. **Frontend: Unsaved State**
   - Compare `allConfigs` against the `sysConfig.proxies` list to identify dynamic ones.
