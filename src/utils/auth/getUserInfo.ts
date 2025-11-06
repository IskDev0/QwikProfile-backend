import { Context } from "hono";
import { verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";

export interface UserPayload {
  id: string;
  exp: number;
}

export default async function getUserInfo(
  c: Context,
): Promise<UserPayload> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    throw new HTTPException(401, {
      message: "Authorization header missing",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new HTTPException(401, {
      message: "Token missing",
    });
  }

  try {
    return (await verify(
      token,
      process.env.ACCESS_SECRET!,
    )) as unknown as UserPayload;
  } catch (error) {
    throw new HTTPException(401, {
      message: "Invalid or expired token",
    });
  }
}
