const PRODUCTION_API_ORIGIN = "https://accountiva-api.netlify.app";
const UAT_API_ORIGIN = "https://uat-accountiva-api.netlify.app";
const ALLOWED_API_ORIGINS = new Set([
  PRODUCTION_API_ORIGIN,
  UAT_API_ORIGIN,
]);

const resolveApiOrigin = (requestUrl) => {
  const configuredOrigin = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
  if (configuredOrigin) {
    if (!ALLOWED_API_ORIGINS.has(configuredOrigin)) {
      throw new Error("API_PROXY_TARGET is not an approved Accountiva API origin");
    }
    return configuredOrigin;
  }

  const hostname = new URL(requestUrl).hostname.toLowerCase();
  const isUatHostname =
    hostname === "uat.accountiva.ai" ||
    hostname.endsWith(".uat.accountiva.ai") ||
    hostname.includes("uat-accountiva");

  return isUatHostname
    ? UAT_API_ORIGIN
    : PRODUCTION_API_ORIGIN;
};

const getApiPath = (requestUrl) => {
  const url = new URL(requestUrl);
  const functionPrefix = "/.netlify/functions/api";
  const path = url.pathname.startsWith(functionPrefix)
    ? url.pathname.slice(functionPrefix.length)
    : url.pathname.replace(/^\/api/, "");
  return `/api${path.startsWith("/") ? path : `/${path}`}${url.search}`;
};

export default async (request) => {
  try {
    const requestUrl = new URL(request.url);
    const apiOrigin = resolveApiOrigin(request.url);
    const upstreamUrl = `${apiOrigin}${getApiPath(request.url)}`;
    const headers = new Headers(request.headers);

    headers.delete("connection");
    headers.delete("content-length");
    headers.delete("host");
    headers.set("x-accountiva-frontend-host", requestUrl.host);
    headers.set("x-forwarded-host", requestUrl.host);
    headers.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer();

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    const location = responseHeaders.get("location");
    if (location?.startsWith(apiOrigin)) {
      responseHeaders.set(
        "location",
        `${requestUrl.origin}${location.slice(apiOrigin.length)}`,
      );
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[API Proxy] Request failed", error);
    return Response.json(
      { error: "API_PROXY_UNAVAILABLE" },
      { status: 502 },
    );
  }
};
