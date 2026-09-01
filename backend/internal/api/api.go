// Package api wires the HTTP layer for the calculator to the pure calc core.
package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/navarrovitor/calculator/backend/internal/calc"
	"github.com/navarrovitor/calculator/backend/internal/httperr"
)

// request is the POST /calculate payload (ADR-0001).
type request struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
}

// response is the POST /calculate success body.
type response struct {
	Result float64 `json:"result"`
}

// NewMux returns the calculator's HTTP handler with all routes registered.
func NewMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /calculate", handleCalculate)
	mux.HandleFunc("/calculate", handleMethodNotAllowed)
	return mux
}

// handleMethodNotAllowed answers non-POST requests to /calculate with a 405 in
// the shared error shape (ADR-0002), rather than the net/http default.
func handleMethodNotAllowed(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Allow", http.MethodPost)
	httperr.Write(w, httperr.MethodNotAllowed("only POST is supported on /calculate"))
}

// handleCalculate decodes a calculation request, runs it through calc, and
// writes {"result": number} on success. Every failure path goes through
// httperr.Write so the error body shape stays consistent (ADR-0002).
func handleCalculate(w http.ResponseWriter, r *http.Request) {
	var req request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		if _, ok := errors.AsType[*json.UnmarshalTypeError](err); ok {
			httperr.Write(w, httperr.BadRequest("operands must be numbers"))
			return
		}
		httperr.Write(w, httperr.BadRequest("request body is not valid JSON"))
		return
	}
	if req.Operation == "" {
		httperr.Write(w, httperr.BadRequest(`"operation" is required`))
		return
	}

	result, err := calc.Calculate(req.Operation, req.Operands)
	if err != nil {
		httperr.Write(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(response{Result: result})
}
