import { verify } from "hono/jwt";

export default async function verifyToken(
  token: string,
  secret: string,
): Promise<{ id: string; exp: number } | null> {
  try {
    const payload = await verify(token, secret);
    return payload as { id: string; exp: number };
  } catch (error) {
    return null;
  }
}
