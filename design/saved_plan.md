# Plan: Bookmark Session Feature

## Overview

Add functionality to save specific session records as "bookmarks" in the database. Unlike a simple reference, a bookmark will **copy** the entire session record into a dedicated `proxy_bookmarks` table. This ensures that bookmarked sessions remain available even if the main `proxy_sessions` table is cleared or pruned to save space.

## Feature Goals

- Allow users to bookmark/save specific HTTP sessions with a single click.
- Store a complete copy of the session data in the `proxy_bookmarks` table.
- Support optional `note` and `tags` for each bookmark (can be added/edited later).
- Provide Full-Text Search (FTS5) for bookmarked sessions.
- Provide UI to view, manage, and delete bookmarks.

---

## 1. Database Design

### 1.1 New Table: `proxy_bookmarks`

**File:** `migrations/000004_add_proxy_bookmarks.up.sql`

This table duplicates the schema of `proxy_sessions` but adds bookmark-specific metadata and removes the foreign key constraint to `proxy_sessions` to allow the original record to be deleted.

```sql
CREATE TABLE IF NOT EXISTS proxy_bookmarks (
    id TEXT PRIMARY KEY NOT NULL, -- NanoID for the bookmark
    session_id TEXT NOT NULL,      -- Reference to the original session ID (informational)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- User metadata
    note TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '', -- Comma-separated or space-separated tags

    -- Copied from proxy_sessions
    timestamp DATETIME NOT NULL,
    duration_ms INTEGER NOT NULL,
    client_addr TEXT NOT NULL,
    client_ip TEXT,
    request_method TEXT NOT NULL,
    request_path TEXT NOT NULL,
    request_query TEXT,
    request_proto TEXT NOT NULL,
    request_host TEXT NOT NULL,
    request_url_full TEXT NOT NULL,
    request_headers TEXT,
    query_parameters TEXT,
    request_body BLOB,
    request_body_size INTEGER DEFAULT 0,
    request_content_type TEXT,
    request_content_encoding TEXT,
    response_status_code INTEGER NOT NULL,
    response_status_text TEXT,
    response_headers TEXT,
    response_body BLOB,
    response_body_size INTEGER DEFAULT 0,
    response_content_type TEXT,
    response_content_encoding TEXT,
    config_id TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_timestamp ON proxy_bookmarks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_config_id ON proxy_bookmarks(config_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_method_path ON proxy_bookmarks(request_method, request_path);
CREATE INDEX IF NOT EXISTS idx_bookmarks_status ON proxy_bookmarks(response_status_code);
```

### 1.2 FTS Table: `proxy_bookmarks_fts`

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS proxy_bookmarks_fts USING fts5(
    bookmark_id UNINDEXED,
    config_id UNINDEXED,
    note,
    tags,
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

-- Triggers to keep FTS index in sync for bookmarks
CREATE TRIGGER IF NOT EXISTS proxy_bookmarks_ai AFTER INSERT ON proxy_bookmarks BEGIN
    INSERT INTO proxy_bookmarks_fts (
        bookmark_id, config_id, note, tags, request_method, request_path, request_query,
        request_host, request_url_full, request_headers, request_body,
        response_status_text, response_headers, response_body
    ) VALUES (
        new.id, new.config_id, new.note, new.tags, new.request_method, new.request_path, new.request_query,
        new.request_host, new.request_url_full, new.request_headers,
        CASE 
            WHEN new.request_content_type LIKE '%text%' OR new.request_content_type LIKE '%json%' THEN CAST(new.request_body AS TEXT) 
            ELSE NULL 
        END,
        new.response_status_text, new.response_headers,
        CASE 
            WHEN new.response_content_type LIKE '%text%' OR new.response_content_type LIKE '%json%' THEN CAST(new.response_body AS TEXT) 
            ELSE NULL 
        END
    );
END;

CREATE TRIGGER IF NOT EXISTS proxy_bookmarks_au AFTER UPDATE ON proxy_bookmarks BEGIN
    UPDATE proxy_bookmarks_fts SET
        note = new.note,
        tags = new.tags
        -- FTS only needs to update user-editable metadata here
    WHERE bookmark_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS proxy_bookmarks_ad AFTER DELETE ON proxy_bookmarks BEGIN
    DELETE FROM proxy_bookmarks_fts WHERE bookmark_id = old.id;
END;
```

---

## 2. Backend Implementation

### 2.1 Data Model

**File:** `pkg/core/model_proxy_bookmark.go`

```go
type ProxyBookmark struct {
    ID        string    `gorm:"primaryKey;type:text"`
    SessionID string    `gorm:"index"`
    CreatedAt time.Time `gorm:"autoCreateTime"`
    
    Note      string
    Tags      string

    // Full copy of ProxySession fields
    Timestamp                time.Time `gorm:"index"`
    DurationMs               int64
    ClientAddr               string
    ClientIP                 string
    RequestMethod            string `gorm:"index"`
    RequestPath              string `gorm:"index"`
    RequestQuery             string
    RequestProto             string
    RequestHost              string
    RequestURLFull           string
    RequestHeaders           string
    QueryParameters          string
    RequestBody              []byte
    RequestBodySize          int64
    RequestContentType       string
    RequestContentEncoding   string
    ResponseStatusCode       int `gorm:"index"`
    ResponseStatusText       string
    ResponseHeaders          string
    ResponseBody             []byte
    ResponseBodySize         int64
    ResponseContentType      string
    ResponseContentEncoding  string
    ConfigID                 string `gorm:"index"`
}
```

### 2.2 CRUD Operations

- `CreateBookmark(sessionID string)`: Fetches the session from `proxy_sessions` and inserts a copy into `proxy_bookmarks` with empty `note` and `tags`.
- `GetBookmarks(configID string, query string)`: Support FTS search across bookmarks.
- `UpdateBookmarkMetadata(id string, note string, tags string)`: Update user-provided fields.
- `DeleteBookmark(id string)`: Remove the bookmark record.
- `IsSessionBookmarked(sessionID string)`: Check if a session already has a bookmark.

---

## 3. Frontend Implementation

### 3.1 UI Components

- **Bookmark Button**: Add a simple "Bookmark" button (icon-only or icon+text) in the `SessionDetails` component. 
    - Clicking it immediately creates a bookmark.
    - If already bookmarked, the icon should reflect the state (e.g., filled bookmark icon) and potentially allow navigation to the bookmark or deletion.
- **Bookmarks Page**: A new view (e.g., `/bookmarks`) to list all saved sessions.
    - Similar layout to the History page.
    - Inline editing or a simple side panel to update `note` and `tags`.
- **Search**: The search bar in the Bookmarks page will query the `proxy_bookmarks_fts` table.

---

## 4. Implementation Steps

1.  **Migration**: Create `000004_add_proxy_bookmarks.up.sql` with the schema, FTS table, and triggers.
2.  **Core Logic**: Implement `ProxyBookmark` model and the "Copy-on-Bookmark" CRUD logic.
3.  **API**: 
    - `POST /api/bookmarks/{session_id}`: Create bookmark.
    - `GET /api/bookmarks`: List bookmarks (with search/config filtering).
    - `PATCH /api/bookmarks/{id}`: Update note/tags.
    - `DELETE /api/bookmarks/{id}`: Remove bookmark.
4.  **Frontend**: 
    - Add bookmark button to `SessionDetails`.
    - Create the `/bookmarks` page for management.
