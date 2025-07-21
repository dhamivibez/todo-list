import { eq } from "drizzle-orm";
import Elysia, { status, t } from "elysia";
import { db } from "./db/db";
import { todos } from "./db/schema";
import { authPlugin } from "./plugins/authPlugin";

interface UpdateTodoBody {
	name?: string;
	description?: string;
	status?: "active" | "inactive";
}

export const responseMessage = t.Object({
	success: t.Boolean(),
	message: t.String(),
});

export const todo = new Elysia()
	.use(authPlugin)
	.get(
		"/todo",
		async ({ userId }) => {
			if (!userId) {
				throw status(400, "User not logged in");
			}

			const data = await db
				.select({
					id: todos.id,
					name: todos.name,
					description: todos.description,
					status: todos.status,
				})
				.from(todos)
				.where(eq(todos.userId, userId));

			return { success: true, data, message: "Todos retrieved Successfully" };
		},
		{ authenticated: true },
	)

	.post(
		"/todo",
		async ({ userId, body }) => {
			if (!userId) {
				throw status(400, "User not logged in");
			}

			const { name, description } = body;

			await db.insert(todos).values({ name, userId, description });

			return { success: true, message: "Todo Added Successfully" };
		},
		{
			authenticated: true,
			body: t.Object({
				name: t.String({ error: "Todo Name is required" }),
				description: t.Optional(t.String()),
			}),
			response: {
				200: responseMessage,
				400: responseMessage,
				500: responseMessage,
			},
		},
	)
	.get(
		"/todo/:id",
		async ({ userId, params: { id } }) => {
			if (!userId) {
				throw status(400, "User not logged in");
			}

			const todo = await db.query.todos.findFirst({
				where: eq(todos.id, id),
				columns: {
					name: true,
					userId: true,
					description: true,
					status: true,
				},
			});

			if (!todo) {
				throw status(404, "Todo not found");
			}

			if (todo.userId !== userId) {
				throw status(403, "You can't view this todo");
			}

			return {
				success: true,
				data: {
					name: todo.name,
					description: todo.description,
					status: todo.status,
				},
			};
		},

		{
			authenticated: true,
		},
	)
	.patch(
		"/todos/:id",
		async ({ userId, params: { id }, body, status }) => {
			if (!userId) {
				throw status(400, { success: false, message: "User not logged in" });
			}

			const { name, description, status: todoStatus } = body;

			const todo = await db.query.todos.findFirst({
				where: eq(todos.id, id),
				columns: { userId: true },
			});

			if (!todo) {
				throw status(404, { success: false, message: "Todo not found" });
			}

			if (todo.userId !== userId) {
				throw status(403, {
					success: false,
					message: "You can't edit this todo",
				});
			}

			const updatePayload: UpdateTodoBody = {};

			if (name !== undefined && name !== "") {
				updatePayload.name = name;
			}

			if (description !== undefined && description !== "") {
				updatePayload.description = description;
			}

			if (todoStatus !== undefined) {
				updatePayload.status = todoStatus;
			}

			if (Object.keys(updatePayload).length === 0) {
				throw status(422, {
					success: false,
					message: "No valid fields provided for update.",
				});
			}

			await db.update(todos).set(updatePayload).where(eq(todos.id, id));

			return {
				success: true,
				message: "Todo updated successfully",
			};
		},
		{
			body: t.Object({
				name: t.Optional(t.String()),
				description: t.Optional(t.String()),
				status: t.Optional(t.Enum({ active: "active", inactive: "inactive" })),
			}),
			authenticated: true,

			response: {
				200: responseMessage,
				400: responseMessage,
				403: responseMessage,
				404: responseMessage,
				422: responseMessage,
				500: responseMessage,
			},
		},
	)
	.delete(
		"/todos/:id",
		async ({ userId, params: { id } }) => {
			// Corrected destructuring
			if (!userId) {
				throw status(400, "User not logged in");
			}

			// 1. Find the todo to ensure it exists and belongs to the user
			const todo = await db.query.todos.findFirst({
				where: eq(todos.id, id),
				columns: { userId: true }, // Only need userId for authorization
			});

			if (!todo) {
				throw status(404, "Todo not found");
			}

			// 2. Authorization check: Ensure the user owns the todo
			if (todo.userId !== userId) {
				throw status(403, "You can't delete this todo"); // Forbidden
			}

			// 3. Perform the delete operation
			await db.delete(todos).where(eq(todos.id, id));

			return {
				success: true,
				message: "Todo deleted successfully",
			};
		},
		{
			authenticated: true,
		},
	);
