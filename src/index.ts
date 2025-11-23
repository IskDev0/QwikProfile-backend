import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import authIndex from "./routes/auth";
import profilesIndex from "./routes/profiles";
import analyticsIndex from "./routes/analytics";
import utmIndex from "./routes/utm";
import themesIndex from "./routes/themes";
import db from "./db";
import { utmLinks } from "./db/schema";
import { eq } from "drizzle-orm";
import { CacheService, CacheKeys, CacheTTL } from "./utils/cache";

const app = new Hono();
app.use(logger());

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL!,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.route("/auth", authIndex);
app.route("/profiles", profilesIndex);
app.route("/analytics", analyticsIndex);
app.route("/utm", utmIndex);
app.route("/themes", themesIndex);

app.get("/u/:shortCode", async (c) => {
  const shortCode = c.req.param("shortCode");

  try {
    const cacheKey = CacheKeys.shortLink(shortCode);

    const cachedLink = await CacheService.get<{
      fullUrl: string;
      id: number;
      clicks: number;
    }>(cacheKey);

    if (cachedLink) {
      db.update(utmLinks)
        .set({ clicks: cachedLink.clicks + 1 })
        .where(eq(utmLinks.id, cachedLink.id))
        .then(() => {
          CacheService.set(
            cacheKey,
            { ...cachedLink, clicks: cachedLink.clicks + 1 },
            CacheTTL.SHORT_LINK,
          );
        })
        .catch((err) => console.error("Error updating clicks:", err));

      return c.redirect(cachedLink.fullUrl, 302);
    }
    const [link] = await db
      .select()
      .from(utmLinks)
      .where(eq(utmLinks.shortCode, shortCode));

    if (!link) {
      return c.json({ error: "Short link not found" }, 404);
    }

    await CacheService.set(
      cacheKey,
      { fullUrl: link.fullUrl, id: link.id, clicks: link.clicks },
      CacheTTL.SHORT_LINK,
    );

    db.update(utmLinks)
      .set({ clicks: link.clicks + 1 })
      .where(eq(utmLinks.id, link.id))
      .catch((err) => console.error("Error updating clicks:", err));

    return c.redirect(link.fullUrl, 302);
  } catch (error) {
    console.error("Error redirecting short link:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default {
  fetch: app.fetch,
  port: process.env.PORT! || 8000,
};
