import {
  bigserial,
  boolean,
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
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    {
      emailIdx: uniqueIndex("users_email_idx").on(table.email),
      usernameIdx: uniqueIndex("users_username_idx").on(table.username),
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

export const profileViews = pgTable(
  "profile_views",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    viewedAt: timestamp("viewed_at").defaultNow(),
  },
  (table) => [
    {
      profileIdIdx: index("profile_views_profile_id_idx").on(table.profileId),
      viewedAtIdx: index("profile_views_viewed_at_idx").on(table.viewedAt),
    },
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
  views: many(profileViews),
}));

export const profileBlocksRelations = relations(profileBlocks, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileBlocks.profileId],
    references: [profiles.id],
  }),
}));

export const profileViewsRelations = relations(profileViews, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileViews.profileId],
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ProfileBlock = typeof profileBlocks.$inferSelect;
export type NewProfileBlock = typeof profileBlocks.$inferInsert;

export type ProfileView = typeof profileViews.$inferSelect;
export type NewProfileView = typeof profileViews.$inferInsert;
