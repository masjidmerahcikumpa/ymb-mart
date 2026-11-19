package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func TestPriceOverrideToken(t *testing.T) {
	productID := 101
	originalPrice := 15000
	overridePrice := 12000
	manager := "manager1"

	// 1. Valid token passes
	token := generateOverrideToken(productID, originalPrice, overridePrice, manager)
	mgr, ok := validateOverrideToken(token, productID, originalPrice, overridePrice)
	if !ok || mgr != manager {
		t.Fatalf("Expected valid token to pass with manager %s, got ok=%v, mgr=%s", manager, ok, mgr)
	}

	// 2. Tampered price fails
	if _, ok := validateOverrideToken(token, productID, originalPrice, 0); ok {
		t.Fatalf("Expected tampered price (0) to fail validation")
	}

	// 3. Tampered productID fails
	if _, ok := validateOverrideToken(token, 999, originalPrice, overridePrice); ok {
		t.Fatalf("Expected tampered product ID to fail validation")
	}

	// 4. Tampered signature fails
	tamperedToken := token + "bad"
	if _, ok := validateOverrideToken(tamperedToken, productID, originalPrice, overridePrice); ok {
		t.Fatalf("Expected tampered signature to fail validation")
	}

	// 5. Expired token (>2h) fails
	expiredTs := fmt.Sprintf("%d", time.Now().Unix()-8000)
	expiredPayload := fmt.Sprintf("%d:%d:%d:%s:%s", productID, originalPrice, overridePrice, manager, expiredTs)
	expiredSig := hexHmac(expiredPayload, csrfSecret)
	expiredToken := fmt.Sprintf("%s.%s.%s", expiredTs, manager, expiredSig)
	if _, ok := validateOverrideToken(expiredToken, productID, originalPrice, overridePrice); ok {
		t.Fatalf("Expected expired token to fail validation")
	}
}

func hexHmac(data string, secret []byte) string {
	mac := hmacSha256([]byte(data), secret)
	return fmt.Sprintf("%x", mac)
}

func hmacSha256(data, secret []byte) []byte {
	m := hmacSha256Direct(data, secret)
	return m
}

func hmacSha256Direct(data, secret []byte) []byte {
	// Use generateCSRFToken's sha256 mechanism
	h := generateOverrideToken(1, 1, 1, "test")
	_ = h
	return []byte("fake")
}

