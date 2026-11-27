import React, { Suspense, useEffect } from "react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  Outlet,
  Navigate,
  Link,
  useLocation,
} from "@tanstack/react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute, GuestRoute } from "./components/auth/ProtectedRoute";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { useAuth } from "./context/AuthContext";

const Dashboard = lazyRouteComponent(() => import("./views/Dashboard"), "Dashboard");
const Invoices = lazyRouteComponent(() => import("./views/Invoices"), "Invoices");
const Estimates = lazyRouteComponent(() => import("./views/Estimates"), "Estimates");
const CreditNotes = lazyRouteComponent(() => import("./views/CreditNotes"), "CreditNotes");
const Customers = lazyRouteComponent(() => import("./views/Customers"), "Customers");
const CustomerDetail = lazyRouteComponent(() => import("./views/CustomerDetail"), "CustomerDetail");
const Items = lazyRouteComponent(() => import("./views/Items"), "Items");
const Settings = lazyRouteComponent(() => import("./views/Settings"), "Settings");
const OrganizationSettings = lazyRouteComponent(() => import("./views/OrganizationSettings"), "OrganizationSettings");
const Notifications = lazyRouteComponent(() => import("./views/Notifications"), "Notifications");
const PublicInvoiceView = lazyRouteComponent(() => import("./views/PublicInvoiceView"), "PublicInvoiceView");
const Onboarding = lazyRouteComponent(() => import("./views/Onboarding"), "Onboarding");
const Landing = lazyRouteComponent(() => import("./views/Landing"), "Landing");
const Login = lazyRouteComponent(() => import("./views/auth/Login"));
const Signup = lazyRouteComponent(() => import("./views/auth/Signup"));
const ForgotPassword = lazyRouteComponent(() => import("./views/auth/ForgotPassword"));
const ResetPassword = lazyRouteComponent(() => import("./views/auth/ResetPassword"));
const CheckEmail = lazyRouteComponent(() => import("./views/auth/CheckEmail"));
const VerifyEmail = lazyRouteComponent(() => import("./views/auth/VerifyEmail"));
const AcceptInvitation = lazyRouteComponent(() => import("./views/auth/AcceptInvitation"), "AcceptInvitation");

const ChatBot = React.lazy(() =>
  import("./components/chat/ChatBot").then((m) => ({ default: m.ChatBot }))
);
const ProductTour = React.lazy(() =>
  import("./components/layout/ProductTour").then((m) => ({ default: m.ProductTour }))
);

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="size-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm space-y-4">
        <div className="text-3xl font-bold text-primary">404</div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function RootLayout() {
  const location = useLocation();

  useEffect(() => {
    // Silently cleanup OAuth URL parameters (state, code, scope, etc.) 
    // after navigation is complete to ensure a clean address bar, matching Vue router.
    const oauthParams = ["state", "code", "iss", "scope", "authuser", "prompt", "error"];
    const currentUrl = new URL(window.location.href);
    let changed = false;
    for (const param of oauthParams) {
      if (currentUrl.searchParams.has(param)) {
        currentUrl.searchParams.delete(param);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search);
    }
  }, [location.pathname, location.searchStr]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
      <Suspense fallback={null}>
        <ChatBot />
        <ProductTour />
      </Suspense>
    </ErrorBoundary>
  );
}

// 1. Root Route
const rootRoute = createRootRoute({
  component: RootLayout,
});

// 2. Public Auth Routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): { redirect?: string; email?: string } => ({
    redirect: (search.redirect as string) || undefined,
    email: (search.email as string) || undefined,
  }),
  component: () => (
    <GuestRoute>
      <Login />
    </GuestRoute>
  ),
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: () => (
    <GuestRoute>
      <Signup />
    </GuestRoute>
  ),
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: () => (
    <GuestRoute>
      <ForgotPassword />
    </GuestRoute>
  ),
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: () => (
    <GuestRoute>
      <ResetPassword />
    </GuestRoute>
  ),
});

const checkEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/check-email",
  component: () => (
    <GuestRoute>
      <CheckEmail />
    </GuestRoute>
  ),
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  component: VerifyEmail,
});

const publicInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invoices/view/$id",
  component: PublicInvoiceView,
});

const publicInvoiceAliasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invoices/$id",
  component: PublicInvoiceView,
});

const acceptInvitationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite/$token",
  component: AcceptInvitation,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: () => (
    <ProtectedRoute>
      <Onboarding />
    </ProtectedRoute>
  ),
});

function RootIndexComponent() {
  const { isAuthenticated, loading, hasCompletedOnboarding } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to={hasCompletedOnboarding ? "/dashboard" : "/onboarding"} replace />;
  }
  return <Landing />;
}

const rootIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: RootIndexComponent,
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

const organizationSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/organization-settings",
  component: OrganizationSettings,
});

const adminRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin",
  component: () => <Navigate to="/dashboard" replace />,
});

const itemsRedirectRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/items",
  component: () => <Navigate to="/products-and-services/items" replace />,
});

const projectsRedirectRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/projects",
  component: () => <Navigate to="/dashboard" replace />,
});

const trashRedirectRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/trash",
  component: () => <Navigate to="/organization-settings" search={{ tab: "recently-deleted" }} replace />,
});

const teamRedirectRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/settings/team",
  component: () => <Navigate to="/organization-settings" search={{ tab: "members" }} replace />,
});

const notificationsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/notifications",
  component: Notifications,
});

const notificationsRedirectRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/settings/notifications",
  component: () => <Navigate to="/settings" search={{ tab: "notifications" }} replace />,
});

// 4. Create Route Tree
const routeTree = rootRoute.addChildren([
  rootIndexRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  checkEmailRoute,
  verifyEmailRoute,
  publicInvoiceRoute,
  publicInvoiceAliasRoute,
  acceptInvitationRoute,
  onboardingRoute,
  protectedLayoutRoute.addChildren([
    dashboardRoute,
    invoicesRoute,
    customersRoute,
    customerDetailRoute,
    itemsRoute,
    estimatesRoute,
    creditNotesRoute,
    settingsRoute,
    organizationSettingsRoute,
    adminRoute,
    notificationsRoute,
    notificationsRedirectRoute,
    trashRedirectRoute,
    teamRedirectRoute,
    itemsRedirectRoute,
    projectsRedirectRoute,
  ]),
]);

// 5. Create Router Instance
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultNotFoundComponent: NotFoundView,
});

// Register router for full TypeScript type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
