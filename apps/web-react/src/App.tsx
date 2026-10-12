import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./views/Dashboard";
import { Invoices } from "./views/Invoices";
import { Customers } from "./views/Customers";
import { Items } from "./views/Items";
import { Settings } from "./views/Settings";
import Login from "./views/auth/Login";
import Signup from "./views/auth/Signup";
import ForgotPassword from "./views/auth/ForgotPassword";
import ResetPassword from "./views/auth/ResetPassword";
import CheckEmail from "./views/auth/CheckEmail";
import VerifyEmail from "./views/auth/VerifyEmail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/check-email" element={<CheckEmail />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="customers" element={<Customers />} />
                <Route path="products-and-services/items" element={<Items />} />
                <Route path="estimates" element={<Invoices />} />
                <Route path="sales/credit-notes" element={<Invoices />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
