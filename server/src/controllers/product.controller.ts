import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares";
import { JWTPayloadType } from "../dto";
import { sendError, sendSuccess } from "../utils";
import { db } from "../db";
import { categoriesTable, productsTable } from "../db/schema";
import { createProductSchemaType } from "../validators/product.dto";
import { desc, eq, ilike, or, sql } from "drizzle-orm";

export const CreateProduct = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { role } = req.user as JWTPayloadType;
  const { name, price, description, image, categoryId } = <
    createProductSchemaType
  >req.body;

  if (role !== "ADMIN") {
    return sendError(res, "You are not authorized to create a product", 403);
  }

  const existingCategory = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.categoryId, parseInt(categoryId)));

  if (existingCategory.length === 0) {
    return sendError(res, "Category does not exist", 400);
  }

  try {
    const result = await db
      .insert(productsTable)
      .values({
        name,
        price: price.toString(),
        description,
        image,
        categoryId: parseInt(categoryId),
      })
      .returning();

    if (result.length === 0) {
      return sendError(res, "Failed to create product", 500);
    }

    return sendSuccess(res, result[0], "Product created successfully", 201);
  } catch (error) {
    return sendError(res, "Failed to create product", 500);
  }
};

export const GetAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await db
      .select({
        id: productsTable.productId,
        name: productsTable.name,
        price: productsTable.price,
        description: productsTable.description,
        images: productsTable.image,
        category: categoriesTable.name,
        categoryId: productsTable.categoryId,
      })
      .from(productsTable)
      .innerJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.categoryId)
      );
    return sendSuccess(res, products, "Products retrieved successfully");
  } catch (error) {
    return sendError(res, "Failed to retrieve products", 500);
  }
};

export const GetProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const product = await db
      .select({
        id: productsTable.productId,
        name: productsTable.name,
        price: productsTable.price,
        description: productsTable.description,
        images: productsTable.image,
        category: categoriesTable.name,
        categoryId: productsTable.categoryId,
      })
      .from(productsTable)
      .innerJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.categoryId)
      )
      .where(eq(productsTable.productId, parseInt(id)));
    if (product.length === 0) {
      return sendError(res, "Product not found", 404);
    }
    return sendSuccess(
      res,
      { ...product[0], inventory: 200 },
      "Product retrieved successfully"
    );
  } catch (error) {
    return sendError(res, "Failed to retrieve product", 500);
  }
};

export const SearchProducts = async (req: Request, res: Response) => {
  const rawQuery = req.params.query;

  if (!rawQuery || rawQuery.trim().length === 0) {
    return res.status(400).json({ error: "Search query cannot be empty" });
  }

  const query = rawQuery.trim();
  const searchPattern = `%${query}%`;

  const scoreCalculation = sql`
      CASE 
        WHEN ${productsTable.name} ILIKE ${searchPattern} THEN 10
        WHEN ${categoriesTable.name} ILIKE ${searchPattern} THEN 5
        ELSE 2
      END
  `;

  try {
    const products = await db
      .select({
        id: productsTable.productId,
        name: productsTable.name,
        price: productsTable.price,
        description: productsTable.description,
        category: categoriesTable.name,
        score: scoreCalculation.as("relevance_score"),
      })
      .from(productsTable)
      .innerJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.categoryId)
      )
      .where(
        or(
          ilike(productsTable.name, searchPattern),
          ilike(productsTable.description, searchPattern),
          ilike(categoriesTable.name, searchPattern)
        )
      )
      .orderBy(desc(scoreCalculation))
      .limit(10);

    return sendSuccess(res, products, "Products retrieved successfully");
  } catch (error) {
    console.error("Search Error:", error);
    return sendError(res, "Failed to retrieve products", 500);
  }
};
