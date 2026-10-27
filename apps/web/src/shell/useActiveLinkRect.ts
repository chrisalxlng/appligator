import { useLocation } from "@tanstack/react-router";
import { useLayoutEffect, useState, type RefObject } from "react";

export interface LinkRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useActiveLinkRect(navRef: RefObject<HTMLElement | null>) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [rect, setRect] = useState<LinkRect | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const measure = () => setRect(measureActiveLink(nav));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [navRef, pathname]);

  return rect;
}

function measureActiveLink(nav: HTMLElement): LinkRect | null {
  const activeLink = nav.querySelector<HTMLElement>('[data-status="active"]');
  if (!activeLink) return null;

  return {
    left: activeLink.offsetLeft,
    top: activeLink.offsetTop,
    width: activeLink.offsetWidth,
    height: activeLink.offsetHeight,
  };
}
