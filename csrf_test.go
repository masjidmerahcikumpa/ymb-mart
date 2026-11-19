package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestCSRFValidation(t *testing.T) {
	sessionToken := "test-session-token-12345"
	bearerSession := "Bearer " + sessionToken

	// 1. Empty token must fail
	if validateCSRF("", sessionToken) {
		t.Fatal("Expected empty CSRF token to be rejected, but it passed")
	}

	// 2. Empty session must fail
	validToken := generateCSRFToken(sessionToken)
	if validateCSRF(validToken, "") {
		t.Fatal("Expected empty session token to be rejected, but it passed")
	}

	// 3. Valid token with matching session must pass
	if !validateCSRF(validToken, sessionToken) {
		t.Fatal("Expected valid CSRF token to pass, but it failed")
	}

	// 4. Valid token with Bearer-prefixed session must pass
	if !validateCSRF(validToken, bearerSession) {
		t.Fatal("Expected valid CSRF token with Bearer session to pass, but it failed")
	}

	// 5. Valid token with different session must fail
	otherSession := "different-session-token-99999"
	if validateCSRF(validToken, otherSession) {
		t.Fatal("Expected CSRF token with different session to fail, but it passed")
	}

	// 6. Tampered signature must fail
	tampered := validToken + "xyz"
	if validateCSRF(tampered, sessionToken) {
		t.Fatal("Expected tampered CSRF token to fail, but it passed")
	}

	// 7. Expired token (>24h) must fail
	expiredTs := fmt.Sprintf("%d", time.Now().Unix()-90000)
	expiredToken := expiredTs + ".fakesignature"
	if validateCSRF(expiredToken, sessionToken) {
		t.Fatal("Expected expired CSRF token to fail, but it passed")
	}
}

func TestRequireCSRFMiddleware(t *testing.T) {
	// Register mock session in sessions map
	testToken := "mock-auth-token-test-xyz"
	sessionsMu.Lock()
	sessions[testToken] = &session{
		username:  "testuser",
		role:      "cashier",
		expiresAt: time.Now().Add(1 * time.Hour),
	}
	sessionsMu.Unlock()

	defer func() {
		sessionsMu.Lock()
		delete(sessions, testToken)
		sessionsMu.Unlock()
	}()

	dummyHandler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success"}`))
	}
	guarded := requireCSRF(dummyHandler)

	// Test 1: GET request bypasses CSRF check
	{
		req := httptest.NewRequest("GET", "/api/test", nil)
		rec := httptest.NewRecorder()
		guarded(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("Expected GET to pass without CSRF, got code %d", rec.Code)
		}
	}

	// Test 2: POST without Authorization returns 401
	{
		req := httptest.NewRequest("POST", "/api/test", strings.NewReader(`{}`))
		rec := httptest.NewRecorder()
		guarded(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("Expected POST without auth to return 401, got %d", rec.Code)
		}
	}

	// Test 3: POST with valid Auth but MISSING CSRF returns 403
	{
		req := httptest.NewRequest("POST", "/api/test", strings.NewReader(`{}`))
		req.Header.Set("Authorization", testToken)
		rec := httptest.NewRecorder()
		guarded(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("Expected POST without CSRF token to return 403, got %d", rec.Code)
		}
		var resp map[string]string
		json.Unmarshal(rec.Body.Bytes(), &resp)
		if !strings.Contains(resp["error"], "CSRF") {
			t.Fatalf("Expected CSRF error message, got %v", resp)
		}
	}

	// Test 4: POST with valid Auth but INVALID CSRF returns 403
	{
		req := httptest.NewRequest("POST", "/api/test", strings.NewReader(`{}`))
		req.Header.Set("Authorization", testToken)
		req.Header.Set("X-CSRF-Token", "invalid-csrf-token")
		rec := httptest.NewRecorder()
		guarded(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("Expected POST with invalid CSRF token to return 403, got %d", rec.Code)
		}
	}

	// Test 5: POST with valid Auth and VALID CSRF in header returns 200
	{
		csrfToken := generateCSRFToken(testToken)
		req := httptest.NewRequest("POST", "/api/test", strings.NewReader(`{}`))
		req.Header.Set("Authorization", testToken)
		req.Header.Set("X-CSRF-Token", csrfToken)
		rec := httptest.NewRecorder()
		guarded(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("Expected POST with valid CSRF token to return 200, got %d (body: %s)", rec.Code, rec.Body.String())
		}
	}

	// Test 6: POST with valid Auth and VALID CSRF in FormValue returns 200
	{
		csrfToken := generateCSRFToken(testToken)
		form := url.Values{}
		form.Set("csrf_token", csrfToken)
		req := httptest.NewRequest("POST", "/api/test?"+form.Encode(), nil)
		req.Header.Set("Authorization", testToken)
		rec := httptest.NewRecorder()
		guarded(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("Expected POST with valid form CSRF token to return 200, got %d (body: %s)", rec.Code, rec.Body.String())
		}
	}
}

