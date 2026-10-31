import { afterEach, describe, expect, it, vi } from "vitest";
import { api, configureApi, setActiveOrganizationId } from "./client";

const inspectRequestHeaders = async () => {
  const response = await api.get("/header-probe", {
    adapter: async (config) => ({
      data: null,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }),
  });
  return response.config.headers;
};

describe("API runtime headers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setActiveOrganizationId(null);
    configureApi({ getAuthToken: undefined, getOrganizationId: undefined });
  });

  it("does not set browser-forbidden Origin or Cookie headers", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});
    configureApi({ getAuthToken: () => "session-token" });

    const headers = await inspectRequestHeaders();

    expect(headers.get("Origin")).toBeUndefined();
    expect(headers.get("Cookie")).toBeUndefined();
    expect(headers.get("Authorization")).toBe("Bearer session-token");
  });

  it("keeps native trusted-origin and cookie authentication", async () => {
    configureApi({ getAuthToken: () => "session-token" });

    const headers = await inspectRequestHeaders();

    expect(headers.get("Origin")).toBe("https://accountiva.ai");
    expect(headers.get("Cookie")).toContain("better-auth.session_token=session-token");
  });
});
