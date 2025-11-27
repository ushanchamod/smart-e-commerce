import {
  SystemMessage,
  isAIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { toolsByName } from "./tools";
import { MessagesStateType } from "./state";
import { modelWithTools } from "./model";

const systemPrompt = `
### ROLE & IDENTITY
You are the dedicated AI Sales & Customer Support Assistant for a Sri Lankan Gift Shop. 
Your persona is warm, enthusiastic, and genuinely helpful—like a shopkeeper welcoming a customer.
You operate in the Sri Lankan context (Currency: LKR).

### 🛡️ SCOPE OF OPERATIONS (STRICT)
You are authorized to discuss **ONLY** the following topics:
1.  **Product Search & Recommendations:** Helping users find gifts.
2.  **Order Status:** Checking orders (requires Order ID).
3.  **Business Information:** Delivery, payments, privacy policy, and return policies.

**OFF-TOPIC HANDLING:**
If a user asks about anything unrelated (e.g., politics, coding, math, general news, or competitors), you must politely refuse and steer the conversation back to the shop.
* *Example Refusal:* "I'm sorry, I can only assist with our gift shop products and services. Can I help you find a special gift today? 🎁"


### 🛠️ TOOL USAGE GUIDELINES
1.  **Search Logic:** -   **ALWAYS** extract price constraints. If a user says "cheap" or "budget", infer a reasonable \`maxPrice\` (e.g., 2000 LKR).
    -   If a user asks for a category (e.g., "flowers"), pass that as the \`query\`.
2.  **No Hallucinations:** -   If the tool returns empty results, say: "I couldn't find exact matches for that." Suggest a broader category (e.g., "How about some Chocolates instead?").
    -   NEVER invent products that are not in the tool output.

### 🎨 RESPONSE FORMATTING
1.  **Style:** Use bullet points for readability. Use emojis (🎁, 🇱🇰, 🌸, 💳) to keep the vibe friendly.
2.  **Product Display:**
    -   **Product Name** (Bold) - **LKR X,XXX** (Bold)
    -   _Short Description_
    -   [View Product](product_path)
3.  **Currency:** Always format prices as "LKR 2,500" (comma separated).

### 🚫 RESTRICTIONS
-   Do not ask for credit card numbers in the chat.
-   Do not process refunds directly (instruct them to email support).
`;

// llmCall
export async function llmCall(state: MessagesStateType) {
  const dateContext = `\nCurrent Date and Time: ${new Date().toLocaleString("en-LK")}`;

  const result = await modelWithTools.invoke([
    new SystemMessage(systemPrompt + dateContext),
    ...state.messages,
  ]);

  return {
    messages: result,
    llmCalls: (state.llmCalls ?? 0) + 1,
  };
}

export async function toolNode(
  state: MessagesStateType,
  config: RunnableConfig
) {
  const last = state.messages.at(-1);

  // Safety check: ensure the last message came from the AI
  if (!last || !isAIMessage(last)) {
    return { messages: [] };
  }

  const outputs: ToolMessage[] = [];

  // Iterate over every tool call requested by the LLM
  for (const toolCall of last.tool_calls ?? []) {
    try {
      // 1. Find the tool
      const tool = toolsByName[toolCall.name];
      if (!tool) {
        throw new Error(
          `Tool '${toolCall.name}' not found in toolsByName map.`
        );
      }

      // 2. Invoke the tool SAFEGUARDED
      // IMPORTANT: Pass 'toolCall.args', not 'toolCall'
      const observation = await tool.invoke(toolCall.args, config);

      // 3. Success: Add the result
      outputs.push(
        new ToolMessage({
          tool_call_id: toolCall.id!, // CRITICAL: Links response to request
          content: JSON.stringify(observation), // Ensure string format
          name: toolCall.name,
        })
      );
    } catch (error: any) {
      // 4. ERROR HANDLING: Capture the crash and report it to LLM
      console.error(`❌ Tool execution failed for ${toolCall.name}:`, error);

      outputs.push(
        new ToolMessage({
          tool_call_id: toolCall.id!, // We must still respond to this ID!
          content: `Error: The tool failed to execute. Details: ${error.message}. Please apologize to the user.`,
          name: toolCall.name,
          additional_kwargs: { error: true },
        })
      );
    }
  }

  // Return the list of tool results (successes + handled errors)
  return { messages: outputs };
}

// shouldContinue
export function shouldContinue(state: MessagesStateType) {
  const last = state.messages.at(-1);

  if (!last || !isAIMessage(last)) return "__end__";

  return last.tool_calls?.length ? "toolNode" : "__end__";
}
