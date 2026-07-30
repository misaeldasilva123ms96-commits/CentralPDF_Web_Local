package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthAllowsOnlyGet(t *testing.T) {
	handler := newHandler(t.TempDir())

	get := httptest.NewRecorder()
	handler.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/__health", nil))
	if get.Code != http.StatusOK {
		t.Fatalf("GET /__health = %d, want %d", get.Code, http.StatusOK)
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
	} {
		if got := response.Header().Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}
}
