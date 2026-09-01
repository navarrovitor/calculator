import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CalculationError, calculate } from "../lib/api.ts";
import type { BinaryOperation, CalculateRequest } from "../types.ts";

// All calculator input logic lives in this hook (ADR-0004). Components read
// `display`/`error` and call the handlers; they hold no state of their own.
//
// State model:
// - `buffer`      the digits typed for the current operand ("" = nothing typed)
// - `accumulator` the left operand / running result, or null
// - `pendingOp`   the operation awaiting its right operand, or null
// - `lastResult`  the value from the most recent `=` (shown when buffer is "")
// - `overwrite`   true when `buffer` holds a computed value; the next digit
//                 starts a fresh entry instead of appending
// - `error`       a client- or backend-originated message to surface, or null
//
// Invariant: `accumulator` and `pendingOp` are always set and cleared together.

interface CalculatorState {
  buffer: string;
  accumulator: number | null;
  pendingOp: BinaryOperation | null;
  lastResult: number | null;
  overwrite: boolean;
  error: string | null;
}

const initialState: CalculatorState = {
  buffer: "",
  accumulator: null,
  pendingOp: null,
  lastResult: null,
  overwrite: false,
  error: null,
};

type Action =
  | { type: "digit"; digit: string }
  | { type: "decimal" }
  | { type: "clear" }
  | { type: "operatorNoBuffer"; op: BinaryOperation }
  | { type: "operatorFirstOperand"; op: BinaryOperation }
  | { type: "chainResolved"; op: BinaryOperation; result: number }
  | { type: "equalsResolved"; result: number }
  | { type: "sqrtResolved"; result: number }
  | { type: "error"; message: string };

function reducer(state: CalculatorState, action: Action): CalculatorState {
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
    case "clear":
      return initialState;
    case "operatorNoBuffer":
      // Chained operator, or an operator right after `=`: keep the left
      // operand (or the last result), just swap in the new operation.
      return {
        ...state,
        accumulator: state.accumulator ?? state.lastResult ?? 0,
        pendingOp: action.op,
        lastResult: null,
        overwrite: false,
        error: null,
      };
    case "operatorFirstOperand":
      return {
        ...state,
        accumulator: Number(state.buffer),
        buffer: "",
        pendingOp: action.op,
        lastResult: null,
        overwrite: false,
        error: null,
      };
    case "chainResolved":
      return {
        ...state,
        accumulator: action.result,
        buffer: "",
        pendingOp: action.op,
        lastResult: null,
        overwrite: true,
        error: null,
      };
    case "equalsResolved":
      return {
        ...state,
        accumulator: null,
        buffer: "",
        pendingOp: null,
        lastResult: action.result,
        overwrite: true,
        error: null,
      };
    case "sqrtResolved":
      // Mid-entry of a right operand: the root becomes that operand. Otherwise
      // it is a standalone result. Either way `buffer` now holds a computed
      // value, so the next digit starts fresh (`overwrite`).
      return state.pendingOp !== null
        ? { ...state, buffer: String(action.result), overwrite: true, error: null }
        : {
            ...state,
            accumulator: null,
            buffer: "",
            lastResult: action.result,
            overwrite: true,
            error: null,
          };
    case "error":
      return { ...state, error: action.message };
  }
}

/**
 * committedValue is the numeric value in play when nothing is being typed: the
 * running result mid-chain, or the last `=` result, or null. Shared by the
 * display and the square-root handler.
 */
function committedValue(state: CalculatorState): number | null {
  return state.accumulator ?? state.lastResult;
}

function displayValue(state: CalculatorState): string {
  if (state.buffer !== "") {
    return state.buffer;
  }
  return String(committedValue(state) ?? 0);
}

function messageFor(err: unknown): string {
  if (err instanceof CalculationError) {
    return err.message;
  }
  return "Something went wrong.";
}

