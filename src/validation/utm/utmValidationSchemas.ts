import { z } from "zod";

const utmParamsSchema = z.object({
  utm_source: z.string().min(1).max(255).optional(),
  utm_medium: z.string().min(1).max(255).optional(),
  utm_campaign: z.string().min(1).max(255).optional(),
  utm_content: z.string().min(1).max(255).optional(),
  utm_term: z.string().min(1).max(255).optional(),
});

export const createUserUtmTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Name too long"),
  icon: z.string().max(50).optional(),
  params: utmParamsSchema,
});

export const updateUserUtmTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Name too long")
    .optional(),
  icon: z.string().max(50).optional(),
  params: utmParamsSchema.optional(),
});

export const generateUtmLinkSchema = z
  .object({
    profileId: z.uuid("Invalid profile ID"),
    templateId: z.uuid("Invalid template ID").optional(),
    templateType: z.enum(["system", "user"]).optional(),
    customParams: utmParamsSchema.optional(),
    generateShortCode: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      const hasTemplate = data.templateId && data.templateType;
      const hasCustomParams =
        data.customParams &&
        Object.keys(data.customParams).some((key) => {
          const value =
            data.customParams?.[key as keyof typeof data.customParams];
          return value && value.trim().length > 0;
        });

      return hasTemplate || hasCustomParams;
    },
    {
      message:
        "Either template (templateId and templateType) or customParams must be provided",
    },
  )
  .refine(
    (data) => {
      if (data.templateId && !data.templateType) {
        return false;
      }
      if (data.templateType && !data.templateId) {
        return false;
      }
      return true;
    },
    {
      message: "Both templateId and templateType must be provided together",
    },
  );

export const updateUtmLinkSchema = z.object({
  utmParams: utmParamsSchema,
});
