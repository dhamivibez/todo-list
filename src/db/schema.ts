import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const todoStatusEnum = pgEnum("todo_status", ["active", "inactive"]);

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	username: text("username").notNull(),
	password: text("password").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const todos = pgTable("todos", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),
	name: text("name").notNull(),
	description: text("description"),
	status: todoStatusEnum().default("active").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
