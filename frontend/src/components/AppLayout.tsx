import { type ReactNode, type SVGProps, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, CalendarDays, LogOut, Moon, Sun, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import { API_BASE } from "@/config";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
] as const;

function GeminiLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="gemini-gradient" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#8ab4ff" />
          <stop offset="40%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>
      <rect
        x="3"
        y="6"
        width="26"
        height="20"
        rx="6"
        fill="url(#gemini-gradient)"
      />
      <rect
        x="9"
        y="10"
        width="3"
        height="12"
        rx="1.5"
        fill="white"
        opacity="0.85"
      />
      <rect
        x="20"
        y="10"
        width="3"
        height="12"
        rx="1.5"
        fill="white"
        opacity="0.85"
      />
    </svg>
  );
}

interface PendingPlan {
  summary: string;
  actions: { type: string; params?: Record<string, unknown> }[];
}

interface AgentHistoryItem {
  prompt: string;
  response: string;
  pending_plan?: PendingPlan | null;
  plan_status?: "pending" | "approved" | "rejected";
  execute_result?: { success: boolean; results?: unknown[]; error?: string };
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { reset } = useStore();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiAgentOpen, setAiAgentOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<AgentHistoryItem[]>([]);
  const [executingPlanIndex, setExecutingPlanIndex] = useState<number | null>(null);

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

  const handleAgentSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    let userId: string | null = null;
    try {
      const userRaw = localStorage.getItem("user");
      userId = userRaw ? (JSON.parse(userRaw) as { id?: string }).id ?? null : null;
    } catch {
      userId = null;
    }
    if (!userId) {
      setAiError("You must be signed in to use the AI agent.");
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, user_id: userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiError(data.detail ?? `Request failed (${res.status})`);
        return;
      }
      const responseText = data.response ?? "";
      const pendingPlan = data.pending_plan ?? null;
      setAiHistory((prev) => [
        {
          prompt: trimmed,
          response: responseText,
          pending_plan: pendingPlan,
          plan_status: pendingPlan ? "pending" : undefined,
        },
        ...prev,
      ].slice(0, 50));
      setAiPrompt("");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApprovePlan = async (index: number, plan: PendingPlan) => {
    let userId: string | null = null;
    try {
      const userRaw = localStorage.getItem("user");
      userId = userRaw ? (JSON.parse(userRaw) as { id?: string }).id ?? null : null;
    } catch {
      userId = null;
    }
    if (!userId) {
      setAiError("You must be signed in to approve changes.");
      return;
    }
    setExecutingPlanIndex(index);
    setAiError(null);
    try {
      const res = await fetch(`${API_BASE}/agent/execute-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan }),
      });
      const result = await res.json().catch(() => ({}));
      setAiHistory((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                plan_status: "approved" as const,
                execute_result: result,
                pending_plan: undefined,
              }
            : item
        )
      );
      if (!res.ok) {
        setAiError(result.detail ?? result.error ?? "Execute failed");
      } else if (result.success) {
        window.dispatchEvent(new CustomEvent("agent-plan-executed"));
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Something went wrong");
      setAiHistory((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, plan_status: "approved" as const, execute_result: { success: false, error: String(e) } } : item
        )
      );
    } finally {
      setExecutingPlanIndex(null);
    }
  };

  const handleDisapprovePlan = (index: number) => {
    setAiHistory((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, plan_status: "rejected" as const, pending_plan: undefined } : item
      )
    );
  };

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

        <button
          type="button"
          onClick={() => setAiAgentOpen(true)}
          className={cn(
            "mb-2 flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200 min-w-0 w-full border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
            sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
          )}
        >
          <GeminiLogo className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              "whitespace-nowrap transition-all duration-200",
              sidebarCollapsed && "w-0 overflow-hidden opacity-0"
            )}
          >
            AI Agent
          </span>
        </button>

        <div className="flex flex-col gap-0.5 pt-2 border-t border-border/80">
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
          <button
            type="button"
            onClick={() => setAiAgentOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-primary"
            )}
          >
            <GeminiLogo className="h-5 w-5" />
            AI Agent
          </button>
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
      {aiAgentOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-label="AI Agent"
          onClick={() => setAiAgentOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-border/80 bg-card shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-primary/40 bg-background">
                  <GeminiLogo className="h-full w-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    AI Agent
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ask to create or edit courses and assignments. Approve or reject proposed changes below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiAgentOpen(false)}
                className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              >
                Close
              </button>
            </div>
            <form
              className="px-5 pt-4 pb-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleAgentSubmit(aiPrompt);
              }}
            >
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Prompt
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => {
                  setAiPrompt(e.target.value);
                  setAiError(null);
                }}
                rows={3}
                className="w-full resize-none rounded-xl border border-border/80 bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                placeholder="e.g. Create a course called Math 101 and add an assignment due next week worth 10%"
                disabled={aiLoading}
              />
              {aiError && (
                <p className="text-xs text-destructive" role="alert">
                  {aiError}
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  The agent will summarize changes for your approval before applying them.
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!aiPrompt.trim() || aiLoading}
                >
                  {aiLoading ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  History
                </p>
                {aiHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAiHistory([])}
                    className="text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-dashed border-border/60 bg-muted/40 p-2">
                {aiHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1 py-2">
                    No messages yet. Send a prompt above to talk to the agent.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {aiHistory.map((item, index) => (
                      <li
                        key={index}
                        className="rounded-lg bg-background/80 px-2.5 py-2 text-xs shadow-sm border border-border/60 space-y-1.5"
                      >
                        <p className="font-medium text-foreground">You: {item.prompt}</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">Agent: {item.response}</p>
                        {item.pending_plan && item.plan_status === "pending" && (
                          <div className="mt-2 pt-2 border-t border-border/60 space-y-2">
                            <p className="font-medium text-foreground">Proposed changes:</p>
                            <p className="text-muted-foreground">{item.pending_plan.summary}</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprovePlan(index, item.pending_plan!)}
                                disabled={executingPlanIndex === index}
                                className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                              >
                                {executingPlanIndex === index ? "Applying…" : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDisapprovePlan(index)}
                                disabled={executingPlanIndex !== null}
                                className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60"
                              >
                                Disapprove
                              </button>
                            </div>
                          </div>
                        )}
                        {item.plan_status === "rejected" && (
                          <p className="mt-1 text-muted-foreground italic">You declined the changes.</p>
                        )}
                        {item.plan_status === "approved" && item.execute_result && (
                          <div className="mt-1">
                            {item.execute_result.success ? (
                              <p className="text-green-600 dark:text-green-400">Changes applied successfully.</p>
                            ) : (
                              <p className="text-destructive">
                                {item.execute_result.error ?? "Some changes could not be applied."}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
