import { Context, Hono } from "hono";
import db from "../db";
import { profileBlocks, profiles, themes } from "../db/schema";
import { and, eq, max } from "drizzle-orm";
import authMiddleware from "../middleware/authMiddleware";
import { validationHook } from "../validation/validationHook";
import {
  createProfileBlockSchema,
  reorderProfileBlocksSchema,
  updateProfileBlockSchema,
} from "../validation/profiles/blocks/profileBlocksValidationSchemas";
import getUserInfo from "../utils/auth/getUserInfo";
import { BLOCK_TYPES_CONFIG } from "../constants/blockTypesConfig";
import { uploadToR2 } from "../utils/s3/uploadToS3";
import { deleteFromR2 } from "../utils/s3/deleteFromS3";
import { DEFAULT_THEME_CONFIG } from "../constants/defaultTheme";
import { CacheService, CacheKeys, CacheTTL } from "../utils/cache";

const profilesIndex = new Hono();

profilesIndex.get("/", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);

  try {
    const profilesList = await db.query.profiles.findMany({
      where: eq(profiles.userId, user.id),
      with: {
        themeRelation: true,
      },
      orderBy: (profiles, { asc }) => [asc(profiles.createdAt)],
    });

    return c.json({ items: profilesList });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.get("/slug/:slug", async (c: Context) => {
  const slug = c.req.param("slug");

  try {
    const cacheKey = CacheKeys.profile(slug);

    const cachedProfile = await CacheService.get<any>(cacheKey);

    if (cachedProfile) {
      return c.json(cachedProfile);
    }

    const profileData = await db.query.profiles.findFirst({
      where: eq(profiles.slug, slug),
      with: {
        blocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.position)],
        },
        themeRelation: true,
      },
    });

    if (!profileData) {
      return c.json(
        {
          error: "Profile not found",
        },
        404,
      );
    }

    const { themeRelation, blocks, ...profile } = profileData;

    const response = {
      ...profile,
      blocks,
      themeConfig: themeRelation?.config || DEFAULT_THEME_CONFIG,
    };

    await CacheService.set(cacheKey, response, CacheTTL.PROFILE);

    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.get("/check-slug", async (c: Context) => {
  const slug = c.req.query("slug");

  if (!slug) {
    return c.json({ error: "Slug parameter is required" }, 400);
  }

  try {
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.slug, slug));

    if (existingProfile) {
      return c.json({ available: false }, 409);
    }

    return c.json({ available: true }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.get("/:profileId", authMiddleware, async (c: Context) => {
  const profileId = c.req.param("profileId");

  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      with: {
        blocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.position)],
        },
        themeRelation: true,
      },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const blocks = await db
      .select()
      .from(profileBlocks)
      .where(eq(profileBlocks.profileId, profileId))
      .orderBy(profileBlocks.position);

    return c.json({
      ...profile,
      blocks,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.post("/", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);

  try {
    const formData = await c.req.formData();
    const slug = formData.get("slug") as string;
    const title = formData.get("title") as string;
    const bio = formData.get("bio") as string;
    const avatar = formData.get("avatar") as File | null;

    if (!slug || slug.length < 3) {
      return c.json({ error: "Slug must be at least 3 characters" }, 400);
    }
    if (!title || title.length < 3 || title.length > 100) {
      return c.json(
        { error: "Title must be between 3 and 100 characters" },
        400,
      );
    }
    if (!bio || bio.length < 3 || bio.length > 255) {
      return c.json({ error: "Bio must be between 3 and 255 characters" }, 400);
    }

    const existingProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.slug, slug));

    if (existingProfile.length > 0) {
      return c.json({ error: "This slug is already taken" }, 409);
    }

    let avatarUrl = "";

    if (avatar && avatar.size > 0) {
      const uploadResult = await uploadToR2(avatar, "avatars");
      avatarUrl = uploadResult.url;
    }

    await db.insert(profiles).values({
      userId: user.id,
      slug,
      title,
      bio,
      avatarUrl,
    });

    return c.json(
      {
        message: "Profile created successfully",
      },
      201,
    );
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.put("/:profileId", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);
  const profileId = c.req.param("profileId");

  try {
    const formData = await c.req.formData();
    const slug = formData.get("slug") as string;
    const title = formData.get("title") as string;
    const bio = formData.get("bio") as string;
    const avatar = formData.get("avatar") as File | null;

    if (!slug || slug.length < 3) {
      return c.json({ error: "Slug must be at least 3 characters" }, 400);
    }
    if (!title || title.length < 3 || title.length > 100) {
      return c.json(
        { error: "Title must be between 3 and 100 characters" },
        400,
      );
    }
    if (!bio || bio.length < 3 || bio.length > 255) {
      return c.json({ error: "Bio must be between 3 and 255 characters" }, 400);
    }

    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));

    if (!existingProfile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    if (existingProfile.userId !== user.id) {
      return c.json({ error: "Forbidden: You don't own this profile" }, 403);
    }

    if (existingProfile.slug !== slug) {
      const [slugTaken] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.slug, slug));

      if (slugTaken) {
        return c.json({ error: "This slug is already taken" }, 409);
      }
    }

    let avatarUrl = existingProfile.avatarUrl;

    if (avatar && avatar.size > 0) {
      if (existingProfile.avatarUrl && existingProfile.avatarUrl !== "") {
        await deleteFromR2(existingProfile.avatarUrl);
      }

      const uploadResult = await uploadToR2(avatar, "avatars");
      avatarUrl = uploadResult.url;
    }

    await db
      .update(profiles)
      .set({
        slug,
        title,
        bio,
        avatarUrl,
      })
      .where(eq(profiles.id, profileId));

    await CacheService.delete(CacheKeys.profile(existingProfile.slug));
    if (existingProfile.slug !== slug) {
      await CacheService.delete(CacheKeys.profile(slug));
    }
    await CacheService.delete(CacheKeys.userProfiles(user.id));

    return c.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.patch("/:profileId", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);
  const profileId = c.req.param("profileId");

  try {
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));

    if (!existingProfile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    if (existingProfile.userId !== user.id) {
      return c.json({ error: "Forbidden: You don't own this profile" }, 403);
    }

    await db
      .update(profiles)
      .set({
        isPublished: !existingProfile.isPublished,
      })
      .where(eq(profiles.id, profileId));

    await CacheService.delete(CacheKeys.profile(existingProfile.slug));
    await CacheService.delete(CacheKeys.userProfiles(user.id));

    return c.json({
      message: "Profile status changed successfully",
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.delete("/:profileId", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);
  const profileId = c.req.param("profileId");

  try {
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));

    if (!existingProfile) {
      return c.json(
        {
          error: "Profile not found",
        },
        404,
      );
    }

    if (existingProfile.userId !== user.id) {
      return c.json({ error: "Forbidden: You don't own this profile" }, 403);
    }

    if (existingProfile.avatarUrl && existingProfile.avatarUrl !== "") {
      await deleteFromR2(existingProfile.avatarUrl);
    }

    await db.delete(profiles).where(eq(profiles.id, profileId));

    await CacheService.delete(CacheKeys.profile(existingProfile.slug));
    await CacheService.delete(CacheKeys.userProfiles(user.id));

    return c.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.get("/blocks/config", (c: Context) => {
  return c.json({ items: BLOCK_TYPES_CONFIG });
});

profilesIndex.post(
  "/:profileId/blocks",
  authMiddleware,
  validationHook(createProfileBlockSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);
    const profileId = c.req.param("profileId");
    const body = await c.req.json();

    try {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId));

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      if (profile.userId !== user.id) {
        return c.json({ error: "Forbidden: You don't own this profile" }, 403);
      }

      const result = await db
        .select({ max: max(profileBlocks.position) })
        .from(profileBlocks)
        .where(eq(profileBlocks.profileId, profileId));

      const newPosition = (result[0]?.max ?? -1) + 1;

      await db
        .insert(profileBlocks)
        .values({
          profileId,
          type: body.type,
          config: body.config,
          position: newPosition,
        })
        .returning();

      await CacheService.delete(CacheKeys.profile(profile.slug));

      return c.json(
        {
          message: "Block created successfully",
        },
        201,
      );
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

profilesIndex.put(
  "/:profileId/blocks/:blockId",
  authMiddleware,
  validationHook(updateProfileBlockSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);
    const profileId = c.req.param("profileId");
    const blockId = c.req.param("blockId");
    const body = await c.req.json();

    try {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId));

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      if (profile.userId !== user.id) {
        return c.json({ error: "Forbidden: You don't own this profile" }, 403);
      }

      const [block] = await db
        .select()
        .from(profileBlocks)
        .where(
          and(
            eq(profileBlocks.id, blockId),
            eq(profileBlocks.profileId, profileId),
          ),
        );

      if (!block) {
        return c.json({ error: "Block not found" }, 404);
      }

      const updateData: any = {};
      if (body.type) updateData.type = body.type;
      if (body.config) updateData.config = body.config;

      const [updatedBlock] = await db
        .update(profileBlocks)
        .set(updateData)
        .where(eq(profileBlocks.id, blockId))
        .returning();

      await CacheService.delete(CacheKeys.profile(profile.slug));

      return c.json({
        message: "Block updated successfully",
        block: updatedBlock,
      });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

profilesIndex.delete("/blocks/:blockId", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);
  const blockId = c.req.param("blockId");

  try {
    const [block] = await db
      .select()
      .from(profileBlocks)
      .where(eq(profileBlocks.id, blockId));

    if (!block) {
      return c.json({ error: "Block not found" }, 404);
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, block.profileId));

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    if (profile.userId !== user.id) {
      return c.json({ error: "Forbidden: You don't own this profile" }, 403);
    }

    await db.delete(profileBlocks).where(eq(profileBlocks.id, blockId));

    await CacheService.delete(CacheKeys.profile(profile.slug));

    return c.json({ message: "Block deleted successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.patch(
  "/:profileId/blocks/reorder",
  authMiddleware,
  validationHook(reorderProfileBlocksSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);
    const profileId = c.req.param("profileId");
    const body = await c.req.json();

    try {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId));

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      if (profile.userId !== user.id) {
        return c.json({ error: "Forbidden: You don't own this profile" }, 403);
      }

      const blockIds = body.blocks.map((b: any) => b.id);
      const existingBlocks = await db
        .select()
        .from(profileBlocks)
        .where(eq(profileBlocks.profileId, profileId));

      const existingBlockIds = existingBlocks.map((b) => b.id);
      const invalidBlocks = blockIds.filter(
        (id: string) => !existingBlockIds.includes(id),
      );

      if (invalidBlocks.length > 0) {
        return c.json(
          { error: "Some blocks do not belong to this profile" },
          400,
        );
      }

      await db.transaction(async (tx) => {
        for (const block of body.blocks) {
          await tx
            .update(profileBlocks)
            .set({ position: block.position })
            .where(eq(profileBlocks.id, block.id));
        }
      });

      await CacheService.delete(CacheKeys.profile(profile.slug));

      return c.json({ message: "Blocks reordered successfully" });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

export default profilesIndex;
