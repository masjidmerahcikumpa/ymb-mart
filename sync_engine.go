package main

import (
	"context"
	"database/sql"
	"fmt"
	"net"
	"os"
	"sync"
	"time"
)

type SyncStatus struct {
	IsOnline     bool   `json:"is_online"`
	LastSync     string `json:"last_sync"`
	PendingCount int    `json:"pending_count"`
	IsSyncing    bool   `json:"is_syncing"`
	LastError    string `json:"last_error"`
	Mode         string `json:"mode"`
}

var (
	cloudDB           *sql.DB
	syncMu            sync.Mutex
	currentSyncStatus = SyncStatus{
		IsOnline:  false,
		LastSync:  "-",
		Mode:      "local_offline_first",
	}
	syncTriggerChan = make(chan struct{}, 1)
)

func InitSyncEngine(tursoURL, tursoToken string) {
	if tursoURL == "" || tursoToken == "" {
		fmt.Println("[Sync] No Turso credentials provided; running in pure offline mode")
		return
	}

	connStr := fmt.Sprintf("%s?authToken=%s", tursoURL, tursoToken)
	var err error
	cloudDB, err = sql.Open("libsql", connStr)
	if err != nil {
		fmt.Printf("[Sync] Failed to open cloud DB: %v\n", err)
		return
	}
	cloudDB.SetMaxOpenConns(5)
	cloudDB.SetMaxIdleConns(2)

	fmt.Println("[Sync] Sync Engine initialized with Turso Cloud")

	// Start background sync worker
	go syncWorker()
}

func syncWorker() {
	// Run initial sync after a short delay
	time.Sleep(1 * time.Second)
	TriggerSync()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			DoSync()
		case <-syncTriggerChan:
			DoSync()
		}
	}
}

func TriggerSync() {
	select {
	case syncTriggerChan <- struct{}{}:
	default:
	}
}

func GetSyncStatus() SyncStatus {
	// If running on Vercel serverless (direct cloud mode)
	if os.Getenv("VERCEL") == "1" {
		return SyncStatus{
			IsOnline:     true,
			LastSync:     "Cloud Live (Turso)",
			PendingCount: 0,
			IsSyncing:    false,
			LastError:    "",
			Mode:         "cloud_direct",
		}
	}

	syncMu.Lock()
	defer syncMu.Unlock()

	// Update pending count from local DB
	if db != nil {
		var txCount, shiftCount, cashCount, userCount, prodCount, opnCount, attCount, memCount int
		db.QueryRow("SELECT COUNT(*) FROM transactions WHERE sync_status = 'pending'").Scan(&txCount)
		db.QueryRow("SELECT COUNT(*) FROM shifts WHERE sync_status = 'pending'").Scan(&shiftCount)
		db.QueryRow("SELECT COUNT(*) FROM cash_log WHERE sync_status = 'pending'").Scan(&cashCount)
		db.QueryRow("SELECT COUNT(*) FROM users WHERE sync_status = 'pending'").Scan(&userCount)
		db.QueryRow("SELECT COUNT(*) FROM products WHERE sync_status = 'pending'").Scan(&prodCount)
		db.QueryRow("SELECT COUNT(*) FROM stock_opname_sessions WHERE sync_status = 'pending'").Scan(&opnCount)
		db.QueryRow("SELECT COUNT(*) FROM attendance WHERE sync_status = 'pending'").Scan(&attCount)
		db.QueryRow("SELECT COUNT(*) FROM members WHERE sync_status = 'pending'").Scan(&memCount)
		currentSyncStatus.PendingCount = txCount + shiftCount + cashCount + userCount + prodCount + opnCount + attCount + memCount
	}

	return currentSyncStatus
}

func hasInternetConnectivity() bool {
	conn, err := net.DialTimeout("tcp", "8.8.8.8:53", 600*time.Millisecond)
	if err == nil {
		conn.Close()
		return true
	}
	conn2, err2 := net.DialTimeout("tcp", "1.1.1.1:53", 600*time.Millisecond)
	if err2 == nil {
		conn2.Close()
		return true
	}
	return false
}

