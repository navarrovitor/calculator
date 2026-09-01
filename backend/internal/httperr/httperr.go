// Package httperr is the single place that turns an error into an HTTP status
// code and the shared {"error": "message"} response body (ADR-0002).
package httperr

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/navarrovitor/calculator/backend/internal/calc"
)

// Error is an error that carries the HTTP status and client-facing message it
// should produce. Handlers build one with BadRequest or Unprocessable for
// failures they detect directly (invalid JSON, missing fields).
type Error struct {
	Status  int
	Message string
}

// Error returns the client-facing message.
func (e *Error) Error() string { return e.Message }

// BadRequest returns an Error that maps to HTTP 400 with msg as its body.
func BadRequest(msg string) *Error {
	return &Error{Status: http.StatusBadRequest, Message: msg}
}

// Unprocessable returns an Error that maps to HTTP 422 with msg as its body.
func Unprocessable(msg string) *Error {
	return &Error{Status: http.StatusUnprocessableEntity, Message: msg}
}

// MethodNotAllowed returns an Error that maps to HTTP 405 with msg as its body.
func MethodNotAllowed(msg string) *Error {
	return &Error{Status: http.StatusMethodNotAllowed, Message: msg}
}

// body is the shared error response shape.
type body struct {
	Error string `json:"error"`
}

// Write maps err to a status code and writes the {"error": "message"} body. It
// honours an *Error directly; otherwise it recognises the calc sentinels
// (ErrOperandCount -> 400; ErrUnsupportedOperation, ErrDivisionByZero, and
// ErrNonFiniteResult -> 422). Anything else is a 500 with a generic message.
func Write(w http.ResponseWriter, err error) {
	he := classify(err)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(he.Status)
	_ = json.NewEncoder(w).Encode(body{Error: he.Message})
}

// classify resolves err to the Error that should be written for it.
func classify(err error) *Error {
	if he, ok := errors.AsType[*Error](err); ok {
		return he
	}
	switch {
	case errors.Is(err, calc.ErrOperandCount):
		return BadRequest(err.Error())
	case errors.Is(err, calc.ErrUnsupportedOperation),
		errors.Is(err, calc.ErrDivisionByZero),
		errors.Is(err, calc.ErrNonFiniteResult):
		return Unprocessable(err.Error())
	default:
		return &Error{Status: http.StatusInternalServerError, Message: "internal server error"}
	}
}
