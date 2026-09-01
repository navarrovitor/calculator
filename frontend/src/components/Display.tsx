interface DisplayProps {
  value: string;
  error: string | null;
}

/** Display is a presentational readout of the current value and any error. */
export function Display({ value, error }: DisplayProps) {
  return (
    <div className="calculator__display">
      <output className="calculator__value" aria-label="display">
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
