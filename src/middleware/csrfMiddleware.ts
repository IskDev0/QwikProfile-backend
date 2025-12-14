import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

export const csrfProtection = async (c: Context, next: Next) => {
  if (process.env.NODE_ENV === "development") {
    return await next();
  }

  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return await next();
  }

  const headerToken = c.req.header("X-CSRF-Token");
  const cookieToken = getCookie(c, "csrf-token");

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return c.json({ error: "Invalid CSRF token" }, 403);
  }

  await next();
};

export const originValidation = async (c: Context, next: Next) => {
  // Skip origin validation in development mode
  if (process.env.NODE_ENV === "development") {
    return await next();
  }

  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return await next();
  }

  const origin = c.req.header("Origin");
  const referer = c.req.header("Referer");

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    `http://localhost:${process.env.PORT || 8000}`,
  ].filter(Boolean) as string[];

  if (origin) {
    const isAllowed = allowedOrigins.some((allowed) =>
      origin.startsWith(allowed),
    );
    if (!isAllowed) {
      return c.json({ error: "Invalid origin" }, 403);
    }
  } else if (referer) {
    const isAllowed = allowedOrigins.some((allowed) =>
      referer.startsWith(allowed),
    );
    if (!isAllowed) {
      return c.json({ error: "Invalid referer" }, 403);
    }
  } else {
    console.warn("Request without Origin or Referer header:", {
      method,
      path: c.req.path,
      userAgent: c.req.header("User-Agent"),
    });
  }

  await next();
};
