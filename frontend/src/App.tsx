import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import HomePage from "@/pages/Home";
import DashboardPage from "@/pages/Dashboard";
import ChatbotPage from "@/pages/Chatbot";
import MedicinesPage from "@/pages/Medicines";
import ConditionsPage from "@/pages/Conditions";
import HospitalsPage from "@/pages/Hospitals";
import PharmaciesPage from "@/pages/Pharmacies";
import EmergencyPage from "@/pages/Emergency";
import SavedPage from "@/pages/Saved";
import AccountPage from "@/pages/Account";
import AppLayout from "@/components/AppLayout";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "hsl(var(--primary))" }} />
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<AuthGate><DashboardPage /></AuthGate>} />
            <Route path="/chatbot" element={<AuthGate><ChatbotPage /></AuthGate>} />
            <Route path="/medicines" element={<AuthGate><MedicinesPage /></AuthGate>} />
            <Route path="/conditions" element={<AuthGate><ConditionsPage /></AuthGate>} />
            <Route path="/hospitals" element={<AuthGate><HospitalsPage /></AuthGate>} />
            <Route path="/pharmacies" element={<AuthGate><PharmaciesPage /></AuthGate>} />
            <Route path="/emergency" element={<AuthGate><EmergencyPage /></AuthGate>} />
            <Route path="/saved" element={<AuthGate><SavedPage /></AuthGate>} />
            <Route path="/account" element={<AuthGate><AccountPage /></AuthGate>} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}