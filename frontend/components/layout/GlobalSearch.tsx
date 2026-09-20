"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Search } from "lucide-react";
import { DEMO_BIDDERS, DEMO_TENDERS, BIDDER_TO_BID } from "@/lib/demoData";
import { cn } from "@/lib/cn";

interface Hit {
  type: "tender" | "bidder";
  id: string;
  primary: string;
  secondary: string;
  href: string;
}

/** Global search over bidder / tender / PAN / GSTIN. */
export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: Hit[] = [];
    for (const t of DEMO_TENDERS) {
      if (
        t.title.toLowerCase().includes(term) ||
        t.ref_no.toLowerCase().includes(term) ||
        t.buyer_org.toLowerCase().includes(term)
      ) {
        out.push({ type: "tender", id: t.id, primary: t.title, secondary: t.ref_no, href: `/tenders/${t.id}` });
      }
    }
    for (const b of Object.values(DEMO_BIDDERS)) {
      const ids = b.identifiers.map((i) => i.value.toLowerCase()).join(" ");
      if (
        b.legal_name.toLowerCase().includes(term) ||
        b.trade_name.toLowerCase().includes(term) ||
        b.primary_pan.toLowerCase().includes(term) ||
        ids.includes(term)
      ) {
        out.push({
          type: "bidder",
          id: b.id,
          primary: b.legal_name,
          secondary: b.primary_pan,
          href: `/bidders/${b.id}`,
        });
      }
    }
    return out.slice(0, 8);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-input border border-border bg-surface-1 px-3 focus-within:border-primary">
        <Search aria-hidden className="h-4 w-4 text-ink-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) go(hits[0].href);
          }}
          placeholder="Search bidder, tender, PAN, GSTIN…"
          aria-label="Global search"
          className="h-9 w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none"
        />
      </div>
      {open && hits.length > 0 && (
        <ul className="absolute z-40 mt-1 w-full overflow-hidden rounded-input border border-border bg-surface shadow-popover">
          {hits.map((h) => (
            <li key={`${h.type}-${h.id}`}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(h.href);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2",
                )}
              >
                {h.type === "tender" ? (
                  <FileText aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Building2 aria-hidden className="h-4 w-4 shrink-0 text-accent-teal" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-900">{h.primary}</span>
                  <span className="block truncate text-2xs text-ink-500">
                    {h.type === "tender" ? "Tender" : "Bidder"} · {h.secondary}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && hits.length === 0 && (
        <div className="absolute z-40 mt-1 w-full rounded-input border border-border bg-surface px-3 py-3 text-sm text-ink-500 shadow-popover">
          No matches for “{q}”.
        </div>
      )}
    </div>
  );
}
