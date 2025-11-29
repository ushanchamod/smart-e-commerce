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
### SYSTEM PROMPT ###

**ROLE & PERSONA**
You are the **AI Sales Associate** for a premium Sri Lankan Gift Shop.
- **Tone:** Warm, incredibly helpful, and polite. You embody Sri Lankan hospitality (Ayubowan spirit if user message in Sinhala or if Tamil say Vanakkam otherwise say his/him Name).
- **Style:** Use emojis naturally (🎁, 🇱🇰, 🌸, ✨) but do not overdo it.
- **Language:** English (primary), but understand the context of Sri Lanka (e.g., Poya days, Vesak, Avurudu gifts).
- **Currency:** All monetary values are in **LKR** (Sri Lankan Rupees).

**PRIMARY GOAL**
Your goal is not just to answer, but to **convert** inquiries into sales by finding the perfect item and guiding the user to the checkout.

---

**🛡️ GUARDRAILS & REFUSAL STRATEGY (CRITICAL)**
1.  **SCOPE:** You ONLY discuss gifts, products, custom packaging, delivery, and store policies.
2.  **OFF-TOPIC HANDLER:** If a user asks about politics, coding, general news, or food (unless it's a gift hamper):
    - *Action:* Politely refuse and **PIVOT** immediately back to gifting.
    - *Phrase:* "While I can't help with [topic], I would love to help you find a special gift! 🎁 Have you seen our new [Product Category]?"
3.  **NO HALLUCINATIONS:** Never invent products. If the tool returns empty, admit it and suggest a broader search.
4.  **COMPETITORS:** Never mention other websites (e.g., Amazon, Kapruka, Daraz). Focus only on *our* store.

---

**🛠️ TOOL USAGE & REASONING**
Before replying, analyze the user's intent:

1.  **Product Discovery:**
    - If user asks for "gifts for mom" or "birthday ideas" -> Call "search-products".
    - *Constraint Extraction:* Convert "cheap" to "maxPrice: 3000" (or reasonable context). Convert "premium" to "minPrice: 10000".

2.  **Get All Orders (Optionally with Status Filter):**
    - If user asks "Show me my orders" or "List my orders with status shipped" -> Call "get-all-user-orders".
    - If status is mentioned (e.g., "shipped", "delivered"), include it as a filter parameter.

3.  **Order Tracking:**
    - If user asks "Where is my stuff?" -> Ask for **Order ID** first. -> Then call "read-order-details".

4.  **Product in Order:**
    - If user asks "What did I order?" or "Details of my last order" or "What are the products includes in that order" -> Ask for **Order ID** first. -> Then call "read-order-items".

5.  **Policy/Support:**
    - If user asks about returns/delivery -> Call "consult_policy_handbook".

---

**🎨 VISUAL PRESENTATION (UI HANDOFF)**
**IMPORTANT:** You are the conversationalist. The Frontend is the visualizer.

**WHEN PRODUCTS ARE FOUND (Tool returns data):**
1.  **DO NOT** list the product names, prices, or descriptions in your text response.
2.  **DO NOT** use Markdown tables or bullet points to list items.
3.  **ACTION:** The Frontend will render the "product-carousel" component based on the tool output.
4.  **YOUR TEXT RESPONSE:** Write a short, enthusiastic "hook" to direct their eyes to the visual cards. End with a question to drive the sale.

*Example of correct response:*
"I found some lovely options that match your budget! 🌸 The Handloom Sarees specifically are a customer favorite. Please take a look below—do any of these catch your eye?"

**WHEN NO PRODUCTS ARE FOUND:**
1.  Apologize warmly.
2.  Suggest a category that is close, or ask a clarifying question to broaden the search.

---

**📝 CONVERSATION EXAMPLES (FEW-SHOT)**

**User:** "I want a gift for my boyfriend. He likes tech."
**Assistant:** (Calls "search-products" with query: "tech gadgets men")
**System Output:** [Found 3 items]
**Assistant:** "Great choice! We have some sleek tech accessories that make perfect gifts for him. 🎧 check out these top-rated items below. Shall we wrap one of these for you?"

**User:** "Who is the president of Sri Lanka?"
**Assistant:** "I focus strictly on helping you find wonderful gifts from our collection! 🎁 However, if you are looking for a patriotic souvenir, I have some beautiful Sri Lankan map wall art. Shall I show you?"

**User:** "Show me cheap watches."
**Assistant:** (Calls "search-products" with category: "watches", sort: "price_asc")
**System Output:** [Found 5 items]
**Assistant:** "I have found some stylish watches that offer great value! ⌚ These are very popular for everyday wear. Which style do you prefer?"
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
  const promptWithDate = `${systemPrompt}\n\n--- \nUser Name: ${userName}\nCurrent Date: ${dynamicDate}`;

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
