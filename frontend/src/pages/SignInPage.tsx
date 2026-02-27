import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";

export function SignInPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // If already signed in, redirect to dashboard
    const existing = localStorage.getItem("user");
    if (existing) {
      navigate("/");
      return;
    }
    // Fetch client ID from backend then render Google Sign-In button
    const renderBtn = () => {
      (async () => {
        try {
          const cfgRes = await fetch("/api/auth/google-config");
          const cfg = cfgRes.ok ? await cfgRes.json() : { client_id: "" };
          const clientId = cfg.client_id || "";

          // @ts-ignore - global provided by Google Identity Services
          if (window.google && window.google.accounts && window.google.accounts.id) {
            // @ts-ignore
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: async (response: any) => {
                const idToken = response.credential;
                try {
                  const res = await fetch("/api/auth/google", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id_token: idToken }),
                  });
                  if (!res.ok) throw new Error("Auth failed");
                  const data = await res.json();
                  // Store basic user info in localStorage
                  localStorage.setItem("user", JSON.stringify(data.user || {}));
                  navigate("/");
                } catch (err) {
                  console.error("Sign-in error", err);
                  alert("Sign-in failed");
                }
              },
            });

            // @ts-ignore
            window.google.accounts.id.renderButton(document.getElementById("google-signin")!, {
              theme: "outline",
              size: "large",
            });
          }
        } catch (e) {
          /* ignore */
        }
      })();
    };

    // Small timeout to allow library to load
    const t = setTimeout(renderBtn, 300);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="max-w-md mx-auto py-24 px-6">
      <h1 className="text-2xl font-bold mb-6">Sign in</h1>
      <p className="mb-6 text-muted-foreground">Sign in with your Google account to access your dashboard.</p>

      <div id="google-signin" className="mb-4" />

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Or use a demo sign-in</p>
        <Button onClick={() => {
          // demo sign-in: store a minimal user object
          localStorage.setItem("user", JSON.stringify({ email: "demo@example.com" }));
          window.location.href = "/";
        }} className="mt-3">Continue as Demo</Button>
      </div>
    </div>
  );
}

export default SignInPage;
