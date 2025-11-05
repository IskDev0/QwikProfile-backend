import { sign } from "hono/jwt";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export default async function generateTokens(
  user: any,
  rememberMe: boolean = false,
): Promise<Tokens> {
  const accessPayload = {
    id: user.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 час
  };

  const refreshPayload = {
    id: user.id,
    exp: rememberMe
      ? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 дней
      : Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 1 день
  };

  const accessToken = await sign(accessPayload, process.env.ACCESS_SECRET!);
  const refreshToken = await sign(refreshPayload, process.env.REFRESH_SECRET!);

  return {
    accessToken,
    refreshToken,
  };
}
