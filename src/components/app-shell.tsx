import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Layers,
  Package,
  TrendingUp,
  FileBarChart,
  Settings,
  Sparkles,
  Bell,
  Search,
  ChevronDown,
  Menu,
  Database,
  ClipboardCheck,
  Cable,
  FileSignature,
  PlugZap,
} from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/tract-logo-dark.png";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/programs", label: "Programs", icon: Layers },
  { to: "/parts", label: "Part Numbers", icon: Package },
  { to: "/dcrs", label: "DCRs", icon: ClipboardCheck },
  { to: "/contracts", label: "Contracts", icon: FileSignature },
  { to: "/recoveries", label: "Recoveries", icon: TrendingUp },
  { to: "/forecasts", label: "Forecasts", icon: Sparkles },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/operations", label: "Operations", icon: Cable },
  { to: "/connections", label: "Data Connections", icon: PlugZap },
  { to: "/settings", label: "Settings", icon: Settings },
];

function TractMark({ className }: { className?: string }) {
  // Compact icon derived from the tract mark
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M4 6 H26 V14 H14 V26 H22 V34 H4 Z" fill="currentColor" />
      <path d="M30 14 H36 V34 H24 V26 H30 Z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function AppShell({
  children,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gradient-navy text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <TractMark className="h-7 w-7 text-brand" />
          <span className="text-xl font-bold tracking-tight text-white">tract</span>
          <div className="mx-2 h-6 w-px bg-white/15" aria-hidden />
          <div
            className="flex items-center gap-1.5 rounded-md bg-white/95 px-1.5 py-1 shadow-sm ring-1 ring-white/20"
            title="Demonstration workspace"
          >
            <Database className="h-3.5 w-3.5 text-brand" aria-hidden />
            <span className="text-[11px] font-semibold tracking-wide text-navy">Demo</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Workspace
          </div>
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mt-3 rounded-lg bg-sidebar-accent/60 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-white">
              <span className="flex h-2 w-2 rounded-full bg-warning" />
              External feeds not connected
            </div>
            <p className="mt-1 text-[11px] text-sidebar-foreground/60">
              Explicit local demonstration data
            </p>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 gradient-navy p-0 text-white">
              <SheetTitle className="sr-only">Tract navigation</SheetTitle>
              <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
                <TractMark className="h-7 w-7 text-brand" />
                <span className="text-xl font-bold tracking-tight">tract</span>
              </div>
              <nav className="space-y-1 px-3 py-6">
                {nav.map((item) => {
                  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                        active ? "bg-brand text-white" : "text-white/80 hover:bg-white/10",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="relative hidden w-full max-w-md sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search is enabled after data connection"
              disabled
              aria-label="Search unavailable in demonstration mode"
              className="h-9 border-border bg-secondary pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications unavailable in demonstration mode"
              disabled
              title="Notification delivery requires an approved provider and authenticated user"
            >
              <Bell className="h-4 w-4" />
              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"
                aria-hidden
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-xs font-semibold text-white">
                    JR
                  </div>
                  <div className="hidden text-left md:block">
                    <div className="text-sm font-medium leading-tight">Local reviewer</div>
                    <div className="text-xs text-muted-foreground">Demonstration workspace</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/organization">Organization</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled
                  title="No authenticated session exists in demonstration mode"
                >
                  Sign out unavailable in demo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:px-6">
          Demonstration mode — synthetic data only; no external feeds or financial postings
        </div>

        <main className="min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>

        {/* Print hidden logo import to avoid unused warning in some setups */}
        <img src={logo} alt="" className="hidden" />
      </div>
    </div>
  );
}
