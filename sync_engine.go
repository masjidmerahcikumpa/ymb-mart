package main

import (
	"context"
	"database/sql"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type SyncStatus struct {
	IsOnline            bool   `json:"is_online"`
	LastSync            string `json:"last_sync"`
	PendingCount        int    `json:"pending_count"`
	IsSyncing           bool   `json:"is_syncing"`
	LastError           string `json:"last_error"`
	Mode                string `json:"mode"`
	ConsecutiveFailures int    `json:"consecutive_failures"`
	NextRetryInSec      int    `json:"next_retry_in_sec"`
}

const (
	baseSyncInterval = 15 * time.Second
	maxSyncInterval  = 300 * time.Second // 5 minutes max
)

var (
	cloudDB             *sql.DB
	cloudTargetHost     string
	cloudTargetPort     string
	syncMu              sync.Mutex
	consecutiveFailures int
	nextSyncAttempt     time.Time
	currentSyncStatus   = SyncStatus{
		IsOnline:  false,
		LastSync:  "-",
		Mode:      "local_offline_first",
	}
	syncTriggerChan = make(chan struct{}, 1)
)

func calculateBackoff(failures int) time.Duration {
	if failures <= 0 {
		return baseSyncInterval
	}
	// Exponential backoff: base * 2^failures (30s, 60s, 120s, 240s, capped at maxSyncInterval)
	multiplier := 1 << failures
	delay := baseSyncInterval * time.Duration(multiplier)
	if delay > maxSyncInterval || delay < 0 {
		delay = maxSyncInterval
	}

	// Add ±15% jitter to prevent reconnect storms
	jitterRange := int64(delay / 6)
	if jitterRange > 0 {
		jitter := (time.Now().UnixNano() % (2 * jitterRange)) - jitterRange
		delay = delay + time.Duration(jitter)
	}

	return delay
}

func InitSyncEngine(tursoURL, tursoToken string) {
	if tursoURL == "" || tursoToken == "" {
		fmt.Println("[Sync] No Turso credentials provided; running in pure offline mode")
		return
	}

	cloudTargetPort = "443"
	cleanURL := tursoURL
	if idx := strings.Index(cleanURL, "://"); idx != -1 {
		cleanURL = cleanURL[idx+3:]
	}
	if idx := strings.Index(cleanURL, "/"); idx != -1 {
		cleanURL = cleanURL[:idx]
	}
	if idx := strings.Index(cleanURL, "?"); idx != -1 {
		cleanURL = cleanURL[:idx]
	}
	if h, p, err := net.SplitHostPort(cleanURL); err == nil {
		cloudTargetHost = h
		cloudTargetPort = p
	} else {
		cloudTargetHost = cleanURL
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

	fmt.Printf("[Sync] Sync Engine initialized with Turso Cloud (target: %s:%s)\n", cloudTargetHost, cloudTargetPort)

	// Start background sync worker
	go syncWorker()
}

func syncWorker() {
	// Run initial sync after a short delay
	time.Sleep(1 * time.Second)
	TriggerSync()

	timer := time.NewTimer(baseSyncInterval)
	defer timer.Stop()

	for {
		select {
		case <-timer.C:
			err := DoSync()
			syncMu.Lock()
			if err != nil {
				consecutiveFailures++
			} else {
				consecutiveFailures = 0
			}
			delay := calculateBackoff(consecutiveFailures)
			nextSyncAttempt = time.Now().Add(delay)
			currentSyncStatus.ConsecutiveFailures = consecutiveFailures
			currentSyncStatus.NextRetryInSec = int(delay.Seconds())
			syncMu.Unlock()

			timer.Reset(delay)

		case <-syncTriggerChan:
			err := DoSync()
			syncMu.Lock()
			if err != nil {
				consecutiveFailures++
			} else {
				consecutiveFailures = 0
			}
			delay := calculateBackoff(consecutiveFailures)
			nextSyncAttempt = time.Now().Add(delay)
			currentSyncStatus.ConsecutiveFailures = consecutiveFailures
			currentSyncStatus.NextRetryInSec = int(delay.Seconds())
			syncMu.Unlock()

			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			timer.Reset(delay)
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
		var txCount, shiftCount, cashCount, userCount, prodCount, opnCount, attCount, memCount, orderCount, addrCount int
		db.QueryRow("SELECT COUNT(*) FROM transactions WHERE sync_status = 'pending'").Scan(&txCount)
		db.QueryRow("SELECT COUNT(*) FROM shifts WHERE sync_status = 'pending'").Scan(&shiftCount)
		db.QueryRow("SELECT COUNT(*) FROM cash_log WHERE sync_status = 'pending'").Scan(&cashCount)
		db.QueryRow("SELECT COUNT(*) FROM users WHERE sync_status = 'pending'").Scan(&userCount)
		db.QueryRow("SELECT COUNT(*) FROM products WHERE sync_status = 'pending'").Scan(&prodCount)
		db.QueryRow("SELECT COUNT(*) FROM stock_opname_sessions WHERE sync_status = 'pending'").Scan(&opnCount)
		db.QueryRow("SELECT COUNT(*) FROM attendance WHERE sync_status = 'pending'").Scan(&attCount)
		db.QueryRow("SELECT COUNT(*) FROM members WHERE sync_status = 'pending'").Scan(&memCount)
		db.QueryRow("SELECT COUNT(*) FROM online_orders WHERE sync_status = 'pending'").Scan(&orderCount)
		db.QueryRow("SELECT COUNT(*) FROM customer_addresses WHERE sync_status = 'pending'").Scan(&addrCount)
		currentSyncStatus.PendingCount = txCount + shiftCount + cashCount + userCount + prodCount + opnCount + attCount + memCount + orderCount + addrCount
	}

	// Dynamic countdown for next sync retry
	if !nextSyncAttempt.IsZero() {
		rem := int(time.Until(nextSyncAttempt).Seconds())
		if rem < 0 {
			rem = 0
		}
		currentSyncStatus.NextRetryInSec = rem
	}
	currentSyncStatus.ConsecutiveFailures = consecutiveFailures

	return currentSyncStatus
}

// checkAPIConnectivity verifies connectivity directly against the actual cloud database and API endpoints
func checkAPIConnectivity() (bool, error) {
	if cloudDB == nil {
		return false, fmt.Errorf("cloud database not configured")
	}

	// 1. If cloud target host is configured, test direct TCP connectivity to cloud host:port
	if cloudTargetHost != "" {
		port := cloudTargetPort
		if port == "" {
			port = "443"
		}
		targetAddr := net.JoinHostPort(cloudTargetHost, port)
		conn, err := net.DialTimeout("tcp", targetAddr, 1500*time.Millisecond)
		if err != nil {
			return false, fmt.Errorf("cloud host unreachable (%s): %w", targetAddr, err)
		}
		conn.Close()
	}

	// 2. Verified API health check via Turso database ping (verifies TLS handshake, auth token, and database engine)
	ctx, cancel := context.WithTimeout(context.Background(), 2500*time.Millisecond)
	defer cancel()

	if err := cloudDB.PingContext(ctx); err != nil {
		return false, fmt.Errorf("cloud API health check failed: %w", err)
	}

	// 3. Optional health URL check if configured (e.g. SYNC_HEALTH_URL or custom monitoring)
	if healthURL := os.Getenv("SYNC_HEALTH_URL"); healthURL != "" {
		client := &http.Client{Timeout: 2 * time.Second}
		resp, err := client.Get(healthURL)
		if err != nil {
			return false, fmt.Errorf("sync health URL failed: %w", err)
		}
		resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 400 {
			return false, fmt.Errorf("sync health URL returned HTTP %d", resp.StatusCode)
		}
	}

	return true, nil
}

func DoSync() error {
	syncMu.Lock()
	if currentSyncStatus.IsSyncing {
		syncMu.Unlock()
		return nil
	}
	currentSyncStatus.IsSyncing = true
	syncMu.Unlock()

	defer func() {
		syncMu.Lock()
		currentSyncStatus.IsSyncing = false
		syncMu.Unlock()
	}()

	if cloudDB == nil || db == nil {
		return fmt.Errorf("database not initialized")
	}

	// Ping actual API health (instead of generic DNS 8.8.8.8)
	online, connErr := checkAPIConnectivity()
	if !online || connErr != nil {
		syncMu.Lock()
		currentSyncStatus.IsOnline = false
		if connErr != nil {
			currentSyncStatus.LastError = connErr.Error()
		} else {
			currentSyncStatus.LastError = "offline: cloud API unreachable"
		}
		syncMu.Unlock()
		return connErr
	}

	syncMu.Lock()
	currentSyncStatus.IsOnline = true
	currentSyncStatus.LastError = ""
	syncMu.Unlock()

	var syncErr error

	// 2. PUSH Pending Local Products to Turso Cloud (New / Edited products)
	prodPushErr := pushLocalProductsToCloud()
	if prodPushErr != nil {
		fmt.Printf("[Sync] Product push error: %v\n", prodPushErr)
		syncErr = prodPushErr
	}

	// 3. PUSH Pending Local Transactions & Shifts to Turso Cloud
	pushErr := pushLocalTransactionsToCloud()
	if pushErr != nil {
		fmt.Printf("[Sync] Push error: %v\n", pushErr)
		if syncErr == nil {
			syncErr = pushErr
		}
	}

	// 4. PULL Master Data from Turso Cloud to Local SQLite
	pullErr := pullMasterDataFromCloud()
	if pullErr != nil {
		fmt.Printf("[Sync] Pull error: %v\n", pullErr)
		if syncErr == nil {
			syncErr = pullErr
		}
	}

	syncMu.Lock()
	if syncErr == nil {
		currentSyncStatus.LastSync = nowWIB().Format("2006-01-02 15:04:05")
		currentSyncStatus.LastError = ""
	} else {
		currentSyncStatus.LastError = syncErr.Error()
	}
	syncMu.Unlock()

	return syncErr
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
	// Check if local has pending transactions, movements, or open opname sessions before pulling stock
	var pendingTx, pendingInvMovements, openOpnameSessions, pendingOpnameSessions, pendingOpnameItems int
	db.QueryRow("SELECT COUNT(*) FROM transactions WHERE sync_status='pending'").Scan(&pendingTx)
	db.QueryRow("SELECT COUNT(*) FROM inventory_movements WHERE sync_status='pending'").Scan(&pendingInvMovements)
	db.QueryRow("SELECT COUNT(*) FROM stock_opname_sessions WHERE status='open'").Scan(&openOpnameSessions)
	db.QueryRow("SELECT COUNT(*) FROM stock_opname_sessions WHERE sync_status='pending'").Scan(&pendingOpnameSessions)
	db.QueryRow("SELECT COUNT(*) FROM stock_opname_items WHERE sync_status='pending'").Scan(&pendingOpnameItems)

	hasPendingStockChanges := (pendingTx > 0) || (pendingInvMovements > 0) || 
		(openOpnameSessions > 0) || (pendingOpnameSessions > 0) || (pendingOpnameItems > 0)

	pRows, err := cloudDB.Query("SELECT id, sku, name, description, price, cost, category, stock, min_stock, unit, barcode, promo_price, promo_active, tax_rate, active FROM products")
	if err == nil {
		defer pRows.Close()
		for pRows.Next() {
			var id, price, cost, stock, minStock, promoPrice, promoActive, active int
			var sku, name, desc, cat, unit, barcode string
			var taxRate float64
			if err := pRows.Scan(&id, &sku, &name, &desc, &price, &cost, &cat, &stock, &minStock, &unit, &barcode, &promoPrice, &promoActive, &taxRate, &active); err == nil {
				// Protect local pending changes from being overwritten
				var localID int
				var localSyncStatus string
				checkErr := db.QueryRow("SELECT id, sync_status FROM products WHERE sku = ?", sku).Scan(&localID, &localSyncStatus)
				if checkErr == nil && localSyncStatus == "pending" {
					// Local product has unpushed modifications - skip pull to avoid overwrite
					continue
				}

				if checkErr == sql.ErrNoRows && barcode != "" {
					// Not found locally by SKU, check if exists by barcode
					db.QueryRow("SELECT id, sync_status FROM products WHERE barcode = ?", barcode).Scan(&localID, &localSyncStatus)
					if localSyncStatus == "pending" {
						continue
					}
				}

				if localID == 0 {
					// Not found locally, insert new product from cloud
					db.Exec(`INSERT INTO products (id, sku, name, description, price, cost, category, stock, min_stock, unit, barcode, promo_price, promo_active, tax_rate, active, sync_status) 
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
						id, sku, name, desc, price, cost, cat, stock, minStock, unit, barcode, promoPrice, promoActive, taxRate, active)
				} else {
					// Check per-product opname protection (whether this specific item is in an active open opname session)
					protectStock := hasPendingStockChanges
					if !protectStock {
						var inActiveOpname int
						db.QueryRow(`SELECT COUNT(*) FROM stock_opname_items soi 
							JOIN stock_opname_sessions sos ON soi.session_id = sos.id 
							WHERE sos.status = 'open' AND soi.product_id = ?`, localID).Scan(&inActiveOpname)
						if inActiveOpname > 0 {
							protectStock = true
						}
					}

					if protectStock {
						// Don't overwrite local stock if there are pending transactions, open opname sessions, or unpushed inventory movements
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

	// I. Pull Online Orders from Cloud (Orders created/paid via mobile app)
	ooRows, err := cloudDB.Query(`SELECT order_no, COALESCE(member_id, ''), customer_name, customer_phone, 
		fulfillment_type, address_text, status, items_subtotal, delivery_fee, discount_amount, 
		infaq_amount, total_amount, payment_method, COALESCE(payment_reference, ''), payment_status, 
		COALESCE(shopper_notes, ''), driver_name, driver_phone, eta_minutes, 
		COALESCE(expires_at, ''), created_at, updated_at 
		FROM online_orders ORDER BY id DESC LIMIT 100`)
	if err == nil {
		defer ooRows.Close()
		for ooRows.Next() {
			var ordNo, memID, cName, cPhone, fulfill, addr, st, payMethod, payRef, payStatus, sNotes, dName, dPhone, expAt, cAt, uAt string
			var itemsSubtotal, deliveryFee, discountAmount, infaqAmount, totalAmount, etaMinutes int
			if err := ooRows.Scan(&ordNo, &memID, &cName, &cPhone, &fulfill, &addr, &st,
				&itemsSubtotal, &deliveryFee, &discountAmount, &infaqAmount, &totalAmount,
				&payMethod, &payRef, &payStatus, &sNotes, &dName, &dPhone, &etaMinutes,
				&expAt, &cAt, &uAt); err == nil {

				var localID int
				var localStatus, localSyncStatus string
				checkErr := db.QueryRow("SELECT id, status, sync_status FROM online_orders WHERE order_no = ?", ordNo).Scan(&localID, &localStatus, &localSyncStatus)

				if checkErr == sql.ErrNoRows {
					// New online order arrived from cloud!
					res, iErr := db.Exec(`INSERT INTO online_orders (
						order_no, member_id, customer_name, customer_phone, fulfillment_type, 
						address_text, status, items_subtotal, delivery_fee, discount_amount, 
						infaq_amount, total_amount, payment_method, payment_reference, 
						payment_status, shopper_notes, driver_name, driver_phone, eta_minutes, 
						expires_at, created_at, updated_at, sync_status
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
						ordNo, memID, cName, cPhone, fulfill, addr, st, itemsSubtotal, deliveryFee, discountAmount,
						infaqAmount, totalAmount, payMethod, payRef, payStatus, sNotes, dName, dPhone, etaMinutes,
						nullStr(expAt), cAt, uAt)

					if iErr == nil {
						newOrderID, _ := res.LastInsertId()
						// Pull items for this order from cloud
						itemRows, itemErr := cloudDB.Query("SELECT product_id, product_name, price, qty, subtotal, shopper_note FROM online_order_items WHERE order_no = ?", ordNo)
						if itemErr == nil {
							for itemRows.Next() {
								var pid, price, qty, subtotal int
								var pName, sNote string
								if err := itemRows.Scan(&pid, &pName, &price, &qty, &subtotal, &sNote); err == nil {
									db.Exec(`INSERT INTO online_order_items (order_id, order_no, product_id, product_name, price, qty, subtotal, shopper_note)
										VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
										newOrderID, ordNo, pid, pName, price, qty, subtotal, sNote)
								}
							}
							itemRows.Close()
						}

						// If order is paid or processing, broadcast to store cashier immediately!
						if st == "paid" || st == "processing" {
							wsBroadcast(WSMessage{
								Type: "ONLINE_ORDER_PAID",
								Data: map[string]interface{}{
									"order_no":      ordNo,
									"customer_name": cName,
									"total_amount":  totalAmount,
									"status":        st,
								},
							})
						}
					}
				} else {
					// Existing order: update local if local is not currently pending modifications
					if localSyncStatus != "pending" && localStatus != st {
						db.Exec(`UPDATE online_orders 
							SET status = ?, payment_status = ?, driver_name = ?, driver_phone = ?, eta_minutes = ?, updated_at = ?, sync_status = 'synced' 
							WHERE order_no = ?`,
							st, payStatus, dName, dPhone, etaMinutes, uAt, ordNo)

						wsBroadcast(WSMessage{
							Type: "ONLINE_ORDER_UPDATED",
							Data: map[string]interface{}{
								"order_no": ordNo,
								"status":   st,
							},
						})
					}
				}
			}
		}
	}

	// J. Pull Customer Addresses from Cloud
	caRows, err := cloudDB.Query(`SELECT id, COALESCE(member_id, ''), phone, label, recipient_name, 
		address_line, COALESCE(benchmark_note, ''), COALESCE(latitude, 0), COALESCE(longitude, 0), 
		is_primary, created_at, updated_at FROM customer_addresses`)
	if err == nil {
		defer caRows.Close()
		for caRows.Next() {
			var id, isPrimary int
			var memID, ph, lbl, rName, aLine, bNote, cAt, uAt string
			var lat, lng float64
			if err := caRows.Scan(&id, &memID, &ph, &lbl, &rName, &aLine, &bNote, &lat, &lng, &isPrimary, &cAt, &uAt); err == nil {
				var localSyncStatus string
				db.QueryRow("SELECT sync_status FROM customer_addresses WHERE id = ?", id).Scan(&localSyncStatus)
				if localSyncStatus == "pending" {
					continue
				}

				db.Exec(`INSERT INTO customer_addresses (id, member_id, phone, label, recipient_name, address_line, 
					benchmark_note, latitude, longitude, is_primary, created_at, updated_at, sync_status)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
					ON CONFLICT(id) DO UPDATE SET 
						member_id=excluded.member_id, phone=excluded.phone, label=excluded.label, 
						recipient_name=excluded.recipient_name, address_line=excluded.address_line, 
						benchmark_note=excluded.benchmark_note, latitude=excluded.latitude, 
						longitude=excluded.longitude, is_primary=excluded.is_primary, 
						updated_at=excluded.updated_at, sync_status='synced'`,
					id, memID, ph, lbl, rName, aLine, bNote, lat, lng, isPrimary, cAt, uAt)
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

	// 9. Fetch and Push Pending Online Orders to Turso Cloud
	type pendingOnlineOrderItem struct {
		productID, price, qty, subtotal int
		productName, shopperNote string
	}
	type pendingOnlineOrder struct {
		id, itemsSubtotal, deliveryFee, discountAmount, infaqAmount, totalAmount, etaMinutes int
		orderNo, memberID, customerName, customerPhone, fulfillmentType, addressText, status, paymentMethod, paymentRef, paymentStatus, shopperNotes, driverName, driverPhone, expiresAt, createdAt, updatedAt string
		items []pendingOnlineOrderItem
	}

	var pendingOnlineOrders []pendingOnlineOrder
	ooPushRows, err := db.Query(`SELECT id, order_no, COALESCE(member_id, ''), customer_name, customer_phone, 
		fulfillment_type, address_text, status, items_subtotal, delivery_fee, discount_amount, 
		infaq_amount, total_amount, payment_method, COALESCE(payment_reference, ''), payment_status, 
		COALESCE(shopper_notes, ''), driver_name, driver_phone, eta_minutes, 
		COALESCE(expires_at, ''), created_at, updated_at 
		FROM online_orders WHERE sync_status = 'pending'`)
	if err == nil {
		for ooPushRows.Next() {
			var o pendingOnlineOrder
			if err := ooPushRows.Scan(&o.id, &o.orderNo, &o.memberID, &o.customerName, &o.customerPhone, &o.fulfillmentType,
				&o.addressText, &o.status, &o.itemsSubtotal, &o.deliveryFee, &o.discountAmount, &o.infaqAmount,
				&o.totalAmount, &o.paymentMethod, &o.paymentRef, &o.paymentStatus, &o.shopperNotes,
				&o.driverName, &o.driverPhone, &o.etaMinutes, &o.expiresAt, &o.createdAt, &o.updatedAt); err == nil {

				// Fetch items for this order
				itemRows, iErr := db.Query("SELECT product_id, product_name, price, qty, subtotal, shopper_note FROM online_order_items WHERE order_no = ?", o.orderNo)
				if iErr == nil {
					for itemRows.Next() {
						var it pendingOnlineOrderItem
						if err := itemRows.Scan(&it.productID, &it.productName, &it.price, &it.qty, &it.subtotal, &it.shopperNote); err == nil {
							o.items = append(o.items, it)
						}
					}
					itemRows.Close()
				}
				pendingOnlineOrders = append(pendingOnlineOrders, o)
			}
		}
		ooPushRows.Close()
	}

	cloudDB.Exec(`CREATE TABLE IF NOT EXISTS online_orders (
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
		driver_name TEXT DEFAULT 'Pak Joko (Kurir Kilat Masjid)',
		driver_phone TEXT DEFAULT '+628123456789',
		eta_minutes INTEGER DEFAULT 15,
		expires_at TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		sync_status TEXT DEFAULT 'pending'
	)`)

	cloudDB.Exec(`CREATE TABLE IF NOT EXISTS online_order_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		order_id INTEGER NOT NULL,
		order_no TEXT NOT NULL,
		product_id INTEGER NOT NULL,
		product_name TEXT NOT NULL,
		price INTEGER NOT NULL,
		qty INTEGER NOT NULL,
		subtotal INTEGER NOT NULL,
		shopper_note TEXT DEFAULT ''
	)`)

	for _, o := range pendingOnlineOrders {
		_, cErr := cloudDB.Exec(`INSERT INTO online_orders (
			order_no, member_id, customer_name, customer_phone, fulfillment_type, 
			address_text, status, items_subtotal, delivery_fee, discount_amount, 
			infaq_amount, total_amount, payment_method, payment_reference, 
			payment_status, shopper_notes, driver_name, driver_phone, eta_minutes, 
			expires_at, created_at, updated_at, sync_status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
		ON CONFLICT(order_no) DO UPDATE SET
			status = excluded.status,
			payment_status = excluded.payment_status,
			driver_name = excluded.driver_name,
			driver_phone = excluded.driver_phone,
			eta_minutes = excluded.eta_minutes,
			updated_at = excluded.updated_at,
			sync_status = 'synced'`,
			o.orderNo, o.memberID, o.customerName, o.customerPhone, o.fulfillmentType,
			o.addressText, o.status, o.itemsSubtotal, o.deliveryFee, o.discountAmount,
			o.infaqAmount, o.totalAmount, o.paymentMethod, o.paymentRef,
			o.paymentStatus, o.shopperNotes, o.driverName, o.driverPhone, o.etaMinutes,
			nullStr(o.expiresAt), o.createdAt, o.updatedAt)

		if cErr == nil {
			var cloudOrderID int
			cloudDB.QueryRow("SELECT id FROM online_orders WHERE order_no = ?", o.orderNo).Scan(&cloudOrderID)

			for _, it := range o.items {
				cloudDB.Exec(`INSERT INTO online_order_items (order_id, order_no, product_id, product_name, price, qty, subtotal, shopper_note)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					cloudOrderID, o.orderNo, it.productID, it.productName, it.price, it.qty, it.subtotal, it.shopperNote)
			}

			db.Exec("UPDATE online_orders SET sync_status = 'synced' WHERE id = ?", o.id)
			fmt.Printf("[Sync] Online order %s pushed to Turso Cloud\n", o.orderNo)
		} else {
			fmt.Printf("[Sync] Error pushing online order %s to cloud: %v\n", o.orderNo, cErr)
		}
	}

	// 10. Fetch and Push Pending Customer Addresses to Turso Cloud
	cloudDB.Exec(`CREATE TABLE IF NOT EXISTS customer_addresses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		member_id TEXT DEFAULT '',
		phone TEXT NOT NULL,
		label TEXT DEFAULT 'Rumah',
		recipient_name TEXT NOT NULL,
		address_line TEXT NOT NULL,
		benchmark_note TEXT DEFAULT '',
		latitude REAL DEFAULT 0,
		longitude REAL DEFAULT 0,
		is_primary INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		sync_status TEXT DEFAULT 'pending'
	)`)

	type pendingCustAddr struct {
		id, isPrimary int
		memberID, phone, label, recipientName, addressLine, benchmarkNote, createdAt, updatedAt string
		latitude, longitude float64
	}
	var pendingAddrs []pendingCustAddr
	caPushRows, err := db.Query(`SELECT id, COALESCE(member_id, ''), phone, COALESCE(label, 'Rumah'), 
		recipient_name, address_line, COALESCE(benchmark_note, ''), 
		COALESCE(latitude, 0), COALESCE(longitude, 0), is_primary, created_at, updated_at 
		FROM customer_addresses WHERE sync_status = 'pending'`)
	if err == nil {
		for caPushRows.Next() {
			var a pendingCustAddr
			if err := caPushRows.Scan(&a.id, &a.memberID, &a.phone, &a.label, &a.recipientName,
				&a.addressLine, &a.benchmarkNote, &a.latitude, &a.longitude, &a.isPrimary,
				&a.createdAt, &a.updatedAt); err == nil {
				pendingAddrs = append(pendingAddrs, a)
			}
		}
		caPushRows.Close()
	}

	for _, a := range pendingAddrs {
		_, cErr := cloudDB.Exec(`INSERT INTO customer_addresses (
			id, member_id, phone, label, recipient_name, address_line, 
			benchmark_note, latitude, longitude, is_primary, created_at, updated_at, sync_status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
		ON CONFLICT(id) DO UPDATE SET
			member_id=excluded.member_id, phone=excluded.phone, label=excluded.label,
			recipient_name=excluded.recipient_name, address_line=excluded.address_line,
			benchmark_note=excluded.benchmark_note, latitude=excluded.latitude,
			longitude=excluded.longitude, is_primary=excluded.is_primary,
			updated_at=excluded.updated_at, sync_status='synced'`,
			a.id, a.memberID, a.phone, a.label, a.recipientName, a.addressLine,
			a.benchmarkNote, a.latitude, a.longitude, a.isPrimary, a.createdAt, a.updatedAt)

		if cErr == nil {
			db.Exec("UPDATE customer_addresses SET sync_status = 'synced' WHERE id = ?", a.id)
			fmt.Printf("[Sync] Customer address ID %d (%s) pushed to Turso Cloud\n", a.id, a.recipientName)
		} else {
			fmt.Printf("[Sync] Error pushing customer address %d to cloud: %v\n", a.id, cErr)
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
	cloudDB.Exec("UPDATE online_orders SET sync_status = 'synced' WHERE sync_status != 'synced'")
	cloudDB.Exec("UPDATE customer_addresses SET sync_status = 'synced' WHERE sync_status != 'synced'")

	return nil
}
