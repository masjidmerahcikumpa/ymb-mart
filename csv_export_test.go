package main

import (
	"bytes"
	"database/sql"
	"encoding/csv"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestCSVExportEndpoints(t *testing.T) {
	mockDB, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open mock sqlite: %v", err)
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
			active INTEGER DEFAULT 1
		);
		CREATE TABLE shifts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			shift_name TEXT NOT NULL,
			cashier TEXT NOT NULL,
			opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			closed_at TIMESTAMP DEFAULT NULL,
			opening_cash INTEGER DEFAULT 0,
			closing_cash INTEGER DEFAULT 0,
			expected_cash INTEGER DEFAULT 0,
			cash_sales INTEGER DEFAULT 0,
			cash_out INTEGER DEFAULT 0,
			cash_discrepancy INTEGER DEFAULT 0,
			total_sales INTEGER DEFAULT 0,
			total_tx INTEGER DEFAULT 0,
			status TEXT DEFAULT 'open'
		);
		CREATE TABLE transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			invoice_no TEXT UNIQUE,
			shift_id INTEGER,
			payment TEXT,
			grand_total INTEGER,
			status TEXT
		);
		CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
		CREATE TABLE products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sku TEXT,
			barcode TEXT,
			name TEXT,
			category TEXT,
			unit TEXT DEFAULT 'pcs',
			cost INTEGER DEFAULT 0,
			price INTEGER DEFAULT 0,
			stock INTEGER DEFAULT 0,
			reserved_stock INTEGER DEFAULT 0,
			online_stock INTEGER DEFAULT 0,
			min_stock INTEGER DEFAULT 0,
			promo_price INTEGER DEFAULT 0,
			promo_active INTEGER DEFAULT 0,
			active INTEGER DEFAULT 1
		);
	`)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Insert test users
	mockDB.Exec(`INSERT INTO users (username, display_name, role) VALUES ('kasir1', 'Budi Kasir', 'kasir')`)
	mockDB.Exec(`INSERT INTO users (username, display_name, role) VALUES ('kasir2', 'Siti Kasir', 'kasir')`)
	mockDB.Exec(`INSERT INTO users (username, display_name, role) VALUES ('admin1', 'Administrator', 'admin')`)

	// Insert test shifts
	// Shift 1: Closed shift by kasir1
	mockDB.Exec(`INSERT INTO shifts (shift_name, cashier, opened_at, closed_at, opening_cash, closing_cash, expected_cash, cash_sales, cash_out, cash_discrepancy, total_sales, total_tx, status)
		VALUES ('Shift Pagi', 'kasir1', '2026-11-19 08:00:00', '2026-11-19 16:00:00', 100000, 350000, 350000, 260000, 10000, 0, 400000, 15, 'closed')`)

	// Shift 2: Open shift by kasir2 with live transactions
	mockDB.Exec(`INSERT INTO shifts (shift_name, cashier, opened_at, closed_at, opening_cash, closing_cash, expected_cash, cash_sales, cash_out, cash_discrepancy, total_sales, total_tx, status)
		VALUES ('Shift Siang', 'kasir2', '2026-11-20 12:00:00', NULL, 150000, 0, 150000, 0, 0, 0, 500000, 10, 'open')`)
	// Insert live cash tx for Shift 2
	_, txErr1 := mockDB.Exec(`INSERT INTO transactions (invoice_no, shift_id, payment, grand_total, status) VALUES ('INV-1', 2, 'CASH', 200000, 'completed')`)
	if txErr1 != nil {
		t.Fatalf("txErr1: %v", txErr1)
	}
	_, txErr2 := mockDB.Exec(`INSERT INTO transactions (invoice_no, shift_id, payment, grand_total, status) VALUES ('INV-2', 2, 'QRIS', 300000, 'completed')`)
	if txErr2 != nil {
		t.Fatalf("txErr2: %v", txErr2)
	}

	// Global low_stock_threshold = 10
	mockDB.Exec("INSERT INTO settings (key, value) VALUES ('low_stock_threshold', '10')")

	// Insert test products
	// P1: Normal stock
	mockDB.Exec(`INSERT INTO products (sku, barcode, name, category, unit, cost, price, stock, reserved_stock, online_stock, min_stock, promo_price, promo_active, active)
		VALUES ('SKU-001', '8991', 'Indomie Goreng', 'Makanan', 'pcs', 2500, 3500, 50, 0, 50, 0, 0, 0, 1)`)
	// P2: Low stock via global threshold (stock 5 <= 10)
	mockDB.Exec(`INSERT INTO products (sku, barcode, name, category, unit, cost, price, stock, reserved_stock, online_stock, min_stock, promo_price, promo_active, active)
		VALUES ('SKU-002', '8992', 'Susu UHT 1L', 'Minuman', 'kotak', 15000, 20000, 5, 1, 4, 0, 18000, 1, 1)`)
	// P3: Out of stock (stock 0)
	mockDB.Exec(`INSERT INTO products (sku, barcode, name, category, unit, cost, price, stock, reserved_stock, online_stock, min_stock, promo_price, promo_active, active)
		VALUES ('SKU-003', '8993', 'Beras Ramos 5kg', 'Sembako', 'karung', 60000, 72000, 0, 0, 0, 20, 0, 0, 1)`)
	// P4: Inactive product
	mockDB.Exec(`INSERT INTO products (sku, barcode, name, category, unit, cost, price, stock, reserved_stock, online_stock, min_stock, promo_price, promo_active, active)
		VALUES ('SKU-004', '8994', 'Rokok Lama', 'Rokok', 'bungkus', 20000, 25000, 2, 0, 2, 0, 0, 0, 0)`)

	// Register admin session for router testing
	adminToken := "test-admin-csv-token"
	sessionsMu.Lock()
	sessions[adminToken] = &session{
		username:  "admin1",
		role:      "admin",
		expiresAt: time.Now().Add(2 * time.Hour),
	}
	sessionsMu.Unlock()
	defer func() {
		sessionsMu.Lock()
		delete(sessions, adminToken)
		sessionsMu.Unlock()
	}()

	router := setupRouter()

	// 1. Shift Export CSV: Unauthorized without admin token
	{
		req := httptest.NewRequest("GET", "/api/reports/shifts/export-csv", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("Expected 401 for unauthenticated shifts export, got %d", rec.Code)
		}
	}

	// 2. Shift Export CSV: Success with admin token
	{
		req := httptest.NewRequest("GET", "/api/reports/shifts/export-csv?token="+adminToken, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected 200 for shifts export, got %d", rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "text/csv") {
			t.Errorf("Expected text/csv content type, got %s", ct)
		}
		if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "attachment") {
			t.Errorf("Expected attachment in Content-Disposition, got %s", cd)
		}

		bodyBytes := rec.Body.Bytes()
		// Verify UTF-8 BOM
		if len(bodyBytes) < 3 || !bytes.Equal(bodyBytes[:3], []byte{0xEF, 0xBB, 0xBF}) {
			t.Fatalf("Expected UTF-8 BOM at the start of CSV")
		}

		// Parse CSV without BOM
		r := csv.NewReader(bytes.NewReader(bodyBytes[3:]))
		records, err := r.ReadAll()
		if err != nil {
			t.Fatalf("Failed to parse shift CSV: %v", err)
		}

		if len(records) < 3 { // 1 header + 2 shift rows
			t.Fatalf("Expected at least 3 rows in shift CSV, got %d", len(records))
		}

		header := records[0]
		if header[0] != "ID Shift" || header[1] != "Nama Shift" || header[3] != "Nama Kasir" {
			t.Errorf("Unexpected header columns: %v", header)
		}

		// Find Shift Siang (open shift)
		var openRow []string
		for _, row := range records[1:] {
			if row[1] == "Shift Siang" {
				openRow = row
				break
			}
		}
		if openRow == nil {
			t.Fatalf("Shift Siang not found in export")
		}

		// Verify live cash calculation for open shift (INV-1 had 200,000 cash)
		// Row cols: 0:ID, 1:ShiftName, 2:Username, 3:CashierName, 4:OpenedAt, 5:ClosedAt, 6:Opening, 7:CashSales, 8:NonCash, 9:TotalSales, 10:TotalTx, 11:CashOut, 12:Expected
		if openRow[7] != "200000" {
			t.Errorf("Expected live cash sales 200000 for open shift, got %s", openRow[7])
		}
		if openRow[8] != "300000" { // non cash = 500000 - 200000 = 300000
			t.Errorf("Expected live non-cash sales 300000 for open shift, got %s", openRow[8])
		}
		if openRow[12] != "350000" { // expected = 150000 opening + 200000 cash - 0 cashout = 350000
			t.Errorf("Expected live expected cash 350000 for open shift, got %s", openRow[12])
		}
	}

	// 3. Shift Export CSV: Filter by status=closed
	{
		req := httptest.NewRequest("GET", "/api/reports/shifts/export-csv?token="+adminToken+"&status=closed", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		bodyBytes := rec.Body.Bytes()
		r := csv.NewReader(bytes.NewReader(bodyBytes[3:]))
		records, _ := r.ReadAll()

		if len(records) != 2 { // 1 header + 1 closed shift
			t.Fatalf("Expected exactly 1 closed shift row, got %d", len(records)-1)
		}
		if records[1][1] != "Shift Pagi" {
			t.Errorf("Expected Shift Pagi, got %s", records[1][1])
		}
	}

	// 4. Inventory Export CSV: All active products
	{
		req := httptest.NewRequest("GET", "/api/reports/inventory/export-csv?token="+adminToken, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected 200 for inventory export, got %d", rec.Code)
		}

		bodyBytes := rec.Body.Bytes()
		if len(bodyBytes) < 3 || !bytes.Equal(bodyBytes[:3], []byte{0xEF, 0xBB, 0xBF}) {
			t.Fatalf("Expected UTF-8 BOM in inventory CSV")
		}

		r := csv.NewReader(bytes.NewReader(bodyBytes[3:]))
		records, err := r.ReadAll()
		if err != nil {
			t.Fatalf("Failed to parse inventory CSV: %v", err)
		}

		// Should have header + 3 active products (SKU-001, SKU-002, SKU-003)
		if len(records) != 4 {
			t.Fatalf("Expected 4 rows (header + 3 active products), got %d", len(records))
		}

		header := records[0]
		if header[1] != "SKU" || header[3] != "Nama Produk" || header[12] != "Status Stok" {
			t.Errorf("Unexpected inventory header: %v", header)
		}

		rowMap := make(map[string][]string)
		for _, row := range records[1:] {
			rowMap[row[1]] = row
		}

		// SKU-001: Indomie, stock 50 -> Status: Normal, Nilai Modal: 50 * 2500 = 125000
		p1 := rowMap["SKU-001"]
		if p1[12] != "Normal" {
			t.Errorf("Expected SKU-001 status Normal, got %s", p1[12])
		}
		if p1[13] != "125000" {
			t.Errorf("Expected SKU-001 total cost 125000, got %s", p1[13])
		}

		// SKU-002: Susu, stock 5 <= 10 -> Status: Menipis, Promo: Aktif
		p2 := rowMap["SKU-002"]
		if p2[12] != "Menipis" {
			t.Errorf("Expected SKU-002 status Menipis, got %s", p2[12])
		}
		if p2[15] != "Aktif" {
			t.Errorf("Expected SKU-002 promo Aktif, got %s", p2[15])
		}

		// SKU-003: Beras, stock 0 -> Status: Habis
		p3 := rowMap["SKU-003"]
		if p3[12] != "Habis" {
			t.Errorf("Expected SKU-003 status Habis, got %s", p3[12])
		}
	}

	// 5. Inventory Export CSV: Low stock only
	{
		req := httptest.NewRequest("GET", "/api/reports/inventory/export-csv?token="+adminToken+"&low_stock=1", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		bodyBytes := rec.Body.Bytes()
		r := csv.NewReader(bytes.NewReader(bodyBytes[3:]))
		records, _ := r.ReadAll()

		// Low stock only should have SKU-002 (stock 5 <= 10) and SKU-003 (stock 0 <= 20) -> 2 items + header = 3 rows
		if len(records) != 3 {
			t.Fatalf("Expected 2 low stock products (3 rows), got %d rows", len(records))
		}
	}

	// 6. Test alternate alias routes
	{
		req1 := httptest.NewRequest("GET", "/api/shifts/export?token="+adminToken, nil)
		rec1 := httptest.NewRecorder()
		router.ServeHTTP(rec1, req1)
		if rec1.Code != http.StatusOK {
			t.Errorf("Expected 200 for /api/shifts/export alias, got %d", rec1.Code)
		}

		req2 := httptest.NewRequest("GET", "/api/inventory/export?token="+adminToken, nil)
		rec2 := httptest.NewRecorder()
		router.ServeHTTP(rec2, req2)
		if rec2.Code != http.StatusOK {
			t.Errorf("Expected 200 for /api/inventory/export alias, got %d", rec2.Code)
		}
	}
}
