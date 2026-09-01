import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery.ts";

// jsdom has no matchMedia, so the "available" cases stub one that records its
// change listeners.
function stubMatchMedia(initial: boolean): { setMatches: (value: boolean) => void } {
  const listeners = new Set<() => void>();
  let matches = initial;
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: () => void) => listeners.delete(cb),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql));
  return {
    setMatches(value: boolean) {
      matches = value;
      for (const cb of listeners) {
        cb();
      }
    },
  };
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when matchMedia is unavailable", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 480px)"));
    expect(result.current).toBe(false);
  });

  it("returns the current match when matchMedia is available", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(max-width: 480px)"));
    expect(result.current).toBe(true);
  });

  it("updates when the media query starts or stops matching", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 480px)"));
    expect(result.current).toBe(false);

    act(() => media.setMatches(true));
    expect(result.current).toBe(true);
  });
});
