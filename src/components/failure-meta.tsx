import {
  Crosshair,
  Clock,
  XCircle,
  WifiOff,
  Server,
  SlidersHorizontal,
  KeyRound,
  Database,
  Package,
  MonitorX,
  Shuffle,
  Bug,
  type LucideIcon,
} from "lucide-react";
import type { FailureType, Framework, RiskLevel } from "@/lib/types";

interface FailureMeta {
  icon: LucideIcon;
  /** Tailwind classes for text + background tint, used on badges/icons. */
  className: string;
  /** Solid bg-* class for small dot indicators — written out literally (not derived from
   *  `className` at runtime) so Tailwind's static scanner can actually see and generate it. */
  dotClassName: string;
}

export const FAILURE_TYPE_META: Record<FailureType, FailureMeta> = {
  locator_breakage: {
    icon: Crosshair,
    className: "text-amber-500 bg-amber-500/10",
    dotClassName: "bg-amber-500",
  },
  timing_race_condition: {
    icon: Clock,
    className: "text-orange-500 bg-orange-500/10",
    dotClassName: "bg-orange-500",
  },
  assertion_failure: {
    icon: XCircle,
    className: "text-red-500 bg-red-500/10",
    dotClassName: "bg-red-500",
  },
  network_api_failure: {
    icon: WifiOff,
    className: "text-blue-500 bg-blue-500/10",
    dotClassName: "bg-blue-500",
  },
  environment_issue: {
    icon: Server,
    className: "text-purple-500 bg-purple-500/10",
    dotClassName: "bg-purple-500",
  },
  configuration_issue: {
    icon: SlidersHorizontal,
    className: "text-sky-500 bg-sky-500/10",
    dotClassName: "bg-sky-500",
  },
  authentication_issue: {
    icon: KeyRound,
    className: "text-indigo-500 bg-indigo-500/10",
    dotClassName: "bg-indigo-500",
  },
  test_data_issue: {
    icon: Database,
    className: "text-cyan-500 bg-cyan-500/10",
    dotClassName: "bg-cyan-500",
  },
  dependency_issue: {
    icon: Package,
    className: "text-lime-500 bg-lime-500/10",
    dotClassName: "bg-lime-500",
  },
  browser_issue: {
    icon: MonitorX,
    className: "text-fuchsia-500 bg-fuchsia-500/10",
    dotClassName: "bg-fuchsia-500",
  },
  flaky_test: {
    icon: Shuffle,
    className: "text-yellow-500 bg-yellow-500/10",
    dotClassName: "bg-yellow-500",
  },
  application_bug: {
    icon: Bug,
    className: "text-rose-500 bg-rose-500/10",
    dotClassName: "bg-rose-500",
  },
};

export function confidenceClassName(confidence: number): string {
  if (confidence >= 80) return "text-emerald-500 bg-emerald-500/10";
  if (confidence >= 50) return "text-amber-500 bg-amber-500/10";
  return "text-red-500 bg-red-500/10";
}

const RISK_CLASSNAMES: Record<RiskLevel, string> = {
  low: "text-emerald-500 bg-emerald-500/10",
  medium: "text-amber-500 bg-amber-500/10",
  high: "text-red-500 bg-red-500/10",
};

export function riskClassName(risk: RiskLevel): string {
  return RISK_CLASSNAMES[risk];
}

/** Two-chip framework badge, e.g. "PLAYWRIGHT" + "TYPESCRIPT", or "SELENIUM" + "JAVA". */
export const FRAMEWORK_BADGE_PARTS: Record<Framework, [string, string]> = {
  "playwright-ts": ["Playwright", "TypeScript"],
  "playwright-js": ["Playwright", "JavaScript"],
  "selenium-java": ["Selenium", "Java"],
};