func TestRouterCSRFRoutes(t *testing.T) {
	mockDB, err := sql.Open("sqlite", ":memory:")
	if err == nil {
		oldDB := db
		db = mockDB
		defer func() {
			mockDB.Close()
			db = oldDB
		}()
	}

	testToken := "mock-admin-token-test-router"
	sessionsMu.Lock()
	sessions[testToken] = &session{
		username:  "admin",
		role:      "admin",
		expiresAt: time.Now().Add(1 * time.Hour),
	}
	sessionsMu.Unlock()

	defer func() {
		sessionsMu.Lock()
		delete(sessions, testToken)
		sessionsMu.Unlock()
	}()

	router := setupRouter()

	endpoints := []struct {
		method string
		path   string
	}{
		{"POST", "/api/checkout"},
		{"POST", "/api/shifts/open"},
		{"POST", "/api/shifts/123/close-self"},
		{"POST", "/api/change-password"},
		{"POST", "/api/users"},
		{"POST", "/api/users/1/toggle"},
		{"POST", "/api/products"},
		{"PUT", "/api/products/1"},
		{"DELETE", "/api/products/1"},
		{"POST", "/api/cash/drop"},
		{"POST", "/api/cash/in"},
		{"POST", "/api/stock-adjustment"},
		{"POST", "/api/stock-opname"},
		{"PUT", "/api/settings"},
		{"POST", "/api/settings"},
		{"PUT", "/api/ai/settings"},
		{"PUT", "/api/transactions/1/void"},
		{"DELETE", "/api/holds/1"},
	}

	for _, ep := range endpoints {
		// Without CSRF token: must be rejected with 403 Forbidden
		req := httptest.NewRequest(ep.method, ep.path, strings.NewReader(`{}`))
		req.Header.Set("Authorization", testToken)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("[%s %s] Expected 403 Forbidden without CSRF, got %d (body: %s)", ep.method, ep.path, rec.Code, rec.Body.String())
		}

		// With valid CSRF token: must NOT be 403 Forbidden (may fail on payload/db, but CSRF passed)
		csrfToken := generateCSRFToken(testToken)
		reqValid := httptest.NewRequest(ep.method, ep.path, strings.NewReader(`{}`))
		reqValid.Header.Set("Authorization", testToken)
		reqValid.Header.Set("X-CSRF-Token", csrfToken)
		recValid := httptest.NewRecorder()

		func() {
			defer func() {
				// Recover if handler tries to query non-existent in-memory table
				recover()
			}()
			router.ServeHTTP(recValid, reqValid)
		}()

		if recValid.Code == http.StatusForbidden {
			t.Errorf("[%s %s] Expected CSRF to pass with valid token, but got 403 Forbidden (body: %s)", ep.method, ep.path, recValid.Body.String())
		}
	}
}
