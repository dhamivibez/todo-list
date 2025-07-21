import { drizzle } from "drizzle-orm/node-postgres";
import { todos, users, todoStatusEnum } from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error("Database URL is required");
}

export const db = drizzle(DATABASE_URL, {
	schema: { users, todos, todoStatusEnum },
});
