import dotenv from "dotenv";
dotenv.config();

import { db } from "../db";
import { documentsTable } from "../db/schema";
import { eq, isNull } from "drizzle-orm";
import { OpenAIEmbeddings } from "@langchain/openai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("Missing API_KEY in env");
}

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  apiKey: API_KEY,
});

async function generatePolicyEmbeddings() {
  console.log("Starting Policy Document Embedding...");

  const docs = await db
    .select()
    .from(documentsTable)
    .where(isNull(documentsTable.embedding));

  console.log(`Found ${docs.length} documents to process.`);

  if (docs.length === 0) {
    console.log("DONE All documents are already embedded. No action needed.");
    process.exit(0);
  }

  for (const doc of docs) {
    try {
      console.log(`Processing Document ID ${doc.id}...`);

      const vector = await embeddings.embedQuery(doc.content);

      await db
        .update(documentsTable)
        .set({ embedding: vector })
        .where(eq(documentsTable.id, doc.id));

      console.log(`DONE Embedded Document ID ${doc.id}`);
    } catch (error) {
      console.error(`!!! Failed to embed Document ID ${doc.id}:`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log("🎉 Policy embedding generation complete!");
  process.exit(0);
}

generatePolicyEmbeddings();
