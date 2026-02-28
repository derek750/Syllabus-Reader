import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/Button";
import { API_BASE } from "@/config";

type GoogleCredentialResponse = { credential: string };
type GoogleAccountsId = {
  initialize: (opts: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (el: HTMLElement, opts: { theme: string; size: string; width?: number }) => void;
};
type GoogleIdentityServices = { accounts: { id: GoogleAccountsId } };

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

export function SignInPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const existing = localStorage.getItem("user");
    if (existing) {
      navigate("/");
      return;
    }
    const renderBtn = () => {
      (async () => {
        try {
          const cfgRes = await fetch(`${API_BASE}/auth/google-config`);
          const cfg = cfgRes.ok ? await cfgRes.json() : { client_id: "" };
          const clientId = cfg.client_id || "";

          const googleId = window.google?.accounts?.id;
          if (googleId) {
            googleId.initialize({
              client_id: clientId,
              callback: async (response: GoogleCredentialResponse) => {
                const idToken = response.credential;
                try {
                  const res = await fetch(`${API_BASE}/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id_token: idToken }),
                  });
                  if (!res.ok) throw new Error("Auth failed");
                  const data = await res.json();
                  localStorage.setItem("user", JSON.stringify(data.user || {}));
                  navigate("/");
                } catch (err) {
                  console.error("Sign-in error", err);
                  alert("Sign-in failed");
                }
              },
            });

            const host = document.getElementById("google-signin");
            if (host) {
              // Width 240–400px per Google's API; match card content width (max-w-md minus padding)
              googleId.renderButton(host, { theme: "outline", size: "large", width: 400 });
            }
          }
        } catch (e) {
          /* ignore */
        }
      })();
    };

    const t = setTimeout(renderBtn, 300);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-6">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Syllabus Reader</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your courses and deadlines</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-card space-y-6">
          <h2 className="text-lg font-semibold font-heading">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            Use your Google account to access your dashboard.
          </p>

          <div id="google-signin" className="flex justify-center min-h-[44px]" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                localStorage.setItem("user", JSON.stringify({ email: "demo@example.com" }));
                window.location.href = "/";
              }}
            >
              Continue as Demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInPage;
