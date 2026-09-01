import { useCalculator } from "../hooks/useCalculator.ts";
import type { Operation } from "../types.ts";
import { Display } from "./Display.tsx";

// The keypad is one grid laid out in the design handoff's key order. Each
// entry is one button; `name` (where present) is the button's accessible name.
type Key =
  | { kind: "digit"; value: string }
  | { kind: "decimal" }
  | { kind: "operation"; op: Operation; label: string; name: string }
  | { kind: "equals" }
  | { kind: "clear" };

// Operations shown in the sage "advanced" colour rather than the accent one.
const ADVANCED_OPERATIONS: ReadonlySet<Operation> = new Set([
  "exponentiation",
  "percentage",
  "sqrt",
]);

const KEYS: readonly Key[] = [
  { kind: "digit", value: "7" },
  { kind: "digit", value: "8" },
  { kind: "digit", value: "9" },
  { kind: "operation", op: "divide", label: "÷", name: "divide" },
  { kind: "clear" },
  { kind: "digit", value: "4" },
  { kind: "digit", value: "5" },
  { kind: "digit", value: "6" },
  { kind: "operation", op: "multiply", label: "×", name: "multiply" },
  { kind: "operation", op: "sqrt", label: "√", name: "square root" },
  { kind: "digit", value: "1" },
  { kind: "digit", value: "2" },
  { kind: "digit", value: "3" },
  { kind: "operation", op: "subtract", label: "−", name: "subtract" },
  { kind: "operation", op: "exponentiation", label: "^", name: "exponentiation" },
  { kind: "digit", value: "0" },
  { kind: "decimal" },
  { kind: "equals" },
  { kind: "operation", op: "add", label: "+", name: "add" },
  { kind: "operation", op: "percentage", label: "%", name: "percentage" },
];

/**
 * Calculator is the container: it reads every value and handler from
 * useCalculator and renders the button grid (ADR-0004). It holds no logic.
 */
export function Calculator() {
  const calc = useCalculator();

  function renderKey(key: Key) {
    switch (key.kind) {
      case "digit":
        return (
          <button
            key={`digit-${key.value}`}
            type="button"
            className="calculator__key calculator__key--digit"
            disabled={calc.busy}
            onClick={() => calc.inputDigit(key.value)}
          >
            {key.value}
          </button>
        );
      case "decimal":
        return (
          <button
            key="decimal"
            type="button"
            className="calculator__key calculator__key--digit"
            aria-label="decimal point"
            disabled={calc.busy}
            onClick={() => calc.inputDecimal()}
          >
            .
          </button>
        );
      case "operation": {
        const variant = ADVANCED_OPERATIONS.has(key.op) ? "advanced" : "operation";
        return (
          <button
            key={key.op}
            type="button"
            className={`calculator__key calculator__key--${variant}`}
            aria-label={key.name}
            disabled={calc.busy}
            onClick={() => calc.inputOperation(key.op)}
          >
            {key.label}
          </button>
        );
      }
      case "equals":
        return (
          <button
            key="equals"
            type="button"
            className="calculator__key calculator__key--equals"
            aria-label="equals"
            disabled={calc.busy}
            onClick={() => calc.equals()}
          >
            =
          </button>
        );
      case "clear":
        return (
          <button
            key="clear"
            type="button"
            className="calculator__key calculator__key--clear"
            aria-label="clear"
            onClick={() => calc.clear()}
          >
            C
          </button>
        );
    }
  }

  return (
    <section className="calculator" aria-label="calculator">
      <Display value={calc.display} expression={calc.expression} error={calc.error} />
      <div className="calculator__keys">{KEYS.map(renderKey)}</div>
    </section>
  );
}
