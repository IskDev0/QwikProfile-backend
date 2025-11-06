import { Context, Hono } from "hono";
import db from "../db";
import { profiles } from "../db/schema";
import { eq } from "drizzle-orm";
import authMiddleware from "../middleware/authMiddleware";
import { validationHook } from "../validation/validationHook";
import { profileSchema } from "../validation/profiles/profileValidationSchemas";
import getUserInfo from "../utils/auth/getUserInfo";

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

    return c.json(profile);
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

export default profilesIndex;
