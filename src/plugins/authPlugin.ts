import Elysia, { status } from "elysia";
import { jwtPlugin } from "./jwtPlugin";

export const authPlugin = new Elysia().use(jwtPlugin).macro({
	authenticated: {
		async resolve({ jwt, cookie: { auth_token } }) {
			const authToken = auth_token.value;

			if (!authToken) {
				throw status(400, "User not logged in");
			}

			const payload = await jwt.verify(authToken);

			if (!payload) {
				throw status(400, "Session Expired.");
			}

			const { sub } = payload;

			return { userId: sub };
		},
	},
});
