package main

import (
	"embed"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

//go:embed frontend/*
var frontendFS embed.FS


var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" || strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
			return true
		}
		return false
	},
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	wsMu.Lock()
	wsClients[conn] = true
	wsMu.Unlock()

	defer func() {
		wsMu.Lock()
		delete(wsClients, conn)
		wsMu.Unlock()
		conn.Close()
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func setupRouter() *http.ServeMux {
	mux := http.NewServeMux()

	// Auth helper: wrap admin-only endpoints
	adminOnly := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if !requireAuth(r, "admin") {
				jsonResponse(w, map[string]string{"error": "Unauthorized"}, 401)
				return
			}
			next(w, r)
		}
	}

	// API routes
	mux.HandleFunc("/api/login", handleLogin)
	mux.HandleFunc("/api/csrf-token", handleGetCSRFToken)
	mux.HandleFunc("/api/logout", handleLogout)
	mux.HandleFunc("/api/change-password", requireCSRF(handleChangePassword))
	mux.HandleFunc("/api/users", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handleAddCashier(w, r)
		} else {
			handleGetUsers(w, r)
		}
	}))
	mux.HandleFunc("/api/users/", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/toggle") {
			handleToggleUserStatus(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/reset-pin") {
			handleResetUserPIN(w, r)
		} else {
			http.NotFound(w, r)
		}
	}))
	mux.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handleGetProducts(w, r)
		} else if r.Method == "POST" {
			adminOnly(handleAddProduct)(w, r)
		}
	})
	mux.HandleFunc("/api/products/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/movements") {
			handleProductMovements(w, r)
		} else if r.Method == "PUT" {
			adminOnly(handleUpdateProduct)(w, r)
		} else if r.Method == "DELETE" {
			adminOnly(handleDeleteProduct)(w, r)
		}
	})
	mux.HandleFunc("/api/categories", handleGetCategories)
	mux.HandleFunc("/api/shifts/open", handleOpenShift)
	mux.HandleFunc("/api/shifts/active", handleGetActiveShifts)
	mux.HandleFunc("/api/shifts", requireCSRF(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handleOpenShift(w, r)
		} else {
			handleGetShifts(w, r)
		}
	}))
	mux.HandleFunc("/api/shifts/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			if strings.HasSuffix(r.URL.Path, "/close-self") {
				handleCloseShiftSelf(w, r)
			} else {
				adminOnly(handleCloseShift)(w, r)
			}
		}
	})
	mux.HandleFunc("/api/cash/drop", requireCSRF(adminOnly(handleCashDrop)))
	mux.HandleFunc("/api/cash/in", requireCSRF(adminOnly(handleCashIn)))
	mux.HandleFunc("/api/cash/log/", handleGetCashLog)
	mux.HandleFunc("/api/members", requireCSRF(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handleGetMembers(w, r)
		} else if r.Method == "POST" {
			handleAddMember(w, r)
		}
	}))
	mux.HandleFunc("/api/members/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/transactions") {
			handleMemberTransactions(w, r)
		} else {
			handleGetMember(w, r)
		}
	})
	mux.HandleFunc("/api/checkout", requireCSRF(handleCheckout))
	mux.HandleFunc("/api/hold", requireCSRF(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handleGetHolds(w, r)
		} else if r.Method == "POST" {
			handleHold(w, r)
		}
	}))
	mux.HandleFunc("/api/holds/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "DELETE" {
			handleDeleteHold(w, r)
		}
	})
	mux.HandleFunc("/api/transactions", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handleGetTransactions(w, r)
		}
	})
	mux.HandleFunc("/api/transactions/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			handleVoidTransaction(w, r)
		}
	})
	mux.HandleFunc("/api/stats", requireAuthHandler(handleGetStats))
	mux.HandleFunc("/api/sales-trend", requireAuthHandler(handleSalesTrend))
	mux.HandleFunc("/api/payment-breakdown", requireAuthHandler(handlePaymentBreakdown))
	mux.HandleFunc("/api/daily-report", handleDailyReport)
	mux.HandleFunc("/api/stock-report", handleStockReport)
	mux.HandleFunc("/api/e-voucher", requireCSRF(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handleGetEVouchers(w, r)
		} else if r.Method == "POST" {
			handleEVoucher(w, r)
		}
	}))
	mux.HandleFunc("/api/quick-access", handleQuickAccess)
	mux.HandleFunc("/api/receipt/", handleReceipt)
	mux.HandleFunc("/api/alerts/low-stock", handleLowStock)
	mux.HandleFunc("/api/backup", adminOnly(handleBackup))
	mux.HandleFunc("/api/restore", adminOnly(handleRestore))
	mux.HandleFunc("/api/ai/webhook", handleAIWebhook)
	mux.HandleFunc("/api/display-token", handleGenerateDisplayToken)
	mux.HandleFunc("/api/stock-adjustment", requireCSRF(adminOnly(handleStockAdjustment)))
	mux.HandleFunc("/api/stock-opname", requireCSRF(adminOnly(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" { handleListStockOpname(w, r) } else { handleCreateStockOpname(w, r) }
	})))
	mux.HandleFunc("/api/stock-opname/submit/", requireCSRF(adminOnly(handleSubmitStockOpname)))
	mux.HandleFunc("/api/stock-opname/apply/", requireCSRF(adminOnly(handleApplyStockOpname)))
	mux.HandleFunc("/api/stock-opname/", requireCSRF(adminOnly(handleGetStockOpname)))
	mux.HandleFunc("/api/ai/restock-candidates", adminOnly(handleRestockCandidates))
	mux.HandleFunc("/api/ai/report", adminOnly(handleAIReport))
	mux.HandleFunc("/api/ai/settings", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handleGetAISettings(w, r)
		} else if r.Method == "PUT" {
			adminOnly(handleUpdateAISettings)(w, r)
		}
	})
	mux.HandleFunc("/api/settings", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handleGetSettings(w, r)
		} else if r.Method == "PUT" {
			adminOnly(handleUpdateSettings)(w, r)
		}
	})
	mux.HandleFunc("/api/presensi", handlePresensi)
	mux.HandleFunc("/api/sync/status", handleGetSyncStatus)
	mux.HandleFunc("/api/sync/trigger", handleTriggerSync)
	mux.HandleFunc("/api/ws-broadcast", handleWSBroadcast)
	mux.HandleFunc("/ws", handleWebSocket)
	mux.HandleFunc("/health", handleHealth)

	// Frontend routes (prefer embedded assets, fallback to live disk)
	frontendHandler := func(name string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			var data []byte
			var err error
			data, err = frontendFS.ReadFile("frontend/" + name)
			if err != nil || len(data) == 0 {
				dir := getDataDir()
				diskPath := filepath.Join(dir, "frontend", name)
				if d, e := os.ReadFile(diskPath); e == nil {
					data = d
					err = nil
				} else if d, e := os.ReadFile(filepath.Join("frontend", name)); e == nil {
					data = d
					err = nil
				}
			}
			if err != nil && len(data) == 0 {
				http.Error(w, "Not found", 404)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
			w.Write(data)
		}
	}

	mux.HandleFunc("/kasir", frontendHandler("kasir.html"))
	mux.HandleFunc("/admin", frontendHandler("admin.html"))
	mux.HandleFunc("/customer", frontendHandler("customer.html"))
	mux.HandleFunc("/presensi", frontendHandler("presensi.html"))
	mux.HandleFunc("/sw.js", func(w http.ResponseWriter, r *http.Request) {
		data, _ := frontendFS.ReadFile("frontend/sw.js")
		if len(data) == 0 {
			dir := getDataDir()
			if d, e := os.ReadFile(filepath.Join(dir, "frontend", "sw.js")); e == nil {
				data = d
			} else if d, e := os.ReadFile("frontend/sw.js"); e == nil {
				data = d
			}
		}
		w.Header().Set("Content-Type", "application/javascript")
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Write(data)
	})
	logoHandler := func(w http.ResponseWriter, r *http.Request) {
		data, _ := frontendFS.ReadFile("frontend/logo.png")
		if len(data) == 0 {
			dir := getDataDir()
			if d, e := os.ReadFile(filepath.Join(dir, "frontend", "logo.png")); e == nil {
				data = d
			} else if d, e := os.ReadFile(filepath.Join(dir, "LOGO-YMB.png")); e == nil {
				data = d
			} else if d, e := os.ReadFile("frontend/logo.png"); e == nil {
				data = d
			} else if d, e := os.ReadFile("LOGO-YMB.png"); e == nil {
				data = d
			}
		}
		if len(data) == 0 {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(data)
	}
	mux.HandleFunc("/logo.png", logoHandler)
	mux.HandleFunc("/favicon.ico", logoHandler)
	mux.HandleFunc("/LOGO-YMB.png", logoHandler)

	mux.HandleFunc("/manifest.json", func(w http.ResponseWriter, r *http.Request) {
		data, _ := frontendFS.ReadFile("frontend/manifest.json")
		if len(data) == 0 {
			dir := getDataDir()
			if d, e := os.ReadFile(filepath.Join(dir, "frontend", "manifest.json")); e == nil {
				data = d
			} else if d, e := os.ReadFile("frontend/manifest.json"); e == nil {
				data = d
			}
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			frontendHandler("index.html")(w, r)
		} else {
			http.NotFound(w, r)
		}
	})
	mux.HandleFunc("/receipt", frontendHandler("receipt.html"))
	mux.HandleFunc("/admin-login", frontendHandler("admin-login.html"))
	mux.HandleFunc("/admin-dashboard", frontendHandler("admin.html")) // redirect to admin

	return mux
}

