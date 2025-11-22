import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color");

const themeBackgroundSolidSchema = z.object({
  type: z.literal("solid"),
  value: hexColorSchema,
});

const themeBackgroundGradientSchema = z.object({
  type: z.literal("gradient"),
  gradient: z.object({
    from: hexColorSchema,
    to: hexColorSchema,
    direction: z.enum([
      "to-br",
      "to-tr",
      "to-bl",
      "to-tl",
      "to-b",
      "to-t",
      "to-l",
      "to-r",
    ]),
  }),
});

const themeBackgroundImageSchema = z.object({
  type: z.literal("image"),
  imageUrl: z.url(),
});

const themeBackgroundSchema = z.discriminatedUnion("type", [
  themeBackgroundSolidSchema,
  themeBackgroundGradientSchema,
  themeBackgroundImageSchema,
]);

const cssUnitSchema = z
  .string()
  .regex(/^\d+(\.\d+)?(px|rem|em|%)$/, "Must be a valid CSS unit");

const blockStyleSchema = z.object({
  backgroundColor: z
    .union([hexColorSchema, z.literal("transparent")])
    .optional(),
  textColor: hexColorSchema.optional(),
  borderRadius: cssUnitSchema.optional(),
  borderWidth: cssUnitSchema.optional(),
  borderColor: hexColorSchema.optional(),
  fontWeight: z.enum(["normal", "medium", "semibold", "bold"]).optional(),
  padding: cssUnitSchema.optional(),
  hoverEffect: z.enum(["scale", "shadow", "glow", "none"]).optional(),
});

const linkStyleOverridesSchema = z.object({
  default: blockStyleSchema.partial().optional(),
  outline: blockStyleSchema.partial().optional(),
  shadow: blockStyleSchema.partial().optional(),
});

export const themeConfigSchema = z.object({
  profile: z.object({
    background: themeBackgroundSchema,
    textColor: hexColorSchema,
    accentColor: hexColorSchema,
    fontFamily: z.string().min(1).max(100),
  }),
  avatar: z.object({
    borderWidth: cssUnitSchema,
    borderColor: hexColorSchema,
    shape: z.enum(["circle", "rounded", "square"]),
    shadow: z.enum(["none", "sm", "md", "lg", "xl"]),
  }),
  defaultBlockStyles: z.object({
    borderRadius: cssUnitSchema,
    padding: cssUnitSchema,
    backgroundColor: z.union([hexColorSchema, z.literal("transparent")]),
    textColor: hexColorSchema,
  }),
  blockOverrides: z
    .object({
      link: linkStyleOverridesSchema.optional(),
      header: blockStyleSchema.partial().optional(),
      text: blockStyleSchema.partial().optional(),
    })
    .optional(),
  spacing: z.object({
    blockGap: cssUnitSchema,
    containerPadding: cssUnitSchema,
    maxWidth: cssUnitSchema,
  }),
});

export const createThemeSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Theme name must contain only lowercase letters, numbers, and hyphens",
    ),
  displayName: z.string().min(3).max(100),
  description: z.string().min(10).max(500).optional(),
  previewImageUrl: z.url().optional(),
  config: themeConfigSchema,
});

export const applyThemeSchema = z.object({
  themeName: z.string().min(1),
});
