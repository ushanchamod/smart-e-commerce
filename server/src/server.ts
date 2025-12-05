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
import { chatRateLimiter, burstRateLimiter } from "./service/agent/utils/rateLimiter";
import { logger } from "./service/agent/utils/logger";
import { validateMessage, validateThreadId } from "./service/agent/utils/validator";
import { metrics } from "./service/agent/utils/metrics";

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
          // Allow guest connections to proceed
        }
      } catch (err: any) {
        console.error(`!!! Auth failed for ${socket.id}:`, err.message);
        // Only disconnect if token was provided but invalid
        // Allow guests without tokens to connect
        if (token) {
          socket.disconnect();
          return;
        }
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
        
        if (!validateThreadId(threadId)) {
          logger.warn("Invalid thread ID in restoreChat", { threadId });
          socket.emit("chatHistory", []);
          return;
        }

        logger.debug("Restoring chat history", { threadId, userId: user?.userId });

        try {
          const rawHistory = await getChatHistory(threadId);
          const formattedHistory: any[] = [];
          let messageTimestamp = Date.now();

          for (const msg of rawHistory) {
            if (msg instanceof HumanMessage) {
              formattedHistory.push({
                id: `hist_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                sender: "user",
                text: typeof msg.content === "string" ? msg.content : "",
                timestamp: new Date(messageTimestamp),
                isStreaming: false,
              });
              messageTimestamp += 1000; // Increment timestamp for next message
            } else if (
              msg instanceof AIMessageChunk ||
              msg instanceof AIMessage
            ) {
              formattedHistory.push({
                id: `hist_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                sender: "bot",
                text: typeof msg.content === "string" ? msg.content : "",
                timestamp: new Date(messageTimestamp),
                isStreaming: false,
                products: [],
              });
              messageTimestamp += 1000; // Increment timestamp for next message
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

          logger.info("Chat history restored", {
            threadId,
            messageCount: cleanHistory.length,
          });
          socket.emit("chatHistory", cleanHistory);
        } catch (error) {
          logger.error("Failed to restore chat history", error, { threadId });
          socket.emit("chatHistory", []);
        }
      });

      socket.on(
        "chatMessage",
        async (data: { message: string; session_id: string }) => {
          const requestStartTime = Date.now();
          const threadId = data.session_id || socket.id;
          const identifier = user?.userId?.toString() || socket.id;

          // Validate thread ID
          if (!validateThreadId(threadId)) {
            logger.warn("Invalid thread ID", { threadId, socketId: socket.id });
            socket.emit("chatEnd", {
              status: "error",
              error: "Invalid session ID.",
            });
            return;
          }

          // Validate and sanitize message
          const validation = validateMessage(data.message || "");
          if (!validation.valid) {
            logger.warn("Invalid message", {
              threadId,
              error: validation.error,
            });
            socket.emit("chatEnd", {
              status: "error",
              error: validation.error || "Invalid message.",
            });
            return;
          }

          const userMessage = validation.sanitized!;

          // Rate limiting
          const rateLimitCheck = chatRateLimiter.check(identifier);
          const burstCheck = burstRateLimiter.check(identifier);

          if (!rateLimitCheck.allowed || !burstCheck.allowed) {
            const retryAfter = rateLimitCheck.retryAfter || burstCheck.retryAfter;
            logger.rateLimitExceeded(
              identifier,
              !rateLimitCheck.allowed ? "chat" : "burst"
            );
            socket.emit("chatEnd", {
              status: "error",
              error: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            });
            return;
          }

          logger.agentStart(threadId, user?.userId);

          let agent;
          try {
            agent = await getRunnable();
          } catch (error: any) {
            logger.agentError(threadId, error, { phase: "initialization" });
            socket.emit("chatEnd", {
              status: "error",
              error: "Agent initialization failed. Please try again.",
            });
            metrics.recordRequest(
              Date.now() - requestStartTime,
              0,
              [],
              true
            );
            return;
          }

          const configurable = {
            thread_id: threadId,
            user_id: user?.userId,
            user_email: user?.email,
          };

          // Set timeout for agent execution (5 minutes)
          const timeoutId = setTimeout(() => {
            logger.warn("Agent execution timeout", { threadId });
            socket.emit("chatEnd", {
              status: "error",
              error: "Request timeout. The operation took too long.",
            });
            metrics.recordRequest(
              Date.now() - requestStartTime,
              0,
              [],
              true
            );
          }, 300000);

          let llmCallCount = 0;
          const toolCalls: string[] = [];

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
                llmCallCount++;
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
                toolCalls.push(event.name);
                logger.debug("Tool execution completed", {
                  toolName: event.name,
                  threadId,
                });

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

            clearTimeout(timeoutId);
            const duration = Date.now() - requestStartTime;
            socket.emit("chatEnd", { status: "success" });
            
            logger.agentComplete(threadId, duration, llmCallCount);
            metrics.recordRequest(duration, llmCallCount, toolCalls, false);
          } catch (error: any) {
            clearTimeout(timeoutId);
            const duration = Date.now() - requestStartTime;
            
            logger.agentError(threadId, error, {
              duration,
              llmCalls: llmCallCount,
            });
            metrics.recordRequest(duration, llmCallCount, toolCalls, true);

            socket.emit("chatEnd", {
              status: "error",
              error:
                error.message ||
                "An unexpected error occurred. Please try again.",
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