/** UseCalculator is the return shape of the useCalculator hook. */
export interface UseCalculator {
  display: string;
  error: string | null;
  busy: boolean;
  inputDigit: (digit: string) => void;
  inputDecimal: () => void;
  chooseOperation: (op: BinaryOperation) => void;
  applySquareRoot: () => void;
  equals: () => void;
  clear: () => void;
}

/** useCalculator owns every piece of calculator input state (ADR-0004). */
export function useCalculator(): UseCalculator {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [busy, setBusy] = useState(false);

  // Async handlers read the freshest state through a ref rather than a stale
  // closure captured at render time.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Each compute takes the next request id; a resolved request whose id is no
  // longer current (the user pressed Clear meanwhile) is dropped.
  const requestIdRef = useRef(0);

  const runCompute = useCallback(
    async (request: CalculateRequest, onResult: (result: number) => void) => {
      const id = ++requestIdRef.current;
      setBusy(true);
      try {
        const result = await calculate(request);
        if (id === requestIdRef.current) {
          onResult(result);
        }
      } catch (err) {
        if (id === requestIdRef.current) {
          dispatch({ type: "error", message: messageFor(err) });
        }
      } finally {
        if (id === requestIdRef.current) {
          setBusy(false);
        }
      }
    },
    [],
  );

  const inputDigit = useCallback((digit: string) => {
    dispatch({ type: "digit", digit });
  }, []);

  const inputDecimal = useCallback(() => {
    dispatch({ type: "decimal" });
  }, []);

  const clear = useCallback(() => {
    // Invalidate any in-flight compute so its result cannot land on the
    // cleared state, and drop the busy flag its `finally` no longer owns.
    requestIdRef.current += 1;
    setBusy(false);
    dispatch({ type: "clear" });
  }, []);

  const chooseOperation = useCallback(
    (op: BinaryOperation) => {
      const s = stateRef.current;
      if (s.error) {
        return;
      }
      if (s.buffer === "") {
        dispatch({ type: "operatorNoBuffer", op });
        return;
      }
      if (s.pendingOp !== null && s.accumulator !== null) {
        void runCompute(
          { operation: s.pendingOp, operands: [s.accumulator, Number(s.buffer)] },
          (result) => dispatch({ type: "chainResolved", op, result }),
        );
        return;
      }
      dispatch({ type: "operatorFirstOperand", op });
    },
    [runCompute],
  );

  const equals = useCallback(() => {
    const s = stateRef.current;
    if (s.error) {
      return;
    }
    // Redundant `=` (pendingOp already cleared) and empty submission are no-ops.
    if (s.pendingOp === null || s.accumulator === null) {
      return;
    }
    // Trailing operator on submit (`2 + =`): reuse the left operand as the right.
    const right = s.buffer === "" ? s.accumulator : Number(s.buffer);
    void runCompute({ operation: s.pendingOp, operands: [s.accumulator, right] }, (result) =>
      dispatch({ type: "equalsResolved", result }),
    );
  }, [runCompute]);

  const applySquareRoot = useCallback(() => {
    const s = stateRef.current;
    if (s.error) {
      return;
    }
    // Root the typed entry, or a standalone value once a chain is done. A
    // half-entered binary op (`2 + √`) has no operand to root — treat it as
    // empty input (shallow client validation only, ADR-0005).
    const value =
      s.buffer !== "" ? Number(s.buffer) : s.pendingOp === null ? committedValue(s) : null;
    if (value === null || Number.isNaN(value)) {
      dispatch({ type: "error", message: "Enter a number first." });
      return;
    }
    void runCompute({ operation: "sqrt", operands: [value] }, (result) =>
      dispatch({ type: "sqrtResolved", result }),
    );
  }, [runCompute]);

  return {
    display: displayValue(state),
    error: state.error,
    busy,
    inputDigit,
    inputDecimal,
    chooseOperation,
    applySquareRoot,
    equals,
    clear,
  };
}
