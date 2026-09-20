"use client";

import { Contrast, Link2, Minus, Moon, Plus, RotateCcw, Sun, Type } from "lucide-react";
import { cn } from "@/lib/cn";
import { useA11y } from "@/components/providers/AccessibilityProvider";

const btn =
  "inline-flex h-7 items-center gap-1 rounded px-1.5 text-2xs font-medium text-white/85 hover:bg-white/15 focus-visible:bg-white/15";

/** Accessibility toolbar: A- / A / A+ font sizing, contrast, dark, highlight links. */
export function AccessibilityControls() {
  const a11y = useA11y();
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Accessibility controls">
      <span className="mr-1 hidden items-center gap-1 text-2xs text-white/60 sm:flex">
        <Type aria-hidden className="h-3 w-3" /> Text
      </span>
      <button
        className={btn}
        onClick={() => a11y.cycleFont(-1)}
        aria-label="Decrease text size"
        title="Decrease text size"
      >
        <Minus className="h-3 w-3" />
        <span aria-hidden>A</span>
      </button>
      <button
        className={cn(btn, a11y.fontStep === 0 && "bg-white/10")}
        onClick={() => a11y.setFontStep(0)}
        aria-label="Reset text size"
        title="Default text size"
      >
        A
      </button>
      <button
        className={btn}
        onClick={() => a11y.cycleFont(1)}
        aria-label="Increase text size"
        title="Increase text size"
      >
        <Plus className="h-3 w-3" />
        <span aria-hidden>A</span>
      </button>
      <span className="mx-1 h-4 w-px bg-white/20" aria-hidden />
      <button
        className={cn(btn, a11y.highContrast && "bg-white/20")}
        onClick={a11y.toggleContrast}
        aria-pressed={a11y.highContrast}
        aria-label="Toggle high contrast"
        title="High contrast"
      >
        <Contrast className="h-3.5 w-3.5" />
      </button>
      <button
        className={cn(btn, a11y.dark && "bg-white/20")}
        onClick={a11y.toggleDark}
        aria-pressed={a11y.dark}
        aria-label="Toggle dark mode"
        title="Dark mode"
      >
        {a11y.dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
      <button
        className={cn(btn, a11y.highlightLinks && "bg-white/20")}
        onClick={a11y.toggleHighlightLinks}
        aria-pressed={a11y.highlightLinks}
        aria-label="Toggle highlight links"
        title="Highlight links"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      <button
        className={btn}
        onClick={a11y.reset}
        aria-label="Reset accessibility settings"
        title="Reset"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
