import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesState } from "./utils/state";
import { llmCall, toolNode, shouldContinue } from "./utils/nodes";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { pool } from "../../db";

const checkpointer = new PostgresSaver(pool);

const workflow = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall");

let runnable: any = null;

export async function getRunnable() {
  if (!runnable) {
    await checkpointer.setup();
    runnable = workflow.compile({ checkpointer });
  }
  return runnable;
}

export async function getChatHistory(threadId: string) {
  const agent = await getRunnable();

  const config = { configurable: { thread_id: threadId } };

  const state = await agent.getState(config);

  return state.values.messages || [];
}
