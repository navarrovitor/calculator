import { Calculator } from "./components/Calculator.tsx";
import { useMediaQuery } from "./hooks/useMediaQuery.ts";

/** App is the root component; it renders the calculator. */
export function App() {
  const compact = useMediaQuery("(max-width: 480px)");

  return (
    <main className={compact ? "app app--compact" : "app"}>
      <h1>Calculator</h1>
      <Calculator />
    </main>
  );
}
