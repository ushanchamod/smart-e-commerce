import { z } from "zod/v4";
import { BaseMessage } from "@langchain/core/messages";
import { registry } from "@langchain/langgraph/zod";
import { MessagesZodMeta } from "@langchain/langgraph";

export const MessagesState = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),
  llmCalls: z.number().optional(),
});

export type MessagesStateType = z.infer<typeof MessagesState>;
