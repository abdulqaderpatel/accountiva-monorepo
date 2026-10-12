import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export interface ApiClientConfig {
  baseURL?: string;
  getOrganizationId?: () => string | null | Promise<string | null>;
  getAuthToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

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
  if (currentConfig.getOrganizationId) {
    const orgId = await currentConfig.getOrganizationId();
    if (orgId) {
      config.headers.set('x-organization-id', orgId);
    }
  }

  if (currentConfig.getAuthToken) {
    const token = await currentConfig.getAuthToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && currentConfig.onUnauthorized) {
      currentConfig.onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;

