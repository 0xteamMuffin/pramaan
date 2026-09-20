"use client";

import { useState } from "react";
import { Globe } from "lucide-react";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
];

/**
 * Language switcher (GIGW bilingual requirement). Full i18n routing is a
 * roadmap item; this control demonstrates the affordance and persists intent.
 */
export function LanguageSwitcher() {
  const [lang, setLang] = useState("en");
  return (
    <label className="flex items-center gap-1 text-2xs text-white/85">
      <Globe aria-hidden className="h-3.5 w-3.5" />
      <span className="sr-only">Language</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="cursor-pointer rounded bg-transparent py-0.5 pr-1 text-2xs text-white/90 outline-none hover:bg-white/10"
        aria-label="Select language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="text-ink-900">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
