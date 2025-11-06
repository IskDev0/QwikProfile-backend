import { Context, Hono } from "hono";
import db from "../db";
import { profiles, profileBlocks } from "../db/schema";
import { and, eq, max } from "drizzle-orm";
import authMiddleware from "../middleware/authMiddleware";
import { validationHook } from "../validation/validationHook";
import { profileSchema } from "../validation/profiles/profileValidationSchemas";
import {
  createProfileBlockSchema,
  updateProfileBlockSchema,
  reorderProfileBlocksSchema,
} from "../validation/profiles/blocks/profileBlocksValidationSchemas";
import getUserInfo from "../utils/auth/getUserInfo";
import { BLOCK_TYPES_CONFIG } from "../constants/blockTypesConfig";

const profilesIndex = new Hono();

profilesIndex.get("/", authMiddleware, async (c: Context) => {
  const user = await getUserInfo(c);

  try {
    const profilesList = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .orderBy(profiles.createdAt);
    return c.json({ items: profilesList });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.get("/:profileId", async (c: Context) => {
  const profileId = c.req.param("profileId");

  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    if (!profile.isPublished) {
      return c.json({ error: "Profile is not published" }, 403);
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

profilesIndex.post(
  "/",
  authMiddleware,
  validationHook(profileSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);

    const body = await c.req.json();

    try {
      const existingProfile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.slug, body.slug));

      if (existingProfile.length > 0) {
        return c.json({ error: "This slug is already taken" }, 409);
      }

      await db.insert(profiles).values({
        userId: user.id,
        slug: body.slug,
        title: body.title,
        bio: body.bio,
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
  },
);

profilesIndex.put(
  "/:profileId",
  authMiddleware,
  validationHook(profileSchema),
  async (c: Context) => {
    const user = await getUserInfo(c);
    const profileId = c.req.param("profileId");
    const body = await c.req.json();

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

      if (existingProfile.slug !== body.slug) {
        const [slugTaken] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.slug, body.slug));

        if (slugTaken) {
          return c.json({ error: "This slug is already taken" }, 409);
        }
      }

      await db
        .update(profiles)
        .set({
          slug: body.slug,
          title: body.title,
          bio: body.bio,
        })
        .where(eq(profiles.id, profileId));

      return c.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

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

    await db.delete(profiles).where(eq(profiles.id, profileId));

    return c.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profilesIndex.get("/blocks/config", (c: Context) => {
  return c.json({ blockTypes: BLOCK_TYPES_CONFIG });
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

profilesIndex.patch(
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

profilesIndex.delete(
  "/:profileId/blocks/:blockId",
  authMiddleware,
  async (c: Context) => {
    const user = await getUserInfo(c);
    const profileId = c.req.param("profileId");
    const blockId = c.req.param("blockId");

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

      await db.delete(profileBlocks).where(eq(profileBlocks.id, blockId));

      return c.json({ message: "Block deleted successfully" });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

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

      return c.json({ message: "Blocks reordered successfully" });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

export default profilesIndex;
