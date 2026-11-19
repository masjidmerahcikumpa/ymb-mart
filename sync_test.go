package main

import (
	"database/sql"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestCheckAPIConnectivity_Unconfigured(t *testing.T) {
	origDB := cloudDB
	origHost := cloudTargetHost
	origPort := cloudTargetPort
	defer func() {
		cloudDB = origDB
		cloudTargetHost = origHost
		cloudTargetPort = origPort
	}()

	cloudDB = nil
	cloudTargetHost = ""
	cloudTargetPort = ""

	online, err := checkAPIConnectivity()
	if online || err == nil {
		t.Fatalf("Expected checkAPIConnectivity to return false when unconfigured, got online=%v, err=%v", online, err)
	}
	if !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("Expected 'not configured' error, got %v", err)
	}
}

func TestCheckAPIConnectivity_UnreachableHost(t *testing.T) {
	origDB := cloudDB
	origHost := cloudTargetHost
	origPort := cloudTargetPort
	defer func() {
		cloudDB = origDB
		cloudTargetHost = origHost
		cloudTargetPort = origPort
	}()

	mockDB, _ := sql.Open("sqlite", ":memory:")
	defer mockDB.Close()

	cloudDB = mockDB
	// Point to a non-existent port on loopback that will refuse connections immediately
	cloudTargetHost = "127.0.0.1"
	cloudTargetPort = "59999"

	online, err := checkAPIConnectivity()
	if online || err == nil {
		t.Fatalf("Expected checkAPIConnectivity to fail for unreachable host, got online=%v, err=%v", online, err)
	}
	if !strings.Contains(err.Error(), "unreachable") {
		t.Fatalf("Expected 'unreachable' error, got %v", err)
	}
}

func TestCheckAPIConnectivity_Success(t *testing.T) {
	origDB := cloudDB
	origHost := cloudTargetHost
	origPort := cloudTargetPort
	defer func() {
		cloudDB = origDB
		cloudTargetHost = origHost
		cloudTargetPort = origPort
	}()

	// Start a local mock TCP listener simulating the cloud host
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start test listener: %v", err)
	}
	defer listener.Close()

	// Accept connections in background
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			conn.Close()
		}
	}()

	_, portStr, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatalf("Failed to split host port: %v", err)
	}

	mockDB, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open mock in-memory db: %v", err)
	}
	defer mockDB.Close()

	cloudDB = mockDB
	cloudTargetHost = "127.0.0.1"
	cloudTargetPort = portStr

	online, connErr := checkAPIConnectivity()
	if !online || connErr != nil {
		t.Fatalf("Expected checkAPIConnectivity to succeed, got online=%v, err=%v", online, connErr)
	}
}

func TestCheckAPIConnectivity_HealthURL(t *testing.T) {
	origDB := cloudDB
	origHost := cloudTargetHost
	origPort := cloudTargetPort
	defer func() {
		cloudDB = origDB
		cloudTargetHost = origHost
		cloudTargetPort = origPort
		os.Unsetenv("SYNC_HEALTH_URL")
	}()

	// Mock DB and local listener
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start listener: %v", err)
	}
	defer listener.Close()

	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			conn.Close()
		}
	}()

	_, portStr, _ := net.SplitHostPort(listener.Addr().String())
	mockDB, _ := sql.Open("sqlite", ":memory:")
	defer mockDB.Close()

	cloudDB = mockDB
	cloudTargetHost = "127.0.0.1"
	cloudTargetPort = portStr

	// Subtest 1: Healthy HTTP server (200 OK)
	serverOk := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy"}`))
	}))
	defer serverOk.Close()

	os.Setenv("SYNC_HEALTH_URL", serverOk.URL)
	online, err := checkAPIConnectivity()
	if !online || err != nil {
		t.Fatalf("Expected health URL 200 OK to pass, got online=%v, err=%v", online, err)
	}

	// Subtest 2: Unhealthy HTTP server (503 Service Unavailable)
	serverFail := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer serverFail.Close()

	os.Setenv("SYNC_HEALTH_URL", serverFail.URL)
	onlineFail, errFail := checkAPIConnectivity()
	if onlineFail || errFail == nil {
		t.Fatalf("Expected health URL 503 to fail, got online=%v, err=%v", onlineFail, errFail)
	}
	if !strings.Contains(errFail.Error(), strconv.Itoa(http.StatusServiceUnavailable)) {
		t.Fatalf("Expected status 503 in error message, got %v", errFail)
	}
}

func TestCalculateBackoff(t *testing.T) {
	// 0 failures -> base 15s
	b0 := calculateBackoff(0)
	if b0 < 12*time.Second || b0 > 18*time.Second {
		t.Fatalf("Expected ~15s for 0 failures, got %v", b0)
	}

	// 1 failure -> ~30s
	b1 := calculateBackoff(1)
	if b1 < 24*time.Second || b1 > 36*time.Second {
		t.Fatalf("Expected ~30s for 1 failure, got %v", b1)
	}

	// 2 failures -> ~60s
	b2 := calculateBackoff(2)
	if b2 < 48*time.Second || b2 > 72*time.Second {
		t.Fatalf("Expected ~60s for 2 failures, got %v", b2)
	}

	// 3 failures -> ~120s
	b3 := calculateBackoff(3)
	if b3 < 96*time.Second || b3 > 144*time.Second {
		t.Fatalf("Expected ~120s for 3 failures, got %v", b3)
	}

	// 4 failures -> ~240s
	b4 := calculateBackoff(4)
	if b4 < 192*time.Second || b4 > 288*time.Second {
		t.Fatalf("Expected ~240s for 4 failures, got %v", b4)
	}

	// 5 failures -> capped at max 300s
	b5 := calculateBackoff(5)
	if b5 < 240*time.Second || b5 > 360*time.Second {
		t.Fatalf("Expected ~300s cap for 5 failures, got %v", b5)
	}

	// 10 failures -> still capped at max 300s
	b10 := calculateBackoff(10)
	if b10 < 240*time.Second || b10 > 360*time.Second {
		t.Fatalf("Expected ~300s cap for 10 failures, got %v", b10)
	}
}

func TestSyncStatus_BackoffFields(t *testing.T) {
	syncMu.Lock()
	origFailures := consecutiveFailures
	origNext := nextSyncAttempt
	consecutiveFailures = 3
	nextSyncAttempt = time.Now().Add(45 * time.Second)
	syncMu.Unlock()

	defer func() {
		syncMu.Lock()
		consecutiveFailures = origFailures
		nextSyncAttempt = origNext
		syncMu.Unlock()
	}()

	status := GetSyncStatus()
	if status.ConsecutiveFailures != 3 {
		t.Fatalf("Expected ConsecutiveFailures 3, got %d", status.ConsecutiveFailures)
	}
	if status.NextRetryInSec < 40 || status.NextRetryInSec > 50 {
		t.Fatalf("Expected NextRetryInSec ~45s, got %d", status.NextRetryInSec)
	}
}
