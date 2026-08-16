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
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-lg">
          🩺
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight">TraceFix AI</p>
          <p className="truncate text-[11px] text-muted-foreground">CI failure → root cause → fix</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
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
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
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
