import axios from "axios";
import { apiBaseURL } from "./api-base";

type OrganizationRequestConfig = {
  organizationId?: string;
  organizationController?: AbortController;
};

const organizationRequests = new Map<string, Set<AbortController>>();

const releaseOrganizationRequest = (config: unknown) => {
  const tracked = config as OrganizationRequestConfig | undefined;
  if (!tracked?.organizationId || !tracked.organizationController) return;
  const controllers = organizationRequests.get(tracked.organizationId);
  controllers?.delete(tracked.organizationController);
  if (controllers?.size === 0) organizationRequests.delete(tracked.organizationId);
};

export const cancelOrganizationRequests = (organizationId?: string | null) => {
  if (!organizationId) return;
  organizationRequests.get(organizationId)?.forEach((controller) => controller.abort());
  organizationRequests.delete(organizationId);
};

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const orgId = typeof window !== "undefined" ? localStorage.getItem("accountiva_org_id") : null;
  if (orgId) {
    config.headers.set("x-organization-id", orgId);
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      const trackedConfig = config as typeof config & OrganizationRequestConfig;
      trackedConfig.organizationId = orgId;
      trackedConfig.organizationController = controller;
      const controllers = organizationRequests.get(orgId) || new Set<AbortController>();
      controllers.add(controller);
      organizationRequests.set(orgId, controllers);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    releaseOrganizationRequest(response.config);
    return response;
  },
  (error) => {
    releaseOrganizationRequest(error.config);
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const publicPaths = [
        "/login",
        "/signup",
        "/verify-email",
        "/reset-password",
        "/forgot-password",
        "/accept-invitation",
      ];
      const isPublicPath =
        publicPaths.includes(window.location.pathname) ||
        window.location.pathname.startsWith("/invoices/") ||
        window.location.pathname.startsWith("/invite/");
      if (!isPublicPath) {
        localStorage.removeItem("accountiva_session");
        localStorage.removeItem("accountiva_org_id");
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

