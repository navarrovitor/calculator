import { useCalculator } from "../hooks/useCalculator.ts";
import type { BinaryOperation } from "../types.ts";
import { Display } from "./Display.tsx";

const DIGITS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0"] as const;

const BINARY_OPERATIONS: ReadonlyArray<{ op: BinaryOperation; label: string }> = [
  { op: "add", label: "+" },
  { op: "subtract", label: "−" },
  { op: "multiply", label: "×" },
  { op: "divide", label: "÷" },
  { op: "exponentiation", label: "x^y" },
  { op: "percentage", label: "%" },
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
        {BINARY_OPERATIONS.map(({ op, label }) => (
          <button
            key={op}
            type="button"
            aria-label={op}
            disabled={calc.busy}
            onClick={() => calc.chooseOperation(op)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-label="square root"
          disabled={calc.busy}
          onClick={() => calc.applySquareRoot()}
        >
          {"√"}
        </button>
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
