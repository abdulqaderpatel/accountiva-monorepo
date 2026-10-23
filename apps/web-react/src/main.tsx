import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/outfit";
import "@fontsource-variable/jetbrains-mono";
import "./style.css";
import App from "./App";
import { configureApi, setActiveOrganizationId } from "@accountiva/api";
import { apiBaseURL } from "./lib/api-base";

const initialOrgId = typeof window !== "undefined" ? localStorage.getItem("accountiva_org_id") : null;
if (initialOrgId) {
  setActiveOrganizationId(initialOrgId);
}

// Configure @accountiva/api to target correct API base URL and forward organization ID
configureApi({
  baseURL: apiBaseURL,
  getOrganizationId: () => (typeof window !== "undefined" ? localStorage.getItem("accountiva_org_id") : null),
});

// Clean up transient OAuth query parameters (?code=...&state=...) from browser URL if present
if (typeof window !== "undefined" && window.location.search) {
  const params = new URLSearchParams(window.location.search);
  if (params.has("code") || params.has("state")) {
    params.delete("code");
    params.delete("state");
    params.delete("scope");
    params.delete("authuser");
    params.delete("prompt");
    const cleanSearch = params.toString();
    const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "") + window.location.hash;
    window.history.replaceState(null, "", cleanUrl);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
