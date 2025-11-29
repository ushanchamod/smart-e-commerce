import dotenv from "dotenv";
dotenv.config();
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../../../../db";
import {
  categoriesTable,
  documentsTable,
  orderItemsTable,
  ordersTable,
  productsTable,
} from "../../../../db/schema";
import {
  and,
  cosineDistance,
  count,
  desc,
  eq,
  gt,
  gte,
  ne,
  ilike,
  inArray,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { RunnableConfig } from "@langchain/core/runnables";
import { embeddings } from "../../../embeddingService";

const CLIENT_URL = process.env.CORS_ORIGIN_CLIENT || "http://localhost:3000";

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(Number(amount));
};

function getSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

export const getSomeProducts = tool(
  async (_input, config: RunnableConfig) => {
    try {
      const userId = config.configurable?.user_id;
      let recommendedProducts: any[] = [];

      if (userId) {
        const pastPurchases = await db
          .select({
            productId: orderItemsTable.productId,
            categoryId: productsTable.categoryId,
          })
          .from(orderItemsTable)
          .innerJoin(
            ordersTable,
            eq(orderItemsTable.orderId, ordersTable.orderId)
          )
          .innerJoin(
            productsTable,
            eq(orderItemsTable.productId, productsTable.productId)
          )
          .where(eq(ordersTable.userId, Number(userId)));

        if (pastPurchases.length > 0) {
          const boughtProductIds = pastPurchases.map((p) => p.productId);
          const preferredCategoryIds = [
            ...new Set(pastPurchases.map((p) => p.categoryId)),
          ];

          recommendedProducts = await db
            .select({
              id: productsTable.productId,
              name: productsTable.name,
              price: productsTable.price,
              description: productsTable.description,
              image: productsTable.image,
              category: categoriesTable.name,
            })
            .from(productsTable)
            .innerJoin(
              categoriesTable,
              eq(productsTable.categoryId, categoriesTable.categoryId)
            )
            .where(
              and(
                inArray(productsTable.categoryId, preferredCategoryIds),
                notInArray(productsTable.productId, boughtProductIds)
              )
            )
            .orderBy(sql`RANDOM()`)
            .limit(5);
        }
      }

      const products =
        recommendedProducts.length > 0
          ? recommendedProducts
          : await db
              .select({
                id: productsTable.productId,
                name: productsTable.name,
                price: productsTable.price,
                description: productsTable.description,
                image: productsTable.image,
                category: categoriesTable.name,
              })
              .from(productsTable)
              .innerJoin(
                categoriesTable,
                eq(productsTable.categoryId, categoriesTable.categoryId)
              )
              .orderBy(sql`RANDOM()`)
              .limit(5);

      const productsFormatted = products.map((product) => ({
        ...product,
        price: formatCurrency(product.price),
        product_path: `${CLIENT_URL}/product/${product.id}`,
        suggestion_type:
          recommendedProducts.length > 0
            ? "Personalized based on history"
            : "Popular/Random selection",
      }));

      return JSON.stringify(productsFormatted);
    } catch (error) {
      console.error("Tool Error (getSomeProducts):", error);
      return `Error fetching products: ${error}`;
    }
  },
  {
    name: "get-random-product-suggestions",
    description: `
    USE CASE: Open-ended discovery / Window shopping.
    TRIGGER: User asks "Show me something interesting", "What do you recommend?", or "Give me gift ideas" WITHOUT specific criteria.
    
    BEHAVIOR:
    - If the user is logged in, this tool automatically prioritizes items matching their past purchase history.
    - If they are a guest, it returns a random selection of popular items.
    
    RESTRICTIONS:
    - DO NOT use if the user specifies a category (e.g., "flowers"), color, or price. Use 'search-products' for those.
    `,
    schema: z.object({}),
  }
);

