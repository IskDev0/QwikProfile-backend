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
    themeId: uuid("theme_id").references(() => themes.id, {
      onDelete: "set null",
    }),
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
      themeIdIdx: index("profiles_theme_id_idx").on(table.themeId),
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

export const utmTemplates = pgTable(
  "utm_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    platform: text("platform").notNull(),
    icon: text("icon"),
    defaultParams: jsonb("default_params").notNull().$type<UtmParams>(),
    isSystem: boolean("is_system").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    {
      platformIdx: index("utm_templates_platform_idx").on(table.platform),
      isSystemIdx: index("utm_templates_is_system_idx").on(table.isSystem),
    },
  ],
);

export const userUtmTemplates = pgTable(
  "user_utm_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon"),
    params: jsonb("params").notNull().$type<UtmParams>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    {
      userIdIdx: index("user_utm_templates_user_id_idx").on(table.userId),
    },
  ],
);

export const utmLinks = pgTable(
  "utm_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    utmParams: jsonb("utm_params").notNull().$type<UtmParams>(),
    templateId: uuid("template_id"),
    templateType: text("template_type", { enum: ["system", "user"] }),
    shortCode: text("short_code").unique(),
    fullUrl: text("full_url").notNull(),
    clicks: integer("clicks").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("utm_links_user_id_idx").on(table.userId),
    index("utm_links_profile_id_idx").on(table.profileId),
    index("utm_links_short_code_idx").on(table.shortCode),
    uniqueIndex("utm_links_short_code_unique_idx").on(table.shortCode),
  ],
);

export const themes = pgTable(
  "themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    previewImageUrl: text("preview_image_url"),
    config: jsonb("config").notNull().$type<ThemeConfig>(),
    isSystem: boolean("is_system").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    {
      nameIdx: uniqueIndex("themes_name_idx").on(table.name),
      isSystemIdx: index("themes_is_system_idx").on(table.isSystem),
    },
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  profiles: many(profiles),
  userUtmTemplates: many(userUtmTemplates),
  utmLinks: many(utmLinks),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  themeRelation: one(themes, {
    fields: [profiles.themeId],
    references: [themes.id],
  }),
  blocks: many(profileBlocks),
  analyticsEvents: many(analyticsEvents),
  utmLinks: many(utmLinks),
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

export const userUtmTemplatesRelations = relations(
  userUtmTemplates,
  ({ one }) => ({
    user: one(users, {
      fields: [userUtmTemplates.userId],
      references: [users.id],
    }),
  }),
);

export const utmLinksRelations = relations(utmLinks, ({ one }) => ({
  user: one(users, {
    fields: [utmLinks.userId],
    references: [users.id],
  }),
  profile: one(profiles, {
    fields: [utmLinks.profileId],
    references: [profiles.id],
  }),
}));

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

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface ThemeBackgroundSolid {
  type: "solid";
  value: string;
}

export interface ThemeBackgroundGradient {
  type: "gradient";
  gradient: {
    from: string;
    to: string;
    direction: string;
  };
}

export interface ThemeBackgroundImage {
  type: "image";
  imageUrl: string;
}

export type ThemeBackground =
  | ThemeBackgroundSolid
  | ThemeBackgroundGradient
  | ThemeBackgroundImage;

export interface BlockStyle {
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  fontWeight?: string;
  padding?: string;
  hoverEffect?: "scale" | "shadow" | "glow" | "none";
}

export interface LinkStyleOverrides {
  default?: Partial<BlockStyle>;
  outline?: Partial<BlockStyle>;
  shadow?: Partial<BlockStyle>;
}

export interface ThemeConfig {
  profile: {
    background: ThemeBackground;
    textColor: string;
    accentColor: string;
    fontFamily: string;
  };
  avatar: {
    borderWidth: string;
    borderColor: string;
    shape: "circle" | "rounded" | "square";
    shadow: "none" | "sm" | "md" | "lg" | "xl";
  };
  defaultBlockStyles: {
    borderRadius: string;
    padding: string;
    backgroundColor: string;
    textColor: string;
  };
  blockOverrides?: {
    link?: LinkStyleOverrides;
    header?: Partial<BlockStyle>;
    text?: Partial<BlockStyle>;
    [blockType: string]: Partial<BlockStyle> | LinkStyleOverrides | undefined;
  };
  spacing: {
    blockGap: string;
    containerPadding: string;
    maxWidth: string;
  };
}

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ProfileBlock = typeof profileBlocks.$inferSelect;
export type NewProfileBlock = typeof profileBlocks.$inferInsert;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

export type UtmTemplate = typeof utmTemplates.$inferSelect;
export type NewUtmTemplate = typeof utmTemplates.$inferInsert;

export type UserUtmTemplate = typeof userUtmTemplates.$inferSelect;
export type NewUserUtmTemplate = typeof userUtmTemplates.$inferInsert;

export type UtmLink = typeof utmLinks.$inferSelect;
export type NewUtmLink = typeof utmLinks.$inferInsert;

export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;
