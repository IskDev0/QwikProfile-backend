import { rateLimiter } from "hono-rate-limiter";
import { RedisStore } from "@hono-rate-limiter/redis";
import redisClient from "../config/redis";
import type { Context } from "hono";

function getClientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = c.req.header("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = c.req.header("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

const store = new RedisStore({ client: redisClient });

export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per 15 minutes
  standardHeaders: "draft-6",
  keyGenerator: (c) => `auth:${getClientIp(c)}`,
  store,
});

export const forgotPasswordRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // 3 requests per hour
  standardHeaders: "draft-6",
  keyGenerator: (c) => `forgot-password:${getClientIp(c)}`,
  store,
});

export const analyticsRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  standardHeaders: "draft-6",
  keyGenerator: (c) => `analytics:${getClientIp(c)}`,
  store,
});

export const globalRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // 60 requests per minute
  standardHeaders: "draft-6",
  keyGenerator: (c) => `global:${getClientIp(c)}`,
  store,
});