export const getSpecificProduct = tool(
  async (inputs: { productId: string }) => {
    try {
      const rawId = inputs.productId.toString().trim();
      const id = parseInt(rawId);

      if (isNaN(id)) {
        return "Error: Invalid Product ID. The ID must be a numeric value.";
      }

      const product = await db
        .select({
          id: productsTable.productId,
          name: productsTable.name,
          price: productsTable.price,
          description: productsTable.description,
          image: productsTable.image,
          category: categoriesTable.name,
        })
        .from(productsTable)
        .innerJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.categoryId)
        )
        .where(eq(productsTable.productId, id))
        .limit(1)
        .then((res) => res[0] ?? null);

      if (!product) {
        return `Product with ID ${id} not found. It may have been removed or the ID is incorrect.`;
      }

      const productFormatted = {
        ...product,
        price: formatCurrency(product.price),
        product_path: `${CLIENT_URL}/product/${product.id}`,
      };

      return JSON.stringify(productFormatted);
    } catch (error) {
      return `Error fetching product: ${error}`;
    }
  },
  {
    name: "get-product-details",
    description: `
    USE CASE: Fetching full details for a SPECIFIC product by its ID.
    TRIGGER: User clicks a product link or asks "Tell me more about the red shoes" (where you already know the ID from context).
    
    CRITICAL RULES:
    1. You MUST have a valid numeric 'productId' from a previous search result.
    2. DO NOT GUESS IDs. If you don't know the ID, use 'search-products' to find it first.
    `,
    schema: z.object({
      productId: z
        .union([z.string(), z.number()])
        .describe("The unique numeric ID of the product"),
    }),
  }
);

export const searchProducts = tool(
  async (inputs: {
    query: string;
    minPrice?: number;
    maxPrice?: number;
    category?: string;
  }) => {
    const { query, minPrice, maxPrice, category } = inputs;

    if (!query || query.trim() === "") {
      return "Error: Search query cannot be empty.";
    }

    try {
      const queryVector = await embeddings.embedQuery(query.trim());
      const similarity = sql<number>`1 - (${cosineDistance(
        productsTable.embedding,
        queryVector
      )})`;

      const conditions = [];
      conditions.push(gt(similarity, 0.3));

      // 2. Price Filters
      if (minPrice !== undefined) {
        conditions.push(gte(productsTable.price, minPrice.toString()));
      }
      if (maxPrice !== undefined) {
        conditions.push(lte(productsTable.price, maxPrice.toString()));
      }

      let resolvedCategory: string | null = null;

      if (category) {
        const allCategories = await db
          .select({ name: categoriesTable.name })
          .from(categoriesTable);

        let bestMatch = null;
        let highestScore = 0;

        for (const cat of allCategories) {
          const score = getSimilarity(category, cat.name);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = cat.name;
          }
        }

        if (bestMatch && highestScore > 0.6) {
          console.log(
            `Category Normalization: "${category}" -> "${bestMatch}" (Score: ${highestScore.toFixed(2)})`
          );
          conditions.push(eq(categoriesTable.name, bestMatch));
          resolvedCategory = bestMatch;
        } else {
          console.log(
            `!!! Category "${category}" not found in DB. Dropping filter to rely on Vector Search.`
          );
        }
      }

      // 4. Execute Main Search
      const products = await db
        .select({
          id: productsTable.productId,
          name: productsTable.name,
          price: productsTable.price,
          description: productsTable.description,
          image: productsTable.image,
          category: categoriesTable.name,
          score: similarity,
        })
        .from(productsTable)
        .innerJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.categoryId)
        )
        .where(and(...conditions))
        .orderBy(desc(similarity))
        .limit(8);

      if (products.length === 0) {
        console.log(
          "⚠️ Vector search yielded 0 results, attempting hybrid text fallback..."
        );

        const textConditions = [
          or(
            ilike(productsTable.name, `%${query}%`),
            ilike(categoriesTable.name, `%${query}%`)
          ),
        ];

        if (maxPrice)
          textConditions.push(lte(productsTable.price, maxPrice.toString()));

        if (resolvedCategory) {
          textConditions.push(eq(categoriesTable.name, resolvedCategory));
        }

        const fallbackProducts = await db
          .select({
            id: productsTable.productId,
            name: productsTable.name,
            price: productsTable.price,
            category: categoriesTable.name,
          })
          .from(productsTable)
          .innerJoin(
            categoriesTable,
            eq(productsTable.categoryId, categoriesTable.categoryId)
          )
          .where(and(...textConditions))
          .limit(5);

        if (fallbackProducts.length === 0) {
          return "No products found matching that query and price range.";
        }

        const formattedFallback = fallbackProducts.map((p) => ({
          ...p,
          price: formatCurrency(p.price),
          product_path: `${CLIENT_URL}/product/${p.id}`,
          match_type: "keyword_fallback",
        }));

        return JSON.stringify(formattedFallback);
      }

      const formattedProducts = products.map((p) => ({
        ...p,
        price: formatCurrency(p.price),
        product_path: `${CLIENT_URL}/product/${p.id}`,
        relevance: Math.round((p.score as number) * 100) + "%",
      }));

      return JSON.stringify(formattedProducts);
    } catch (error) {
      console.error("Tool Error (Vector Search):", error);
      return "An error occurred while performing product search.";
    }
  },
  {
    name: "search-products",
    description: `USE CASE: Search with specific criteria (keywords, category, price).`,
    schema: z.object({
      query: z.string().describe("The user's search intent keywords."),
      category: z
        .string()
        .optional()
        .describe("Target category name (e.g. 'Clothing', 'Electronics')"),
      minPrice: z.number().optional().describe("Minimum price filter (LKR)"),
      maxPrice: z.number().optional().describe("Maximum price filter (LKR)"),
    }),
  }
);

