interface DisplayProps {
  value: string;
  error: string | null;
}

/** Display is a presentational readout of the current value and any error. */
export function Display({ value, error }: DisplayProps) {
  return (
    <div>
      <output aria-label="display">{value}</output>
      {error !== null ? <p role="alert">{error}</p> : null}
    </div>
  );
}
