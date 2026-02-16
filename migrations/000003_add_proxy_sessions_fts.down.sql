-- ============================================================
-- File: migrations/000003_add_proxy_sessions_fts.down.sql
-- Description: Remove FTS5 virtual table and triggers
-- ============================================================

DROP TRIGGER IF EXISTS proxy_sessions_ai;
DROP TRIGGER IF EXISTS proxy_sessions_au;
DROP TRIGGER IF EXISTS proxy_sessions_ad;
DROP TABLE IF EXISTS proxy_sessions_fts;
