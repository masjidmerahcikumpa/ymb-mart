package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPerProductLowStockThreshold(t *testing.T) {
	mockDB, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open in-memory sqlite: %v", err)
	}
	defer mockDB.Close()

	oldDB := db
	db = mockDB
	defer func() {
		db = oldDB
	}()

	// Setup tables
	_, err = mockDB.Exec(`
		CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
		CREATE TABLE products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sku TEXT,
			name TEXT,
			category TEXT,
			price INTEGER DEFAULT 0,
			cost INTEGER DEFAULT 0,
			stock INTEGER DEFAULT 0,
			min_stock INTEGER DEFAULT 0,
			active INTEGER DEFAULT 1
		);
	`)
	if err != nil {
		t.Fatalf("Failed to setup schema: %v", err)
	}

	// Default low_stock_threshold = 10
	mockDB.Exec("INSERT INTO settings (key, value) VALUES ('low_stock_threshold', '10')")

	// Insert test data
	// 1. Item A: stock 20, min_stock 25 -> low stock (custom min_stock > stock)
	mockDB.Exec(`INSERT INTO products (sku, name, category, price, cost, stock, min_stock, active) 
		VALUES ('SKU-A', 'Item High Min', 'General', 10000, 8000, 20, 25, 1)`)
	// 2. Item B: stock 5, min_stock 2 -> NOT low stock (custom min_stock takes precedence over global 10)
	mockDB.Exec(`INSERT INTO products (sku, name, category, price, cost, stock, min_stock, active) 
		VALUES ('SKU-B', 'Item Low Min', 'General', 10000, 8000, 5, 2, 1)`)
	// 3. Item C: stock 8, min_stock 0 -> low stock (fallback to global threshold 10, 8 <= 10)
	mockDB.Exec(`INSERT INTO products (sku, name, category, price, cost, stock, min_stock, active) 
		VALUES ('SKU-C', 'Item Global Low', 'General', 10000, 8000, 8, 0, 1)`)
	// 4. Item D: stock 15, min_stock 0 -> NOT low stock (15 > global 10)
	mockDB.Exec(`INSERT INTO products (sku, name, category, price, cost, stock, min_stock, active) 
		VALUES ('SKU-D', 'Item Global Normal', 'General', 10000, 8000, 15, 0, 1)`)
	// 5. Item E: stock 1, min_stock 10, active 0 -> NOT low stock (inactive)
	mockDB.Exec(`INSERT INTO products (sku, name, category, price, cost, stock, min_stock, active) 
		VALUES ('SKU-E', 'Item Inactive', 'General', 10000, 8000, 1, 10, 0)`)

	// Test 1: getGlobalLowStockThreshold
	if thresh := getGlobalLowStockThreshold(); thresh != 10 {
		t.Fatalf("Expected global threshold 10, got %d", thresh)
	}

	// Test 2: handleLowStock with global=10
	{
		req := httptest.NewRequest("GET", "/api/alerts/low-stock", nil)
		rec := httptest.NewRecorder()
		handleLowStock(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", rec.Code, rec.Body.String())
		}

		var items []map[string]interface{}
		if err := json.Unmarshal(rec.Body.Bytes(), &items); err != nil {
			t.Fatalf("Failed to parse response JSON: %v", err)
		}

		if len(items) != 2 {
			t.Fatalf("Expected exactly 2 low stock items (SKU-A and SKU-C), got %d items: %+v", len(items), items)
		}

		itemMap := make(map[string]map[string]interface{})
		for _, it := range items {
			itemMap[it["sku"].(string)] = it
		}

		if _, ok := itemMap["SKU-A"]; !ok {
			t.Errorf("Expected SKU-A (stock 20, min_stock 25) to be alerted as low stock")
		} else {
			if int(itemMap["SKU-A"]["threshold"].(float64)) != 25 {
				t.Errorf("Expected SKU-A effective threshold 25, got %v", itemMap["SKU-A"]["threshold"])
			}
		}

		if _, ok := itemMap["SKU-C"]; !ok {
			t.Errorf("Expected SKU-C (stock 8, min_stock 0) to be alerted as low stock")
		} else {
			if int(itemMap["SKU-C"]["threshold"].(float64)) != 10 {
				t.Errorf("Expected SKU-C effective threshold 10, got %v", itemMap["SKU-C"]["threshold"])
			}
		}

		if _, ok := itemMap["SKU-B"]; ok {
			t.Errorf("SKU-B (stock 5, min_stock 2) should NOT be low stock despite stock < 10")
		}
		if _, ok := itemMap["SKU-D"]; ok {
			t.Errorf("SKU-D (stock 15, min_stock 0) should NOT be low stock")
		}
		if _, ok := itemMap["SKU-E"]; ok {
			t.Errorf("SKU-E (inactive) should NOT be low stock")
		}
	}

	// Test 3: Change global threshold to 5 in settings
	mockDB.Exec("UPDATE settings SET value='5' WHERE key='low_stock_threshold'")
	if thresh := getGlobalLowStockThreshold(); thresh != 5 {
		t.Fatalf("Expected updated global threshold 5, got %d", thresh)
	}

	// Re-run handleLowStock: SKU-C (stock 8) should NO LONGER be alerted because 8 > 5
	{
		req := httptest.NewRequest("GET", "/api/alerts/low-stock", nil)
		rec := httptest.NewRecorder()
		handleLowStock(rec, req)

		var items []map[string]interface{}
		json.Unmarshal(rec.Body.Bytes(), &items)

		if len(items) != 1 {
			t.Fatalf("Expected exactly 1 low stock item (only SKU-A) after lowering threshold to 5, got %d: %+v", len(items), items)
		}
		if items[0]["sku"].(string) != "SKU-A" {
			t.Errorf("Expected only SKU-A, got %s", items[0]["sku"].(string))
		}
	}

	// Test 4: handleRestockCandidates default vs explicit query
	{
		// Default (uses global=5, but SKU-A has min_stock=25)
		req := httptest.NewRequest("GET", "/api/ai/restock-candidates", nil)
		rec := httptest.NewRecorder()
		handleRestockCandidates(rec, req)

		var res struct {
			Threshold  int                      `json:"threshold"`
			Count      int                      `json:"count"`
			Candidates []map[string]interface{} `json:"candidates"`
		}
		json.Unmarshal(rec.Body.Bytes(), &res)

		if res.Count != 1 || res.Candidates[0]["sku"].(string) != "SKU-A" {
			t.Fatalf("Expected 1 candidate (SKU-A), got %d (%+v)", res.Count, res.Candidates)
		}

		// Explicit threshold=15 (overrides all min_stock and returns active products with stock <= 15)
		reqExplicit := httptest.NewRequest("GET", "/api/ai/restock-candidates?threshold=15", nil)
		recExplicit := httptest.NewRecorder()
		handleRestockCandidates(recExplicit, reqExplicit)

		var resExplicit struct {
			Threshold  int                      `json:"threshold"`
			Count      int                      `json:"count"`
			Candidates []map[string]interface{} `json:"candidates"`
		}
		json.Unmarshal(recExplicit.Body.Bytes(), &resExplicit)

		// With stock <= 15: SKU-B (5), SKU-C (8), SKU-D (15) are <= 15. SKU-A is 20 (> 15). SKU-E is inactive.
		if resExplicit.Count != 3 {
			t.Fatalf("Expected 3 candidates for explicit threshold=15, got %d: %+v", resExplicit.Count, resExplicit.Candidates)
		}
	}
}
