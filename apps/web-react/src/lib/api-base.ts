const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

// In browser environments, always use relative /api so requests go through the
// Netlify proxy on the same domain, keeping all session and state cookies strictly first-party.
const isHostedWebApp =
  typeof window !== "undefined" &&
  (window.location.protocol === "https:" || window.location.protocol === "http:");

export const apiBaseURL = isHostedWebApp ? "/api" : (configuredApiUrl || "/api");

export const authBaseURL = apiBaseURL.startsWith("http")
  ? new URL(apiBaseURL).origin
  : typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5000";


