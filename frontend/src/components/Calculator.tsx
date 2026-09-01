import { useCalculator } from "../hooks/useCalculator.ts";
import type { Operation } from "../types.ts";
import { Display } from "./Display.tsx";

const DIGITS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0"] as const;

// One list for every operation; `name` is the button's accessible name.
const OPERATIONS: ReadonlyArray<{ op: Operation; label: string; name: string }> = [
  { op: "add", label: "+", name: "add" },
  { op: "subtract", label: "−", name: "subtract" },
  { op: "multiply", label: "×", name: "multiply" },
  { op: "divide", label: "÷", name: "divide" },
  { op: "exponentiation", label: "x^y", name: "exponentiation" },
  { op: "percentage", label: "%", name: "percentage" },
  { op: "sqrt", label: "√", name: "square root" },
];

/**
 * Calculator is the container: it reads every value and handler from
 * useCalculator and renders the button grid (ADR-0004). It holds no logic.
 */
export function Calculator() {
  const calc = useCalculator();

  return (
    <section aria-label="calculator">
      <Display value={calc.display} error={calc.error} />

      <div>
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={calc.busy}
            onClick={() => calc.inputDigit(digit)}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          aria-label="decimal point"
          disabled={calc.busy}
          onClick={() => calc.inputDecimal()}
        >
          .
        </button>
      </div>

      <div>
        {OPERATIONS.map(({ op, label, name }) => (
          <button
            key={op}
            type="button"
            aria-label={name}
            disabled={calc.busy}
            onClick={() => calc.inputOperation(op)}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <button
          type="button"
          aria-label="equals"
          disabled={calc.busy}
          onClick={() => calc.equals()}
        >
          =
        </button>
        <button type="button" aria-label="clear" onClick={() => calc.clear()}>
          C
        </button>
      </div>
    </section>
  );
}