func DoSync() {
	syncMu.Lock()
	if currentSyncStatus.IsSyncing {
		syncMu.Unlock()
		return
	}
	currentSyncStatus.IsSyncing = true
	syncMu.Unlock()

	defer func() {
		syncMu.Lock()
		currentSyncStatus.IsSyncing = false
		syncMu.Unlock()
	}()

	if cloudDB == nil || db == nil {
		return
	}

	// Fast pre-check: if no internet, skip Turso connection immediately (zero DNS lag)
	if !hasInternetConnectivity() {
		syncMu.Lock()
		currentSyncStatus.IsOnline = false
		currentSyncStatus.LastError = "offline: no internet"
		syncMu.Unlock()
		return
	}

	// 1. Non-blocking connectivity test to Turso with 3s timeout
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	pingErr := cloudDB.PingContext(ctx)
	if pingErr != nil {
		syncMu.Lock()
		currentSyncStatus.IsOnline = false
		currentSyncStatus.LastError = pingErr.Error()
		syncMu.Unlock()
		return
	}

	syncMu.Lock()
	currentSyncStatus.IsOnline = true
	currentSyncStatus.LastError = ""
	syncMu.Unlock()

	// 2. PUSH Pending Local Products to Turso Cloud (New / Edited products)
	prodPushErr := pushLocalProductsToCloud()
	if prodPushErr != nil {
		fmt.Printf("[Sync] Product push error: %v\n", prodPushErr)
	}

	// 3. PUSH Pending Local Transactions & Shifts to Turso Cloud
	pushErr := pushLocalTransactionsToCloud()
	if pushErr != nil {
		fmt.Printf("[Sync] Push error: %v\n", pushErr)
	}

	// 4. PULL Master Data from Turso Cloud to Local SQLite
	pullErr := pullMasterDataFromCloud()
	if pullErr != nil {
		fmt.Printf("[Sync] Pull error: %v\n", pullErr)
	}

	syncMu.Lock()
	currentSyncStatus.LastSync = nowWIB().Format("2006-01-02 15:04:05")
	syncMu.Unlock()
}

