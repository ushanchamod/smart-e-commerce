import {
  SystemMessage,
  isAIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { toolsByName } from "./tools";
import { MessagesStateType } from "./state";
import { modelWithTools } from "./model";

// llmCall
export async function llmCall(state: MessagesStateType) {
  const result = await modelWithTools.invoke([
    new SystemMessage("You are a helpful assistant..."),
    ...state.messages,
  ]);

  return {
    messages: result,
    llmCalls: (state.llmCalls ?? 0) + 1,
  };
}

// toolNode
export async function toolNode(
  state: MessagesStateType,
  config: RunnableConfig
) {
  const last = state.messages.at(-1);

  if (!last || !isAIMessage(last)) {
    return { messages: [] };
  }

  const outputs: ToolMessage[] = [];

  for (const toolCall of last.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    const observation = await tool.invoke(toolCall, config);
    outputs.push(observation);
  }

  return { messages: outputs };
}

// shouldContinue
export function shouldContinue(state: MessagesStateType) {
  const last = state.messages.at(-1);

  if (!last || !isAIMessage(last)) return "__end__";

  return last.tool_calls?.length ? "toolNode" : "__end__";
}
