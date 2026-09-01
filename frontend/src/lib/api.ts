import type { CalculateErrorResponse, CalculateRequest, CalculateResponse } from "../types.ts";

// Base URL for the backend. Empty by default so requests go to a same-origin
// /calculate, which the Vite dev server proxies to the Go backend.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * CalculationError carries a human-readable message for the UI. It is thrown
 * both for backend 400/422 responses (message taken verbatim from the
 * {"error"} body, per ADR-0002 and ADR-0005) and for transport failures.
 */
export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationError";
  }
}

function isErrorBody(value: unknown): value is CalculateErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "string"
  );
}

function isResultBody(value: unknown): value is CalculateResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "result" in value &&
    typeof (value as { result: unknown }).result === "number"
  );
}

/**
 * calculate POSTs a calculation to the backend and resolves with the numeric
 * result. It throws CalculationError with the backend's message for any
 * non-2xx response so the caller can surface it unchanged.
 */
export async function calculate(request: CalculateRequest): Promise<number> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new CalculationError("Could not reach the calculator service.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isErrorBody(body)) {
      throw new CalculationError(body.error);
    }
    throw new CalculationError(`Request failed (${response.status}).`);
  }

  if (!isResultBody(body)) {
    throw new CalculationError("Received an unexpected response from the service.");
  }
  return body.result;
}
