import {
  SystemMessage,
  isAIMessage,
  ToolMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { toolsByName } from "./tools";
import { MessagesStateType } from "./state";
import { modelWithTools } from "./model";

const MAX_LOOPS = 6;

const systemPrompt = `
You are the AI Sales Associate for a premium Sri Lankan Gift Shop.

TONE:
- Warm, polite, concise, helpful — embody Sri Lankan hospitality.
- Use emojis sparingly and naturally (🎁✨🌸🇱🇰🍰).

LANGUAGE:
- English only.
- All prices must be displayed in LKR.

PRIMARY DOMAIN:
- You ONLY discuss: gifts, products, recommendations, packaging, delivery, orders, and store policies.
- If users go off-topic (politics, news, religion, personal advice), gently redirect back to gifting.

FOOD RULE:
- You may sell cakes, sweets, teas, and snacks.
- You must NOT give recipes or cooking instructions.

DATA & MEMORY (CRITICAL):
- You have access to detailed product information (ingredients, dimensions, descriptions) in the tool outputs. 
- IF a user asks for specific details about a product you just found (e.g., "Does it contain nuts?", "How big is it?"), CHECK the tool output history and answer accurately. Do not say you don't know if the data is there.

ORDER CANCELLATION PROTOCOL (Mandatory):
1. Ask for Order ID if missing.
2. Call 'read-order-details' with that ID and show the summary.
3. Ask: “Are you sure you want to cancel Order #[ID]? (Yes/No)”
4. Only if the user says “Yes” → call 'cancel-order'. Otherwise, keep the order active.

TOOL USAGE:
- Always choose the specific tool matching user intent.
- Never guess product IDs or order IDs.
- Ask a clarifying question only when required to pick the correct tool.
- Never fabricate data; tools are the source of truth.

RESPONSE STYLE:
- Keep messages short, friendly, and sales-oriented.
- When presenting a list of products, keep the text brief and inviting (hook the user).
- HOWEVER, if the user specifically asks for details (ingredients, size, material), provide the full details from your memory.

`;

function getTrimmedMessages(messages: BaseMessage[]): BaseMessage[] {
  const MAX_WINDOW = 50;

  if (messages.length <= MAX_WINDOW) {
    return messages;
  }

  const sliced = messages.slice(-MAX_WINDOW);

  let startIndex = 0;
  while (
    startIndex < sliced.length &&
    sliced[startIndex] instanceof ToolMessage
  ) {
    startIndex++;
  }

  if (startIndex >= sliced.length) {
    let lastHumanIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].getType() === "human") {
        lastHumanIndex = i;
        break;
      }
    }
    if (lastHumanIndex !== -1) {
      return messages.slice(lastHumanIndex);
    }
    return sliced;
  }

  return sliced.slice(startIndex);
}

export async function llmCall(
  state: MessagesStateType,
  config: RunnableConfig
) {
  const currentCalls = state.llmCalls ?? 0;

  console.log(`🧠 Processing Step. Loop Count: ${currentCalls}/${MAX_LOOPS}`);

  if (currentCalls > MAX_LOOPS) {
    console.log("⚠️ Max loops hit, returning error.");
    return {
      messages: [
        {
          role: "assistant",
          content:
            "I apologize, but I'm having trouble retrieving the information. Could you please rephrase your request?",
        },
      ],
      llmCalls: currentCalls,
    };
  }

  const dynamicDate = new Date().toLocaleDateString("en-LK");
  const cfg = config as RunnableConfig & { context?: { userName?: string } };
  const userName = cfg.context?.userName || "Valued Customer";
  const promptWithDate = `
  ${systemPrompt}

  ---
  **CURRENT CONTEXT**
  - **User Name:** ${userName}
  - **Current Date:** ${dynamicDate}
  `;

  const recentMessages = getTrimmedMessages(state.messages);
  console.log(`🧠 Context Size: ${recentMessages.length} messages`);

  const result = await modelWithTools.invoke(
    [new SystemMessage(promptWithDate), ...recentMessages],
    config
  );

  return {
    messages: [result],
    llmCalls: currentCalls + 1,
  };
}

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
    try {
      const tool = toolsByName[toolCall.name];
      if (!tool) throw new Error(`Tool not found`);

      const observation = await tool.invoke(toolCall.args, config);

      const memoryContent = observation;

      outputs.push(
        new ToolMessage({
          tool_call_id: toolCall.id!,
          content: memoryContent,
          name: toolCall.name,
        })
      );
    } catch (error: any) {
      console.error(`Tool execution failed for ${toolCall.name}:`, error);

      outputs.push(
        new ToolMessage({
          tool_call_id: toolCall.id!,
          content: `Error: The tool failed to execute. Details: ${error.message}. Please apologize to the user.`,
          name: toolCall.name,
          additional_kwargs: { error: true },
        })
      );
    }
  }
  return { messages: outputs };
}

// shouldContinue
export function shouldContinue(state: MessagesStateType) {
  const last = state.messages.at(-1);
  const calls = state.llmCalls ?? 0;

  if (calls > MAX_LOOPS) return "__end__";

  if (!last || !isAIMessage(last)) return "__end__";

  return last.tool_calls?.length ? "toolNode" : "__end__";
}
