import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.tsx";

// The mobile bottom-sheet layout is toggled by a matchMedia-backed hook;
// jsdom has no matchMedia, so the narrow case stubs one.
describe("App layout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the centered layout by default", () => {
    render(<App />);
    const main = screen.getByRole("main");
    expect(main).toHaveClass("app");
    expect(main).not.toHaveClass("app--compact");
  });

  it("switches to the compact bottom-sheet layout on a narrow viewport", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    render(<App />);
    expect(screen.getByRole("main")).toHaveClass("app--compact");
  });
});
