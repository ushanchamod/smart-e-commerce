import { tool, StructuredTool } from "langchain";
import { z } from "zod";
import { db } from "../../../../db";
import { usersTable } from "../../../../db/schema";
import { RunnableConfig } from "@langchain/core/runnables";

// -------------------- Math Tools --------------------

export const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
});

export const subtract = tool(({ a, b }) => a - b, {
  name: "subtract",
  description: "Subtract two numbers",
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
});

export const divide = tool(
  ({ a, b }) => {
    if (b === 0) return "Error: Division by zero is not allowed.";
    return a / b;
  },
  {
    name: "divide",
    description: "Divide two numbers",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  }
);

export const multiply = tool(({ a, b }) => String(a * b), {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
});

// -------------------- DB Tools --------------------

export const getAllUser = tool(
  async (inputs, config: RunnableConfig) => {
    const userId = config.configurable?.user_id;
    const userEmail = config.configurable?.user_email;

    console.log(`🛠️ Creating invoice for User ID: ${userId} (${userEmail})`);

    const users = await db.select().from(usersTable);
    return JSON.stringify(users);
  },
  {
    name: "getAllUser",
    description: "Fetch all users from DB",
    schema: z.object({}),
  }
);

export const getAllProducts = tool(
  async () => {
    const products = [
      {
        id: "1",
        name: "Premium Wireless Headphones",
        // Number or String without '$' symbol
        price: 129.99,
        currency: "$",
        rating: 4.8,
        link: "https://example.com/headphones",
        image:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
        description: "Noise cancelling, 30h battery life.",
      },
      {
        id: "2",
        name: "Mechanical Keyboard",
        price: 89.99,
        currency: "$",
        rating: 4.5,
        link: "https://example.com/keyboard",
        image:
          "https://images.unsplash.com/photo-1587829741301-dc798b91a603?w=500&auto=format&fit=crop&q=60",
        description: "RGB Backlit, Blue Switches.",
      },
      {
        id: "3",
        name: "Ergonomic Mouse",
        price: 49.99,
        currency: "$",
        rating: 4.2,
        image:
          "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=60",
        description: "Wireless, high precision.",
      },
    ];

    // Remember: Must stringify for the Tool Output!
    return JSON.stringify(products);
  },
  {
    name: "get-all-products",
    description: "Fetch the list of available products.",
    schema: z.object({}),
  }
);
