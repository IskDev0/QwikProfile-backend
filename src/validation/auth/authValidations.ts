import { z } from "zod";

const loginSchema = z.object({
  email: z.email({ error: "Invalid email" }),
  password: z.string().min(8),
  rememberMe: z.boolean().default(false),
});

const registerSchema = z.object({
  email: z.email({ error: "Invalid email" }),
  password: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  email: z.email({ message: "Invalid email" }),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token is required" }),
  newPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
