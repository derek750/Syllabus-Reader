import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, CalendarDays, GraduationCap, LogOut, Moon, Sun, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/grades", label: "Grades", icon: GraduationCap },
] as const;

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { reset } = useStore();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      try { localStorage.setItem("theme", "dark"); } catch { /* ignore */ }
    } else {
      document.documentElement.classList.remove("dark");
      try { localStorage.setItem("theme", "light"); } catch { /* ignore */ }
    }
  }, [dark]);

  const onSignOut = () => {
    try {
      localStorage.removeItem("user");
    } catch {
      // ignore
    }
    reset();
    navigate("/signin", { replace: true });
  };

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/80 bg-card/60 backdrop-blur-md gap-2 shrink-0 transition-[width] duration-200 overflow-hidden",
          sidebarCollapsed ? "w-20 p-2" : "w-64 p-4"
        )}
      >
        <div
          className={cn(
            "flex items-center py-4 mb-2 min-w-0 w-full",
            sidebarCollapsed ? "justify-center gap-0 px-0" : "gap-3 px-3"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <BookOpen className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold tracking-tight font-heading whitespace-nowrap">
              Syllabus Reader
            </span>
          )}
        </div>
        <nav className="flex flex-col gap-0.5 flex-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 min-w-0 w-full",
                sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive(item.to)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-200",
                  sidebarCollapsed && "w-0 overflow-hidden opacity-0"
                )}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-0.5 mt-2 pt-2 border-t border-border/80">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors min-w-0 w-full",
              sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
            )}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Collapse</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "flex items-center rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors min-w-0 w-full",
              sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
            )}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-200",
                sidebarCollapsed && "w-0 overflow-hidden opacity-0"
              )}
            >
              {dark ? "Light" : "Dark"}
            </span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            className={cn(
              "flex items-center rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-w-0 w-full",
              sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-200",
                sidebarCollapsed && "w-0 overflow-hidden opacity-0"
              )}
            >
              Sign out
            </span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-md safe-area-pb">
        <nav className="flex justify-around py-2" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                isActive(item.to) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <main
        id="main-content"
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-area pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <div className="md:hidden flex items-center justify-end gap-2 mb-4">
              <button
                type="button"
                onClick={() => setDark((d) => !d)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={dark ? "Light mode" : "Dark mode"}
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
