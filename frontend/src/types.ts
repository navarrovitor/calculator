// API contract for the backend POST /calculate endpoint (ADR-0001, ADR-0002).
// Shared by lib/api.ts and hooks/useCalculator.ts.

/** Operation is the set of operation names the backend accepts (ADR-0003). */
export type Operation =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "exponentiation"
  | "sqrt"
  | "percentage";

/** CalculateRequest is the POST /calculate request body. */
export interface CalculateRequest {
  operation: Operation;
  operands: number[];
}

/** CalculateResponse is the POST /calculate success body. */
export interface CalculateResponse {
  result: number;
}

/** CalculateErrorResponse is the shared error body for 400 and 422 (ADR-0002). */
export interface CalculateErrorResponse {
  error: string;
}
