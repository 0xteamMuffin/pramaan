"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface SortHeaderProps {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onSort: () => void;
  align?: "left" | "right" | "center";
  className?: string;
}

/** Sortable table column header button. */
export function SortHeader({
  label,
  active,
  direction,
  onSort,
  align = "left",
  className,
}: SortHeaderProps) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      onClick={onSort}
      className={cn(
        "flex w-full items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-ink-500 hover:text-ink-900",
        align === "right" && "justify-end",
        align === "center" && "justify-center",
        className,
      )}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <Icon aria-hidden className={cn("h-3 w-3", active ? "text-primary" : "text-ink-500/60")} />
    </button>
  );
}
