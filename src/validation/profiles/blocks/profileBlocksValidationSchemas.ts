import { z } from "zod";

const linkBlockConfigSchema = z.object({
  url: z.url("Invalid URL format"),
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  icon: z.string().optional(),
  style: z.enum(["default", "outline", "shadow"]).optional(),
});

const textBlockConfigSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(1000, "Content too long"),
  alignment: z.enum(["left", "center", "right"]).optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
});

const headerBlockConfigSchema = z.object({
  text: z
    .string()
    .min(1, "Header text is required")
    .max(200, "Header too long"),
  level: z
    .enum(["1", "2", "3"])
    .transform(Number)
    .pipe(z.literal(1).or(z.literal(2)).or(z.literal(3)))
    .optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
});

const createProfileBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("link"),
    config: linkBlockConfigSchema,
  }),
  z.object({
    type: z.literal("text"),
    config: textBlockConfigSchema,
  }),
  z.object({
    type: z.literal("header"),
    config: headerBlockConfigSchema,
  }),
]);

const updateProfileBlockSchema = z.object({
  type: z.enum(["link", "text", "header"]).optional(),
  config: z
    .union([
      linkBlockConfigSchema,
      textBlockConfigSchema,
      headerBlockConfigSchema,
    ])
    .optional(),
});

const reorderProfileBlocksSchema = z.object({
  blocks: z
    .array(
      z.object({
        id: z.uuid("Invalid block ID"),
        position: z.number().int().min(0, "Position must be non-negative"),
      }),
    )
    .min(1, "At least one block is required"),
});

export {
  createProfileBlockSchema,
  updateProfileBlockSchema,
  reorderProfileBlocksSchema,
  linkBlockConfigSchema,
  textBlockConfigSchema,
  headerBlockConfigSchema,
};
