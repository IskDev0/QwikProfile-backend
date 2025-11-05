import { Context } from "hono";
import { setCookie } from "hono/cookie";

export default function generateCookie(
  c: Context,
  accessToken: string,
  refreshToken: string,
) {
  setCookie(c, "accessToken", accessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_DOMAIN
        : undefined,
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_DOMAIN
        : undefined,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}
