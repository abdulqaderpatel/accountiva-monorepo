import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export interface ApiClientConfig {
  baseURL?: string;
  getOrganizationId?: () => string | null | Promise<string | null>;
  getAuthToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

let activeOrganizationId: string | null = null;

export function setActiveOrganizationId(orgId: string | null) {
  activeOrganizationId = orgId;
}

export function getActiveOrganizationId(): string | null {
  return activeOrganizationId;
}

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
  organizationRequests.get(organizationId)?.forEach((controller) => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  });
  organizationRequests.delete(organizationId);
};

let currentConfig: ApiClientConfig = {
  baseURL: 'http://localhost:3000/api',
};

export const api: AxiosInstance = axios.create({
  baseURL: currentConfig.baseURL,
  withCredentials: true,
});

export function configureApi(config: Partial<ApiClientConfig>) {
  currentConfig = { ...currentConfig, ...config };
  if (config.baseURL) {
    api.defaults.baseURL = config.baseURL;
  }
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const isBrowserRuntime = typeof window !== 'undefined' && typeof document !== 'undefined';

  // Browsers own these forbidden headers. Native/mobile clients must provide them explicitly.
  if (!isBrowserRuntime) {
    const currentOrigin = config.headers.get('Origin');
    if (!currentOrigin || currentOrigin === 'null') {
      config.headers.set('Origin', 'https://accountiva.ai');
    }
  }

  let orgId = activeOrganizationId;
  if (!orgId && currentConfig.getOrganizationId) {
    orgId = await currentConfig.getOrganizationId();
  }

  if (orgId) {
    config.headers.set('x-organization-id', orgId);
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

  if (currentConfig.getAuthToken) {
    const token = await currentConfig.getAuthToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
      if (!isBrowserRuntime) {
        const existingCookie = config.headers.get('Cookie');
        const cookieStr = typeof existingCookie === 'string' ? existingCookie : '';
        if (!cookieStr.includes('session_token')) {
          config.headers.set(
            'Cookie',
            `better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}${cookieStr ? '; ' + cookieStr : ''}`
          );
        }
      }
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
    releaseOrganizationRequest(error?.config);
    if (error.response?.status === 401 && currentConfig.onUnauthorized) {
      currentConfig.onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
