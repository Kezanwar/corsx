import landingHtml from "./landing.html";

interface Env {
  // Add KV namespace here if you want rate limiting later
  // RATE_LIMIT: KVNamespace;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    //handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    switch (url.pathname) {
      case "/health": //health check
        return new Response("OK", { status: 200 });
      case "/proxy": //main proxy endpoint
        return handleProxy(request, url);
      case "/": //serve landing page
        return new Response(landingHtml, {
          headers: { "Content-Type": "text/html" },
        });
      default: //else not found
        return jsonError("Not found", 404);
    }
  },
};

async function handleProxy(request: Request, url: URL): Promise<Response> {
  const targetURL = url.searchParams.get("url");

  if (!targetURL) {
    //handle missing URL search param
    return jsonError("Missing 'url' query parameter", 400);
  }

  //validate URL
  let parsed: URL;
  try {
    parsed = new URL(targetURL);
  } catch {
    return jsonError("Invalid URL", 400);
  }

  //handle missing protocol
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return jsonError("Only HTTP and HTTPS URLs are supported", 400);
  }

  //block internal hosts (SSRF protection)
  if (isInternalHost(parsed.hostname)) {
    return jsonError("Internal hosts are not allowed", 403);
  }

  //fetch the target URL
  try {
    const proxyRequest = new Request(targetURL, {
      method: request.method,
      headers: filterHeaders(request.headers), //filter any headers
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? request.body
          : null,
      redirect: "follow",
    });

    const response = await fetch(proxyRequest);

    // Build response with CORS headers
    const newHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    newHeaders.set("X-Proxied-By", "corsx");
    newHeaders.set("X-Original-URL", targetURL);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonError(`Failed to fetch URL: ${message}`, 502);
  }
}

function filterHeaders(headers: Headers): Headers {
  const filtered = new Headers();
  const allowedHeaders = [
    "accept",
    "accept-language",
    "content-type",
    "user-agent",
  ];

  for (const [key, value] of headers.entries()) {
    if (allowedHeaders.includes(key.toLowerCase())) {
      filtered.set(key, value);
    }
  }

  if (!filtered.has("User-Agent")) {
    filtered.set("User-Agent", "corsx/1.0");
  }

  console.log([...filtered.values()]);

  return filtered;
}

const privatePatterns = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.x.x.x
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.x.x
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16-31.x.x
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // Link-local
  /^0\.0\.0\.0$/,
];

function isInternalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  //localhost
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") {
    return true;
  }

  //private IP ranges
  return privatePatterns.some((pattern) => pattern.test(lower));
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}
