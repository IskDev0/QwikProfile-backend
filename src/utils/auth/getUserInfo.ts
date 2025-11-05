import { Context } from "hono";
import { verify } from "hono/jwt";

export interface UserPayload {
  id: string;
  exp: number;
}

export default async function getUserInfo(
  c: Context,
): Promise<UserPayload | Response> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return c.json(
      {
        error: "Authorization header missing",
      },
      401,
    );
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return c.json(
      {
        error: "Token missing",
      },
      401,
    );
  }

  try {
    return (await verify(
      token,
      process.env.ACCESS_SECRET!,
    )) as unknown as UserPayload;
  } catch (error) {
    return c.json(
      {
        error: "Invalid or expired token",
      },
      401,
    );
  }
}
