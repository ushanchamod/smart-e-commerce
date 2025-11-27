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

const MAX_LOOPS = 4;

const systemPrompt = `
### 🤖 IDENTITY & PERSONA
You are the **AI Sales Associate** for a premium Sri Lankan Gift Shop.
- **Tone:** Warm, welcoming, and polite (Sri Lankan hospitality). Use emojis (🎁, 🇱🇰, 🌸) naturally.
- **Context:** Currency is **LKR** (Sri Lankan Rupees).
- **Goal:** Help users find the perfect gift and complete their purchase journey comfortably.

### 🛡️ SCOPE & GUARDRAILS (CRITICAL)
1. **GIFT SHOP ONLY:** You strictly ONLY discuss gifts, products, orders, and store policies.
2. **REFUSAL STRATEGY:** If a user asks about food ("I'm hungry"), coding, general knowledge, or politics:
   - **Do NOT** answer the question.
   - **Politely PIVOT** back to gifts. 
   - *Example:* "I can't help with lunch, but I can help you find a delicious **Gourmet Gift Hamper**! 🍬 Shall we look at those?"
3. **NO HALLUCINATION:** If a tool returns **no products**, admit it. Do not invent items.

---

### 🧠 REASONING & TOOL STRATEGY
1. **ANALYZE INTENT:** - Specific criteria? -> \`search-products\`
   - "Returns" or "Delivery"? -> \`consult_policy_handbook\`
   - "Show me anything"? -> \`get-random-product-suggestions\`
   - "Where is my order"? -> Ask for **Order ID** -> \`readOrders\`

2. **EXTRACT CONSTRAINTS:**
   - **Price:** Convert "cheap", "budget", or "under 5000" to numeric \`maxPrice\`.
   - **Keywords:** Strip filler words. "Gift for my wife" -> "romantic gift for her".

### 🎨 VISUAL PRESENTATION RULES
**Your Frontend handles the UI. You handle the conversation.**

**IF PRODUCTS ARE FOUND:**
1. **STOP:** Do not describe the products in text.
2. **ACTION:** The frontend will automatically render a **Visual Carousel**.
3. **RESPONSE:** Write a short, exciting hook to direct their attention to the cards.
   - *Good:* "I've found some beautiful options for you! 🎁 The red watch below is very popular. Which one do you like?"
   - *Bad:* "Here is a Red Watch for LKR 5000..."

**IF NO PRODUCTS ARE FOUND:**
1. Apologize warmly.
2. Suggest a broader category or ask for different criteria.

### 📦 FORMATTING
- Use **Bold** for emphasis.
- Keep responses concise; do not wall of text.
`;

function getTrimmedMessages(messages: BaseMessage[]): BaseMessage[] {
  // 1. Always keep the very first message if it's the System Prompt (usually it's not in state.messages array in LangGraph but passed separately)
  // But in your previous code, you manually added SystemMessage inside llmCall.

  // 2. Define Max Window Size (e.g., last 12 messages)
  const MAX_WINDOW = 12;

  if (messages.length <= MAX_WINDOW) {
    return messages;
  }

  // 3. Slice to get the last N messages
  return messages.slice(-MAX_WINDOW);
}

export async function llmCall(
  state: MessagesStateType,
  config: RunnableConfig
) {
  const currentCalls = state.llmCalls ?? 0;

  // FIX: Log this FIRST so we can see if the limit is hitting
  console.log(`🧠 Processing Step. Loop Count: ${currentCalls}/${MAX_LOOPS}`);

  // 1. Loop Limit Check
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

  // 2. Date & Memory Logic
  const dynamicDate = new Date().toLocaleDateString("en-LK");
  const promptWithDate = `${systemPrompt}\n\n--- \nCurrent Date: ${dynamicDate}`;

  // Use the trimming logic we added previously
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

  // Safety check: ensure the last message came from the AI
  if (!last || !isAIMessage(last)) {
    return { messages: [] };
  }

  const outputs: ToolMessage[] = [];

  // Iterate over every tool call requested by the LLM
  for (const toolCall of last.tool_calls ?? []) {
    try {
      const tool = toolsByName[toolCall.name];
      if (!tool) throw new Error(`Tool not found`);

      // 1. Invoke Tool
      // The tool returns a JSON string of the products
      const observation = await tool.invoke(toolCall.args, config);

      // 2. COMPRESS FOR MEMORY (New Logic)
      // If the output is a huge JSON array, we strip it down for the LLM's memory
      // The Frontend still received the full event via 'on_tool_end' in server.ts
      let memoryContent = observation;

      try {
        const parsed = JSON.parse(observation);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed[0].description
        ) {
          // It's a product list. Simplify it for the LLM to save tokens.
          const simplified = parsed.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            // We remove 'image', 'description' to save massive space in DB
          }));
          memoryContent = JSON.stringify(simplified);
        }
      } catch (e) {
        // If parsing fails, just use original
      }

      outputs.push(
        new ToolMessage({
          tool_call_id: toolCall.id!,
          content: memoryContent, // Save the SMALLER version to DB
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
  const calls = state.llmCalls ?? 0;

  if (calls > MAX_LOOPS) return "__end__";

  if (!last || !isAIMessage(last)) return "__end__";

  return last.tool_calls?.length ? "toolNode" : "__end__";
}
