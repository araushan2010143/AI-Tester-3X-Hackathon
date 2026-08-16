import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Search, ListTree, Activity } from "lucide-react";

export type AppMode = "single" | "bulk" | "flaky" | "dashboard";

interface NavItem {
  mode: AppMode;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { mode: "dashboard", label: "Overview", icon: LayoutDashboard },
  { mode: "single", label: "Investigate", icon: Search },
  { mode: "bulk", label: "CI Failures", icon: ListTree },
  { mode: "flaky", label: "Flaky Tests", icon: Activity },
];

/**
 * Permanent left sidebar — real navigation to the four modes that actually exist, nothing
 * else. Deliberately doesn't add Insights/Integrations/Settings/Help sections from the
 * mockup this was modeled on: those would be dead links with no functionality behind them.
 */
export function AppSidebar({ mode, onModeChange }: { mode: AppMode; onModeChange: (mode: AppMode) => void }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-xl">
          🩺
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold tracking-tight">TraceFix AI</p>
          <p className="truncate text-[11px] text-muted-foreground">CI failure → root cause → fix</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div>
          <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Workspace
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = mode === item.mode;
              return (
                <li key={item.mode}>
                  <button
                    type="button"
                    onClick={() => onModeChange(item.mode)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex w-full items-center gap-3 rounded-lg py-2.5 pr-2.5 pl-4 text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-1/2 left-0 h-4/5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
