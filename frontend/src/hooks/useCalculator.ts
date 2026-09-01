import { useEffect, useReducer } from "react";
import { CalculationError, calculate } from "../lib/api.ts";
import type { CalculateRequest, Operation } from "../types.ts";

// All calculator input logic lives in this hook (ADR-0004). Components read
// `display`/`error`/`busy` and call the handlers; they hold no state of their
// own. Handlers dispatch plain user intents (`digit`, `operator`, `equals`, …);
// the reducer is the single place that interprets an intent against the current
// state. When an intent needs a backend result the reducer parks a request in
// `status`, and one effect drains it.
//
// State model:
// - `buffer`      the digits typed for the current operand ("" = nothing typed)
// - `accumulator` the left operand / running result, or null
// - `pendingOp`   the (always two-operand) operation awaiting its right operand
// - `lastResult`  the value from the most recent `=` (shown when buffer is "")
// - `overwrite`   true when `buffer` holds a computed value; the next digit
//                 starts a fresh entry instead of appending
// - `error`       a client- or backend-originated message to surface, or null
// - `status`      "ready", or an in-flight backend request plus what to do
//                 with its result
//
// Invariant: `accumulator` and `pendingOp` are always set and cleared together.

/** ARITY is the operand count per operation, mirroring the backend dispatch. */
const ARITY: Record<Operation, 1 | 2> = {
  sqrt: 1,
  add: 2,
  subtract: 2,
  multiply: 2,
  divide: 2,
  exponentiation: 2,
  percentage: 2,
};

/** OPERATOR_SYMBOL is the glyph shown for a pending operation in the expression line. */
const OPERATOR_SYMBOL: Record<Operation, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
  exponentiation: "^",
  percentage: "%",
  sqrt: "√",
};

// Continuation is what `applyResult` does with a resolved backend result.
type Continuation =
  | { apply: "chainInto"; op: Operation } // fold result into the accumulator, then start `op`
  | { apply: "finish" } // `=`: result becomes the last result
  | { apply: "intoBuffer" }; // sqrt: result replaces the current entry

type Status =
  | { kind: "ready" }
  | { kind: "computing"; request: CalculateRequest; then: Continuation };

const READY: Status = { kind: "ready" };

interface CalculatorState {
  buffer: string;
  accumulator: number | null;
  pendingOp: Operation | null;
  lastResult: number | null;
  overwrite: boolean;
  error: string | null;
  status: Status;
}

const initialState: CalculatorState = {
  buffer: "",
  accumulator: null,
  pendingOp: null,
  lastResult: null,
  overwrite: false,
  error: null,
  status: READY,
};

type Action =
  | { type: "digit"; digit: string }
  | { type: "decimal" }
  | { type: "operator"; op: Operation }
  | { type: "equals" }
  | { type: "clear" }
  | { type: "resolved"; result: number }
  | { type: "failed"; message: string };

/**
 * committedValue is the numeric value in play when nothing is being typed: the
 * running result mid-chain, or the last `=` result, or null.
 */
function committedValue(state: CalculatorState): number | null {
  return state.accumulator ?? state.lastResult;
}

/**
 * currentOperand is the value the user's current entry represents: the typed
 * buffer, or a standalone committed value. A half-entered binary op (`2 + √`)
 * has no operand yet and yields null.
 */
function currentOperand(state: CalculatorState): number | null {
  if (state.buffer !== "") {
    return Number(state.buffer);
  }
  if (state.pendingOp !== null) {
    return null;
  }
  return committedValue(state);
}

function displayValue(state: CalculatorState): string {
  if (state.buffer !== "") {
    return state.buffer;
  }
  return String(committedValue(state) ?? 0);
}

/**
 * expressionText is the "left operand + pending operator" line shown above the
 * display while a binary operation waits for its right operand. Empty when
 * nothing is pending.
 */
function expressionText(state: CalculatorState): string {
  if (state.pendingOp === null || state.accumulator === null) {
    return "";
  }
  return `${state.accumulator} ${OPERATOR_SYMBOL[state.pendingOp]}`;
}

function messageFor(err: unknown): string {
  if (err instanceof CalculationError) {
    return err.message;
  }
  return "Something went wrong.";
}

function computing(
  state: CalculatorState,
  request: CalculateRequest,
  then: Continuation,
): CalculatorState {
  return { ...state, status: { kind: "computing", request, then } };
}

