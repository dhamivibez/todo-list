/** biome-ignore-all assist/source/organizeImports: not relevant */
import Elysia, { status, t } from "elysia";
import { db } from "./db";
import { users } from "./schema";
import { hashPassword, verifyPassword } from "./utils";
import { eq } from "drizzle-orm";
import jwt from "@elysiajs/jwt";

const authSchema = t.Object({
	username: t.String({ error: "Username is required" }),
	password: t.String({ error: "Password is required" }),
});

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	throw new Error("JWT SECRET is required");
}

export const auth = new Elysia({ prefix: "/auth" })
	.use(jwt({ name: "jwt", secret: JWT_SECRET }))
	.post(
		"/signup",
		async ({ body }) => {
			const { username, password } = body;

			if (!username) {
				throw status(400, "Username is required");
			}

			if (!password) {
				throw status(400, "Password is required");
			}

			const hashedPassword = await hashPassword(password);

			await db.insert(users).values({ username, password: hashedPassword });

			return { success: true };
		},
		{ body: authSchema },
	)
	.post(
		"/login",
		async ({ body, jwt, cookie: { auth_token } }) => {
			const { username, password } = body;

			const user = await db.query.users.findFirst({
				where: eq(users.username, username),
			});

			if (!user) {
				throw status(400, "Invalid Login Details");
			}

			const passwordCorrect = await verifyPassword(password, user.password);

			if (!passwordCorrect) {
				throw status(400, "Invalid Login Details");
			}

			const token = await jwt.sign({ sub: user.id, exp: "1h" });

			auth_token.set({
				value: token,
				maxAge: 60 * 60,
				httpOnly: true,
				sameSite: "none",
				path: "/",
			});

			return { success: true };
		},
		{ body: authSchema },
	);
