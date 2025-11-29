import { StructuredTool } from "langchain";
import {
  getAllCategories,
  getAllOrders,
  getSomeProducts,
  getSpecificProduct,
  lookupPolicy,
  productsIncludedInOrder,
  readOrders,
  searchProducts,
} from "./tools";

export const tools = [
  getSomeProducts,
  getSpecificProduct,
  searchProducts,
  getAllCategories,
  lookupPolicy,
  getAllOrders,
  readOrders,
  productsIncludedInOrder,
];

export const toolsByName: Record<string, StructuredTool> = Object.fromEntries(
  tools.map((t) => [t.name, t])
);