export const getAllCategories = tool(
  async () => {
    try {
      const categories = await db
        .select({
          id: categoriesTable.categoryId,
          name: categoriesTable.name,
          description: categoriesTable.description,
          productCount: count(productsTable.productId),
        })
        .from(categoriesTable)
        .leftJoin(
          productsTable,
          eq(categoriesTable.categoryId, productsTable.categoryId)
        )
        .groupBy(
          categoriesTable.categoryId,
          categoriesTable.name,
          categoriesTable.description
        )
        .orderBy(categoriesTable.name);

      const formattedCategories = categories.map((c) => ({
        name: c.name,
        description: c.description,
        total_items: Number(c.productCount),
      }));

      return JSON.stringify(formattedCategories);
    } catch (error) {
      console.error("Tool Error (getAllCategories):", error);
      return "Error fetching category list.";
    }
  },
  {
    name: "get-all-categories",
    description: `
    USE CASE: Fetch a list of all product departments/collections.
    TRIGGER: User asks "What do you sell?", "Show me your collections", or "Do you have electronics?".
    `,
    schema: z.object({}),
  }
);

export const getAllOrders = tool(
  async (params, runOpts: RunnableConfig) => {
    const userId = runOpts.configurable?.user_id;
    if (!userId) {
      return "Error: User not authenticated. Cannot access orders.";
    }
    try {
      const orders = await db
        .select({
          orderId: ordersTable.orderId,
          address: ordersTable.address,
          totalAmount: ordersTable.totalAmount,
          paymentMethod: ordersTable.paymentMethod,
          status: ordersTable.status,
          createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.userId, Number(userId)),
            params.status ? eq(ordersTable.status, params.status) : undefined
          )
        )
        .orderBy(desc(ordersTable.createdAt));
      return JSON.stringify(orders);
    } catch (error) {
      console.error("Tool Error (getAllOrders):", error);
      return "An error occurred while accessing the order database.";
    }
  },
  {
    name: "get-all-user-orders",
    description: `
    USE CASE: Retrieve all orders placed by the authenticated user.
    TRIGGER: User asks "Show my orders" or "What orders have I placed?".
    `,
    schema: z.object({
      status: z
        .enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"])
        .optional()
        .describe("Optional filter to retrieve orders by their status"),
    }),
  }
);

