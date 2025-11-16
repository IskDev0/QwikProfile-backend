import type { Context } from "hono";
import { Hono } from "hono";
import db from "../db";
import { analyticsEvents, profileBlocks, profiles } from "../db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  extractUtmParams,
  getClientIp,
  getDeviceType,
  getGeolocation,
  getTrafficSource,
  hashIpAddress,
  parseUserAgent,
} from "../utils/analytics";
import authMiddleware from "../middleware/authMiddleware";
import getUserInfo from "../utils/auth/getUserInfo";

const analyticsIndex = new Hono();

function getPeriodDates(period: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  const from = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  const periodNumber = parseInt(period);

  switch (periodNumber) {
    case 1:
      // 1 day
      break;
    case 2:
      // 7 days
      from.setUTCDate(from.getUTCDate() - 6);
      break;
    case 3:
      // 1 month
      from.setUTCDate(from.getUTCDate() - 29);
      break;
    default:
      // Default to 7 days
      from.setUTCDate(from.getUTCDate() - 6);
  }

  return { from, to };
}

function generateDateRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);

  const endDate = new Date(to);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, "0");
    const day = String(current.getUTCDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

analyticsIndex.get("/overview", authMiddleware, async (c: Context) => {
  try {
    const profileId = c.req.query("profileId");
    const period = c.req.query("period") || "2";
    const user = await getUserInfo(c);

    if (!profileId) {
      return c.json({ error: "profileId is required" }, 400);
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    if (profile.userId !== user.id) {
      return c.json(
        {
          error: "Forbidden: You don't have access to this profile's analytics",
        },
        403,
      );
    }

    const { from, to } = getPeriodDates(period);

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.profileId, profileId),
          gte(analyticsEvents.createdAt, from),
          lte(analyticsEvents.createdAt, to),
        ),
      )
      .orderBy(analyticsEvents.createdAt);

    const viewEvents = events.filter((e) => e.eventType === "view");
    const clickEvents = events.filter((e) => e.eventType === "click");
    const totalViews = viewEvents.length;
    const totalClicks = clickEvents.length;

    const uniqueVisitors = new Set(viewEvents.map((e) => e.ipHash)).size;
    const clickRate =
      totalViews > 0
        ? parseFloat(((totalClicks / totalViews) * 100).toFixed(2))
        : 0;

    const dateRange = generateDateRange(from, to);

    const viewsByDate = viewEvents.reduce(
      (acc, event) => {
        const date = event.createdAt.toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { views: 0, uniqueVisitors: new Set<string>() };
        }
        acc[date].views++;
        acc[date].uniqueVisitors.add(event.ipHash);
        return acc;
      },
      {} as Record<string, { views: number; uniqueVisitors: Set<string> }>,
    );

    const viewsChart = dateRange.map((date) => ({
      date,
      views: viewsByDate[date]?.views || 0,
      uniqueVisitors: viewsByDate[date]?.uniqueVisitors.size || 0,
    }));

    const clicksByBlock = clickEvents.reduce(
      (acc, event) => {
        if (!event.blockId) return acc;
        if (!acc[event.blockId]) {
          acc[event.blockId] = 0;
        }
        acc[event.blockId]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    const blockIds = Object.keys(clicksByBlock);
    const blocks =
      blockIds.length > 0
        ? await db
            .select()
            .from(profileBlocks)
            .where(eq(profileBlocks.profileId, profileId))
        : [];

    const topLinks = blocks
      .map((block) => {
        const clicks = clicksByBlock[block.id] || 0;
        const clickRate =
          totalViews > 0
            ? parseFloat(((clicks / totalViews) * 100).toFixed(1))
            : 0;
        return {
          id: block.id,
          title: block.label || block.title || "Untitled",
          url: block.url || "",
          clicks,
          clickRate,
        };
      })
      .filter((link) => link.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    const sourceStats = viewEvents.reduce(
      (acc, event) => {
        const source = event.trafficSource || "other";
        if (!acc[source]) {
          acc[source] = 0;
        }
        acc[source]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    const trafficSources = Object.entries(sourceStats)
      .map(([source, views]) => ({
        source,
        views,
        percentage:
          totalViews > 0
            ? parseFloat(((views / totalViews) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.views - a.views);

    const deviceStats = viewEvents.reduce(
      (acc, event) => {
        const device = event.deviceType || "other";
        if (!acc[device]) {
          acc[device] = 0;
        }
        acc[device]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    const devices = Object.entries(deviceStats)
      .map(([type, views]) => ({
        type,
        views,
        percentage:
          totalViews > 0
            ? parseFloat(((views / totalViews) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.views - a.views);

    const countryStats = viewEvents.reduce(
      (acc, event) => {
        const country = event.country || "unknown";
        if (!acc[country]) {
          acc[country] = 0;
        }
        acc[country]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topCountries = Object.entries(countryStats)
      .filter(([country]) => country !== "unknown")
      .map(([country, views]) => ({
        country,
        views,
        percentage:
          totalViews > 0
            ? parseFloat(((views / totalViews) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return c.json({
      overview: {
        totalViews,
        uniqueVisitors,
        totalClicks,
        clickRate,
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
      },
      viewsChart,
      topLinks,
      trafficSources,
      devices,
      topCountries,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

analyticsIndex.post("/events/view", async (c: Context) => {
  try {
    const body = await c.req.json();
    const { profileId, url } = body;

    if (!profileId) {
      return c.json({ error: "profileId is required" }, 400);
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const userAgent = c.req.header("user-agent") || "";
    const referrer =
      c.req.header("referer") || c.req.header("referrer") || null;
    const headers: Record<string, string | undefined> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const clientIp = getClientIp(headers);

    const deviceType = getDeviceType(userAgent);
    const utmParams = url ? extractUtmParams(url) : {};
    const trafficSource = getTrafficSource(referrer, utmParams.utmSource);
    const ipHash = hashIpAddress(clientIp);
    const geolocation = getGeolocation(clientIp);
    const userAgentParsed = parseUserAgent(userAgent);

    const [event] = await db
      .insert(analyticsEvents)
      .values({
        profileId,
        blockId: null,
        eventType: "view",
        utmSource: utmParams.utmSource,
        utmMedium: utmParams.utmMedium,
        utmCampaign: utmParams.utmCampaign,
        utmContent: utmParams.utmContent,
        utmTerm: utmParams.utmTerm,
        referrer: referrer || null,
        trafficSource: trafficSource,
        userAgent,
        userAgentParsed,
        deviceType,
        ipHash,
        country: geolocation.country,
        city: geolocation.city,
      })
      .returning();

    return c.json({ success: true, eventId: event.id }, 201);
  } catch (error) {
    console.error("Error recording view event:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

analyticsIndex.post("/events/click", async (c: Context) => {
  try {
    const body = await c.req.json();
    const { profileId, blockId, url } = body;

    if (!profileId || !blockId) {
      return c.json({ error: "profileId and blockId are required" }, 400);
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const [block] = await db
      .select()
      .from(profileBlocks)
      .where(eq(profileBlocks.id, blockId));

    if (!block) {
      return c.json({ error: "Block not found" }, 404);
    }

    if (block.profileId !== profileId) {
      return c.json({ error: "Block does not belong to profile" }, 400);
    }

    const userAgent = c.req.header("user-agent") || "";
    const referrer =
      c.req.header("referer") || c.req.header("referrer") || null;

    const headers: Record<string, string | undefined> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const clientIp = getClientIp(headers);

    const deviceType = getDeviceType(userAgent);
    const utmParams = url ? extractUtmParams(url) : {};
    const trafficSource = getTrafficSource(referrer, utmParams.utmSource);
    const ipHash = hashIpAddress(clientIp);
    const geolocation = getGeolocation(clientIp);
    const userAgentParsed = parseUserAgent(userAgent);

    const [event] = await db
      .insert(analyticsEvents)
      .values({
        profileId,
        blockId,
        eventType: "click",
        utmSource: utmParams.utmSource,
        utmMedium: utmParams.utmMedium,
        utmCampaign: utmParams.utmCampaign,
        utmContent: utmParams.utmContent,
        utmTerm: utmParams.utmTerm,
        referrer: referrer || null,
        trafficSource: trafficSource,
        userAgent,
        userAgentParsed,
        deviceType,
        ipHash,
        country: geolocation.country,
        city: geolocation.city,
      })
      .returning();

    return c.json({ success: true, eventId: event.id }, 201);
  } catch (error) {
    console.error("Error recording click event:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default analyticsIndex;
