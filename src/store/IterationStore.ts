// src/store/IterationStore.ts

export type Iteration = {
  id: string;
  name: string;
  timestamp: string;
  mode: "live" | "simulation";
  rows: any[];
  avg: {
    ph: number;
    turbidity: number;
    tds: number;
  };
  prediction: {
    reusable: string;
    tank: string;
    filtrationBracket: string;
  };
};

const STORAGE_KEY = "water_iterations";

/* ===============================
   GET ALL ITERATIONS
================================ */
export function getIterations(): Iteration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ===============================
   SAVE NEW ITERATION
================================ */
export function saveIteration(iteration: Iteration) {
  const existing = getIterations();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([iteration, ...existing])
  );
}

/* ===============================
   DELETE ITERATION
================================ */
export function deleteIteration(id: string) {
  const updated = getIterations().filter(
    (it) => it.id !== id
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/* ===============================
   CLEAR ALL ITERATIONS
================================ */
export function clearIterations() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ===============================
   EXPORT ITERATIONS (JSON)
================================ */
export function exportIterations() {
  const data = JSON.stringify(getIterations(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "water_iterations.json";
  a.click();

  URL.revokeObjectURL(url);
}
