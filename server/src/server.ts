import app from "./app";
import dotenv from "dotenv";
dotenv.config();

import { createOwnerIfNotExists, testDbConnection } from "./db";

import http from "http";
import { Server } from "socket.io";
import { getChatHistory, getRunnable } from "./service/agent/agent";
import {
  HumanMessage,
  AIMessage,
  AIMessageChunk,
} from "@langchain/core/messages";
import z from "zod";
import { JWTPayloadType } from "./dto";
import jwt from "jsonwebtoken";

export const contextSchema = z.object({
  userName: z.string(),
});

const getStatusMessage = (toolName: string): string => {
  switch (toolName) {
    case "search-products":
      return "Browsing our catalog...";
    case "get-product-details":
      return "Checking product details...";
    case "get-random-product-suggestions":
      return "Finding gift ideas...";
    case "read-order-details":
    case "read-order-items":
    case "get-all-user-orders":
      return "Looking up your orders...";
    case "cancel-order":
      return "Processing cancellation...";
    case "consult_policy_handbook":
      return "Checking store policies...";
    case "add-item-to-cart":
      return "Updating your cart...";
    default:
      return "Thinking...";
  }
};

const startServer = async () => {
  try {
    await testDbConnection();
    await createOwnerIfNotExists();

    const PORT = process.env.PORT || 8080;
    const httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: ["http://localhost:5173", "http://localhost:4173"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      const token = socket.handshake.auth.token;
      let user: JWTPayloadType | null = null;

      try {
        if (token) {
          user = jwt.verify(
            token,
            process.env.JWT_SECRET as string
          ) as JWTPayloadType;
        } else {
          console.log(
            `!!! No auth token provided. Connecting as Guest: ${socket.id}`
          );
        }
      } catch (err: any) {
        console.error(`!!! Auth failed for ${socket.id}:`, err.message);
        socket.disconnect();
        return;
      }

      const UI_WIDGET_TOOLS = [
        "search-products",
        "get-random-product-suggestions",
        "get-product-details",
        "read-order-details",
        "read-order-items",
        "get-all-user-orders",
      ];

      socket.on("restoreChat", async (data: { session_id: string }) => {
        const threadId = data.session_id || socket.id;
        console.log(`Restoring chat for thread: ${threadId}`);

        try {
          const rawHistory = await getChatHistory(threadId);
          const formattedHistory: any[] = [];

          for (const msg of rawHistory) {
            if (msg instanceof HumanMessage) {
              formattedHistory.push({
                id: "hist_" + Math.random().toString(36).substr(2, 9),
                sender: "user",
                text: typeof msg.content === "string" ? msg.content : "",
                timestamp: new Date(),
                isStreaming: false,
              });
            } else if (
              msg instanceof AIMessageChunk ||
              msg instanceof AIMessage
            ) {
              formattedHistory.push({
                id: "hist_" + Math.random().toString(36).substr(2, 9),
                sender: "bot",
                text: typeof msg.content === "string" ? msg.content : "",
                timestamp: new Date(),
                isStreaming: false,
                products: [],
              });
            }
          }

          const cleanHistory = formattedHistory.filter((m) => {
            if (m.sender === "user") return true;
            if (m.sender === "bot") {
              const hasText = m.text && m.text.trim().length > 0;
              const hasProducts = m.products && m.products.length > 0;
              return hasText || hasProducts;
            }
            return false;
          });

          console.log(`📤 Sending ${cleanHistory.length} recovered messages.`);
          socket.emit("chatHistory", cleanHistory);
        } catch (error) {
          console.error("Failed to restore history:", error);
        }
      });

      socket.on(
        "chatMessage",
        async (data: { message: string; session_id: string }) => {
          const userMessage = data.message || "";

          const threadId = data.session_id || socket.id;

          const agent = await getRunnable();

          const configurable = {
            thread_id: threadId,
            user_id: user?.userId,
            user_email: user?.email,
          };

          try {
            const eventStream = await agent.streamEvents(
              { messages: [new HumanMessage(userMessage)], llmCalls: 0 },
              {
                version: "v2",
                configurable,
                context: { userName: user ? user.firstName : "Guest" },
              }
            );

            for await (const event of eventStream) {
              if (event.event === "on_tool_start") {
                const statusMsg = getStatusMessage(event.name);
                socket.emit("agentState", { status: statusMsg });
              }

              if (event.event === "on_chat_model_stream") {
                const chunk = event.data.chunk;
                const token =
                  chunk && typeof chunk.content === "string"
                    ? chunk.content
                    : "";

                if (token.length > 0) {
                  socket.emit("chatStream", {
                    chunk: token,
                  });
                }
              }

              if (event.event === "on_tool_end") {
                console.log(`DONE TOOL: Tool finished: ${event.name}`);

                if (UI_WIDGET_TOOLS.includes(event.name)) {
                  try {
                    const toolData = JSON.parse(event.data.output);

                    const dataToSend = Array.isArray(toolData)
                      ? toolData
                      : [toolData];

                    socket.emit("suggestedProducts", {
                      toolName: event.name,
                      data: dataToSend,
                    });
                  } catch (e) {
                    // Fallback handled nicely
                  }
                }

                try {
                  if (event.name === "cancel-order") {
                    socket.emit("orderCancelled", {
                      data: event.data.output,
                    });
                  }

                  if (event.name === "add-item-to-cart") {
                    socket.emit("itemAddedToCart", {
                      data: event.data.output,
                    });
                  }
                } catch (e) {
                  console.error("Error emitting orderCancelled event:", e);
                }
              }
            }

            socket.emit("chatEnd", { status: "success" });
            console.log("DONE: Stream finished");
          } catch (error: any) {
            console.error("!!! Error in agent execution:", error.message);

            socket.emit("chatEnd", {
              status: "error",
              error: error.message,
            });
          }
        }
      );

      socket.on("disconnect", () => {
        console.log(`DISCONNECTED: Client disconnected: ${socket.id}`);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("!!! Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
