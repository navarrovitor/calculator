package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// serve runs one request through the real mux and returns the recorder.
func serve(t *testing.T, method, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, "/calculate", strings.NewReader(body))
	rec := httptest.NewRecorder()
	NewMux().ServeHTTP(rec, req)
	return rec
}

// Happy path: each operation returns 200 and {"result": n}.
func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want float64
	}{
		{"add", `{"operation":"add","operands":[2,3]}`, 5},
		{"subtract", `{"operation":"subtract","operands":[10,4]}`, 6},
		{"multiply", `{"operation":"multiply","operands":[6,7]}`, 42},
		{"divide", `{"operation":"divide","operands":[9,2]}`, 4.5},
		{"exponentiation", `{"operation":"exponentiation","operands":[2,10]}`, 1024},
		{"sqrt", `{"operation":"sqrt","operands":[144]}`, 12},
		{"percentage", `{"operation":"percentage","operands":[50,200]}`, 100},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, http.MethodPost, tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200 (body %q)", rec.Code, rec.Body.String())
			}
			var got struct {
				Result float64 `json:"result"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("response is not valid JSON: %v (%q)", err, rec.Body.String())
			}
			if got.Result != tt.want {
				t.Errorf("result = %v, want %v", got.Result, tt.want)
			}
		})
	}
}

// Failure paths: the status code distinguishes malformed input (400) from a
// well-formed but invalid calculation (422); every case returns {"error": ...}.
func TestCalculateErrorStatus(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{"division by zero", `{"operation":"divide","operands":[1,0]}`, http.StatusUnprocessableEntity},
		{"unsupported operation", `{"operation":"power","operands":[2,3]}`, http.StatusUnprocessableEntity},
		{"missing operands", `{"operation":"add"}`, http.StatusBadRequest},
		{"non-numeric operands", `{"operation":"add","operands":[1,"x"]}`, http.StatusBadRequest},
		{"too few operands", `{"operation":"add","operands":[1]}`, http.StatusBadRequest},
		{"too many operands", `{"operation":"add","operands":[1,2,3]}`, http.StatusBadRequest},
		{"malformed JSON", `{"operation":`, http.StatusBadRequest},
		{"empty body", ``, http.StatusBadRequest},
		{"trailing data after object", `{"operation":"add","operands":[1,2]} extra`, http.StatusBadRequest},
		{"missing operation", `{"operands":[1,2]}`, http.StatusBadRequest},
		{"negative sqrt", `{"operation":"sqrt","operands":[-1]}`, http.StatusUnprocessableEntity},
		{"exponentiation overflow", `{"operation":"exponentiation","operands":[10,400]}`, http.StatusUnprocessableEntity},
		{"sqrt wrong operand count", `{"operation":"sqrt","operands":[1,2]}`, http.StatusBadRequest},
		{"exponentiation wrong operand count", `{"operation":"exponentiation","operands":[2]}`, http.StatusBadRequest},
		{"percentage wrong operand count", `{"operation":"percentage","operands":[1]}`, http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, http.MethodPost, tt.body)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body %q)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			var got struct {
				Error string `json:"error"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("response is not valid JSON: %v (%q)", err, rec.Body.String())
			}
			if got.Error == "" {
				t.Error("error message is empty, want non-empty")
			}
		})
	}
}

// Non-POST methods on /calculate get 405 with an Allow header, in the shared
// error shape.
func TestCalculateMethodNotAllowed(t *testing.T) {
	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch} {
		t.Run(method, func(t *testing.T) {
			rec := serve(t, method, "")
			if rec.Code != http.StatusMethodNotAllowed {
				t.Fatalf("status = %d, want 405 (body %q)", rec.Code, rec.Body.String())
			}
			if allow := rec.Header().Get("Allow"); allow != http.MethodPost {
				t.Errorf("Allow header = %q, want %q", allow, http.MethodPost)
			}
			var got struct {
				Error string `json:"error"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("response is not valid JSON: %v (%q)", err, rec.Body.String())
			}
			if got.Error == "" {
				t.Error("error message is empty, want non-empty")
			}
		})
	}
}
