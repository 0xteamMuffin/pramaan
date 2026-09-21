import { AccessibilityControls } from "./AccessibilityControls";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * Government-of-India style top utility bar. Deep navy chrome, "Government of
 * India" text (NO Ashoka emblem), language switcher and accessibility controls.
 * Aligned to the same content gutter as the app header for a consistent grid.
 */
export function TopUtilityBar() {
  return (
    <div className="bg-primary-darker text-white">
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-2 px-4 py-1.5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2 text-2xs">
          <span className="font-semibold text-white">Government of India</span>
          <span className="hidden text-white/30 sm:inline" aria-hidden>
            |
          </span>
          <span className="hidden truncate text-white/70 sm:inline">
            Ministry of Petroleum &amp; Natural Gas &middot; CPCL
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <span className="hidden h-4 w-px bg-white/20 md:inline" aria-hidden />
          <AccessibilityControls />
        </div>
      </div>
    </div>
  );
}
