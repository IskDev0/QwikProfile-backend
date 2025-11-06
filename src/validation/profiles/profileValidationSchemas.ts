import { z } from "zod";

const profileSchema = z.object({
  slug: z.string().min(3),
  title: z.string().min(3).max(100),
  bio: z.string().min(3).max(255),
});

export { profileSchema };
