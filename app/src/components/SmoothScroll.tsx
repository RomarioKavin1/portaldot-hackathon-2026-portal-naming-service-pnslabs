"use client";

import { useEffect } from "react";

/**
 * SmoothScroll — adds smooth scrolling + exposes a tiny window.__lenis-like
 * shim so existing call sites (window.__lenis?.scrollTo(...)) keep working
 * without bringing in the lenis dependency. We use the browser's native
 * scrollTo({ behavior: "smooth" }) under the hood.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = {
      scrollTo: (target: string | HTMLElement, opts?: { offset?: number }) => {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        if (!el) return;
        const top = (el as HTMLElement).getBoundingClientRect().top + window.scrollY + (opts?.offset ?? 0);
        window.scrollTo({ top, behavior: "smooth" });
      },
    };
    (window as Window & { __lenis?: typeof lenis }).__lenis = lenis;
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
      delete (window as Window & { __lenis?: typeof lenis }).__lenis;
    };
  }, []);

  return <>{children}</>;
}

declare global {
  interface Window {
    __lenis?: {
      scrollTo: (target: string | HTMLElement, opts?: { offset?: number }) => void;
    };
  }
}
