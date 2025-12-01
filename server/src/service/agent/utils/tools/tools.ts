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
            .where(inArray(productsTable.categoryId, preferredCategoryIds))
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
    USE WHEN:
    - The user asks for broad, open-ended discovery.
    - Examples: “Show me something nice”, “Any recommendations?”, “Gift ideas?”

    BEHAVIOR:
    - If the customer is logged in, return items related to their past purchases.
    - If not logged in, return a selection of popular/random products.
    `,
    schema: z.object({}),
  }
);

export const getSpecificProduct = tool(
  async (inputs: { productId: string }) => {
    console.log(inputs);

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
      USE WHEN:
      - You already know the product's ID (e.g., from previous search results).
      - The user asks: “Tell me more about [product name]” and that product has an ID.
  
      CRITICAL RULES:
      - YOU MUST provide a valid numeric productId.
      - DO NOT guess IDs.
      - If you don't know the ID → run 'search-products' first.
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

      if (minPrice !== undefined) {
        conditions.push(gte(productsTable.price, minPrice.toString()));
      }
      if (maxPrice !== undefined) {
        conditions.push(lte(productsTable.price, maxPrice.toString()));
      }

      if (category) {
        const categoryMatch = await db
          .select({ name: categoriesTable.name })
          .from(categoriesTable)
          .where(ilike(categoriesTable.name, category))
          .limit(1);

        if (categoryMatch.length > 0) {
          console.log(`Category Filter Applied: ${categoryMatch[0].name}`);
          conditions.push(eq(categoriesTable.name, categoryMatch[0].name));
        } else {
          console.log(
            `Category "${category}" not strictly found. Relying on Vector Search to find relevant items.`
          );
        }
      }

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

        if (category) {
          textConditions.push(ilike(categoriesTable.name, `%${category}%`));
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
    description: `
    USE WHEN:
    - The user specifies ANY search criteria: keywords, category, or price.
    `,
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
      USE WHEN:
      - The user asks: “What do you have?”, “Show me your categories”, “What do you sell?”
  
      DO NOT USE WHEN:
      - The user is looking for specific items or keywords. → Use 'search-products'.
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
      USE WHEN:
      - The user asks: “Show my orders”, “What have I ordered?”, “My order history”.
  
      RULES:
      - The user must be authenticated (user_id available).
      - Optional: Filter by status if the user specifies one.
  
      DO NOT USE FOR:
      - Fetching single order details → Use 'read-order-details'.
      - Cancelling orders → Use 'cancel-order'.
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
      USE ONLY WHEN:
      - The user provides a specific, numeric Order ID.
      - Example: “Where is order #1234?”
  
      RULES:
      - If the user does NOT provide an order ID → Ask them for it.
      - Do not guess or assume order IDs.
  
      DO NOT USE WHEN:
      - The query is general (“show my orders”). → Use 'get-all-user-orders'.
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
      USE WHEN:
      - The user asks what was inside a specific order.
      - Example: “What items were in order #493?”
  
      RULES:
      - A valid orderId is required.
      - Do not assume IDs.
  
      DO NOT USE WHEN:
      - The user wants order status → Use 'read-order-details'.
      - The user wants all orders → Use 'get-all-user-orders'.
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
      USE ONLY WHEN:
      - The user explicitly confirms cancellation AND
      - They provided a specific Order ID.
  
      MUST FOLLOW 4-STEP CANCELLATION PROTOCOL:
      1. User expresses intent → You ask for Order ID (if missing).
      2. Call 'read-order-details' and show the order summary.
      3. Ask: “Are you sure you want to cancel Order #[ID]? (Yes/No)”
      4. If user says Yes → Call 'cancel-order'. If No → Do NOT call.
  
      DO NOT CALL:
      - Without explicit confirmation.
      - For shipped or delivered orders (tool will block, but you must warn user).
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
      console.log(`🔍 Policy Lookup: "${query}"`);

      const queryVector = await embeddings.embedQuery(query);
      const similarity = sql<number>`1 - (${cosineDistance(
        documentsTable.embedding,
        queryVector
      )})`;

      let docs = await db
        .select({
          content: documentsTable.content,
          metadata: documentsTable.metadata,
          score: similarity,
        })
        .from(documentsTable)
        .where(gt(similarity, 0.5))
        .orderBy(desc(similarity))
        .limit(3);

      if (docs.length === 0) {
        console.log(
          "⚠️ Policy Vector Match Failed. Attempting Keyword Fallback..."
        );

        docs = await db
          .select({
            content: documentsTable.content,
            metadata: documentsTable.metadata,
            score: sql<number>`0`,
          })
          .from(documentsTable)
          .where(ilike(documentsTable.content, `%${query}%`))
          .limit(3);
      }

      console.log(`📄 Found ${docs.length} policy matches.`);

      if (docs.length === 0) return "No specific policy found for this query.";

      return docs
        .map((d) => {
          let topic = "General";
          try {
            if (d.metadata) {
              const parsed = JSON.parse(d.metadata as string);
              if (parsed.topic) topic = parsed.topic;
            }
          } catch (e) {
            // Ignore JSON errors
          }
          return `[POLICY: ${topic.toUpperCase()}]\n${d.content}`;
        })
        .join("\n\n---\n\n");
    } catch (error) {
      console.error("Policy Lookup Error:", error);
      return "Error accessing policy handbook.";
    }
  },
  {
    name: "consult_policy_handbook",
    description: `
      USE WHEN:
      - User asks anything related to:
        - Shipping / Delivery
        - Returns / Refunds
        - Payments
        - Order issues
        - Privacy or support topics
  
      BEHAVIOR:
      - Retrieves official policy text from the internal handbook.
      - Never paraphrase unless necessary.
  
      DO NOT USE WHEN:
      - The question is about product details → Use product tools.
      `,
    schema: z.object({
      query: z
        .string()
        .describe("The specific keyword (e.g. 'delivery', 'return')."),
    }),
  }
);
