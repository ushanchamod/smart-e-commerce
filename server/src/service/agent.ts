import dotenv from "dotenv";
dotenv.config();
import { StructuredTool, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, START, END, MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import {
  isAIMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { z } from "zod/v4";
import { RunnableConfig } from "@langchain/core/runnables";
import { db } from "../db";
import { usersTable } from "../db/schema";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment variables");
}

const model = new ChatOpenAI({
  temperature: 0,
  modelName: "gpt-4o-mini",
  apiKey: API_KEY.trim(),
  timeout: 10000,
});

const add = tool(
  ({ a, b }) => {
    console.log("Adding", a, b);
    return a + b;
  },
  {
    name: "add",
    description: "Add two numbers",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

const subtract = tool(
  ({ a, b }) => {
    console.log("Subtracting", a, b);
    return a - b;
  },
  {
    name: "subtract",
    description: "Subtract two numbers",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

const divide = tool(
  ({ a, b }) => {
    console.log("Dividing", a, b);
    if (b === 0) {
      return "Error: Division by zero is not allowed.";
    }
    return a / b;
  },
  {
    name: "divide",
    description: "Divide two numbers",
    schema: z.object({
      a: z.number().describe("Numerator"),
      b: z.number().describe("Denominator"),
    }),
  }
);

const multiply = tool(
  ({ a, b }) => {
    console.log("Multiplying", a, b);
    return String(a * b);
  },
  {
    name: "multiply",
    description: "Multiply two numbers",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

const getAllUser = tool(
  async ({}) => {
    console.log("Fetching all users");
    const users = await db.select().from(usersTable);
    return JSON.stringify(users);
  },
  {
    name: "getAllUser",
    description: "Fetch all users from the database",
    schema: z.object({}),
  }
);

const toolsByName: Record<string, StructuredTool> = {
  [add.name]: add,
  [subtract.name]: subtract,
  [divide.name]: divide,
  [multiply.name]: multiply,
  [getAllUser.name]: getAllUser,
};
const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);

const MessagesState = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),
  llmCalls: z.number().optional(),
});

async function llmCall(state: z.infer<typeof MessagesState>) {
  const result = await modelWithTools.invoke([
    new SystemMessage("You are a helpful assistant..."),
    ...state.messages,
  ]);

  return {
    messages: result,
    llmCalls: (state.llmCalls ?? 0) + 1,
  };
}

async function toolNode(
  state: z.infer<typeof MessagesState>,
  config: RunnableConfig
) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !isAIMessage(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];

    const observation = await tool.invoke(toolCall, config);

    result.push(observation);
  }

  return { messages: result };
}

async function shouldContinue(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);
  if (lastMessage == null || !isAIMessage(lastMessage)) return END;

  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  return END;
}

export const agent = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();

// Invoke
// const result = await agent.invoke({
//   messages: [new HumanMessage("Add 3 and 4.")],
// });

// for (const message of result.messages) {
//   console.log(`[${message.getType()}]: ${message.text}`);
// }
