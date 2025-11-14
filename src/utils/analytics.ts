import { createHash } from "crypto";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";
import type { UserAgentParsed } from "../db/schema";

export function hashIpAddress(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function parseUserAgent(userAgent: string): UserAgentParsed {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name || undefined,
    browserVersion: result.browser.version || undefined,
    os: result.os.name || undefined,
    osVersion: result.os.version || undefined,
    device: result.device.type || undefined,
  };
}

export function getGeolocation(ip: string): {
  country: string | null;
  city: string | null;
} {
  if (ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: null, city: null };
  }

  try {
    const geo = geoip.lookup(ip);
    if (!geo) {
      return { country: null, city: null };
    }

    return {
      country: geo.country || null,
      city: geo.city || null,
    };
  } catch (error) {
    console.error("Error getting geolocation:", error);
    return { country: null, city: null };
  }
}

export function getDeviceType(
  userAgent: string,
): "mobile" | "desktop" | "tablet" {
  const ua = userAgent.toLowerCase();

  if (
    ua.includes("ipad") ||
    (ua.includes("android") && !ua.includes("mobile")) ||
    ua.includes("tablet")
  ) {
    return "tablet";
  }

  if (
    ua.includes("mobile") ||
    ua.includes("iphone") ||
    ua.includes("ipod") ||
    ua.includes("android") ||
    ua.includes("blackberry") ||
    ua.includes("windows phone")
  ) {
    return "mobile";
  }

  return "desktop";
}

export function getTrafficSource(referrer: string | null): string | null {
  if (!referrer) {
    return "direct";
  }

  const ref = referrer.toLowerCase();

  if (ref.includes("instagram.com")) return "instagram";
  if (ref.includes("tiktok.com")) return "tiktok";
  if (ref.includes("twitter.com") || ref.includes("t.co")) return "twitter";
  if (ref.includes("facebook.com") || ref.includes("fb.com")) return "facebook";
  if (ref.includes("linkedin.com")) return "linkedin";
  if (ref.includes("youtube.com")) return "youtube";
  if (ref.includes("reddit.com")) return "reddit";
  if (ref.includes("pinterest.com")) return "pinterest";
  if (ref.includes("telegram.org") || ref.includes("t.me")) return "telegram";
  if (ref.includes("whatsapp.com")) return "whatsapp";
  if (ref.includes("vk.com")) return "vk";

  if (ref.includes("google.com")) return "google";
  if (ref.includes("bing.com")) return "bing";
  if (ref.includes("yahoo.com")) return "yahoo";
  if (ref.includes("yandex.")) return "yandex";
  if (ref.includes("duckduckgo.com")) return "duckduckgo";

  return "other";
}

export function extractUtmParams(url: string) {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    return {
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      utmContent: params.get("utm_content") || undefined,
      utmTerm: params.get("utm_term") || undefined,
    };
  } catch {
    return {
      utmSource: undefined,
      utmMedium: undefined,
      utmCampaign: undefined,
      utmContent: undefined,
      utmTerm: undefined,
    };
  }
}

export function getClientIp(
  headers: Record<string, string | undefined>,
): string {
  // For testing: allow overriding IP with X-Test-IP header
  const testIp = headers["x-test-ip"];
  if (testIp && process.env.NODE_ENV !== "production") {
    return testIp;
  }

  const forwarded = headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = headers["x-real-ip"];
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers["cf-connecting-ip"];
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "127.0.0.1";
}