func pullMasterDataFromCloud() error {
	if cloudDB == nil || db == nil {
		return nil
	}

	// A. Pull Settings (exclude massive ad_images blob to keep sync light & fast)
	sRows, err := cloudDB.Query("SELECT key, value FROM settings WHERE key != 'ad_images'")
	if err == nil {
		defer sRows.Close()
		for sRows.Next() {
			var k, v string
			if err := sRows.Scan(&k, &v); err == nil {
				db.Exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", k, v)
			}
		}
	}

	// B. Pull Users
	uRows, err := cloudDB.Query("SELECT username, password, display_name, role, active, password_changed FROM users")
	if err == nil {
		defer uRows.Close()
		for uRows.Next() {
			var active, pwdChanged int
			var uname, pwd, disp, role string
			if err := uRows.Scan(&uname, &pwd, &disp, &role, &active, &pwdChanged); err == nil {
				// Protect local user changes (such as local password change) from being overwritten
				var localSyncStatus string
				db.QueryRow("SELECT sync_status FROM users WHERE username = ?", uname).Scan(&localSyncStatus)
				if localSyncStatus == "pending" {
					continue
				}

				db.Exec(`INSERT INTO users (username, password, display_name, role, active, password_changed, sync_status) 
					VALUES (?, ?, ?, ?, ?, ?, 'synced')
					ON CONFLICT(username) DO UPDATE SET password=excluded.password, 
					display_name=excluded.display_name, role=excluded.role, active=excluded.active, 
					password_changed=excluded.password_changed, sync_status='synced'`,
					uname, pwd, disp, role, active, pwdChanged)
			}
		}
	}

	// C. Pull Categories
	cRows, err := cloudDB.Query("SELECT id, name, icon FROM categories")
	if err == nil {
		defer cRows.Close()
		for cRows.Next() {
			var id int
			var name, icon string
			if err := cRows.Scan(&id, &name, &icon); err == nil {
				db.Exec("INSERT INTO categories (id, name, icon) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon", id, name, icon)
			}
		}
	}

	// D. Pull Products (Master inventory, prices, promos)
	// Check if local has pending transactions before pulling stock
	var pendingTx int
	db.QueryRow("SELECT COUNT(*) FROM transactions WHERE sync_status='pending'").Scan(&pendingTx)

	pRows, err := cloudDB.Query("SELECT id, sku, name, description, price, cost, category, stock, min_stock, unit, barcode, promo_price, promo_active, tax_rate, active FROM products")
	if err == nil {
		defer pRows.Close()
		for pRows.Next() {
			var id, price, cost, stock, minStock, promoPrice, promoActive, active int
			var sku, name, desc, cat, unit, barcode string
			var taxRate float64
			if err := pRows.Scan(&id, &sku, &name, &desc, &price, &cost, &cat, &stock, &minStock, &unit, &barcode, &promoPrice, &promoActive, &taxRate, &active); err == nil {
				// Protect local pending changes from being overwritten
				var localSyncStatus string
				db.QueryRow("SELECT sync_status FROM products WHERE sku = ?", sku).Scan(&localSyncStatus)
				if localSyncStatus == "pending" {
					continue
				}

				var localID int
				checkErr := db.QueryRow("SELECT id FROM products WHERE sku = ?", sku).Scan(&localID)
				if checkErr == sql.ErrNoRows {
					// Not found locally, insert new with cloud ID
					db.Exec(`INSERT INTO products (id, sku, name, description, price, cost, category, stock, min_stock, unit, barcode, promo_price, promo_active, tax_rate, active, sync_status) 
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
						id, sku, name, desc, price, cost, cat, stock, minStock, unit, barcode, promoPrice, promoActive, taxRate, active)
				} else {
					// Already exists locally, update existing row
					if pendingTx > 0 {
						// Don't overwrite local stock if there are pending offline transactions that haven't been pushed
						db.Exec(`UPDATE products SET name=?, description=?, price=?, cost=?, category=?, min_stock=?, unit=?, barcode=?, promo_price=?, promo_active=?, tax_rate=?, active=?, sync_status='synced' WHERE id=?`,
							name, desc, price, cost, cat, minStock, unit, barcode, promoPrice, promoActive, taxRate, active, localID)
					} else {
						// Fully sync including stock
						db.Exec(`UPDATE products SET name=?, description=?, price=?, cost=?, category=?, stock=?, min_stock=?, unit=?, barcode=?, promo_price=?, promo_active=?, tax_rate=?, active=?, sync_status='synced' WHERE id=?`,
							name, desc, price, cost, cat, stock, minStock, unit, barcode, promoPrice, promoActive, taxRate, active, localID)
					}
				}
			}
		}
	}

	// E. Pull Members
	mRows, err := cloudDB.Query("SELECT id, member_id, name, phone, email, points, tier, active FROM members")
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var id, points, active int
			var memberID, name, phone, email, tier string
			if err := mRows.Scan(&id, &memberID, &name, &phone, &email, &points, &tier, &active); err == nil {
				var localSync string
				db.QueryRow("SELECT sync_status FROM members WHERE member_id = ?", memberID).Scan(&localSync)
				if localSync == "pending" {
					continue
				}
				db.Exec(`INSERT INTO members (id, member_id, name, phone, email, points, tier, active, sync_status)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')
					ON CONFLICT(member_id) DO UPDATE SET name=excluded.name, phone=excluded.phone,
					email=excluded.email, points=excluded.points, tier=excluded.tier, active=excluded.active, sync_status='synced'`,
					id, memberID, name, phone, email, points, tier, active)
			}
		}
	}

	// F. Pull Attendance from Cloud (e.g. submitted via mobile QR scan through Vercel)
	attCloudRows, err := cloudDB.Query(`SELECT id, user_id, username, cashier_name, type, date, time, notes, device_info, created_at FROM attendance ORDER BY id DESC LIMIT 200`)
	if err == nil {
		defer attCloudRows.Close()
		for attCloudRows.Next() {
			var id int
			var uID sql.NullInt64
			var uname, cname, aType, aDate, aTime, notes, devInfo, cAt string
			if err := attCloudRows.Scan(&id, &uID, &uname, &cname, &aType, &aDate, &aTime, &notes, &devInfo, &cAt); err == nil {
				var uVal interface{} = nil
				if uID.Valid { uVal = uID.Int64 }
				var exists int
				db.QueryRow("SELECT COUNT(*) FROM attendance WHERE username=? AND date=? AND time=? AND type=?", uname, aDate, aTime, aType).Scan(&exists)
				if exists == 0 {
					db.Exec(`INSERT INTO attendance (user_id, username, cashier_name, type, date, time, notes, device_info, created_at, sync_status)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
						uVal, uname, cname, aType, aDate, aTime, notes, devInfo, cAt)
				}
			}
		}
	}

	// G. Pull Stock Opname Sessions from Cloud (if created/managed on Vercel)
	soRows, err := cloudDB.Query("SELECT id, created_by, status, COALESCE(opname_date,''), COALESCE(notes,''), created_at, closed_at FROM stock_opname_sessions")
	if err == nil {
		defer soRows.Close()
		for soRows.Next() {
			var id int
			var cBy, st, opDate, notes, cAt string
			var clAt sql.NullString
			if err := soRows.Scan(&id, &cBy, &st, &opDate, &notes, &cAt, &clAt); err == nil {
				var localSync string
				db.QueryRow("SELECT sync_status FROM stock_opname_sessions WHERE id = ?", id).Scan(&localSync)
				if localSync == "pending" {
					continue
				}
				var clVal interface{} = nil
				if clAt.Valid { clVal = clAt.String }
				db.Exec(`INSERT INTO stock_opname_sessions (id, created_by, status, opname_date, notes, created_at, closed_at, sync_status)
					VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
					ON CONFLICT(id) DO UPDATE SET status=excluded.status, closed_at=excluded.closed_at, notes=excluded.notes, opname_date=excluded.opname_date, sync_status='synced'`,
					id, cBy, st, opDate, notes, cAt, clVal)
			}
		}
	}

	// H. Pull Stock Opname Items from Cloud
	soiRows, err := cloudDB.Query("SELECT session_id, product_id, system_qty, physical_qty, difference, scanned_at, user FROM stock_opname_items")
	if err == nil {
		defer soiRows.Close()
		for soiRows.Next() {
			var sessID, prodID, sysQty int
			var pQty, diff sql.NullInt64
			var scAt, usr sql.NullString
			if err := soiRows.Scan(&sessID, &prodID, &sysQty, &pQty, &diff, &scAt, &usr); err == nil {
				var localSync string
				db.QueryRow("SELECT sync_status FROM stock_opname_items WHERE session_id = ? AND product_id = ?", sessID, prodID).Scan(&localSync)
				if localSync == "pending" {
					continue
				}
				var pVal, dVal, sVal, uVal interface{} = nil, nil, nil, nil
				if pQty.Valid { pVal = pQty.Int64 }
				if diff.Valid { dVal = diff.Int64 }
				if scAt.Valid { sVal = scAt.String }
				if usr.Valid { uVal = usr.String }
				db.Exec(`INSERT INTO stock_opname_items (session_id, product_id, system_qty, physical_qty, difference, scanned_at, user, sync_status)
					VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
					ON CONFLICT(session_id, product_id) DO UPDATE SET system_qty=excluded.system_qty, physical_qty=excluded.physical_qty, difference=excluded.difference, scanned_at=excluded.scanned_at, user=excluded.user, sync_status='synced'`,
					sessID, prodID, sysQty, pVal, dVal, sVal, uVal)
			}
		}
	}

	return nil
}

