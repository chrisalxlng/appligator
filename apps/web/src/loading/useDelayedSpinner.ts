import { useEffect, useRef, useState } from "react";

const showDelayMs = 400;
const minVisibleMs = 300;

export function useDelayedSpinner(isLoading: boolean) {
  const [isVisible, setIsVisible] = useState(false);
  const visibleSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        visibleSinceRef.current = Date.now();
        setIsVisible(true);
      }, showDelayMs);
      return () => clearTimeout(timer);
    }

    const visibleSince = visibleSinceRef.current;
    if (visibleSince === null) return;

    const remainingMs = Math.max(0, minVisibleMs - (Date.now() - visibleSince));
    const timer = setTimeout(() => {
      visibleSinceRef.current = null;
      setIsVisible(false);
    }, remainingMs);
    return () => clearTimeout(timer);
  }, [isLoading]);

  return isVisible;
}
