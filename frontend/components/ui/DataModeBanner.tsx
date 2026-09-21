import { CloudOff, Wifi } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DataMode } from "@/lib/api";

interface DataModeBannerProps {
  mode: DataMode | null;
  className?: string;
}

/**
 * Small, honest indicator of where the data came from. When the backend is
 * unreachable we render seeded demo data and say so explicitly.
 */
export function DataModeBanner({ mode, className }: DataModeBannerProps) {
  if (!mode) return null;
  if (mode === "live") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-bg px-2.5 py-1 text-2xs font-medium text-success",
          className,
        )}
      >
        <Wifi aria-hidden className="h-3 w-3" /> Live data
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-bg px-2.5 py-1 text-2xs font-medium text-warning",
        className,
      )}
      title="The backend API was unreachable · showing seeded demo data so the UI stays fully functional."
    >
      <CloudOff aria-hidden className="h-3 w-3" /> Demo data (offline fallback)
    </span>
  );
}
