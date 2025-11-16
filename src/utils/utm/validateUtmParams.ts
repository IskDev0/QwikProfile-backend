import type { UtmParams } from "../../db/schema";

export function validateUtmParams(params: UtmParams): boolean {
  const hasAtLeastOneParam =
    !!params.utm_source ||
    !!params.utm_medium ||
    !!params.utm_campaign ||
    !!params.utm_content ||
    !!params.utm_term;

  return hasAtLeastOneParam;
}

export function cleanUtmParams(params: UtmParams): UtmParams {
  const cleaned: UtmParams = {};

  if (params.utm_source?.trim()) {
    cleaned.utm_source = params.utm_source.trim();
  }
  if (params.utm_medium?.trim()) {
    cleaned.utm_medium = params.utm_medium.trim();
  }
  if (params.utm_campaign?.trim()) {
    cleaned.utm_campaign = params.utm_campaign.trim();
  }
  if (params.utm_content?.trim()) {
    cleaned.utm_content = params.utm_content.trim();
  }
  if (params.utm_term?.trim()) {
    cleaned.utm_term = params.utm_term.trim();
  }

  return cleaned;
}