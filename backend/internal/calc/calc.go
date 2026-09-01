// Package calc holds the pure arithmetic core of the calculator. It has no
// knowledge of HTTP; callers translate its errors into responses.
package calc

import (
	"errors"
	"math"
)

// ErrOperandCount indicates the operand count does not match the operation's
// arity. The HTTP layer maps it to 400 (malformed input).
var ErrOperandCount = errors.New("expected exactly 2 operands")

// ErrNonFiniteResult indicates the operation overflowed float64 or is
// otherwise not a finite number. The HTTP layer maps it to 422 (well-formed
// request, invalid calculation).
var ErrNonFiniteResult = errors.New("result is not a finite number")

// ErrUnsupportedOperation indicates the operation name is not recognised. The
// HTTP layer maps it to 422 (well-formed request, invalid calculation).
var ErrUnsupportedOperation = errors.New("unsupported operation")

// ErrDivisionByZero indicates a divide by a zero denominator. The HTTP layer
// maps it to 422 (well-formed request, invalid calculation).
var ErrDivisionByZero = errors.New("division by zero")

// binaryOp applies an operation to exactly two operands.
type binaryOp func(a, b float64) (float64, error)

// binaryOps is the operation dispatch table; adding an operation is an entry
// here, per ADR-0001. This pass implements only the four required operations —
// the rest of ADR-0003 lands in a later prompt.
var binaryOps = map[string]binaryOp{
	"add":      func(a, b float64) (float64, error) { return a + b, nil },
	"subtract": func(a, b float64) (float64, error) { return a - b, nil },
	"multiply": func(a, b float64) (float64, error) { return a * b, nil },
	"divide":   divide,
}

// Calculate applies the named operation to operands and returns the result. It
// returns ErrUnsupportedOperation for an unknown operation, ErrOperandCount
// when the operand count does not match the operation's arity, and
// ErrDivisionByZero for division by zero. Every operation in this pass is
// binary and requires exactly two operands.
func Calculate(operation string, operands []float64) (float64, error) {
	op, ok := binaryOps[operation]
	if !ok {
		return 0, ErrUnsupportedOperation
	}
	if len(operands) != 2 {
		return 0, ErrOperandCount
	}
	result, err := op(operands[0], operands[1])
	if err != nil {
		return 0, err
	}
	if math.IsInf(result, 0) || math.IsNaN(result) {
		return 0, ErrNonFiniteResult
	}
	return result, nil
}

// divide returns a/b, or ErrDivisionByZero when b is zero.
func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}
