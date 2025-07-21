import { jwt } from "@elysiajs/jwt";
import Elysia from "elysia";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	throw new Error("JWT SECRET is required");
}

export const jwtPlugin = new Elysia().use(
	jwt({ name: "jwt", secret: JWT_SECRET }),
);
