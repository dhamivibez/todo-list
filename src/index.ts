import swagger from "@elysiajs/swagger";
import { Elysia, status } from "elysia";
import { auth } from "./auth";
import { todo } from "./todo";

export const app = new Elysia()
	.onError(({ code, error }) => {
		if (typeof code === "number") {
			return status(code, { suucess: false, message: error.response });
		}
	})
	.use(
		swagger({
			path: "/docs",
			documentation: { info: { title: "Todo List", version: "1.0.0" } },
		}),
	)
	.get("/", () => "A todo list app")
	.use(auth)
	.use(todo)
	.listen(3000);
