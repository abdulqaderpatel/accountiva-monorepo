const configuredApiUrl =
  import.meta.env.VITE_API_URL || "/api";

const isHostedWebApp =
  import.meta.env.PROD &&
  typeof window !== "undefined" &&
  (window.location.protocol === "https:" || window.location.protocol === "http:");

export const apiBaseURL = isHostedWebApp ? "/api" : configuredApiUrl;

export const authBaseURL = apiBaseURL.startsWith("http")
  ? new URL(apiBaseURL).origin
  : typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5000";

