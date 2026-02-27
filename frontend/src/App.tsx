import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/store";
import { AppLayout } from "@/components/AppLayout";
import { IndexPage } from "@/pages/IndexPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { GradesPage } from "@/pages/GradesPage";
import { CoursesPage } from "@/pages/CoursesPage";
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
      <Route path="/calendar" element={<Protected><AppLayout><CalendarPage /></AppLayout></Protected>} />
      <Route path="/grades" element={<Protected><AppLayout><GradesPage /></AppLayout></Protected>} />
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
    </StoreProvider>
  );
}
