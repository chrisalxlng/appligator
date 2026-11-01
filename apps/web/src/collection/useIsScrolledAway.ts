import { useEffect, useState } from "react";

// Lets the element disappear behind the compact page header instead of only past the screen edge.
const compactHeaderHeight = 56;

export function useIsScrolledAway(element: Element | null) {
  const [isScrolledAway, setIsScrolledAway] = useState(false);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolledAway(!entry?.isIntersecting),
      { rootMargin: `-${compactHeaderHeight}px 0px 0px` },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      setIsScrolledAway(false);
    };
  }, [element]);

  return isScrolledAway;
}
