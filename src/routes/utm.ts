import { Context, Hono } from "hono";
import db from "../db";
import {
  utmTemplates,
  userUtmTemplates,
  utmLinks,
  profiles,
} from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import authMiddleware from "../middleware/authMiddleware";
import getUserInfo from "../utils/auth/getUserInfo";
import { validationHook } from "../validation/validationHook";
import {
  createUserUtmTemplateSchema,
  updateUserUtmTemplateSchema,
  generateUtmLinkSchema,
  updateUtmLinkSchema,
} from "../validation/utm/utmValidationSchemas";
import { generateShortCode } from "../utils/utm/generateShortCode";
import { buildUtmUrl } from "../utils/utm/buildUtmUrl";
import {
  validateUtmParams,
  cleanUtmParams,
} from "../utils/utm/validateUtmParams";
import { CacheService, CacheKeys, CacheTTL } from "../utils/cache";
import { csrfProtection, originValidation } from "../middleware/csrfMiddleware";

const utmIndex = new Hono();

utmIndex.use("*", originValidation);
utmIndex.use("*", csrfProtection);

utmIndex.get("/templates", async (c: Context) => {
  try {
    const cacheKey = CacheKeys.systemTemplates();

    const cachedTemplates = await CacheService.get<any[]>(cacheKey);

    if (cachedTemplates) {
      return c.json({ items: cachedTemplates });
    }

    const templates = await db
      .select()
      .from(utmTemplates)
      .where(eq(utmTemplates.isSystem, true))
      .orderBy(utmTemplates.name);

    await CacheService.set(cacheKey, templates, CacheTTL.SYSTEM_TEMPLATES);

    return c.json({ items: templates });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

utmIndex.get("/user-templates", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);

  try {
    const templates = await db
      .select()
      .from(userUtmTemplates)
      .where(eq(userUtmTemplates.userId, user.id))
      .orderBy(userUtmTemplates.createdAt);

    return c.json({ items: templates });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

utmIndex.post(
  "/user-templates",
  authMiddleware,
  validationHook(createUserUtmTemplateSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);
    const body = await c.req.json();

    try {
      const cleanedParams = cleanUtmParams(body.params);

      if (!validateUtmParams(cleanedParams)) {
        return c.json({ error: "At least one UTM parameter is required" }, 400);
      }

      const [template] = await db
        .insert(userUtmTemplates)
        .values({
          userId: user.id,
          name: body.name,
          icon: body.icon || null,
          params: cleanedParams,
        })
        .returning();

      return c.json(
        { message: "Template created successfully", template },
        201,
      );
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

utmIndex.put(
  "/user-templates/:id",
  authMiddleware,
  validationHook(updateUserUtmTemplateSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);
    const templateId = c.req.param("id");
    const body = await c.req.json();

    try {
      const [existingTemplate] = await db
        .select()
        .from(userUtmTemplates)
        .where(eq(userUtmTemplates.id, templateId));

      if (!existingTemplate) {
        return c.json({ error: "Template not found" }, 404);
      }

      if (existingTemplate.userId !== user.id) {
        return c.json({ error: "Forbidden: You don't own this template" }, 403);
      }

      const updateData: any = {};

      if (body.name) {
        updateData.name = body.name;
      }
      if (body.icon !== undefined) {
        updateData.icon = body.icon || null;
      }
      if (body.params) {
        const cleanedParams = cleanUtmParams(body.params);
        if (!validateUtmParams(cleanedParams)) {
          return c.json(
            { error: "At least one UTM parameter is required" },
            400,
          );
        }
        updateData.params = cleanedParams;
      }

      const [updatedTemplate] = await db
        .update(userUtmTemplates)
        .set(updateData)
        .where(eq(userUtmTemplates.id, templateId))
        .returning();

      return c.json({
        message: "Template updated successfully",
        template: updatedTemplate,
      });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

utmIndex.delete("/user-templates/:id", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);
  const templateId = c.req.param("id");

  try {
    const [existingTemplate] = await db
      .select()
      .from(userUtmTemplates)
      .where(eq(userUtmTemplates.id, templateId));

    if (!existingTemplate) {
      return c.json({ error: "Template not found" }, 404);
    }

    if (existingTemplate.userId !== user.id) {
      return c.json({ error: "Forbidden: You don't own this template" }, 403);
    }

    await db
      .delete(userUtmTemplates)
      .where(eq(userUtmTemplates.id, templateId));

    return c.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

utmIndex.post(
  "/links/generate",
  authMiddleware,
  validationHook(generateUtmLinkSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);
    const body = await c.req.json();

    try {
      let utmParams = {};
      let templateId = body.templateId || null;
      let templateType = body.templateType || null;

      if (body.templateId && body.templateType) {
        if (body.templateType === "system") {
          const [template] = await db
            .select()
            .from(utmTemplates)
            .where(eq(utmTemplates.id, body.templateId));

          if (!template) {
            return c.json({ error: "System template not found" }, 404);
          }

          utmParams = { ...template.defaultParams };
        } else if (body.templateType === "user") {
          const [template] = await db
            .select()
            .from(userUtmTemplates)
            .where(
              and(
                eq(userUtmTemplates.id, body.templateId),
                eq(userUtmTemplates.userId, user.id),
              ),
            );

          if (!template) {
            return c.json({ error: "User template not found" }, 404);
          }

          utmParams = { ...template.params };
        }
      }

      if (body.customParams) {
        utmParams = { ...utmParams, ...body.customParams };
      }

      const cleanedParams = cleanUtmParams(utmParams);

      if (!validateUtmParams(cleanedParams)) {
        return c.json({ error: "At least one UTM parameter is required" }, 400);
      }

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, body.profileId));

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      if (profile.userId !== user.id) {
        return c.json({ error: "Forbidden: You don't own this profile" }, 403);
      }

      const baseUrl = `${process.env.FRONTEND_URL}/u/${profile.slug}`;
      const fullUrl = buildUtmUrl(baseUrl, cleanedParams);

      let shortCode = null;
      if (body.generateShortCode) {
        shortCode = await generateShortCode();
      }

      const [link] = await db
        .insert(utmLinks)
        .values({
          userId: user.id,
          profileId: body.profileId,
          utmParams: cleanedParams,
          templateId: body.templateId || null,
          templateType: body.templateType || null,
          shortCode,
          fullUrl,
          clicks: 0,
        })
        .returning();

      return c.json(
        {
          message: "UTM link generated successfully",
          link: {
            ...link,
            shortUrl: shortCode
              ? `${process.env.FRONTEND_URL}/u/${shortCode}`
              : null,
          },
        },
        201,
      );
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

utmIndex.get("/links", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);
  const profileId = c.req.query("profileId");

  try {
    let query = db
      .select()
      .from(utmLinks)
      .where(eq(utmLinks.userId, user.id))
      .$dynamic();

    if (profileId) {
      query = query.where(eq(utmLinks.profileId, profileId));
    }

    const links = await query.orderBy(desc(utmLinks.createdAt));

    const linksWithShortUrl = links.map((link) => ({
      ...link,
      shortUrl: link.shortCode
        ? `${process.env.FRONTEND_URL}/u/${link.shortCode}`
        : null,
    }));

    return c.json({ items: linksWithShortUrl });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

utmIndex.get("/links/:id", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);
  const linkId = c.req.param("id");

  try {
    const [link] = await db
      .select()
      .from(utmLinks)
      .where(eq(utmLinks.id, linkId));

    if (!link) {
      return c.json({ error: "Link not found" }, 404);
    }

    if (link.userId !== user.id) {
      return c.json({ error: "Forbidden: You don't own this link" }, 403);
    }

    const linkWithShortUrl = {
      ...link,
      shortUrl: link.shortCode
        ? `${process.env.FRONTEND_URL}/u/${link.shortCode}`
        : null,
    };

    return c.json(linkWithShortUrl);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

utmIndex.put(
  "/links/:id",
  authMiddleware,
  validationHook(updateUtmLinkSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);
    const linkId = c.req.param("id");
    const body = await c.req.json();

    try {
      const [existingLink] = await db
        .select()
        .from(utmLinks)
        .where(eq(utmLinks.id, linkId));

      if (!existingLink) {
        return c.json({ error: "Link not found" }, 404);
      }

      if (existingLink.userId !== user.id) {
        return c.json({ error: "Forbidden: You don't own this link" }, 403);
      }

      const cleanedParams = cleanUtmParams(body.utmParams);

      if (!validateUtmParams(cleanedParams)) {
        return c.json({ error: "At least one UTM parameter is required" }, 400);
      }

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, existingLink.profileId));

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      const baseUrl = `${process.env.FRONTEND_URL}/u/${profile.slug}`;
      const fullUrl = buildUtmUrl(baseUrl, cleanedParams);

      const [updatedLink] = await db
        .update(utmLinks)
        .set({
          utmParams: cleanedParams,
          fullUrl,
        })
        .where(eq(utmLinks.id, linkId))
        .returning();

      if (existingLink.shortCode) {
        await CacheService.delete(CacheKeys.shortLink(existingLink.shortCode));
      }

      const linkWithShortUrl = {
        ...updatedLink,
        shortUrl: updatedLink.shortCode
          ? `${process.env.FRONTEND_URL}/u/${updatedLink.shortCode}`
          : null,
      };

      return c.json({
        message: "Link updated successfully",
        link: linkWithShortUrl,
      });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

utmIndex.delete("/links/:id", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);
  const linkId = c.req.param("id");

  try {
    const [link] = await db
      .select()
      .from(utmLinks)
      .where(eq(utmLinks.id, linkId));

    if (!link) {
      return c.json({ error: "Link not found" }, 404);
    }

    if (link.userId !== user.id) {
      return c.json({ error: "Forbidden: You don't own this link" }, 403);
    }

    await db.delete(utmLinks).where(eq(utmLinks.id, linkId));

    if (link.shortCode) {
      await CacheService.delete(CacheKeys.shortLink(link.shortCode));
    }

    return c.json({ message: "Link deleted successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default utmIndex;
