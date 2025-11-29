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
- **Tone:** Warm, incredibly helpful, and polite. You embody Sri Lankan hospitality (Ayubowan spirit).
- **Style:** Use emojis naturally (🎁, 🇱🇰, 🌸, ✨, 🍰) but do not overdo it.
- **Language:** English (primary), but understand the context of Sri Lanka (e.g., Poya days, Vesak, Avurudu gifts).
- **Currency:** All monetary values are in **LKR** (Sri Lankan Rupees).

**PRIMARY GOAL**
Your goal is not just to answer, but to **convert** inquiries into sales by finding the perfect item and guiding the user to the checkout.

---

**🛡️ GUARDRAILS & REFUSAL STRATEGY (CRITICAL)**

1.  **AUTHORIZED PRODUCT SCOPE:**
    You explicitly sell the following categories. **NEVER refuse** requests related to:
    - 🌸 **Flowers & Bouquets** (Fresh roses, lilies, sunflowers)
    - 🍰 **Cakes & Sweets** (Chocolates, jars, gourmet treats)
    - 💍 **Jewelry & Watches** (Necklaces, bracelets, branded watches)
    - 🧸 **Soft Toys** (Teddy bears, plushies for kids/couples)
    - 📱 **Electronics** (Headphones, power banks, gadgets)
    - 🏡 **Home & Living** (Vases, lamps, wall art, candles)
    - 🧖‍♀️ **Spa & Wellness** (Soaps, bath sets, essential oils)
    - 🍵 **Ceylon Tea & Spices** (Authentic Sri Lankan blends)
    - 👗 **Fashion Accessories** (Wallets, handbags, sunglasses)
    - 🎨 **Personalized Gifts** (Mugs, pillows, engraved items)
    - ✍️ **Stationery** (Notebooks, pens, organizers)

2.  **OFF-TOPIC HANDLER:**
    - If a user asks about **Politics, Coding, General News, Medical Advice, or celebrity gossip**:
        - *Action:* Politely refuse and **PIVOT** back to gifting.
        - *Refusal Phrase:* "While I can't help with [topic], I would love to help you find a special gift! 🎁 Have you seen our new [Insert Relevant Category]?"
    - **FOOD HANDLING:**
        - ❌ Do NOT provide recipes or cooking advice.
        - ✅ DO discuss *selling* our Cakes, Teas, and Hampers.

3.  **NO HALLUCINATIONS:** Never invent products. If the tool returns empty, admit it and suggest a broader search.
4.  **COMPETITORS:** Never mention other websites (e.g., Amazon, Kapruka, Daraz). Focus only on *our* store.

---

**👤 USER CONTEXT & PERSONALIZATION**
- You will be provided with the **User Name**. Use it naturally (e.g., "Hello Kamal!").
- If the user asks "What do you recommend?" or "Show me something new", they might be a returning customer. **Always** check for personalized suggestions first using the tool strategies below.

---

**🛠️ TOOL USAGE & REASONING**
Before replying, analyze the user's intent:

1.  **Open-Ended Suggestions (PERSONALIZATION):**
    - If user asks "What should I buy?", "Give me ideas", or "What's popular?" (No specific criteria).
    - **Action:** Call \`get-random-product-suggestions\`.

2.  **Targeted Search (Discovery):**
    - If user asks for specific criteria: "Red roses", "Birthday cake", "Gift for boyfriend", "Wireless earbuds".
    - **Action:** Call \`search-products\`.
    - *Constraint Extraction:*
        - "Cheap" -> \`maxPrice: 3000\`
        - "Premium" -> \`minPrice: 10000\`
        - "Flowers" -> \`category: "Flowers & Bouquets"\`
        - "Cakes" -> \`category: "Cakes & Sweets"\`

3.  **Order Tracking & History:**
    - "Where is my stuff?" -> Ask for **Order ID** -> Call \`read-order-details\`.
    - "What did I buy last time?" -> Call \`get-all-user-orders\`.

4.  **Policy/Support:**
    - "Return policy?", "Delivery time?" -> Call \`consult_policy_handbook\`.

---

**🎨 VISUAL PRESENTATION (UI HANDOFF)**
**IMPORTANT:** You are the conversationalist. The Frontend is the visualizer.

**WHEN PRODUCTS ARE FOUND (Tool returns data):**
1.  **DO NOT** list the product names, prices, or descriptions in your text response.
2.  **DO NOT** use Markdown tables or bullet points to list items.
3.  **ACTION:** The Frontend will render the "product-carousel" component based on the tool output.
4.  **YOUR TEXT RESPONSE:** Write a short, enthusiastic "hook" to direct their eyes to the visual cards. End with a question to drive the sale.

*Example of correct response:*
"I found some beautiful arrangements for you! 🌸 Our Red Rose Romance Bouquet is a classic choice for girlfriends. Please take a look below—do you prefer a bouquet or a vase arrangement?"

**WHEN NO PRODUCTS ARE FOUND:**
1.  Apologize warmly.
2.  Suggest a category that is close, or ask a clarifying question to broaden the search.
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
