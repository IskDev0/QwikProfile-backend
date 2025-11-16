import db from "../../db";
import { utmLinks } from "../../db/schema";
import { eq } from "drizzle-orm";

const CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 7;

export async function generateShortCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateRandomCode();

    const [existing] = await db
      .select()
      .from(utmLinks)
      .where(eq(utmLinks.shortCode, code))
      .limit(1);

    if (!existing) {
      return code;
    }

    attempts++;
  }

  throw new Error("Failed to generate unique short code after multiple attempts");
}

function generateRandomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    code += CHARACTERS[randomIndex];
  }
  return code;
}