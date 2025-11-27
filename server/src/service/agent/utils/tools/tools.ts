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
  ilike,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RunnableConfig } from "@langchain/core/runnables";

const CLIENT_URL = process.env.CORS_ORIGIN_CLIENT || "http://localhost:3000";

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(Number(amount));
};

const embeddings = new OpenAIEmbeddings();

export const getSomeProducts = tool(
  async () => {
    try {
      const products = await db
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
      }));

      return JSON.stringify(productsFormatted);
    } catch (error) {
      return `Error fetching products: ${error}`;
    }
  },
  {
    name: "get-random-product-suggestions",
    description: `
    Fetch 5 RANDOM products from the catalog. 
    Use this tool ONLY when the user asks specifically for:
    - "Show me something interesting"
    - "What do you have?"
    - "Give me some gift ideas" (without specific criteria)
    
    DO NOT use this if the user asks for a specific category like "flowers" (use search-products instead).
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
    Fetch full details for a SINGLE product using its numeric ID.
    
    CRITICAL RULES:
    1. ONLY use this tool if you have an actual 'id' from a previous 'search-products' or 'list-products' result.
    2. DO NOT guess product IDs (e.g., do not try ID 1, 2, 3 arbitrarily).
    3. Use this when the user asks "Tell me more about the red shoes" or clicks a product link.
    `,
    schema: z.object({
      productId: z
        .union([z.string(), z.number()])
        .describe("The unique numeric ID of the product"),
    }),
  }
);

export const searchProducts = tool(
  async (inputs: { query: string; minPrice?: number; maxPrice?: number }) => {
    const { query, minPrice, maxPrice } = inputs;

    if (!query || query.trim() === "") {
      return "Error: Search query cannot be empty.";
    }

    const trimmedQuery = query.trim();
    const searchPattern = `%${trimmedQuery}%`;

    try {
      const searchConditions = or(
        ilike(productsTable.name, searchPattern),
        ilike(productsTable.description, searchPattern),
        ilike(categoriesTable.name, searchPattern)
      );

      const conditions = [searchConditions];
      if (minPrice !== undefined)
        conditions.push(gte(productsTable.price, minPrice.toString()));
      if (maxPrice !== undefined)
        conditions.push(lte(productsTable.price, maxPrice.toString()));

      const scoreCalculation = sql`
        CASE 
          WHEN ${productsTable.name} ILIKE ${searchPattern} THEN 10
          WHEN ${categoriesTable.name} ILIKE ${searchPattern} THEN 5
          ELSE 2
        END
      `;

      const products = await db
        .select({
          id: productsTable.productId,
          name: productsTable.name,
          price: productsTable.price,
          description: productsTable.description,
          image: productsTable.image,
          category: categoriesTable.name,
          score: scoreCalculation.as("relevance_score"),
        })
        .from(productsTable)
        .innerJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.categoryId)
        )
        .where(and(...conditions))
        .orderBy(desc(scoreCalculation))
        .limit(10);

      if (products.length === 0) {
        return "No products found matching that query and price range.";
      }

      const formattedProducts = products.map((p) => ({
        ...p,
        price: formatCurrency(p.price),
        product_path: `${CLIENT_URL}/product/${p.id}`,
      }));

      return JSON.stringify(formattedProducts);
    } catch (error) {
      console.error("Tool Error:", error);
      return "An error occurred while accessing the product database.";
    }
  },
  {
    name: "search-products",
    description: `
    Search for products using natural language keywords (e.g., "birthday gift", "red roses").
    - Handles synonyms and stemming automatically.
    - Supports optional minPrice and maxPrice filters.
    - Returns a ranked list of relevant products.
    `,
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search keywords. Can be a category, name, or description."
        ),
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
    Fetch the list of product categories and the number of available items in each.
    - Use this when the user asks "What do you sell?" or "Show me your collections."
    - Use this to guide the user towards categories that actually have stock.
    `,
    schema: z.object({}),
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
    name: "readOrders",
    description: "Retrieve a list of orders for the authenticated user.",
    schema: z.object({
      orderId: z.string().describe("The unique identifier of the order"),
    }),
  }
);

export const lookupPolicy = tool(
  async ({ query }: { query: string }) => {
    try {
      // 1. Convert user question to vector
      const queryVector = await embeddings.embedQuery(query);

      // 2. Perform Vector Search (Semantic Similarity)
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
        .where(gt(similarity, 0.75)) // Only relevant matches
        .orderBy(desc(similarity))
        .limit(3);

      if (docs.length === 0) return "No specific policy found for this query.";

      // 3. Return the text chunks to the LLM
      return docs.map((d) => d.content).join("\n\n");
    } catch (error) {
      return "Error accessing policy handbook.";
    }
  },
  {
    name: "consult_policy_handbook",
    description: `
    The OFFICIAL knowledge base for company policies (Returns, Delivery, Payments, Privacy).
    
    RULES FOR AI:
    1. Use this tool whenever a user asks about business rules or logistics.
    2. TRUST ONLY the output of this tool. 
    3. IF the tool returns "No specific policy found", DO NOT GUESS. Do not make up a policy based on general e-commerce knowledge. Just say you don't know and suggest contacting support.
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
