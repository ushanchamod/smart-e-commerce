import dotenv from "dotenv";
dotenv.config();

import { OpenAIEmbeddings } from "@langchain/openai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("Missing API_KEY in env");
}

export const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  apiKey: API_KEY,
});

export async function generateProductVector(
  name: string,
  description: string,
  categoryName: string,
  categoryDescription?: string
) {
  const textToEmbed = `
      Product: ${name}
      Category: ${categoryName}
      Description: ${description}
      CategoryDescription: ${categoryDescription || ""}
    `.trim();

  return await embeddings.embedQuery(textToEmbed);
}
