import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App.tsx";

// Behaviour is exercised through the DOM only (CLAUDE.md): render <App/>, click
// buttons by their accessible name, assert on the rendered display / alert.
// The backend is replaced by a fetch mock that mirrors the real POST /calculate
// contract (ADR-0001/0002) so chained requests behave as they would live.

const BUTTON_NAME: Record<string, string> = {
  "+": "add",
  "-": "subtract",
  "*": "multiply",
  "/": "divide",
  "^": "exponentiation",
  "%": "percentage",
  r: "square root",
  "=": "equals",
  c: "clear",
  ".": "decimal point",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeBackend(operation: string, operands: number[]): Response {
  const a = operands[0] ?? Number.NaN;
  const b = operands[1] ?? Number.NaN;
  switch (operation) {
    case "add":
      return jsonResponse({ result: a + b }, 200);
    case "subtract":
      return jsonResponse({ result: a - b }, 200);
    case "multiply":
      return jsonResponse({ result: a * b }, 200);
    case "divide":
      return b === 0
        ? jsonResponse({ error: "division by zero" }, 422)
        : jsonResponse({ result: a / b }, 200);
    case "exponentiation":
      return jsonResponse({ result: a ** b }, 200);
    case "percentage":
      return jsonResponse({ result: (a / 100) * b }, 200);
    case "sqrt":
      return a < 0
        ? jsonResponse({ error: "square root of a negative number" }, 422)
        : jsonResponse({ result: Math.sqrt(a) }, 200);
    default:
      return jsonResponse({ error: "unsupported operation" }, 422);
  }
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    const { operation, operands } = JSON.parse(String(init?.body)) as {
      operation: string;
      operands: number[];
    };
    return Promise.resolve(fakeBackend(operation, operands));
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function press(user: UserEvent, keys: string): Promise<void> {
  for (const key of keys) {
    const name = BUTTON_NAME[key] ?? key;
    await user.click(screen.getByRole("button", { name }));
  }
}

function display(): HTMLElement {
  return screen.getByLabelText("display");
}

async function expectDisplay(text: string): Promise<void> {
  await waitFor(() => expect(display()).toHaveTextContent(new RegExp(`^${text}$`)));
}

function lastRequestBody(): { operation: string; operands: number[] } {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) {
    throw new Error("fetch was not called");
  }
  return JSON.parse(String((call[1] as RequestInit).body));
}

describe("operation happy paths", () => {
  const cases: ReadonlyArray<[label: string, keys: string, expected: string]> = [
    ["add", "2+3=", "5"],
    ["subtract", "7-4=", "3"],
    ["multiply", "6*7=", "42"],
    ["divide", "8/2=", "4"],
    ["exponentiation", "2^10=", "1024"],
    ["percentage", "50%200=", "100"],
  ];

  it.each(cases)("%s", async (_label, keys, expected) => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, keys);
    await expectDisplay(expected);
  });

  it("sqrt is a unary button with no second operand", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "144r");
    await expectDisplay("12");
    expect(lastRequestBody()).toEqual({ operation: "sqrt", operands: [144] });
  });

  it("POSTs the API contract shape to /calculate", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "2+3=");
    await expectDisplay("5");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/calculate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ operation: "add", operands: [2, 3] });
  });
});

describe("input edge cases (ADR-0004)", () => {
  it("ignores a second decimal point", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "1..5");
    await expectDisplay("1\\.5");
  });

  it("collapses leading zeros", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "007");
    await expectDisplay("7");
  });

  it("keeps a single leading zero before a decimal", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "0.5");
    await expectDisplay("0\\.5");
  });

  it("prefixes a bare leading decimal with zero", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, ".5");
    await expectDisplay("0\\.5");
  });

  it("feeds a square root into a pending operation", async () => {
    const user = userEvent.setup();
    render(<App />);
    // 2 + sqrt(9) = 2 + 3 = 5
    await press(user, "2+9r");
    await expectDisplay("3");
    await press(user, "=");
    await expectDisplay("5");
  });

  it("treats a repeated operator as swapping the pending operator", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "2++3=");
    await expectDisplay("5");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("evaluates left-to-right when operators are chained", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "2+3*4=");
    await expectDisplay("20");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastRequestBody()).toEqual({ operation: "multiply", operands: [5, 4] });
  });

  it("reuses the left operand for a trailing operator on submit", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "2+=");
    await expectDisplay("4");
    expect(lastRequestBody()).toEqual({ operation: "add", operands: [2, 2] });
  });

  it("makes a redundant = a no-op", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "2+3===");
    await expectDisplay("5");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("makes an empty submission a no-op", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "=");
    await expectDisplay("0");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("backend errors are surfaced (ADR-0005)", () => {
  it("renders the API error message for division by zero", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "5/0=");
    expect(await screen.findByRole("alert")).toHaveTextContent("division by zero");
  });

  it("renders the API error message for square root of a negative number", async () => {
    const user = userEvent.setup();
    render(<App />);
    // 9 - 16 = -7, then sqrt(-7) is rejected by the backend with 422.
    await press(user, "9-16=");
    await expectDisplay("-7");
    await press(user, "r");
    expect(await screen.findByRole("alert")).toHaveTextContent("square root of a negative number");
  });

  it("clears a surfaced error with C", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "5/0=");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await press(user, "c");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await expectDisplay("0");
  });

  it("ignores further operations while an error is showing", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "5/0=");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fetchMock.mockClear();
    // Operator / equals presses are inert until the error is cleared (with C or
    // by typing a fresh digit).
    await press(user, "+=r");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("validates non-numeric sqrt input on the client without calling the backend", async () => {
    const user = userEvent.setup();
    render(<App />);
    await press(user, "r");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a number first.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a transport failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    const user = userEvent.setup();
    render(<App />);
    await press(user, "2+3=");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the calculator service.",
    );
  });
});
