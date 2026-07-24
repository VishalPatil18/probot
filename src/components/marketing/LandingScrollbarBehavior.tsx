"use client";

import { useEffect } from "react";

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
