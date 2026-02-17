# Database Schema

`ihpp` uses SQLite for all persistent data. This ensures portability and zero-configuration for the user.

## Tables

### `proxy_sessions`
The core table storing captured traffic.
- `id`: (UUID) Unique session ID.
- `config_id`: (String) ID of the proxy config that captured this request.
- `request_method`: (String) e.g., `GET`, `POST`.
- `request_url`: (String) Full target URL.
- `request_body`: (Blob) Captured request payload.
- `response_status`: (Integer) HTTP status code.
- `response_body`: (Blob) Captured response payload.
- `duration_ms`: (Integer) Total round-trip time.

### `proxy_configs`
Stores dynamic proxy configurations.
- `id`: (String) Unique identifier.
- `name`: (String)
- `listen`: (String)
- `target`: (String)

### `proxy_bookmarks`
Stores references to bookmarked sessions and saved notes.
- `session_id`: (UUID) Reference to `proxy_sessions`.
- `name`: (String) Custom title for the bookmark.
- `notes`: (String) Markdown-compatible user notes.

## Full-Text Search (FTS5)
`ihpp` utilizes SQLite's FTS5 extension to enable ultra-fast searching across:
- URL paths
- Header keys/values
- Request/Response bodies (text-based)
