# SQLite FTS5 Integration Plan

This plan outlines the steps to integrate SQLite Full-Text Search (FTS5) into the `inspect-http-proxy-plus` project to provide powerful search capabilities across HTTP sessions.

## 1. Goal
Enable high-performance, full-text search for HTTP sessions, including:
- Request/Response paths and URLs
- Headers (keys and values)
- Body content (text-based)
- Status codes and status text

## 2. Technical Approach

### 2.1 Virtual Table
We will create an FTS5 virtual table `proxy_sessions_fts` that acts as an index for the `proxy_sessions` table.

```sql
CREATE VIRTUAL TABLE proxy_sessions_fts USING fts5(
    session_id UNINDEXED,
    request_method,
    request_path,
    request_query,
    request_host,
    request_url_full,
    request_headers,
    request_body,
    response_status_text,
    response_headers,
    response_body,
    tokenize="trigram"
);
```
*Note: We use the `trigram` tokenizer because it allows efficient substring matching, which is essential for searching paths, URLs, and header values.*

### 2.2 Synchronization (Triggers)
To keep the FTS index in sync with the main table, we will implement three triggers:
- `AFTER INSERT`: Insert a new entry into `proxy_sessions_fts`.
- `AFTER UPDATE`: Update the corresponding entry in `proxy_sessions_fts`.
- `AFTER DELETE`: Remove the entry from `proxy_sessions_fts`.

### 2.3 Build Configuration
The project uses `github.com/mattn/go-sqlite3` which requires the `fts5` build tag to enable FTS5 support.
- Update `.air.toml` to include `-tags fts5` in the build command.
- Update `scripts/build_and_copy_frontend.sh` (if it builds the proxy) or any other build scripts.

## 3. Implementation Steps

### Phase 1: Database Migration
1. Create `migrations/000003_add_proxy_sessions_fts.up.sql`:
    - Create the `proxy_sessions_fts` table.
    - Create `proxy_sessions_ai`, `proxy_sessions_au`, `proxy_sessions_ad` triggers.
    - Populate `proxy_sessions_fts` with existing data from `proxy_sessions`.
2. Create `migrations/000003_add_proxy_sessions_fts.down.sql`:
    - Drop triggers.
    - Drop the `proxy_sessions_fts` table.

### Phase 2: Go Backend (Core)
1. Add `SearchSessions` function to `pkg/core/model_proxy_session.go`.
    - Accept `configID`, `query` string, `limit`, and `offset`.
    - Construct a SQL query that JOINs `proxy_sessions` with `proxy_sessions_fts` using `MATCH`.
    - Return a list of `ProxySessionRow`.

### Phase 3: Go Backend (API)
1. Add a new API endpoint in `pkg/web/api/api_sessions.go`:
    - `GET /api/configs/:config_id/sessions/search?q=SEARCH_TERM`
2. Register the route in `pkg/web/api/api_routes.go`.

### Phase 4: Build System
1. Update `.air.toml`:
    ```toml
    cmd = "go build -tags fts5 -o ./tmp/proxy ./cmd/proxy/main.go"
    ```

### Phase 5: Frontend UI
1. Add a general search input field in `SessionList` component.
2. Implement debounced search that calls the new search API.
3. Display search results in the session list.

## 4. Considerations
- **Body Indexing (Text vs Binary)**: To avoid indexing large binary blobs (images, archives, etc.), we will use a conditional approach in the triggers. We will only index the body if the `Content-Type` indicates text-based content (e.g., contains "text", "json", "xml", or "javascript").
    - SQL logic: `CASE WHEN request_content_type LIKE '%text%' OR request_content_type LIKE '%json%' OR request_content_type LIKE '%xml%' OR request_content_type LIKE '%javascript%' THEN CAST(request_body AS TEXT) ELSE NULL END`
- **Performance**: FTS5 with trigram can increase the database size and slightly slow down writes. Given the proxy's use case, this is an acceptable trade-off for the search power it provides.
- **Query Syntax**: Users can use FTS5 query syntax (e.g., `path: /api` or `status: OK`). We should decide whether to expose this directly or escape it.