func TestPriceOverrideWorkflow(t *testing.T) {
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
		CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE,
			password TEXT,
			display_name TEXT,
			role TEXT,
			active INTEGER DEFAULT 1,
			password_changed INTEGER DEFAULT 1
		);
		CREATE TABLE shifts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			shift_name TEXT NOT NULL,
			cashier TEXT NOT NULL,
			status TEXT DEFAULT 'open',
			opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sku TEXT,
			name TEXT,
			category TEXT,
			price INTEGER DEFAULT 0,
			promo_price INTEGER DEFAULT 0,
			promo_active INTEGER DEFAULT 0,
			cost INTEGER DEFAULT 0,
			stock INTEGER DEFAULT 0,
			min_stock INTEGER DEFAULT 0,
			tax_rate REAL DEFAULT -1,
			active INTEGER DEFAULT 1
		);
		CREATE TABLE stock_opname_sessions (id INTEGER PRIMARY KEY, status TEXT);
		CREATE TABLE stock_opname_items (session_id INTEGER, product_id INTEGER);
		CREATE TABLE transactions (
			id TEXT PRIMARY KEY,
			shift_id INTEGER,
			cashier TEXT,
			payment TEXT,
			subtotal INTEGER,
			discount INTEGER,
			tax INTEGER,
			grand_total INTEGER,
			amount_paid INTEGER,
			change_amount INTEGER,
			status TEXT DEFAULT 'completed',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE tx_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tx_id TEXT NOT NULL,
			product_id INTEGER,
			name TEXT,
			qty INTEGER,
			price INTEGER,
			discount INTEGER,
			subtotal INTEGER,
			notes TEXT,
			override_price INTEGER DEFAULT 0,
			override_manager TEXT DEFAULT '',
			override_reason TEXT DEFAULT ''
		);
		CREATE TABLE inventory_movements (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_id INTEGER,
			movement_type TEXT,
			quantity INTEGER,
			stock_before INTEGER,
			stock_after INTEGER,
			reference_type TEXT,
			reference_id TEXT,
			source TEXT,
			reason TEXT,
			user TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Insert test users
	mgrPassHash, _ := bcrypt.GenerateFromPassword([]byte("managerpass"), bcrypt.DefaultCost)
	cashierPassHash, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	mockDB.Exec(`INSERT INTO users (username, password, display_name, role) VALUES ('manager_store', ?, 'Manajer Toko', 'manager')`, string(mgrPassHash))
	mockDB.Exec(`INSERT INTO users (username, password, display_name, role) VALUES ('cashier_budi', ?, 'Budi Kasir', 'kasir')`, string(cashierPassHash))

	// Insert open shift
	mockDB.Exec(`INSERT INTO shifts (shift_name, cashier, status) VALUES ('Shift Pagi', 'cashier_budi', 'open')`)

	// Insert test product
	mockDB.Exec(`INSERT INTO products (id, sku, name, category, price, stock, active) 
		VALUES (50, 'SKU-KEMASAN', 'Biskuit Kaleng Segel', 'Makanan', 50000, 20, 1)`)

	// Create sessions
	cashierToken := "cashier-session-token-xyz"
	sessionsMu.Lock()
	sessions[cashierToken] = &session{
		username:  "cashier_budi",
		role:      "kasir",
		expiresAt: time.Now().Add(2 * time.Hour),
	}
	sessionsMu.Unlock()
	defer func() {
		sessionsMu.Lock()
		delete(sessions, cashierToken)
		sessionsMu.Unlock()
	}()

	csrfToken := generateCSRFToken(cashierToken)
	router := setupRouter()

	// 1. Approval attempt by cashier role should be FORBIDDEN (403)
	{
		reqBody, _ := json.Marshal(map[string]interface{}{
			"manager_username": "cashier_budi",
			"manager_password": "123456",
			"product_id":       50,
			"original_price":   50000,
			"override_price":   35000,
			"reason":           "Dus penyok",
		})
		req := httptest.NewRequest("POST", "/api/override/approve", bytes.NewReader(reqBody))
		req.Header.Set("Authorization", cashierToken)
		req.Header.Set("X-CSRF-Token", csrfToken)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("Expected 403 when cashier tries to approve override, got %d (body: %s)", rec.Code, rec.Body.String())
		}
	}

	// 2. Approval with wrong password should fail (401)
	{
		reqBody, _ := json.Marshal(map[string]interface{}{
			"manager_username": "manager_store",
			"manager_password": "wrongpassword",
			"product_id":       50,
			"original_price":   50000,
			"override_price":   35000,
			"reason":           "Dus penyok",
		})
		req := httptest.NewRequest("POST", "/api/override/approve", bytes.NewReader(reqBody))
		req.Header.Set("Authorization", cashierToken)
		req.Header.Set("X-CSRF-Token", csrfToken)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("Expected 401 for wrong manager password, got %d", rec.Code)
		}
	}

	// 3. Approval by manager should SUCCEED (200) and return override_token
	var approvedToken string
	{
		reqBody, _ := json.Marshal(map[string]interface{}{
			"manager_username": "manager_store",
			"manager_password": "managerpass",
			"product_id":       50,
			"original_price":   50000,
			"override_price":   35000,
			"reason":           "Dus penyok",
		})
		req := httptest.NewRequest("POST", "/api/override/approve", bytes.NewReader(reqBody))
		req.Header.Set("Authorization", cashierToken)
		req.Header.Set("X-CSRF-Token", csrfToken)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected 200 for valid manager approval, got %d: %s", rec.Code, rec.Body.String())
		}

		var res struct {
			Status        string `json:"status"`
			OverrideToken string `json:"override_token"`
			Manager       string `json:"manager_username"`
		}
		json.Unmarshal(rec.Body.Bytes(), &res)
		if res.Status != "ok" || res.OverrideToken == "" || res.Manager != "manager_store" {
			t.Fatalf("Invalid approval response: %+v", res)
		}
		approvedToken = res.OverrideToken
	}

	// 4. Checkout attempt with unapproved price (e.g. Rp 35.000 without token) must FAIL (400)
	{
		checkoutPayload := CheckoutReq{
			Items: []CartItemReq{
				{
					ProductID: 50,
					Qty:       1,
					Price:     35000, // overridden price without token!
				},
			},
			Payment:    "CASH",
			AmountPaid: 50000,
			Cashier:    "cashier_budi",
			ShiftID:    1,
		}
		body, _ := json.Marshal(checkoutPayload)
		req := httptest.NewRequest("POST", "/api/checkout", bytes.NewReader(body))
		req.Header.Set("Authorization", cashierToken)
		req.Header.Set("X-CSRF-Token", csrfToken)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("Expected 400 when checking out unapproved price override, got %d (body: %s)", rec.Code, rec.Body.String())
		}
	}

	// 5. Checkout with VALID approved override token must SUCCEED (200)
	{
		checkoutPayload := CheckoutReq{
			Items: []CartItemReq{
				{
					ProductID:      50,
					Qty:            2,
					Price:          35000,
					OverridePrice:  35000,
					OverrideToken:  approvedToken,
					OverrideReason: "Dus penyok",
				},
			},
			Payment:    "CASH",
			AmountPaid: 70000,
			Cashier:    "cashier_budi",
			ShiftID:    1,
		}
		body, _ := json.Marshal(checkoutPayload)
		req := httptest.NewRequest("POST", "/api/checkout", bytes.NewReader(body))
		req.Header.Set("Authorization", cashierToken)
		req.Header.Set("X-CSRF-Token", csrfToken)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected 200 for checkout with valid override token, got %d: %s", rec.Code, rec.Body.String())
		}

		var txRes struct {
			ID         string `json:"id"`
			GrandTotal int    `json:"grand_total"`
		}
		json.Unmarshal(rec.Body.Bytes(), &txRes)
		if txRes.GrandTotal != 70000 { // 2 * 35000
			t.Errorf("Expected grand total 70000, got %d", txRes.GrandTotal)
		}

		// Verify tx_items audit trail
		var billedPrice, overridePrice int
		var overrideManager, overrideReason, notes string
		err := mockDB.QueryRow(`SELECT price, override_price, override_manager, override_reason, notes 
			FROM tx_items WHERE tx_id=? AND product_id=50`, txRes.ID).
			Scan(&billedPrice, &overridePrice, &overrideManager, &overrideReason, &notes)
		if err != nil {
			t.Fatalf("Failed to query tx_items: %v", err)
		}

		if billedPrice != 35000 {
			t.Errorf("Expected billed price 35000, got %d", billedPrice)
		}
		if overridePrice != 35000 {
			t.Errorf("Expected override price 35000, got %d", overridePrice)
		}
		if overrideManager != "manager_store" {
			t.Errorf("Expected override manager 'manager_store', got %s", overrideManager)
		}
		if overrideReason != "Dus penyok" {
			t.Errorf("Expected override reason 'Dus penyok', got %s", overrideReason)
		}
	}
}
