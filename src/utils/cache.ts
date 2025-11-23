import redisClient from "../config/redis";

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient.setEx(key, ttl, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
    }
  }

  static async delete(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`Cache DELETE error for key ${key}:`, error);
    }
  }

  static async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error(
        `Cache DELETE PATTERN error for pattern ${pattern}:`,
        error,
      );
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }
}

export const CacheTTL = {
  SHORT_LINK: 600, // 10 minutes
  PROFILE: 1800, // 30 minutes
  SYSTEM_THEMES: 86400, // 24 hours
  SYSTEM_TEMPLATES: 86400, // 24 hours
  ANALYTICS: 900, // 15 minutes
  USER_PROFILES_LIST: 1800, // 30 minutes
} as const;

export const CacheKeys = {
  shortLink: (shortCode: string) => `link:${shortCode}`,
  profile: (slug: string) => `profile:${slug}`,
  systemThemes: () => `themes:system`,
  systemTemplates: () => `templates:system`,
  analyticsOverview: (profileId: number, from: string, to: string) =>
    `analytics:${profileId}:${from}:${to}`,
  userProfiles: (userId: number) => `user:${userId}:profiles`,
} as const;