func main() {
	initDB()
	defer db.Close()
	go cleanupSessions()

	mux := setupRouter()

	port := "8070"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	fmt.Printf("[POS] Server starting on http://localhost:%s/\n", port)
	fmt.Printf("[POS] Data dir: %s\n", getDataDir())
	fmt.Printf("[POS] Version: 2.2 (Go)\n")

	// Auto-open browser
	go func() {
		time.Sleep(2 * time.Second)
		url := "http://localhost:" + port + "/"
		cacheBust := fmt.Sprintf("%d", time.Now().UnixMilli())
		freshURL := url + "?v=" + cacheBust
		fmt.Printf("[POS] Opening browser: %s\n", freshURL)
		if runtime.GOOS == "windows" {
			// Use separate Chrome profile for POS (always kiosk-printing)
		myPath, _ := os.Executable()
		posDir := filepath.Dir(myPath)
		chromeProfile := filepath.Join(posDir, "chrome-pos-profile")
		exec.Command("cmd", "/c", "start", "chrome",
			"--user-data-dir="+chromeProfile,
			"--kiosk-printing",
			"--disable-features=TranslateUI",
			"--no-first-run",
			"--disable-session-crashed-bubble",
			freshURL).Start()
		} else if runtime.GOOS == "darwin" {
			exec.Command("open", freshURL).Start()
		} else {
			exec.Command("xdg-open", freshURL).Start()
		}
	}()

// Auto-start Cloudflare Tunnel ONLY if ENABLE_ADMIN_TUNNEL=true
	if os.Getenv("ENABLE_ADMIN_TUNNEL") != "true" {
		fmt.Println("[POS] Admin tunnel DISABLED (set ENABLE_ADMIN_TUNNEL=true to enable)")
	} else {
	go func() {
		time.Sleep(3 * time.Second)
		exePath, _ := os.Executable()
		exeDir := filepath.Dir(exePath)
		cloudflared := filepath.Join(exeDir, "cloudflared.exe")
		if _, err := os.Stat(cloudflared); os.IsNotExist(err) {
			fmt.Printf("[POS] cloudflared.exe not found in %s\n", exeDir)
			return
		}
		fmt.Printf("[POS] Found cloudflared at: %s\n", cloudflared)
		fmt.Printf("[POS] Starting Cloudflare Tunnel...\n")
		fmt.Printf("[POS] Buka terminal cloudflared untuk lihat URL\n")
		fmt.Printf("[POS] Atau jalankan manual: ENABLE_ADMIN_TUNNEL=true cloudflared tunnel --url http://localhost:%s\n", port)
		// Open cloudflared in separate console window
		if runtime.GOOS == "windows" {
			cmd := exec.Command("cmd", "/c", "start", "cmd", "/k", cloudflared, "tunnel", "--url", "http://localhost:"+port)
			cmd.Start()
		} else {
			cmd := exec.Command(cloudflared, "tunnel", "--url", "http://localhost:"+port)
			cmd.Start()
		}
	}()
	}

log.Fatal(http.ListenAndServe(":"+port, mux))
}
