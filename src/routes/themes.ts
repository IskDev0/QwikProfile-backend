import { Context, Hono } from "hono";
import db from "../db";
import { themes, profiles } from "../db/schema";
import { eq } from "drizzle-orm";
import authMiddleware from "../middleware/authMiddleware";
import getUserInfo from "../utils/auth/getUserInfo";
import { validationHook } from "../validation/validationHook";
import { applyThemeSchema } from "../validation/themes/themeValidationSchemas";
import { CacheService, CacheKeys, CacheTTL } from "../utils/cache";
import { csrfProtection, originValidation } from "../middleware/csrfMiddleware";

const themesIndex = new Hono();

themesIndex.use("*", originValidation);
themesIndex.use("*", csrfProtection);

themesIndex.get("/", async (c: Context) => {
  try {
    const cacheKey = CacheKeys.systemThemes();

    const cachedThemes = await CacheService.get<any[]>(cacheKey);

    if (cachedThemes) {
      return c.json({ themes: cachedThemes });
    }

    const themesList = await db
      .select()
      .from(themes)
      .where(eq(themes.isSystem, true))
      .orderBy(themes.name);

    await CacheService.set(cacheKey, themesList, CacheTTL.SYSTEM_THEMES);

    return c.json({ themes: themesList });
  } catch (error) {
    console.error("Error fetching themes:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

themesIndex.get("/:name", async (c: Context) => {
  const name = c.req.param("name");

  try {
    const [theme] = await db
      .select()
      .from(themes)
      .where(eq(themes.name, name))
      .limit(1);

    if (!theme) {
      return c.json({ error: "Theme not found" }, 404);
    }

    return c.json({ theme });
  } catch (error) {
    console.error("Error fetching theme:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

themesIndex.patch(
  "/apply/:profileId",
  authMiddleware,
  validationHook(applyThemeSchema),
  async (c: Context) => {
    const profileId = c.req.param("profileId");
    const user = await getUserInfo(c);

    try {
      const body = await c.req.json();
      const { themeName } = body;

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1);

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      if (profile.userId !== user.id) {
        return c.json(
          { error: "You do not have permission to update this profile" },
          403,
        );
      }

      const [theme] = await db
        .select()
        .from(themes)
        .where(eq(themes.name, themeName))
        .limit(1);

      if (!theme) {
        return c.json({ error: "Theme not found" }, 404);
      }

      await db
        .update(profiles)
        .set({
          theme: themeName,
          themeId: theme.id,
        })
        .where(eq(profiles.id, profileId));

      return c.json({ success: true, theme: themeName });
    } catch (error) {
      console.error("Error applying theme:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

export default themesIndex;
