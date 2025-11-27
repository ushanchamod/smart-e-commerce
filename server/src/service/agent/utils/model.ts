import { ChatOpenAI } from "@langchain/openai";
import { tools } from "./tools";

import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("Missing API_KEY in env");
}

export const model = new ChatOpenAI({
  temperature: 0,
  modelName: "gpt-4o-mini",
  apiKey: API_KEY.trim(),
  streaming: true,
  timeout: 120000,
});

export const modelWithTools = model.bindTools(tools);