export const readOrders = tool(
  async (params, runOpts: RunnableConfig) => {
    const userId = runOpts.configurable?.user_id;
    const { orderId } = params;

    if (!userId) {
      return "Error: User not authenticated. Cannot access orders.";
    }

    if (!orderId) {
      return "Error: Order ID cannot be empty.";
    }

    try {
      const order = await db
        .select({
          orderId: ordersTable.orderId,
          address: ordersTable.address,
          totalAmount: ordersTable.totalAmount,
          paymentMethod: ordersTable.paymentMethod,
          status: ordersTable.status,
          createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
        .leftJoin(
          orderItemsTable,
          eq(ordersTable.orderId, orderItemsTable.orderId)
        )
        .where(
          and(
            eq(ordersTable.userId, Number(userId)),
            eq(ordersTable.orderId, Number(orderId))
          )
        )
        .groupBy(ordersTable.orderId);
      if (order.length === 0) {
        return `Order with ID ${orderId} not found for this user.`;
      }

      return JSON.stringify(order[0]);
    } catch (error) {
      console.error("Tool Error (readOrders):", error);
      return "An error occurred while accessing the order database.";
    }
  },
  {
    name: "read-order-details",
    description: `
    USE CASE: Check the status of a specific order.
    
    MANDATORY REQUIREMENT:
    - You MUST provide a specific 'orderId'.
    - If the user asks "Show my orders" WITHOUT providing an ID, DO NOT call this tool. Instead, reply asking for the Order ID.
    `,
    schema: z.object({
      orderId: z.string().describe("The unique identifier of the order"),
    }),
  }
);

export const productsIncludedInOrder = tool(
  async (params, runOpts: RunnableConfig) => {
    const userId = runOpts.configurable?.user_id;
    const { orderId } = params;

    if (!userId) {
      return "Error: User not authenticated. Cannot access order items.";
    }

    if (!orderId) {
      return "Error: Order ID cannot be empty.";
    }

    try {
      const items = await db
        .select({
          productId: productsTable.productId,
          name: productsTable.name,
          price: productsTable.price,
          quantity: orderItemsTable.quantity,
          image: productsTable.image,
        })
        .from(orderItemsTable)
        .innerJoin(
          ordersTable,
          eq(orderItemsTable.orderId, ordersTable.orderId)
        )
        .innerJoin(
          productsTable,
          eq(orderItemsTable.productId, productsTable.productId)
        )
        .where(
          and(
            eq(ordersTable.userId, Number(userId)),
            eq(ordersTable.orderId, Number(orderId))
          )
        );

      return JSON.stringify(items);
    } catch (error) {
      console.error("Tool Error (productsIncusedInOrder):", error);
      return "An error occurred while accessing the order items database.";
    }
  },
  {
    name: "read-order-items",
    description: `
    USE CASE: Retrieve the list of products included in a specific order.
    
    MANDATORY REQUIREMENT:
    - You MUST provide a specific 'orderId'.
    - If the user asks "Show my orders" WITHOUT providing an ID, DO NOT call this tool. Instead, reply asking for the Order ID.
    `,
    schema: z.object({
      orderId: z.string().describe("The unique identifier of the order"),
    }),
  }
);

export const cancelOrder = tool(
  async (params, runOpts: RunnableConfig) => {
    const userId = runOpts.configurable?.user_id;
    const { orderId } = params;

    if (!userId) {
      return "Error: User not authenticated. Cannot cancel orders.";
    }

    if (!orderId) {
      return "Error: Order ID cannot be empty.";
    }
    try {
      const order = await db
        .select()
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.userId, Number(userId)),
            eq(ordersTable.orderId, Number(orderId))
          )
        );
      if (order.length === 0) {
        return `Order with ID ${orderId} not found for this user.`;
      }

      if (order[0].status === "CANCELLED") {
        return `Order with ID ${orderId} is already cancelled.`;
      }

      if (order[0].status === "SHIPPED" || order[0].status === "DELIVERED") {
        return `Order with ID ${orderId} cannot be cancelled as it is already ${order[0].status.toLowerCase()}.`;
      }

      const result = await db
        .update(ordersTable)

        .set({ status: "CANCELLED" })
        .where(
          and(
            eq(ordersTable.userId, Number(userId)),
            eq(ordersTable.orderId, Number(orderId)),
            ne(ordersTable.status, "CANCELLED")
          )
        )
        .returning();

      if (result.length === 0) {
        return `Order with ID ${orderId} could not be cancelled. It may not exist, belong to you, or is already cancelled.`;
      }

      return `Order with ID ${orderId} has been successfully cancelled.`;
    } catch (error) {
      console.error("Tool Error (cancelOrder):", error);
      return "An error occurred while attempting to cancel the order.";
    }
  },
  {
    name: "cancel-order",
    description: `
    USE CASE: Cancel a specific order placed by the user.
    TRIGGER: User asks "I want to cancel my order #1234".
    
    CRITICAL RULES:
    1. You MUST provide a valid 'orderId'.
    2. Only orders that are not already cancelled can be cancelled.
    `,
    schema: z.object({
      orderId: z
        .string()
        .describe("The unique identifier of the order to cancel"),
    }),
  }
);

export const lookupPolicy = tool(
  async ({ query }: { query: string }) => {
    try {
      const queryVector = await embeddings.embedQuery(query);

      const similarity = sql<number>`1 - (${cosineDistance(
        documentsTable.embedding,
        queryVector
      )})`;

      const docs = await db
        .select({
          content: documentsTable.content,
          similarity: similarity,
        })
        .from(documentsTable)
        .where(gt(similarity, 0.75))
        .orderBy(desc(similarity))
        .limit(3);

      if (docs.length === 0) return "No specific policy found for this query.";

      return docs.map((d) => d.content).join("\n\n");
    } catch (error) {
      return "Error accessing policy handbook.";
    }
  },
  {
    name: "consult_policy_handbook",
    description: `
    USE CASE: Retrieve official business policies (Shipping, Returns, Privacy, Payments).
    TRIGGER: User asks "How do I return?", "Is it safe?", "Delivery time?".
    
    RESTRICTIONS:
    - Treat this tool as the single source of truth for rules.
    - If this tool returns "No policy found", admit you don't know. Do not hallucinate policies.
    `,
    schema: z.object({
      query: z
        .string()
        .describe(
          "The specific policy question, e.g., 'How do I return an item?'"
        ),
    }),
  }
);
