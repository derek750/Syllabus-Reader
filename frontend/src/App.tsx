import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/store";
import { AppLayout } from "@/components/AppLayout";
import { IndexPage } from "@/pages/IndexPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { GradesPage } from "@/pages/GradesPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout><IndexPage /></AppLayout>} />
      <Route path="/calendar" element={<AppLayout><CalendarPage /></AppLayout>} />
      <Route path="/grades" element={<AppLayout><GradesPage /></AppLayout>} />
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
