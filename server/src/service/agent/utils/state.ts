import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const MessagesState = Annotation.Root({
  // messagesStateReducer is correct, it appends new messages.
  // The 'trimming' logic we added in node.ts handles what we SEND to the LLM.
  // The DB will still store history, but we won't crash the LLM with it.
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  llmCalls: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
});

export type MessagesStateType = typeof MessagesState.State;
