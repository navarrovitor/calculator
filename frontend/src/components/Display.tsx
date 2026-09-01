interface DisplayProps {
  value: string;
  expression: string;
  error: string | null;
}

/**
 * Display is a presentational readout: the pending expression, the current
 * value, and any error. The value is muted while an error is shown.
 */
export function Display({ value, expression, error }: DisplayProps) {
  return (
    <div className="calculator__display">
      <div className="calculator__expression">{expression}</div>
      <output
        className={
          error !== null ? "calculator__value calculator__value--muted" : "calculator__value"
        }
        aria-label="display"
      >
        {value}
      </output>
      {error !== null ? (
        <p className="calculator__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
