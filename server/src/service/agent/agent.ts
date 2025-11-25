import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { MessagesState } from "./utils/state";
import { llmCall, toolNode, shouldContinue } from "./utils/nodes";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { pool } from "../../db";

export async function createAgent() {
  const checkpointer = new PostgresSaver(pool);
  await checkpointer.setup();

  return new StateGraph(MessagesState)
    .addNode("llmCall", llmCall)
    .addNode("toolNode", toolNode)
    .addEdge(START, "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
    .addEdge("toolNode", "llmCall")
    .compile({ checkpointer });
}