function applyOperator(state: CalculatorState, op: Operation): CalculatorState {
  if (state.error) {
    return state;
  }

  if (ARITY[op] === 1) {
    const value = currentOperand(state);
    if (value === null || Number.isNaN(value)) {
      // Shallow client validation only: empty / non-numeric (ADR-0005).
      return { ...state, error: "Enter a number first." };
    }
    return computing(state, { operation: op, operands: [value] }, { apply: "intoBuffer" });
  }

  if (state.buffer === "") {
    // Chained operator, or an operator right after `=`: keep the left operand
    // (or the last result), just swap in the new operation.
    return {
      ...state,
      accumulator: state.accumulator ?? state.lastResult ?? 0,
      pendingOp: op,
      lastResult: null,
      overwrite: false,
    };
  }
  if (state.pendingOp !== null && state.accumulator !== null) {
    // A second operand was entered: evaluate the pending op, then start `op`.
    return computing(
      state,
      { operation: state.pendingOp, operands: [state.accumulator, Number(state.buffer)] },
      { apply: "chainInto", op },
    );
  }
  return {
    ...state,
    accumulator: Number(state.buffer),
    buffer: "",
    pendingOp: op,
    lastResult: null,
    overwrite: false,
  };
}

function applyEquals(state: CalculatorState): CalculatorState {
  if (state.error) {
    return state;
  }
  // Redundant `=` (nothing pending) and empty submission are no-ops.
  if (state.pendingOp === null || state.accumulator === null) {
    return state;
  }
  // Trailing operator on submit (`2 + =`): reuse the left operand as the right.
  const right = state.buffer === "" ? state.accumulator : Number(state.buffer);
  return computing(
    state,
    { operation: state.pendingOp, operands: [state.accumulator, right] },
    { apply: "finish" },
  );
}

function applyResult(state: CalculatorState, then: Continuation, result: number): CalculatorState {
  const base = { ...state, status: READY, buffer: "", overwrite: true, error: null };
  switch (then.apply) {
    case "chainInto":
      return { ...base, accumulator: result, pendingOp: then.op, lastResult: null };
    case "finish":
      return { ...base, accumulator: null, pendingOp: null, lastResult: result };
    case "intoBuffer":
      return { ...base, buffer: String(result) };
  }
}

function reducer(state: CalculatorState, action: Action): CalculatorState {
  // While a request is in flight only its resolution, or a Clear, is accepted.
  if (
    state.status.kind === "computing" &&
    action.type !== "resolved" &&
    action.type !== "failed" &&
    action.type !== "clear"
  ) {
    return state;
  }

  switch (action.type) {
    case "digit": {
      const base = state.overwrite || state.buffer === "0" ? "" : state.buffer;
      return { ...state, buffer: base + action.digit, overwrite: false, error: null };
    }
    case "decimal": {
      if (state.overwrite || state.buffer === "") {
        return { ...state, buffer: "0.", overwrite: false, error: null };
      }
      if (state.buffer.includes(".")) {
        return { ...state, error: null };
      }
      return { ...state, buffer: `${state.buffer}.`, error: null };
    }
    case "operator":
      return applyOperator(state, action.op);
    case "equals":
      return applyEquals(state);
    case "clear":
      return initialState;
    case "resolved":
      return state.status.kind === "computing"
        ? applyResult(state, state.status.then, action.result)
        : state;
    case "failed":
      return state.status.kind === "computing"
        ? { ...state, status: READY, error: action.message }
        : state;
  }
}

/** UseCalculator is the return shape of the useCalculator hook. */
export interface UseCalculator {
  display: string;
  expression: string;
  error: string | null;
  busy: boolean;
  inputDigit: (digit: string) => void;
  inputDecimal: () => void;
  inputOperation: (op: Operation) => void;
  equals: () => void;
  clear: () => void;
}

/** useCalculator owns every piece of calculator input state (ADR-0004). */
export function useCalculator(): UseCalculator {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (state.status.kind !== "computing") {
      return;
    }
    const { request } = state.status;
    let cancelled = false;
    calculate(request).then(
      (result) => {
        if (!cancelled) {
          dispatch({ type: "resolved", result });
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          dispatch({ type: "failed", message: messageFor(err) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  return {
    display: displayValue(state),
    expression: expressionText(state),
    error: state.error,
    busy: state.status.kind === "computing",
    inputDigit: (digit) => dispatch({ type: "digit", digit }),
    inputDecimal: () => dispatch({ type: "decimal" }),
    inputOperation: (op) => dispatch({ type: "operator", op }),
    equals: () => dispatch({ type: "equals" }),
    clear: () => dispatch({ type: "clear" }),
  };
}
