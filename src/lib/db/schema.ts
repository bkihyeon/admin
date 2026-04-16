import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { DutyAssignment, OfficeFreeEmployees, RecyclingWeek } from "@/lib/types";

export const offices = pgTable("offices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  officeId: text("office_id").references(() => offices.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dutyItems = pgTable("duty_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  requiredCount: integer("required_count").notNull(),
  officeId: text("office_id").references(() => offices.id, {
    onDelete: "set null",
  }),
});

export const duties = pgTable("duties", {
  id: text("id").primaryKey(),
  month: text("month").notNull().unique(),
  assignments: jsonb("assignments").$type<DutyAssignment[]>().notNull(),
  freeEmployees: jsonb("free_employees")
    .$type<OfficeFreeEmployees[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const recyclingState = pgTable("recycling_state", {
  id: integer("id").primaryKey().default(1),
  currentIndex: integer("current_index").notNull().default(0),
  schedule: jsonb("schedule").$type<RecyclingWeek[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
