const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const apiBaseURL = configuredApiUrl || "/api";

export const authBaseURL = apiBaseURL.startsWith("http")
  ? new URL(apiBaseURL).origin
  : typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5000";

