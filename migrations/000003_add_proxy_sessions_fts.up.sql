-- ============================================================
-- File: migrations/000003_add_proxy_sessions_fts.up.sql
-- Description: Add FTS5 virtual table for session searching
-- ============================================================

-- Create FTS5 virtual table
-- Using trigram tokenizer for substring matching
CREATE VIRTUAL TABLE IF NOT EXISTS proxy_sessions_fts USING fts5(
    session_id UNINDEXED,
    config_id UNINDEXED,
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

-- Populate with existing data
INSERT INTO proxy_sessions_fts (
    session_id,
    config_id,
    request_method,
    request_path,
    request_query,
    request_host,
    request_url_full,
    request_headers,
    request_body,
    response_status_text,
    response_headers,
    response_body
)
SELECT 
    id,
    config_id,
    request_method,
    request_path,
    request_query,
    request_host,
    request_url_full,
    request_headers,
    CASE 
        WHEN request_content_type LIKE '%text%' 
          OR request_content_type LIKE '%json%' 
          OR request_content_type LIKE '%xml%' 
          OR request_content_type LIKE '%javascript%' 
          OR request_content_type LIKE '%x-www-form-urlencoded%'
        THEN CAST(request_body AS TEXT) 
        ELSE NULL 
    END,
    response_status_text,
    response_headers,
    CASE 
        WHEN response_content_type LIKE '%text%' 
          OR response_content_type LIKE '%json%' 
          OR response_content_type LIKE '%xml%' 
          OR response_content_type LIKE '%javascript%' 
        THEN CAST(response_body AS TEXT) 
        ELSE NULL 
    END
FROM proxy_sessions;

-- Triggers to keep FTS index in sync

-- AFTER INSERT
CREATE TRIGGER IF NOT EXISTS proxy_sessions_ai AFTER INSERT ON proxy_sessions BEGIN
    INSERT INTO proxy_sessions_fts (
        session_id,
        config_id,
        request_method,
        request_path,
        request_query,
        request_host,
        request_url_full,
        request_headers,
        request_body,
        response_status_text,
        response_headers,
        response_body
    ) VALUES (
        new.id,
        new.config_id,
        new.request_method,
        new.request_path,
        new.request_query,
        new.request_host,
        new.request_url_full,
        new.request_headers,
        CASE 
            WHEN new.request_content_type LIKE '%text%' 
              OR new.request_content_type LIKE '%json%' 
              OR new.request_content_type LIKE '%xml%' 
              OR new.request_content_type LIKE '%javascript%' 
              OR new.request_content_type LIKE '%x-www-form-urlencoded%'
            THEN CAST(new.request_body AS TEXT) 
            ELSE NULL 
        END,
        new.response_status_text,
        new.response_headers,
        CASE 
            WHEN new.response_content_type LIKE '%text%' 
              OR new.response_content_type LIKE '%json%' 
              OR new.response_content_type LIKE '%xml%' 
              OR new.response_content_type LIKE '%javascript%' 
            THEN CAST(new.response_body AS TEXT) 
            ELSE NULL 
        END
    );
END;

-- AFTER UPDATE
CREATE TRIGGER IF NOT EXISTS proxy_sessions_au AFTER UPDATE ON proxy_sessions BEGIN
    UPDATE proxy_sessions_fts SET
        config_id = new.config_id,
        request_method = new.request_method,
        request_path = new.request_path,
        request_query = new.request_query,
        request_host = new.request_host,
        request_url_full = new.request_url_full,
        request_headers = new.request_headers,
        request_body = CASE 
            WHEN new.request_content_type LIKE '%text%' 
              OR new.request_content_type LIKE '%json%' 
              OR new.request_content_type LIKE '%xml%' 
              OR new.request_content_type LIKE '%javascript%' 
              OR new.request_content_type LIKE '%x-www-form-urlencoded%'
            THEN CAST(new.request_body AS TEXT) 
            ELSE NULL 
        END,
        response_status_text = new.response_status_text,
        response_headers = new.response_headers,
        response_body = CASE 
            WHEN new.response_content_type LIKE '%text%' 
              OR new.response_content_type LIKE '%json%' 
              OR new.response_content_type LIKE '%xml%' 
              OR new.response_content_type LIKE '%javascript%' 
            THEN CAST(new.response_body AS TEXT) 
            ELSE NULL 
        END
    WHERE session_id = old.id;
END;

-- AFTER DELETE
CREATE TRIGGER IF NOT EXISTS proxy_sessions_ad AFTER DELETE ON proxy_sessions BEGIN
    DELETE FROM proxy_sessions_fts WHERE session_id = old.id;
END;
