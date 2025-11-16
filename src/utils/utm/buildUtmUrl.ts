import type { UtmParams } from "../../db/schema";

export function buildUtmUrl(baseUrl: string, utmParams: UtmParams): string {
  try {
    const url = new URL(baseUrl);

    if (utmParams.utm_source) {
      url.searchParams.set("utm_source", utmParams.utm_source);
    }
    if (utmParams.utm_medium) {
      url.searchParams.set("utm_medium", utmParams.utm_medium);
    }
    if (utmParams.utm_campaign) {
      url.searchParams.set("utm_campaign", utmParams.utm_campaign);
    }
    if (utmParams.utm_content) {
      url.searchParams.set("utm_content", utmParams.utm_content);
    }
    if (utmParams.utm_term) {
      url.searchParams.set("utm_term", utmParams.utm_term);
    }

    return url.toString();
  } catch (error) {
    throw new Error("Invalid base URL");
  }
}