// Package calc holds the pure arithmetic core of the calculator. It has no
// knowledge of HTTP; callers translate its errors into responses.
package calc

import (
	"errors"
	"math"
)

// ErrOperandCount indicates the operand count does not match the operation's
// arity. The HTTP layer maps it to 400 (malformed input).
var ErrOperandCount = errors.New("wrong operand count for operation")

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

// ErrNegativeSqrt indicates a square root of a negative number. The HTTP layer
// maps it to 422 (well-formed request, invalid calculation).
var ErrNegativeSqrt = errors.New("square root of a negative number")

// unaryOp applies an operation to exactly one operand.
type unaryOp func(a float64) (float64, error)

// binaryOp applies an operation to exactly two operands.
type binaryOp func(a, b float64) (float64, error)

// unaryOps is the dispatch table for one-operand operations (ADR-0001).
var unaryOps = map[string]unaryOp{
	"sqrt": sqrt,
}

// binaryOps is the dispatch table for two-operand operations; adding an
// operation is an entry here, per ADR-0001.
var binaryOps = map[string]binaryOp{
	"add":            func(a, b float64) (float64, error) { return a + b, nil },
	"subtract":       func(a, b float64) (float64, error) { return a - b, nil },
	"multiply":       func(a, b float64) (float64, error) { return a * b, nil },
	"divide":         divide,
	"exponentiation": exponentiation,
	"percentage":     percentage,
}

// Calculate applies the named operation to operands and returns the result. It
// returns ErrUnsupportedOperation for an unknown operation, ErrOperandCount
// when the operand count does not match the operation's arity, and an
// operation-specific sentinel (ErrDivisionByZero, ErrNegativeSqrt) or
// ErrNonFiniteResult for an invalid calculation. Arity is checked per
// operation: sqrt takes one operand, every other operation takes two.
func Calculate(operation string, operands []float64) (float64, error) {
	if op, ok := unaryOps[operation]; ok {
		if len(operands) != 1 {
			return 0, ErrOperandCount
		}
		return finite(op(operands[0]))
	}
	if op, ok := binaryOps[operation]; ok {
		if len(operands) != 2 {
			return 0, ErrOperandCount
		}
		return finite(op(operands[0], operands[1]))
	}
	return 0, ErrUnsupportedOperation
}

// finite passes an operation's result through unless it errored or is not a
// finite number, in which case it returns ErrNonFiniteResult.
func finite(result float64, err error) (float64, error) {
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

// exponentiation returns a raised to the power b. math.Pow returns +Inf on
// overflow, which Calculate maps to ErrNonFiniteResult.
func exponentiation(a, b float64) (float64, error) {
	return math.Pow(a, b), nil
}

// sqrt returns the square root of a, or ErrNegativeSqrt when a is negative.
func sqrt(a float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSqrt
	}
	return math.Sqrt(a), nil
}

// percentage returns (a / 100) * b — "a% of b", per ADR-0003.
func percentage(a, b float64) (float64, error) {
	return (a / 100) * b, nil
}
