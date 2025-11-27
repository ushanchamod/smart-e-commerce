import { StructuredTool } from "langchain";
import {
  getAllCategories,
  getSomeProducts,
  getSpecificProduct,
  lookupPolicy,
  readOrders,
  searchProducts,
} from "./tools";

export const tools = [
  getSomeProducts,
  getSpecificProduct,
  searchProducts,
  getAllCategories,
  lookupPolicy,
  readOrders,
];

export const toolsByName: Record<string, StructuredTool> = Object.fromEntries(
  tools.map((t) => [t.name, t])
);