type pendingShift struct {
	id, opCash, clCash, expCash, csSales, csOut, csDisc, totSales, totTx int
	shName, cashier, opAt, clAt, status string
}

type pendingCashLog struct {
	id, shiftID, amount int
	logType, desc, createdAt string
}

type pendingTxItem struct {
	pid, qty, price, disc, subtotal int
	name, itemNotes string
}

type pendingTx struct {
	id, total, discount, tax, grandTotal, amountPaid, changeAmount int
	shiftID sql.NullInt64
	memberID sql.NullString
	txID, payment, customerName, cashier, notes, status, createdAt string
	items []pendingTxItem
}

type pendingInvMovement struct {
	id, pid, qty, stBefore, stAfter int
	movType, refType, refID, source, reason, invUser, createdAt string
}

func pushLocalProductsToCloud() error {
	if cloudDB == nil || db == nil {
		return nil
	}

	var pendingProducts []Product
	rows, err := db.Query(`SELECT id, sku, name, description, price, cost, category, stock, min_stock, unit, barcode, promo_price, promo_active, tax_rate, active 
		FROM products WHERE sync_status = 'pending'`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.Price, &p.Cost, &p.Category, &p.Stock, &p.MinStock, &p.Unit, &p.Barcode, &p.PromoPrice, &p.PromoActive, &p.TaxRate, &p.Active); err == nil {
			pendingProducts = append(pendingProducts, p)
		}
	}

	for _, p := range pendingProducts {
		_, cErr := cloudDB.Exec(`INSERT INTO products (sku, name, description, price, cost, category, stock, min_stock, unit, barcode, promo_price, promo_active, tax_rate, active)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(sku) DO UPDATE SET
				name=excluded.name,
				description=excluded.description,
				price=excluded.price,
				cost=excluded.cost,
				category=excluded.category,
				stock=excluded.stock,
				min_stock=excluded.min_stock,
				unit=excluded.unit,
				barcode=excluded.barcode,
				promo_price=excluded.promo_price,
				promo_active=excluded.promo_active,
				tax_rate=excluded.tax_rate,
				active=excluded.active`,
			p.SKU, p.Name, p.Description, p.Price, p.Cost, p.Category, p.Stock, p.MinStock, p.Unit, p.Barcode, p.PromoPrice, p.PromoActive, p.TaxRate, p.Active)

		if cErr == nil {
			var cloudID int
			if err := cloudDB.QueryRow("SELECT id FROM products WHERE sku = ?", p.SKU).Scan(&cloudID); err == nil && cloudID > 0 {
				if cloudID != p.ID {
					db.Exec("UPDATE tx_items SET product_id = ? WHERE product_id = ?", cloudID, p.ID)
					db.Exec("UPDATE inventory_movements SET product_id = ? WHERE product_id = ?", cloudID, p.ID)
					db.Exec("UPDATE products SET id = ?, sync_status = 'synced' WHERE id = ?", cloudID, p.ID)
				} else {
					db.Exec("UPDATE products SET sync_status = 'synced' WHERE id = ?", p.ID)
				}
			} else {
				db.Exec("UPDATE products SET sync_status = 'synced' WHERE id = ?", p.ID)
			}
			fmt.Printf("[Sync] Product %s (%s) successfully pushed to Turso Cloud\n", p.Name, p.SKU)
		} else {
			fmt.Printf("[Sync] Error pushing product %s to cloud: %v\n", p.SKU, cErr)
		}
	}
	return nil
}

