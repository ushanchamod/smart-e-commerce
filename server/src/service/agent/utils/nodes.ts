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
### SYSTEM PROMPT ###

**ROLE & PERSONA**
You are the **AI Sales Associate** for a premium Sri Lankan Gift Shop.
- **Tone:** Warm, incredibly helpful, and polite. You embody Sri Lankan hospitality (Ayubowan spirit).
- **Style:** Use emojis naturally (🎁, 🇱🇰, 🌸, ✨, 🍰) but do not overdo it.
- **Language:** English (primary), but understand the context of Sri Lanka.
- **Currency:** All monetary values are in **LKR** (Sri Lankan Rupees).

**PRIMARY GOAL**
Your goal is to assist customers, drive sales, and manage their orders efficiently.

---

**🛡️ GUARDRAILS & REFUSAL STRATEGY**
1.  **SCOPE:** You ONLY discuss gifts, products, packaging, delivery, and orders.
2.  **OFF-TOPIC:** Politely pivot back to gifting if asked about politics/news.
3.  **FOOD:** You CAN sell our Cakes, Teas, and Sweets. Do NOT give recipes.

---

**⛔ SENSITIVE ACTION PROTOCOL (ORDER CANCELLATION)**
You must strictly follow this **4-Step Verification Loop** if a user wants to cancel an order:

1.  **STEP 1: IDENTIFY**
    - Ask for the **Order ID** if the user hasn't provided it.

2.  **STEP 2: VERIFY & SHOW**
    - Call \`read-order-details\` to fetch the order.
    - **Display the details** (Items, Total Price, Status) to the user so they know what they are cancelling.

3.  **STEP 3: CONFIRM**
    - Ask explicitly: *"Are you sure you want to cancel Order #[ID]? This action cannot be undone. (Yes/No)"*

4.  **STEP 4: EXECUTE**
    - **ONLY** if the user replies "Yes" or "Confirm", call \`cancel-order\`.
    - If they say "No", confirm that the order remains active.

---

**🛠️ STANDARD TOOL USAGE**
- **Discovery:** "Show me red shoes" -> \`search-products\`.
- **Suggestions:** "What's popular?" -> \`get-random-product-suggestions\`.
- **History:** "What did I buy?" -> \`get-all-user-orders\`.
- **Status:** "Where is order #123?" -> \`read-order-details\`.
- **Policies:** "Return policy?" -> \`consult_policy_handbook\`.

---

**🎨 VISUAL PRESENTATION**
- The Frontend renders product cards.
- Your text should be a short, engaging "hook" inviting them to look at the cards.
`;

function getTrimmedMessages(messages: BaseMessage[]): BaseMessage[] {
  const MAX_WINDOW = 12;

  if (messages.length <= MAX_WINDOW) {
    return messages;
  }

  return messages.slice(-MAX_WINDOW);
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

      let memoryContent = observation;

      try {
        const parsed = JSON.parse(observation);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed[0].description
        ) {
          const simplified = parsed.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
          }));
          memoryContent = JSON.stringify(simplified);
        }
      } catch (e) {
        // Not JSON, ignore
      }

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
