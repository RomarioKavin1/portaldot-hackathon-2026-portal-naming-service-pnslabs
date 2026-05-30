"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Wraps a subtree in a Lenis smooth-scroll instance. Lenis intercepts wheel /
 * touch input and lerps the scroll position each rAF tick, giving the weighted,
 * inertial feel the pitch deck relies on. We also expose the instance on
 * `window.__lenis` so in-page anchor buttons can call `scrollTo` through Lenis
 * (a raw `scrollIntoView` would fight the smoothing and jump).
 */
declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });
    window.__lenis = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return <>{children}</>;
}
