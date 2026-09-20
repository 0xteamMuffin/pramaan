"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type FontStep = 0 | 1 | 2; // A / A+ / A++ (scale applied to <html>)

interface A11yState {
  fontStep: FontStep;
  dark: boolean;
  highContrast: boolean;
  highlightLinks: boolean;
  setFontStep: (s: FontStep) => void;
  cycleFont: (dir: 1 | -1) => void;
  toggleDark: () => void;
  toggleContrast: () => void;
  toggleHighlightLinks: () => void;
  reset: () => void;
}

const A11yContext = createContext<A11yState | null>(null);

const FONT_SCALE: Record<FontStep, string> = { 0: "1", 1: "1.125", 2: "1.25" };
const STORAGE_KEY = "pramaan.a11y";

interface Persisted {
  fontStep: FontStep;
  dark: boolean;
  highContrast: boolean;
  highlightLinks: boolean;
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontStep, setFontStepState] = useState<FontStep>(0);
  const [dark, setDark] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // load persisted prefs
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        setFontStepState(p.fontStep ?? 0);
        setDark(!!p.dark);
        setHighContrast(!!p.highContrast);
        setHighlightLinks(!!p.highlightLinks);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // apply to <html> + persist
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.style.setProperty("--font-scale", FONT_SCALE[fontStep]);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-contrast", highContrast ? "high" : "normal");
    root.setAttribute("data-highlight-links", highlightLinks ? "on" : "off");
    const persisted: Persisted = { fontStep, dark, highContrast, highlightLinks };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [fontStep, dark, highContrast, highlightLinks, hydrated]);

  const setFontStep = useCallback((s: FontStep) => setFontStepState(s), []);
  const cycleFont = useCallback(
    (dir: 1 | -1) =>
      setFontStepState((prev) => {
        const next = Math.min(2, Math.max(0, prev + dir)) as FontStep;
        return next;
      }),
    [],
  );
  const toggleDark = useCallback(() => setDark((d) => !d), []);
  const toggleContrast = useCallback(() => setHighContrast((c) => !c), []);
  const toggleHighlightLinks = useCallback(() => setHighlightLinks((h) => !h), []);
  const reset = useCallback(() => {
    setFontStepState(0);
    setDark(false);
    setHighContrast(false);
    setHighlightLinks(false);
  }, []);

  const value = useMemo<A11yState>(
    () => ({
      fontStep,
      dark,
      highContrast,
      highlightLinks,
      setFontStep,
      cycleFont,
      toggleDark,
      toggleContrast,
      toggleHighlightLinks,
      reset,
    }),
    [
      fontStep,
      dark,
      highContrast,
      highlightLinks,
      setFontStep,
      cycleFont,
      toggleDark,
      toggleContrast,
      toggleHighlightLinks,
      reset,
    ],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y(): A11yState {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useA11y must be used within AccessibilityProvider");
  return ctx;
}
