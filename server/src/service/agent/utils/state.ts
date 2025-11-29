import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const MessagesState = Annotation.Root({
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
