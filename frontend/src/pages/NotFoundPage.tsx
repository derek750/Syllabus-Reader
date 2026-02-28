import { Link } from "react-router-dom";
import { BookOpen, Home } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-6">
      <div className="text-center max-w-md space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <BookOpen className="h-8 w-8" />
        </div>
        <h1 className="text-6xl font-bold font-heading text-muted-foreground/80">404</h1>
        <p className="text-xl font-medium">Page not found</p>
        <p className="text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors mt-4"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
