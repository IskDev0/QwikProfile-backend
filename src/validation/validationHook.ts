import { ZodError, ZodType } from "zod";
import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

export type DataSource =
  | "json"
  | "form"
  | "query"
  | "param"
  | "header"
  | "cookie";

const getRequiredFields = (schema: ZodType<any, any, any>): string[] => {
  const schemaShape = (schema as any)?._def?.shape?.();
  return schemaShape
    ? Object.keys(schemaShape).filter((key) => !schemaShape[key].isOptional())
    : [];
};

const createJsonParseError = (
  schema: ZodType<any, any, any>,
  includeMissingFields: boolean = true,
) => {
  const errorResponse: any = {
    errors: [
      {
        path: "body",
        message: "Invalid JSON format",
      },
    ],
  };

  if (includeMissingFields) {
    errorResponse.missingFields = getRequiredFields(schema);
  }

  return errorResponse;
};

const formatValidationErrors = (zodError: ZodError) => {
  return JSON.parse(zodError.message)?.map((err: any) => ({
    path: err.path.join("."),
    message: err.message,
  }));
};

const parseDataBySource = async (
  c: Context,
  source: DataSource,
  schema: ZodType<any, any, any>,
): Promise<{ data?: unknown; error?: Response }> => {
  let data: unknown;

  try {
    switch (source) {
      case "json":
        data = await c.req.json();
        break;
      case "query":
        data = c.req.query();
        break;
      case "param":
        data = c.req.param();
        break;
      case "form":
        data = await c.req.parseBody();
        break;
      case "header":
        data = c.req.header();
        break;
      case "cookie":
        data = getCookie(c);
        break;
      default:
        data = await c.req.json();
    }
    return { data };
  } catch (jsonError) {
    return {
      error: c.json(createJsonParseError(schema), 400),
    };
  }
};

export const validationHook = (
  schema: ZodType<any, any, any>,
  source: DataSource = "json",
) => {
  return async (c: Context, next: Next) => {
    try {
      const { data, error } = await parseDataBySource(c, source, schema);

      if (error) {
        return error;
      }

      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        return c.json({ errors }, 400);
      }

      await next();
    } catch (error) {
      console.log(error);

      return c.json(
        {
          errors: [
            {
              path: "unknown",
              message: "Validation error",
            },
          ],
        },
        400,
      );
    }
  };
};
