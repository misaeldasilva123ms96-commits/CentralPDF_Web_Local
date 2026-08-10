package main

import (
	"context"
	"fmt"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

func main() {
	exe, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}
	root := filepath.Dir(exe)
	if err := os.Chdir(root); err != nil {
		log.Fatal(err)
	}

	registerMimeTypes()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatal(err)
	}
	address := listener.Addr().(*net.TCPAddr)
	baseURL := fmt.Sprintf("http://127.0.0.1:%d/index.html", address.Port)
	if os.Getenv("CENTRALPDF_PRINT_URL") == "1" {
		fmt.Println(baseURL)
	}

	mux := newHandler(root)

	server := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       2 * time.Minute,
	}

	if os.Getenv("CENTRALPDF_NO_BROWSER") != "1" {
		go func() {
			time.Sleep(350 * time.Millisecond)
			if err := openBrowser(baseURL); err != nil {
				log.Printf("Abra manualmente: %s (%v)", baseURL, err)
			}
		}()
	}

	go func() {
		// Evita processos esquecidos indefinidamente em computadores compartilhados.
		timer := time.NewTimer(12 * time.Hour)
		<-timer.C
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
	}()

	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func newHandler(root string) http.Handler {
	registerMimeTypes()
	files := http.FileServer(http.Dir(root))
	mux := http.NewServeMux()
	mux.HandleFunc("/__health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok","app":"Central PDF","version":"1.2.1"}`))
	})
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh; worker-src 'self' blob: https://cdn.jsdelivr.net; connect-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://tessdata.projectnaptha.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'")
		if strings.HasSuffix(r.URL.Path, "sw.js") || strings.HasSuffix(r.URL.Path, "index.html") || strings.HasSuffix(r.URL.Path, "vendor/offline-status.js") || r.URL.Path == "/" {
			w.Header().Set("Cache-Control", "no-cache")
		}
		files.ServeHTTP(w, r)
	}))
	return mux
}

func registerMimeTypes() {
	_ = mime.AddExtensionType(".webmanifest", "application/manifest+json")
	_ = mime.AddExtensionType(".wasm", "application/wasm")
	_ = mime.AddExtensionType(".mjs", "text/javascript; charset=utf-8")
}

func openBrowser(url string) error {
	switch runtime.GOOS {
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		return exec.Command("open", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}
