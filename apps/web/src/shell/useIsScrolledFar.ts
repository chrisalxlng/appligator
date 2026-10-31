import { useEffect, useState } from "react";

// Beyond two screen heights, scrolling back by hand takes several swipes or turns of the wheel.
const farScreenHeights = 2;

export type ScrollSource = HTMLElement | Window;

function isScrolledFar(source: ScrollSource) {
  return source instanceof HTMLElement
    ? source.scrollTop > farScreenHeights * source.clientHeight
    : source.scrollY > farScreenHeights * source.innerHeight;
}

export function useIsScrolledFar(source: ScrollSource | null) {
  const [isFar, setIsFar] = useState(false);

  useEffect(() => {
    if (!source) return;

    const update = () => setIsFar(isScrolledFar(source));
    update();
    source.addEventListener("scroll", update, { passive: true });
    return () => source.removeEventListener("scroll", update);
  }, [source]);

  return isFar;
}
