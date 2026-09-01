import { useEffect, useState } from "react";

/**
 * useMediaQuery tracks whether `query` currently matches. It returns false in
 * environments without `matchMedia` (SSR, jsdom) instead of throwing.
 */
export function useMediaQuery(query: string): boolean {
  const read = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches;

  const [matches, setMatches] = useState<boolean>(read);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