func pushLocalTransactionsToCloud() error {
	if cloudDB == nil || db == nil {
		return nil
	}

	// 0. Fetch and Push Pending Users (passwords, PIN resets, status, new users)
	var pendingUsers []User
	userRows, err := db.Query("SELECT id, username, password, display_name, role, active, password_changed FROM users WHERE sync_status = 'pending'")
	if err == nil {
		for userRows.Next() {
			var u User
			if err := userRows.Scan(&u.ID, &u.Username, &u.Password, &u.DisplayName, &u.Role, &u.Active, &u.PasswordChanged); err == nil {
				pendingUsers = append(pendingUsers, u)
			}
		}
		userRows.Close()
	}

	for _, u := range pendingUsers {
		_, cErr := cloudDB.Exec(`INSERT INTO users (username, password, display_name, role, active, password_changed, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, 'synced')
			ON CONFLICT(username) DO UPDATE SET password=excluded.password, display_name=excluded.display_name,
			role=excluded.role, active=excluded.active, password_changed=excluded.password_changed, sync_status='synced'`,
			u.Username, u.Password, u.DisplayName, u.Role, u.Active, u.PasswordChanged)
		if cErr == nil {
			db.Exec("UPDATE users SET sync_status = 'synced' WHERE id = ?", u.ID)
			fmt.Printf("[Sync] User %s successfully pushed to Turso Cloud\n", u.Username)
		} else {
			fmt.Printf("[Sync] Error pushing user %s to cloud: %v\n", u.Username, cErr)
		}
	}

	// 1. Fetch Pending Shifts into memory
	var shifts []pendingShift
	shiftRows, err := db.Query(`SELECT id, shift_name, cashier, opened_at, COALESCE(closed_at,''), opening_cash, 
		closing_cash, expected_cash, cash_sales, cash_out, cash_discrepancy, total_sales, total_tx, status 
		FROM shifts WHERE sync_status = 'pending'`)
	if err == nil {
		for shiftRows.Next() {
			var s pendingShift
			if err := shiftRows.Scan(&s.id, &s.shName, &s.cashier, &s.opAt, &s.clAt, &s.opCash, &s.clCash, &s.expCash, &s.csSales, &s.csOut, &s.csDisc, &s.totSales, &s.totTx, &s.status); err == nil {
				shifts = append(shifts, s)
			}
		}
		shiftRows.Close()
	}

	// Push Shifts
	for _, s := range shifts {
		var closedAtVal interface{} = nil
		if s.clAt != "" {
			closedAtVal = s.clAt
		}
		_, cErr := cloudDB.Exec(`INSERT INTO shifts (id, shift_name, cashier, opened_at, closed_at, opening_cash, closing_cash, expected_cash, cash_sales, cash_out, cash_discrepancy, total_sales, total_tx, status, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
			ON CONFLICT(id) DO UPDATE SET closed_at=excluded.closed_at, closing_cash=excluded.closing_cash,
			expected_cash=excluded.expected_cash, cash_sales=excluded.cash_sales, cash_out=excluded.cash_out,
			cash_discrepancy=excluded.cash_discrepancy, total_sales=excluded.total_sales, total_tx=excluded.total_tx, status=excluded.status, sync_status='synced'`,
			s.id, s.shName, s.cashier, s.opAt, closedAtVal, s.opCash, s.clCash, s.expCash, s.csSales, s.csOut, s.csDisc, s.totSales, s.totTx, s.status)
		if cErr == nil {
			db.Exec("UPDATE shifts SET sync_status = 'synced' WHERE id = ?", s.id)
		}
	}

	// 2. Fetch Pending Cash Logs into memory
	var cashLogs []pendingCashLog
	cashRows, err := db.Query("SELECT id, shift_id, type, amount, description, created_at FROM cash_log WHERE sync_status = 'pending'")
	if err == nil {
		for cashRows.Next() {
			var c pendingCashLog
			if err := cashRows.Scan(&c.id, &c.shiftID, &c.logType, &c.amount, &c.desc, &c.createdAt); err == nil {
				cashLogs = append(cashLogs, c)
			}
		}
		cashRows.Close()
	}

	// Push Cash Logs
	for _, c := range cashLogs {
		_, cErr := cloudDB.Exec(`INSERT INTO cash_log (id, shift_id, type, amount, description, created_at, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, 'synced')
			ON CONFLICT(id) DO UPDATE SET sync_status='synced'`,
			c.id, c.shiftID, c.logType, c.amount, c.desc, c.createdAt)
		if cErr == nil {
			db.Exec("UPDATE cash_log SET sync_status = 'synced' WHERE id = ?", c.id)
		}
	}

	// 3. Fetch Pending Transactions into memory
	var transactions []pendingTx
	txRows, err := db.Query(`SELECT id, tx_id, shift_id, total, discount, tax, grand_total, payment, amount_paid, 
		change_amount, customer_name, member_id, cashier, notes, status, created_at 
		FROM transactions WHERE sync_status = 'pending'`)
	if err == nil {
		for txRows.Next() {
			var t pendingTx
			if err := txRows.Scan(&t.id, &t.txID, &t.shiftID, &t.total, &t.discount, &t.tax, &t.grandTotal, &t.payment, &t.amountPaid, &t.changeAmount, &t.customerName, &t.memberID, &t.cashier, &t.notes, &t.status, &t.createdAt); err == nil {
				transactions = append(transactions, t)
			}
		}
		txRows.Close()
	}

	// Fetch items for each transaction
	for i := range transactions {
		itRows, itErr := db.Query("SELECT product_id, name, qty, price, discount, subtotal, notes FROM tx_items WHERE tx_id = ?", transactions[i].txID)
		if itErr == nil {
			for itRows.Next() {
				var it pendingTxItem
				if itRows.Scan(&it.pid, &it.name, &it.qty, &it.price, &it.disc, &it.subtotal, &it.itemNotes) == nil {
					transactions[i].items = append(transactions[i].items, it)
				}
			}
			itRows.Close()
		}
	}

	// Push Transactions & Items to Cloud
	for _, t := range transactions {
		var shVal interface{} = nil
		if t.shiftID.Valid {
			shVal = t.shiftID.Int64
		}
		var mVal interface{} = nil
		if t.memberID.Valid && t.memberID.String != "" {
			mVal = t.memberID.String
		}

		_, cErr := cloudDB.Exec(`INSERT INTO transactions (tx_id, shift_id, total, discount, tax, grand_total, payment, amount_paid, change_amount, customer_name, member_id, cashier, notes, status, created_at, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
			ON CONFLICT(tx_id) DO UPDATE SET sync_status='synced'`,
			t.txID, shVal, t.total, t.discount, t.tax, t.grandTotal, t.payment, t.amountPaid, t.changeAmount, t.customerName, mVal, t.cashier, t.notes, t.status, t.createdAt)
		if cErr != nil {
			fmt.Printf("[Sync] Error inserting transaction %s to cloud: %v\n", t.txID, cErr)
			continue
		}

		for _, it := range t.items {
			cloudDB.Exec(`INSERT INTO tx_items (tx_id, product_id, name, qty, price, discount, subtotal, notes)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				t.txID, it.pid, it.name, it.qty, it.price, it.disc, it.subtotal, it.itemNotes)

			if it.pid > 0 {
				cloudDB.Exec("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?", it.qty, it.pid)
			}
		}

		db.Exec("UPDATE transactions SET sync_status = 'synced' WHERE id = ?", t.id)
		fmt.Printf("[Sync] Transaction %s successfully pushed to Turso Cloud\n", t.txID)
	}

	// 4. Fetch Pending Inventory Movements into memory
	var invMovements []pendingInvMovement
	invRows, err := db.Query(`SELECT id, product_id, movement_type, quantity, stock_before, stock_after, 
		reference_type, reference_id, source, reason, user, created_at 
		FROM inventory_movements WHERE sync_status = 'pending'`)
	if err == nil {
		for invRows.Next() {
			var im pendingInvMovement
			if err := invRows.Scan(&im.id, &im.pid, &im.movType, &im.qty, &im.stBefore, &im.stAfter, &im.refType, &im.refID, &im.source, &im.reason, &im.invUser, &im.createdAt); err == nil {
				invMovements = append(invMovements, im)
			}
		}
		invRows.Close()
	}

	// Push Inventory Movements
	for _, im := range invMovements {
		_, cErr := cloudDB.Exec(`INSERT INTO inventory_movements (product_id, movement_type, quantity, stock_before, stock_after, reference_type, reference_id, source, reason, user, created_at, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
			im.pid, im.movType, im.qty, im.stBefore, im.stAfter, im.refType, im.refID, im.source, im.reason, im.invUser, im.createdAt)
		if cErr == nil {
			db.Exec("UPDATE inventory_movements SET sync_status = 'synced' WHERE id = ?", im.id)
		}
	}

	// 5. Fetch Pending Attendance into memory
	type pendingAtt struct {
		id int
		userID sql.NullInt64
		username, cashierName, attType, attDate, attTime, notes, deviceInfo, createdAt string
	}
	var attendances []pendingAtt
	attRows, err := db.Query(`SELECT id, user_id, username, cashier_name, type, date, time, notes, device_info, created_at FROM attendance WHERE sync_status = 'pending'`)
	if err == nil {
		for attRows.Next() {
			var a pendingAtt
			if err := attRows.Scan(&a.id, &a.userID, &a.username, &a.cashierName, &a.attType, &a.attDate, &a.attTime, &a.notes, &a.deviceInfo, &a.createdAt); err == nil {
				attendances = append(attendances, a)
			}
		}
		attRows.Close()
	}

	// Make sure cloudDB has attendance table
	cloudDB.Exec(`CREATE TABLE IF NOT EXISTS attendance (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		username TEXT NOT NULL,
		cashier_name TEXT NOT NULL,
		type TEXT NOT NULL,
		date TEXT NOT NULL,
		time TEXT NOT NULL,
		notes TEXT DEFAULT '',
		device_info TEXT DEFAULT '',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		sync_status TEXT DEFAULT 'synced'
	)`)

	// Push Attendance
	for _, a := range attendances {
		var uVal interface{} = nil
		if a.userID.Valid {
			uVal = a.userID.Int64
		}
		_, cErr := cloudDB.Exec(`INSERT INTO attendance (user_id, username, cashier_name, type, date, time, notes, device_info, created_at, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
			uVal, a.username, a.cashierName, a.attType, a.attDate, a.attTime, a.notes, a.deviceInfo, a.createdAt)
		if cErr == nil {
			db.Exec("UPDATE attendance SET sync_status = 'synced' WHERE id = ?", a.id)
		}
	}

	// 6. Fetch and Push Pending Members into memory
	type pendingMember struct {
		id int
		memberID, name, phone, email, tier string
		points int
		active int
		joinedAt string
	}
	var pendingMembers []pendingMember
	memRows, err := db.Query(`SELECT id, member_id, name, phone, email, points, tier, active, joined_at FROM members WHERE sync_status = 'pending'`)
	if err == nil {
		for memRows.Next() {
			var m pendingMember
			if err := memRows.Scan(&m.id, &m.memberID, &m.name, &m.phone, &m.email, &m.points, &m.tier, &m.active, &m.joinedAt); err == nil {
				pendingMembers = append(pendingMembers, m)
			}
		}
		memRows.Close()
	}

	cloudDB.Exec(`ALTER TABLE members ADD COLUMN sync_status TEXT DEFAULT 'pending'`)

	for _, m := range pendingMembers {
		_, cErr := cloudDB.Exec(`INSERT INTO members (member_id, name, phone, email, points, tier, active, joined_at, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')
			ON CONFLICT(member_id) DO UPDATE SET
				name=excluded.name,
				phone=excluded.phone,
				email=excluded.email,
				points=excluded.points,
				tier=excluded.tier,
				active=excluded.active,
				sync_status='synced'`,
			m.memberID, m.name, m.phone, m.email, m.points, m.tier, m.active, m.joinedAt)
		if cErr == nil {
			db.Exec("UPDATE members SET sync_status = 'synced' WHERE id = ?", m.id)
			fmt.Printf("[Sync] Member %s (%s) successfully pushed to Turso Cloud\n", m.name, m.memberID)
		} else {
			fmt.Printf("[Sync] Error pushing member %s to cloud: %v\n", m.memberID, cErr)
		}
	}

	// 7. Fetch and Push Pending Stock Opname Sessions
	type pendingOpnameSession struct {
		id int
		notes, status, createdBy, createdAt string
		opnameDate sql.NullString
		closedAt sql.NullString
	}
	var opnSessions []pendingOpnameSession
	sRows, err := db.Query(`SELECT id, COALESCE(notes,''), status, opname_date, created_by, created_at, closed_at FROM stock_opname_sessions WHERE sync_status = 'pending'`)
	if err == nil {
		for sRows.Next() {
			var s pendingOpnameSession
			if err := sRows.Scan(&s.id, &s.notes, &s.status, &s.opnameDate, &s.createdBy, &s.createdAt, &s.closedAt); err == nil {
				opnSessions = append(opnSessions, s)
			}
		}
		sRows.Close()
	}

	cloudDB.Exec(`ALTER TABLE stock_opname_sessions ADD COLUMN sync_status TEXT DEFAULT 'pending'`)

	for _, s := range opnSessions {
		var opDateVal interface{} = nil
		if s.opnameDate.Valid {
			opDateVal = s.opnameDate.String
		}
		var clVal interface{} = nil
		if s.closedAt.Valid && s.closedAt.String != "" {
			clVal = s.closedAt.String
		}
		_, cErr := cloudDB.Exec(`INSERT INTO stock_opname_sessions (id, created_by, status, opname_date, notes, created_at, closed_at, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
			ON CONFLICT(id) DO UPDATE SET
				status=excluded.status,
				opname_date=excluded.opname_date,
				notes=excluded.notes,
				closed_at=excluded.closed_at,
				sync_status='synced'`,
			s.id, s.createdBy, s.status, opDateVal, s.notes, s.createdAt, clVal)
		if cErr == nil {
			db.Exec("UPDATE stock_opname_sessions SET sync_status = 'synced' WHERE id = ?", s.id)
			fmt.Printf("[Sync] Stock Opname Session %d pushed to Turso Cloud\n", s.id)
		} else {
			fmt.Printf("[Sync] Error pushing stock opname session %d to cloud: %v\n", s.id, cErr)
		}
	}

	// 8. Fetch and Push Pending Stock Opname Items
	type pendingOpnameItem struct {
		id, sessionID, productID, systemQty int
		physicalQty, difference sql.NullInt64
		scannedAt, user sql.NullString
	}
	var opnItems []pendingOpnameItem
	iRows, err := db.Query(`SELECT id, session_id, product_id, system_qty, physical_qty, difference, scanned_at, user FROM stock_opname_items WHERE sync_status = 'pending'`)
	if err == nil {
		for iRows.Next() {
			var it pendingOpnameItem
			if err := iRows.Scan(&it.id, &it.sessionID, &it.productID, &it.systemQty, &it.physicalQty, &it.difference, &it.scannedAt, &it.user); err == nil {
				opnItems = append(opnItems, it)
			}
		}
		iRows.Close()
	}

	cloudDB.Exec(`ALTER TABLE stock_opname_items ADD COLUMN sync_status TEXT DEFAULT 'pending'`)

	for _, it := range opnItems {
		var pQtyVal, diffVal, scAtVal, usrVal interface{} = nil, nil, nil, nil
		if it.physicalQty.Valid {
			pQtyVal = it.physicalQty.Int64
		}
		if it.difference.Valid {
			diffVal = it.difference.Int64
		}
		if it.scannedAt.Valid {
			scAtVal = it.scannedAt.String
		}
		if it.user.Valid {
			usrVal = it.user.String
		}

		_, cErr := cloudDB.Exec(`INSERT INTO stock_opname_items (session_id, product_id, system_qty, physical_qty, difference, scanned_at, user, sync_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
			ON CONFLICT(session_id, product_id) DO UPDATE SET
				system_qty=excluded.system_qty,
				physical_qty=excluded.physical_qty,
				difference=excluded.difference,
				scanned_at=excluded.scanned_at,
				user=excluded.user,
				sync_status='synced'`,
			it.sessionID, it.productID, it.systemQty, pQtyVal, diffVal, scAtVal, usrVal)
		if cErr == nil {
			db.Exec("UPDATE stock_opname_items SET sync_status = 'synced' WHERE id = ?", it.id)
		} else {
			fmt.Printf("[Sync] Error pushing stock opname item %d to cloud: %v\n", it.id, cErr)
		}
	}

	// Clean up any stray pending flags in cloudDB
	cloudDB.Exec("UPDATE transactions SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE shifts SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE cash_log SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE inventory_movements SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE users SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE products SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE attendance SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE members SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE stock_opname_sessions SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE stock_opname_items SET sync_status = 'synced' WHERE sync_status != 'synced'")

	return nil
}
