import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { MessagesState } from "./utils/state";
import { llmCall, toolNode, shouldContinue } from "./utils/nodes";

const checkpointer = new MemorySaver();

export const agent = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile({ checkpointer });
