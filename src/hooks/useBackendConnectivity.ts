import { useEffect, useState } from "react";

export function useBackendConnectivity(url: string) {
  // null = checking, true = connected, false = disconnected
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const res = await fetch(url, { method: "GET" });
        if (alive) setConnected(res.ok);
      } catch {
        if (alive) setConnected(false);
      }
    };

    check(); // initial check
    const id = setInterval(check, 5000); // every 5s

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [url]);

  return connected;
}
