import { z } from "zod";

const loginSchema = z.object({
  email: z.email({ error: "Invalid email" }),
  password: z.string().min(8),
  rememberMe: z.boolean().default(false),
});

const registerSchema = z.object({
  email: z.email({ error: "Invalid email" }),
  username: z.string().min(2),
  password: z.string().min(8),
});

export { loginSchema, registerSchema };
