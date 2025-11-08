import { Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import { validationHook } from "../validation/validationHook";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation/auth/authValidations";
import db from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import generateTokens from "../utils/auth/generateTokens";
import generateCookie from "../utils/auth/generateCookie";
import clearCookies from "../utils/auth/clearCookies";
import verifyToken from "../utils/auth/verifyToken";
import authMiddleware from "../middleware/authMiddleware";
import getUserInfo from "../utils/auth/getUserInfo";
import sendResetEmail from "../utils/auth/sendResetEmail";

const authIndex = new Hono();

authIndex.post(
  "/register",
  validationHook(registerSchema),
  async (c: Context) => {
    const body = await c.req.json();

    try {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email));

      if (existingUser[0]) {
        return c.json(
          {
            error: "User with that email already exists",
          },
          409,
        );
      }

      const hashedPassword = await Bun.password.hash(body.password);

      const [user] = await db
        .insert(users)
        .values({
          email: body.email,
          passwordHash: hashedPassword,
        })
        .returning();

      const { accessToken, refreshToken } = await generateTokens(user);
      generateCookie(c, accessToken, refreshToken);

      const { passwordHash, ...formattedUser } = user;

      return c.json(formattedUser, 201);
    } catch (error) {
      console.error(error);
      return c.json(
        {
          error: "Internal server error",
        },
        500,
      );
    }
  },
);

authIndex.post("/login", validationHook(loginSchema), async (c: Context) => {
  const body = await c.req.json();

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email));

    if (!user) {
      return c.json(
        {
          error: "Invalid email or password",
        },
        400,
      );
    }

    const isPasswordValid = await Bun.password.verify(
      body.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return c.json(
        {
          error: "Invalid email or password",
        },
        401,
      );
    }

    const { accessToken, refreshToken } = await generateTokens(
      user,
      body.rememberMe,
    );

    generateCookie(c, accessToken, refreshToken);

    const { passwordHash, ...formattedUser } = user;

    return c.json(formattedUser);
  } catch (error) {
    console.error(error);
    return c.json(
      {
        error: "Internal server error",
      },
      500,
    );
  }
});

authIndex.post("/refresh", async (c: Context) => {
  try {
    const refreshToken = getCookie(c, "refreshToken");

    if (!refreshToken) {
      return c.json(
        {
          error: "Refresh token not found",
        },
        401,
      );
    }

    const payload = await verifyToken(
      refreshToken,
      process.env.REFRESH_SECRET!,
    );

    if (!payload) {
      return c.json(
        {
          error: "Invalid or expired refresh token",
        },
        401,
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id));

    if (!user) {
      return c.json(
        {
          error: "User not found",
        },
        404,
      );
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    generateCookie(c, accessToken, newRefreshToken);

    const { passwordHash, ...formattedUser } = user;

    return c.json(formattedUser);
  } catch (error) {
    console.error(error);
    return c.json(
      {
        error: "Internal server error",
      },
      500,
    );
  }
});

authIndex.post("/logout", async (c: Context) => {
  try {
    clearCookies(c);

    return c.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error(error);
    return c.json(
      {
        error: "Internal server error",
      },
      500,
    );
  }
});

authIndex.get("/me", authMiddleware, async (c: Context) => {
  try {
    const payload = await getUserInfo(c);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id));

    if (!user) {
      return c.json(
        {
          error: "User not found",
        },
        404,
      );
    }

    const { passwordHash, ...formattedUser } = user;

    return c.json(formattedUser);
  } catch (error) {
    console.error(error);
    return c.json(
      {
        error: "Internal server error",
      },
      500,
    );
  }
});

authIndex.post(
  "/forgot-password",
  validationHook(forgotPasswordSchema),
  async (c: Context) => {
    const body = await c.req.json();

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email));

      if (!user) {
        return c.json({
          message: "If the email exists, a reset link has been sent",
        });
      }

      const resetToken = crypto.randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await db
        .update(users)
        .set({
          resetToken,
          resetTokenExpiry,
        })
        .where(eq(users.id, user.id));

      await sendResetEmail(user.email, resetToken);

      return c.json({
        message: "If the email exists, a reset link has been sent",
      });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

authIndex.post(
  "/reset-password",
  validationHook(resetPasswordSchema),
  async (c: Context) => {
    const body = await c.req.json();

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetToken, body.token));

      if (!user) {
        return c.json({ error: "Invalid or expired reset token" }, 400);
      }

      if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return c.json({ error: "Invalid or expired reset token" }, 400);
      }

      const hashedPassword = await Bun.password.hash(body.newPassword);

      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      return c.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

export default authIndex;
