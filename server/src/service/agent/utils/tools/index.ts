import { StructuredTool } from "langchain";
import {
  getAllCategories,
  getSomeProducts,
  getSpecificProduct,
  lookupPolicy,
  searchProducts,
} from "./tools";

export const tools = [
  getSomeProducts,
  getSpecificProduct,
  searchProducts,
  getAllCategories,
  lookupPolicy,
];

export const toolsByName: Record<string, StructuredTool> = Object.fromEntries(
  tools.map((t) => [t.name, t])
);
