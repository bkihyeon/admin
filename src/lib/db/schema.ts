import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type {
  DutyAssignment,
  OfficeFreeEmployees,
  RecyclingWeek,
  RevealState,
} from "@/lib/types";

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

export const duties = pgTable(
  "duties",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    officeId: text("office_id"),
    // 같은 (month, office)의 재뽑기마다 1씩 증가. 이전 버전은 삭제되지 않고 쌓임 (append-only).
    version: integer("version").notNull().default(1),
    assignments: jsonb("assignments").$type<DutyAssignment[]>().notNull(),
    freeEmployee: jsonb("free_employee").$type<OfficeFreeEmployees | null>(),
    revealState: jsonb("reveal_state")
      .$type<RevealState[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("duties_month_office_version_unique")
      .on(t.month, t.officeId, t.version)
      .nullsNotDistinct(),
    index("duties_month_idx").on(t.month),
    index("duties_office_idx").on(t.officeId),
  ]
);

export const recyclingState = pgTable("recycling_state", {
  id: integer("id").primaryKey().default(1),
  currentIndex: integer("current_index").notNull().default(0),
  schedule: jsonb("schedule").$type<RecyclingWeek[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
