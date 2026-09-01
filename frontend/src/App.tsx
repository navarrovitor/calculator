import { Calculator } from "./components/Calculator.tsx";

/** App is the root component; it renders the calculator. */
export function App() {
  return (
    <main className="app">
      <h1>Calculator</h1>
      <Calculator />
    </main>
  );
}
