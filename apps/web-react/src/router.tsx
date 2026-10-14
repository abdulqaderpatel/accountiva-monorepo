import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  Navigate,
} from "@tanstack/react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Dashboard } from "./views/Dashboard";
import { Invoices } from "./views/Invoices";
import { Estimates } from "./views/Estimates";
import { CreditNotes } from "./views/CreditNotes";
import { Customers } from "./views/Customers";
import { CustomerDetail } from "./views/CustomerDetail";
import { Items } from "./views/Items";
import { Settings } from "./views/Settings";
import Login from "./views/auth/Login";
import Signup from "./views/auth/Signup";
import ForgotPassword from "./views/auth/ForgotPassword";
import ResetPassword from "./views/auth/ResetPassword";
import CheckEmail from "./views/auth/CheckEmail";
import VerifyEmail from "./views/auth/VerifyEmail";

// 1. Root Route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// 2. Public Auth Routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): { redirect?: string; email?: string } => ({
    redirect: (search.redirect as string) || undefined,
    email: (search.email as string) || undefined,
  }),
  component: Login,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: Signup,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPassword,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPassword,
});

const checkEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/check-email",
  component: CheckEmail,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  component: VerifyEmail,
});

// 3. Protected Layout Route
const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: () => (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  ),
});

// Index Route: redirects to /dashboard
const indexRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/",
  component: () => <Navigate to="/dashboard" replace />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/dashboard",
  component: Dashboard,
});

const invoicesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/invoices",
  component: Invoices,
});

const customersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/customers",
  component: Customers,
});

const customerDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/customers/$id",
  component: CustomerDetail,
});

const itemsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/products-and-services/items",
  component: Items,
});

const estimatesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/estimates",
  component: Estimates,
});

const creditNotesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/sales/credit-notes",
  component: CreditNotes,
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/settings",
  component: Settings,
});

// 4. Create Route Tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  checkEmailRoute,
  verifyEmailRoute,
  protectedLayoutRoute.addChildren([
    indexRoute,
    dashboardRoute,
    invoicesRoute,
    customersRoute,
    customerDetailRoute,
    itemsRoute,
    estimatesRoute,
    creditNotesRoute,
    settingsRoute,
  ]),
]);

// 5. Create Router Instance
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

// Register router for full TypeScript type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
