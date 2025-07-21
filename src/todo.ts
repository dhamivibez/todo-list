import { eq } from "drizzle-orm";
import Elysia, { status, t } from "elysia";
import { db } from "./db/db";
import { todos, users } from "./db/schema";
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

			const user = await db.query.users.findFirst({
				where: eq(users.id, userId),
			});

			if (!user) {
				throw status(404, "No user found");
			}

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
		async ({ userId, params: { id }, body }) => {
			if (!userId) {
				throw status(400, "User not logged in");
			}

			// Destructure body once and use the destructured values
			const { name, description, status: todoStatus } = body;

			const todo = await db.query.todos.findFirst({
				where: eq(todos.id, id),
				// Only fetch columns necessary for authorization and validation checks
				columns: { userId: true, status: true },
			});

			if (!todo) {
				throw status(404, "Todo not found");
			}

			if (todo.userId !== userId) {
				throw status(403, "You can't edit this todo");
			}

			// Prepare update payload
			const updatePayload: UpdateTodoBody = {};

			// Only add to payload if they are provided in the body and are not empty strings
			if (name !== undefined && name !== "") {
				updatePayload.name = name;
			}

			if (description !== undefined && description !== "") {
				updatePayload.description = description;
			}

			// Validate todoStatus against the allowed enum values
			if (todoStatus !== undefined) {
				const allowedStatuses = ["active", "inactive"]; // Ensure this matches your enum definition
				if (!allowedStatuses.includes(todoStatus)) {
					throw status(422, "Invalid Status value");
				}
				updatePayload.status = todoStatus;
			}

			// If no fields are provided for update, return a specific message or throw an error
			if (Object.keys(updatePayload).length === 0) {
				throw status(422, "No valid fields provided for update.");
			}

			await db
				.update(todos)
				.set(updatePayload) // Use the constructed updatePayload
				.where(eq(todos.id, id));

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
