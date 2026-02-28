import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, CalendarDays, GraduationCap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/courses", label: "Courses", icon: BookOpen},
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
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border/80 bg-card/50 backdrop-blur-sm p-4 gap-2">
        <div className="flex items-center gap-3 px-3 py-4 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Syllabus Reader
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive(item.to)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={onSignOut}
          className={cn(
            "mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-md">
        <nav className="flex justify-around py-2">
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

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <div className="md:hidden flex justify-end mb-4">
            <button
              type="button"
              onClick={onSignOut}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
