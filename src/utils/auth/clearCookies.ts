import { Context } from "hono";
import { deleteCookie } from "hono/cookie";

export default function clearCookies(c: Context) {
  deleteCookie(c, "accessToken", {
    path: "/",
    domain:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_DOMAIN
        : undefined,
  });
  deleteCookie(c, "refreshToken", {
    path: "/",
    domain:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_DOMAIN
        : undefined,
  });
}
