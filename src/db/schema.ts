import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const shares = pgTable("shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  targetUrl: text("target_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Share = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;
