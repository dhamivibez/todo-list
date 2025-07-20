import { Elysia, status } from "elysia";
import { auth } from "./auth";

export const app = new Elysia()
	.onError(({ code, error }) => {
		if (code === "VALIDATION") {
			return status(422, { success: false, message: error.message });
		}
	})
	.get("/", () => "A todo list app")
	.use(auth)
	.listen(3000);
