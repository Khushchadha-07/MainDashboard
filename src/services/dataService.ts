export type DataRow = {
  slNo: number;
  time: string;
  ph: number;
  tds: number;
  turbidity: number;
};

const MAX_ROWS = 10;
const INTERVAL_SECONDS = 4;

let liveBuffer: DataRow[] = [];
let historyStore: any[] = [];
let counter = 1;

export function pushLiveData() {
  if (liveBuffer.length >= MAX_ROWS) return;

  const now = new Date();
  liveBuffer.push({
    slNo: counter++,
    time: now.toLocaleTimeString(),
    ph: +(7 + Math.random()).toFixed(2),
    tds: +(200 + Math.random() * 20).toFixed(1),
    turbidity: +(3 + Math.random()).toFixed(2),
  });
}

export function getLiveData() {
  return [...liveBuffer];
}

export function getAverages() {
  if (!liveBuffer.length) return null;

  const sum = liveBuffer.reduce(
    (a, b) => ({
      ph: a.ph + b.ph,
      tds: a.tds + b.tds,
      turbidity: a.turbidity + b.turbidity,
    }),
    { ph: 0, tds: 0, turbidity: 0 }
  );

  return {
    ph: +(sum.ph / liveBuffer.length).toFixed(2),
    tds: +(sum.tds / liveBuffer.length).toFixed(1),
    turbidity: +(sum.turbidity / liveBuffer.length).toFixed(2),
  };
}

export function saveIteration(name: string) {
  historyStore.push({
    id: Date.now(),
    name,
    createdAt: new Date().toLocaleString(),
    rows: [...liveBuffer],
    averages: getAverages(),
  });
}

export function getHistory() {
  return [...historyStore];
}

export function resetLiveData() {
  liveBuffer = [];
  counter = 1;
}

export { MAX_ROWS, INTERVAL_SECONDS };
