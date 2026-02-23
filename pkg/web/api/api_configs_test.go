package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/liyu1981/inspect-http-proxy-plus/pkg/core"
)

func TestHandleConfigs(t *testing.T) {
	db := setupTestDB(t)
	handler := NewHandler(&ApiConfig{DB: db})
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// 1. Create some config history
	config1, _ := core.GetOrCreateConfigRow(db, "src1", "cwd1", `{"p":1}`)
	core.GetOrCreateConfigRow(db, "src2", "cwd2", `{"p":2}`)

	// 2. Test GET /api/configs/history
	req := httptest.NewRequest("GET", "/api/configs/history", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
	var history []any
	json.NewDecoder(w.Body).Decode(&history)
	if len(history) != 2 {
		t.Errorf("Expected 2 history items, got %d", len(history))
	}

	// 3. Test GET /api/configs/{id}
	req = httptest.NewRequest("GET", "/api/configs/"+config1.ID, nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	// 4. Test GET /api/configs
	core.GlobalVar.ConfigClear()
	core.GlobalVar.ConfigAdd(config1.ID)

	req = httptest.NewRequest("GET", "/api/configs", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
	var configs []any
	json.NewDecoder(w.Body).Decode(&configs)
	if len(configs) != 2 {
		t.Errorf("Expected 2 configs, got %d", len(configs))
	}

	// 5. Test GET /api/configs/{id}/sessions
	core.CreateProxySession(db, &core.LogEntry{
		ConfigID:   config1.ID,
		RequestURL: &url.URL{Path: "/sessions-test"},
	})
	req = httptest.NewRequest("GET", "/api/configs/"+config1.ID+"/sessions", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestHandleDeleteConfig(t *testing.T) {
	db := setupTestDB(t)
	handler := NewHandler(&ApiConfig{DB: db})
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// 1. Create a config and some sessions
	config, _ := core.GetOrCreateConfigRow(db, "src-del", "cwd-del", `{"p":100}`)
	core.CreateProxySession(db, &core.LogEntry{
		ConfigID:   config.ID,
		RequestURL: &url.URL{Path: "/to-be-deleted-1"},
	})
	core.CreateProxySession(db, &core.LogEntry{
		ConfigID:   config.ID,
		RequestURL: &url.URL{Path: "/to-be-deleted-2"},
	})

	// 2. Test DELETE /api/configs/{id} - Success case
	req := httptest.NewRequest("DELETE", "/api/configs/"+config.ID, nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	// Verify deletion
	var configCount int64
	db.Model(&core.ProxyConfigRow{}).Where("id = ?", config.ID).Count(&configCount)
	if configCount != 0 {
		t.Errorf("Expected config to be deleted, but it still exists")
	}

	var sessionCount int64
	db.Model(&core.ProxySessionRow{}).Where("config_id = ?", config.ID).Count(&sessionCount)
	if sessionCount != 0 {
		t.Errorf("Expected sessions to be deleted, but %d still exist", sessionCount)
	}

	// 3. Test DELETE /api/configs/{id} - Active config case
	activeConfig, _ := core.GetOrCreateConfigRow(db, "src-active", "cwd-active", `{"p":200}`)
	core.GlobalVar.AddProxyServer(activeConfig.ID, &http.Server{}) // Mock as active

	req = httptest.NewRequest("DELETE", "/api/configs/"+activeConfig.ID, nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("Expected status 409 (Conflict) for active config, got %d", w.Code)
	}

	// 4. Test DELETE /api/configs/{id} - Not found case (should still return 200 or 404? Implementation uses Delete which is idempotent in GORM usually)
	// Current implementation: tx.Delete(&core.ProxyConfigRow{}, "id = ?", id)
	req = httptest.NewRequest("DELETE", "/api/configs/non-existent-id", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 (idempotent delete), got %d", w.Code)
	}
}
