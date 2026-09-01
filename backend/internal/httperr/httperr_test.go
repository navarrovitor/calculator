package httperr

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/navarrovitor/calculator/backend/internal/calc"
)

// An *Error reports its client-facing message through the error interface.
func TestErrorMessage(t *testing.T) {
	tests := []struct {
		name string
		err  *Error
		want string
	}{
		{"bad request", BadRequest("bad input"), "bad input"},
		{"unprocessable", Unprocessable("cannot compute"), "cannot compute"},
		{"method not allowed", MethodNotAllowed("only POST"), "only POST"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.err.Error(); got != tt.want {
				t.Errorf("Error() = %q, want %q", got, tt.want)
			}
		})
	}
}

// Write maps each error to its status code and renders the {"error": message}
// body, regardless of whether the error is an *Error or a wrapped calc sentinel.
func TestWriteStatusMapping(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantBody   string
	}{
		{"bad request helper", BadRequest("bad input"), http.StatusBadRequest, "bad input"},
		{"unprocessable helper", Unprocessable("cannot compute"), http.StatusUnprocessableEntity, "cannot compute"},
		{"method not allowed helper", MethodNotAllowed("only POST"), http.StatusMethodNotAllowed, "only POST"},
		{"operand count sentinel", calc.ErrOperandCount, http.StatusBadRequest, calc.ErrOperandCount.Error()},
		{"unsupported operation sentinel", calc.ErrUnsupportedOperation, http.StatusUnprocessableEntity, calc.ErrUnsupportedOperation.Error()},
		{"division by zero sentinel", calc.ErrDivisionByZero, http.StatusUnprocessableEntity, calc.ErrDivisionByZero.Error()},
		{"negative sqrt sentinel", calc.ErrNegativeSqrt, http.StatusUnprocessableEntity, calc.ErrNegativeSqrt.Error()},
		{"non-finite result sentinel", calc.ErrNonFiniteResult, http.StatusUnprocessableEntity, calc.ErrNonFiniteResult.Error()},
		// A wrapped sentinel maps to the right status via errors.Is, and the
		// body carries the sentinel's own message, not the wrapping context.
		{"wrapped sentinel", fmt.Errorf("context: %w", calc.ErrDivisionByZero), http.StatusUnprocessableEntity, calc.ErrDivisionByZero.Error()},
		{"unrecognised error", errors.New("boom"), http.StatusInternalServerError, "internal server error"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			Write(rec, tt.err)

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", ct)
			}
			var got body
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("response body is not valid JSON: %v (%q)", err, rec.Body.String())
			}
			if got.Error != tt.wantBody {
				t.Errorf("error message = %q, want %q", got.Error, tt.wantBody)
			}
		})
	}
}
