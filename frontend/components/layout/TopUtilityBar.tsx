import { AccessibilityControls } from "./AccessibilityControls";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * Government-of-India style top utility bar. Deep navy chrome, "Government of
 * India" text (NO Ashoka emblem), language switcher and accessibility controls.
 */
export function TopUtilityBar() {
  return (
    <div className="bg-primary-darker text-white">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2 px-4 py-1.5">
        <div className="flex items-center gap-2 text-2xs">
          <span className="font-semibold uppercase tracking-wide text-white/90">
            Government of India
          </span>
          <span className="hidden text-white/40 sm:inline" aria-hidden>
            |
          </span>
          <span className="hidden text-white/60 sm:inline">
            Ministry of Petroleum &amp; Natural Gas · CPCL
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
