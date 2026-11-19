package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestVendorAssetsServing(t *testing.T) {
	router := setupRouter()

	testCases := []struct {
		url          string
		expectedCode int
		expectedMime string
		minBytes     int
	}{
		{"/vendor/chart.umd.min.js", http.StatusOK, "application/javascript", 100000},
		{"/vendor/sweetalert2.all.min.js", http.StatusOK, "application/javascript", 50000},
		{"/vendor/tailwind.dashboard.min.css", http.StatusOK, "text/css", 10000},
		{"/vendor/not-found-asset.js", http.StatusNotFound, "text/plain; charset=utf-8", 0},
	}

	for _, tc := range testCases {
		req := httptest.NewRequest("GET", tc.url, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != tc.expectedCode {
			t.Fatalf("[%s] Expected HTTP %d, got %d", tc.url, tc.expectedCode, rec.Code)
		}

		if tc.expectedCode == 200 {
			contentType := rec.Header().Get("Content-Type")
			if !strings.HasPrefix(contentType, tc.expectedMime) {
				t.Fatalf("[%s] Expected Content-Type %s, got %s", tc.url, tc.expectedMime, contentType)
			}
			if rec.Body.Len() < tc.minBytes {
				t.Fatalf("[%s] Expected at least %d bytes, got %d", tc.url, tc.minBytes, rec.Body.Len())
			}
		}
	}
}

func TestNoCDNInLegacyHTML(t *testing.T) {
	router := setupRouter()

	pages := []string{"/kasir", "/admin", "/dashboard"}

	for _, page := range pages {
		req := httptest.NewRequest("GET", page, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != 200 {
			t.Fatalf("[%s] Expected HTTP 200, got %d", page, rec.Code)
		}

		body := rec.Body.String()
		if strings.Contains(body, "cdn.tailwindcss.com") {
			t.Fatalf("[%s] Still contains CDN tailwindcss: %s", page, body)
		}
		if strings.Contains(body, "cdn.jsdelivr.net/npm/chart.js") {
			t.Fatalf("[%s] Still contains CDN chart.js: %s", page, body)
		}
		if strings.Contains(body, "cdn.jsdelivr.net/npm/sweetalert2") {
			t.Fatalf("[%s] Still contains CDN sweetalert2: %s", page, body)
		}

		if !strings.Contains(body, "/vendor/") {
			t.Fatalf("[%s] Expected /vendor/ asset link in page, not found", page)
		}
	}
}
