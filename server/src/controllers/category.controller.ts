import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares";
import { createCategorySchemaType } from "../validators/category.dto";
import { JWTPayloadType } from "../dto";
import { sendError } from "../utils";
import { db } from "../db";
import { categoriesTable } from "../db/schema";

export const CreateCategory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { role } = req.user as JWTPayloadType;
  const { name, description } = <createCategorySchemaType>req.body;

  if (role !== "ADMIN") {
    return sendError(res, "You are not authorized to create a category", 403);
  }

  try {
    const newCategory = await db
      .insert(categoriesTable)
      .values({
        name,
        description,
      })
      .returning();

    if (newCategory.length === 0) {
      return sendError(res, "Failed to create category", 500);
    }
    return res.status(201).json(newCategory[0]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      return sendError(res, "Category with this name already exists", 400);
    }
    return sendError(res, "Failed to create category", 500);
  }
};
