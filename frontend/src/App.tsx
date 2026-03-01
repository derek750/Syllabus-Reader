import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { StoreProvider } from "@/store";
import { AppLayout } from "@/components/AppLayout";
import { IndexPage } from "@/pages/IndexPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { CoursesPage } from "@/pages/CoursesPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import SignInPage from "@/pages/SignInPage";
import type { ReactElement } from "react";


function Protected({ children }: { children: ReactElement }) {
  try {
    const u = localStorage.getItem("user");
    if (!u) return <Navigate to="/signin" replace />;
  } catch {
    return <Navigate to="/signin" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/" element={<Protected><AppLayout><IndexPage /></AppLayout></Protected>} />
      <Route path="/courses" element={<Protected><AppLayout><CoursesPage /></AppLayout></Protected>} />
      <Route path="/courses/:courseId" element={<Protected><AppLayout><CourseDetailPage /></AppLayout></Protected>} />
      <Route path="/calendar" element={<Protected><AppLayout><CalendarPage /></AppLayout></Protected>} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Analytics />
    </StoreProvider>
  );
}
