package calc

import (
	"errors"
	"math"
	"testing"
)

// Happy path: each of the four operations returns the expected result.
func TestCalculateOperations(t *testing.T) {
	tests := []struct {
		name     string
		op       string
		operands []float64
		want     float64
	}{
		{"add", "add", []float64{2, 3}, 5},
		{"add negatives", "add", []float64{-4, 1.5}, -2.5},
		{"subtract", "subtract", []float64{10, 4}, 6},
		{"subtract into negative", "subtract", []float64{3, 8}, -5},
		{"multiply", "multiply", []float64{6, 7}, 42},
		{"multiply by zero", "multiply", []float64{123, 0}, 0},
		{"divide", "divide", []float64{9, 2}, 4.5},
		{"divide negative", "divide", []float64{-9, 3}, -3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands)
			if err != nil {
				t.Fatalf("Calculate(%q, %v) returned error: %v", tt.op, tt.operands, err)
			}
			if got != tt.want {
				t.Errorf("Calculate(%q, %v) = %v, want %v", tt.op, tt.operands, got, tt.want)
			}
		})
	}
}

// Error paths: each case returns the documented sentinel and a zero result.
func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name     string
		op       string
		operands []float64
		wantErr  error
	}{
		{"division by zero", "divide", []float64{1, 0}, ErrDivisionByZero},
		{"zero divided by zero", "divide", []float64{0, 0}, ErrDivisionByZero},
		{"unsupported operation", "modulo", []float64{5, 2}, ErrUnsupportedOperation},
		{"unknown name checked before arity", "power", []float64{2}, ErrUnsupportedOperation},
		{"too few operands", "add", []float64{1}, ErrOperandCount},
		{"too many operands", "add", []float64{1, 2, 3}, ErrOperandCount},
		{"no operands", "multiply", nil, ErrOperandCount},
		{"multiply overflow", "multiply", []float64{math.MaxFloat64, math.MaxFloat64}, ErrNonFiniteResult},
		{"add overflow", "add", []float64{math.MaxFloat64, math.MaxFloat64}, ErrNonFiniteResult},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Calculate(%q, %v) error = %v, want %v", tt.op, tt.operands, err, tt.wantErr)
			}
			if got != 0 {
				t.Errorf("Calculate(%q, %v) = %v, want 0 on error", tt.op, tt.operands, got)
			}
		})
	}
}
