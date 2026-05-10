import { useEffect, useState } from "react";

const DELAY_MS = 250;

export function useDelayedPending(isPending: boolean): boolean {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!isPending) {
      setDelayed(false);
      return;
    }
    const id = setTimeout(() => setDelayed(true), DELAY_MS);
    return () => clearTimeout(id);
  }, [isPending]);
  return delayed;
}
