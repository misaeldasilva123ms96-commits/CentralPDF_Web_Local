package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestHealthAllowsOnlyGet(t *testing.T) {
	handler := newHandler(t.TempDir())

	get := httptest.NewRecorder()
	handler.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/__health", nil))
	if get.Code != http.StatusOK {
		t.Fatalf("GET /__health = %d, want %d", get.Code, http.StatusOK)
	}
	if !strings.Contains(get.Body.String(), `"version":"`+appVersion+`"`) {
		t.Fatalf("GET /__health body = %q, want version %q", get.Body.String(), appVersion)
	}

	post := httptest.NewRecorder()
	handler.ServeHTTP(post, httptest.NewRequest(http.MethodPost, "/__health", nil))
	if post.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST /__health = %d, want %d", post.Code, http.StatusMethodNotAllowed)
	}
}

func TestShutdownEndpointIsNotExposed(t *testing.T) {
	handler := newHandler(t.TempDir())
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/__shutdown", nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("POST /__shutdown = %d, want %d", response.Code, http.StatusNotFound)
	}
}

func TestStaticSecurityHeaders(t *testing.T) {
	handler := newHandler(t.TempDir())
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))

	for header, want := range map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "SAMEORIGIN",
		"Referrer-Policy":        "no-referrer",
		"Permissions-Policy":     "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	} {
		if got := response.Header().Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}
	if got := response.Header().Get("Content-Security-Policy"); got == "" {
		t.Error("Content-Security-Policy is missing")
	}
}

func TestModuleMimeType(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "module.mjs"), []byte("export const ok = true;"), 0o600); err != nil {
		t.Fatal(err)
	}

	response := httptest.NewRecorder()
	newHandler(root).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/module.mjs", nil))
	if got := response.Header().Get("Content-Type"); !strings.HasPrefix(got, "text/javascript") {
		t.Fatalf("Content-Type = %q, want JavaScript", got)
	}
}
