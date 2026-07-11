"use client";

import { useEffect } from "react";

// Landing-page scrollbar behavior: viewport scrollbar is invisible unless
// the visitor is actively scrolling (macOS-style overlay). The global CSS
// otherwise reveals the thumb on any :hover of the page, which reads as
// "always on" once the mouse is inside the browser window. This component
// scopes the auto-hide to `/` by toggling a class on <html>. Removes it on
// unmount so other pages keep the default hover-reveal behavior.
const IDLE_MS = 700;

export function LandingScrollbarBehavior() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("landing-scrollbar");
    let timer: number | undefined;

    function onScroll() {
      html.classList.add("is-scrolling");
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        html.classList.remove("is-scrolling");
      }, IDLE_MS);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer !== undefined) window.clearTimeout(timer);
      html.classList.remove("landing-scrollbar");
      html.classList.remove("is-scrolling");
    };
  }, []);

  return null;
}
