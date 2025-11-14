import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    resetToken: text("reset_token"),
    resetTokenExpiry: timestamp("reset_token_expiry"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    {
      emailIdx: uniqueIndex("users_email_idx").on(table.email),
    },
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title"),
    bio: text("bio"),
    avatarUrl: text("avatar_url").default(""),
    theme: text("theme").default("default"),
    isPublished: boolean("is_published").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    {
      slugIdx: uniqueIndex("profiles_slug_idx").on(table.slug),
      userIdIdx: index("profiles_user_id_idx").on(table.userId),
      isPublishedIdx: index("profiles_is_published_idx").on(table.isPublished),
    },
  ],
);

export const profileBlocks = pgTable(
  "profile_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "link", "text", "header"
    config: jsonb("config").notNull().$type<BlockConfig>(),
    position: integer("position").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    {
      profileIdIdx: index("profile_blocks_profile_id_idx").on(table.profileId),
      positionIdx: index("profile_blocks_position_idx").on(table.position),
    },
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    blockId: uuid("block_id").references(() => profileBlocks.id, {
      onDelete: "cascade",
    }),
    eventType: text("event_type", { enum: ["view", "click"] }).notNull(),

    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),

    referrer: text("referrer"),
    trafficSource: text("traffic_source"), // 'instagram', 'tiktok', 'twitter', 'direct', 'etc'

    userAgent: text("user_agent"),
    userAgentParsed: jsonb("user_agent_parsed").$type<UserAgentParsed>(),
    deviceType: text("device_type", { enum: ["mobile", "desktop", "tablet"] }),
    ipHash: char("ip_hash", { length: 64 }).notNull(),

    country: text("country"),
    city: text("city"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("analytics_events_profile_created_idx").on(
      table.profileId,
      table.createdAt,
    ),
    index("analytics_events_block_idx").on(table.blockId),
    index("analytics_events_event_type_idx").on(table.eventType),
    index("analytics_events_utm_campaign_idx").on(table.utmCampaign),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  profiles: many(profiles),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  blocks: many(profileBlocks),
  analyticsEvents: many(analyticsEvents),
}));

export const profileBlocksRelations = relations(
  profileBlocks,
  ({ one, many }) => ({
    profile: one(profiles, {
      fields: [profileBlocks.profileId],
      references: [profiles.id],
    }),
    analyticsEvents: many(analyticsEvents),
  }),
);

export const analyticsEventsRelations = relations(
  analyticsEvents,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [analyticsEvents.profileId],
      references: [profiles.id],
    }),
    block: one(profileBlocks, {
      fields: [analyticsEvents.blockId],
      references: [profileBlocks.id],
    }),
  }),
);

export type BlockConfig = LinkBlockConfig | TextBlockConfig | HeaderBlockConfig;

export interface LinkBlockConfig {
  url: string;
  title: string;
  icon?: string;
  style?: "default" | "outline" | "shadow";
}

export interface TextBlockConfig {
  content: string;
  alignment?: "left" | "center" | "right";
  fontSize?: "small" | "medium" | "large";
}

export interface HeaderBlockConfig {
  text: string;
  level?: 1 | 2 | 3;
  alignment?: "left" | "center" | "right";
}

export interface UserAgentParsed {
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
}

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ProfileBlock = typeof profileBlocks.$inferSelect;
export type NewProfileBlock = typeof profileBlocks.$inferInsert;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
