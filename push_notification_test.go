package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestPushNotifications(t *testing.T) {
	mockDB, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open mock DB: %v", err)
	}
	defer mockDB.Close()

	oldDB := db
	db = mockDB
	defer func() {
		db = oldDB
	}()

	// Setup schemas
	_, err = mockDB.Exec(`
		CREATE TABLE online_orders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			order_no TEXT UNIQUE NOT NULL,
			member_id TEXT DEFAULT '',
			customer_name TEXT NOT NULL,
			customer_phone TEXT NOT NULL,
			fulfillment_type TEXT DEFAULT 'delivery',
			address_text TEXT DEFAULT '',
			status TEXT DEFAULT 'pending_payment',
			items_subtotal INTEGER NOT NULL,
			delivery_fee INTEGER DEFAULT 0,
			discount_amount INTEGER DEFAULT 0,
			infaq_amount INTEGER DEFAULT 0,
			total_amount INTEGER NOT NULL,
			payment_method TEXT DEFAULT 'qris',
			payment_reference TEXT DEFAULT '',
			payment_status TEXT DEFAULT 'unpaid',
			shopper_notes TEXT DEFAULT '',
			driver_name TEXT DEFAULT 'Pak Joko',
			driver_phone TEXT DEFAULT '+628123456789',
			eta_minutes INTEGER DEFAULT 15,
			expires_at TIMESTAMP,
			push_token TEXT DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			sync_status TEXT DEFAULT 'pending'
		);
		CREATE TABLE customer_push_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_phone TEXT NOT NULL,
			push_token TEXT NOT NULL,
			device_name TEXT DEFAULT '',
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(customer_phone, push_token)
		);
	`)
	if err != nil {
		t.Fatalf("Failed to setup schema: %v", err)
	}

	// Setup mock Expo Push API server
	var receivedMessagesMu sync.Mutex
	var receivedMessages []ExpoPushMessage

	mockExpoServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		body, _ := io.ReadAll(r.Body)
		var msgs []ExpoPushMessage
		if err := json.Unmarshal(body, &msgs); err != nil {
			http.Error(w, "Bad json", http.StatusBadRequest)
			return
		}

		receivedMessagesMu.Lock()
		receivedMessages = append(receivedMessages, msgs...)
		receivedMessagesMu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"data":[{"status":"ok","id":"test-ticket-id-123"}]}`))
	}))
	defer mockExpoServer.Close()

	// Redirect expoPushAPIURL to mock server
	oldURL := expoPushAPIURL
	expoPushAPIURL = mockExpoServer.URL
	defer func() {
		expoPushAPIURL = oldURL
	}()

	router := setupRouter()

	// 1. Test POST /api/mobile/push-token (Validation: missing token returns 400)
	{
		body, _ := json.Marshal(map[string]string{
			"customer_phone": "081234567890",
			"push_token":     "",
		})
		req := httptest.NewRequest("POST", "/api/mobile/push-token", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("Expected 400 for empty push_token, got %d", rec.Code)
		}
	}

	// 2. Test POST /api/mobile/push-token (Success)
	testToken := "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
	{
		body, _ := json.Marshal(map[string]string{
			"customer_phone": "081234567890",
			"push_token":     testToken,
			"device_name":    "Pixel 8 Pro",
		})
		req := httptest.NewRequest("POST", "/api/mobile/push-token", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected 200 for register push-token, got %d", rec.Code)
		}

		// Verify DB record
		var savedToken, devName string
		err := mockDB.QueryRow("SELECT push_token, device_name FROM customer_push_tokens WHERE customer_phone = ?", "081234567890").
			Scan(&savedToken, &devName)
		if err != nil {
			t.Fatalf("Failed to scan customer_push_tokens: %v", err)
		}
		if savedToken != testToken || devName != "Pixel 8 Pro" {
			t.Errorf("Unexpected saved push token: %s, %s", savedToken, devName)
		}
	}

	// 3. Test sendExpoPushNotification direct call
	{
		msg := ExpoPushMessage{
			To:        testToken,
			Title:     "Uji Coba Notifikasi",
			Body:      "Pesan test push",
			Data:      map[string]interface{}{"key": "val"},
			Sound:     "default",
			Priority:  "high",
			ChannelID: "orders",
		}
		err := sendExpoPushNotification([]ExpoPushMessage{msg})
		if err != nil {
			t.Fatalf("sendExpoPushNotification returned error: %v", err)
		}

		receivedMessagesMu.Lock()
		count := len(receivedMessages)
		receivedMessagesMu.Unlock()
		if count == 0 {
			t.Fatalf("Mock Expo server did not receive any message")
		}
	}

	// 4. Test notifyOrderStatusChange on order status transitions
	{
		// Insert order
		orderNo := "YMB-20261120-P01"
		mockDB.Exec(`INSERT INTO online_orders (
			order_no, customer_name, customer_phone, fulfillment_type, 
			status, items_subtotal, total_amount, push_token
		) VALUES (?, 'Ahmad Jamaah', '081234567890', 'delivery', 'pending_payment', 45000, 50000, ?)`,
			orderNo, testToken)

		receivedMessagesMu.Lock()
		receivedMessages = nil // reset
		receivedMessagesMu.Unlock()

		// Trigger "processing"
		notifyOrderStatusChange(orderNo, "processing")

		// Small delay to allow goroutine / execution
		time.Sleep(50 * time.Millisecond)

		receivedMessagesMu.Lock()
		if len(receivedMessages) != 1 {
			t.Fatalf("Expected 1 push message for processing status, got %d", len(receivedMessages))
		}
		m := receivedMessages[0]
		receivedMessagesMu.Unlock()

		if !strings.Contains(m.Title, "Disiapkan") {
			t.Errorf("Expected title to mention 'Disiapkan', got %s", m.Title)
		}
		if !strings.Contains(m.Body, orderNo) {
			t.Errorf("Expected body to contain orderNo %s, got %s", orderNo, m.Body)
		}
		if m.Data["status"] != "processing" {
			t.Errorf("Expected data.status 'processing', got %v", m.Data["status"])
		}
	}

	// 5. Test notifyOrderStatusChange for "ready" (delivery)
	{
		orderNo := "YMB-20261120-P01"
		receivedMessagesMu.Lock()
		receivedMessages = nil
		receivedMessagesMu.Unlock()

		notifyOrderStatusChange(orderNo, "ready")
		time.Sleep(50 * time.Millisecond)

		receivedMessagesMu.Lock()
		if len(receivedMessages) != 1 {
			t.Fatalf("Expected 1 push message for ready status, got %d", len(receivedMessages))
		}
		m := receivedMessages[0]
		receivedMessagesMu.Unlock()

		if !strings.Contains(m.Title, "Siap Dikirim") {
			t.Errorf("Expected title to mention 'Siap Dikirim', got %s", m.Title)
		}
	}

	// 6. Test notifyOrderStatusChange for "completed"
	{
		orderNo := "YMB-20261120-P01"
		receivedMessagesMu.Lock()
		receivedMessages = nil
		receivedMessagesMu.Unlock()

		notifyOrderStatusChange(orderNo, "completed")
		time.Sleep(50 * time.Millisecond)

		receivedMessagesMu.Lock()
		if len(receivedMessages) != 1 {
			t.Fatalf("Expected 1 push message for completed status, got %d", len(receivedMessages))
		}
		m := receivedMessages[0]
		receivedMessagesMu.Unlock()

		if !strings.Contains(m.Title, "Selesai") {
			t.Errorf("Expected title to mention 'Selesai', got %s", m.Title)
		}
	}
}
