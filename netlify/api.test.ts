import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootHandler from "./functions/api.mjs";
import vueHandler from "../apps/web/netlify/functions/api.mjs";
import reactHandler from "../apps/web-react/netlify/functions/api.mjs";

const handlers = [
  ["root", rootHandler],
  ["Vue", vueHandler],
  ["React", reactHandler],
] as const;

const originalAppEnv = process.env.APP_ENV;
const originalProxyTarget = process.env.API_PROXY_TARGET;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  delete process.env.APP_ENV;
  delete process.env.API_PROXY_TARGET;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  if (originalAppEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = originalAppEnv;
  if (originalProxyTarget === undefined) delete process.env.API_PROXY_TARGET;
  else process.env.API_PROXY_TARGET = originalProxyTarget;
});

describe.each(handlers)("%s API proxy", (_name, handler) => {
  test("does not infer UAT from the request hostname", async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("upstream", { status: 200 }));
    globalThis.fetch = upstream;

    const response = await handler(
      new Request("https://uat.accountiva.ai/api/invoices"),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "API_PROXY_UNAVAILABLE",
    });
    expect(upstream).not.toHaveBeenCalled();
  });

  test("requires a supported explicit environment", async () => {
    process.env.API_PROXY_TARGET = "https://uat-accountiva-api.netlify.app";
    process.env.APP_ENV = "staging";
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("upstream", { status: 200 }));
    globalThis.fetch = upstream;

    const response = await handler(
      new Request("https://uat.accountiva.ai/api/invoices"),
    );

    expect(response.status).toBe(502);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("requires an approved explicit proxy target", async () => {
    process.env.APP_ENV = "uat";
    process.env.API_PROXY_TARGET = "https://example.com";
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("upstream", { status: 200 }));
    globalThis.fetch = upstream;

    const response = await handler(
      new Request("https://uat.accountiva.ai/api/invoices"),
    );

    expect(response.status).toBe(502);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("uses only the configured target regardless of request hostname", async () => {
    process.env.APP_ENV = "production";
    process.env.API_PROXY_TARGET = "https://accountiva-api.netlify.app";
    let upstreamUrl = "";
    globalThis.fetch = vi.fn<typeof fetch>(async (input) => {
      upstreamUrl = input.toString();
      return new Response("upstream", { status: 200 });
    });

    const response = await handler(
      new Request("https://uat.accountiva.ai/api/invoices?status=Draft"),
    );

    expect(response.status).toBe(200);
    expect(upstreamUrl).toBe(
      "https://accountiva-api.netlify.app/api/invoices?status=Draft",
    );
  });
});
