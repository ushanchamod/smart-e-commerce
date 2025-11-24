import { StructuredTool } from "langchain";
import {
  add,
  divide,
  getAllProducts,
  getAllUser,
  multiply,
  subtract,
} from "./tools";

export const tools = [
  add,
  subtract,
  divide,
  multiply,
  getAllUser,
  getAllProducts,
];

export const toolsByName: Record<string, StructuredTool> = Object.fromEntries(
  tools.map((t) => [t.name, t])
);
